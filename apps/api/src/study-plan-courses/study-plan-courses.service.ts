import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudyPlanCourseDto } from './dto/create-study-plan-course.dto.js';
import { ReorderStudyPlanCoursesDto } from './dto/reorder-study-plan-courses.dto.js';

@Injectable()
export class StudyPlanCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudyPlanCourseDto) {
    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: {
        id: dto.studyPlanId,
      },
    });

    if (!studyPlan) {
      return {
        success: false,
        errors: ['Study plan not found'],
      };
    }

    const academicYear =
      await this.prisma.academicYear.findUnique({
        where: {
          id: dto.academicYearId,
        },
      });

    if (!academicYear) {
      return {
        success: false,
        errors: ['Academic year not found'],
      };
    }

    if (academicYear.studyPlanId !== dto.studyPlanId) {
      return {
        success: false,
        errors: [
          'Academic year does not belong to the selected study plan',
        ],
      };
    }

    const course = await this.prisma.course.findUnique({
      where: {
        id: dto.courseId,
      },
    });

    if (!course) {
      return {
        success: false,
        errors: ['Course not found'],
      };
    }

    const existingCourse =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          courseId: dto.courseId,
        },
      });

    if (existingCourse) {
      return {
        success: false,
        errors: [
          'Course already exists in this study plan and academic year',
        ],
      };
    }

    const existingPriority =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          priority: dto.priority,
        },
      });

    if (existingPriority) {
      return {
        success: false,
        errors: [
          `Priority ${dto.priority} is already used`,
        ],
      };
    }

    const planCourse =
      await this.prisma.studyPlanCourse.create({
        data: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          courseId: dto.courseId,
          priority: dto.priority,
          requirement: dto.requirement,
        },

        include: {
          course: true,
          academicYear: true,
          studyPlan: true,
        },
      });

    return {
      success: true,
      planCourse,
    };
  }

  async findByPlanAndYear(
    studyPlanId: string,
    academicYearId: string,
  ) {
    const courses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          studyPlanId,
          academicYearId,
        },

        include: {
          course: {
            include: {
              prerequisites: {
                include: {
                  prerequisite: true,
                },
              },
            },
          },

          academicYear: true,
        },

        orderBy: {
          priority: 'asc',
        },
      });

    return {
      success: true,
      count: courses.length,
      courses,
    };
  }

  async reorder(dto: ReorderStudyPlanCoursesDto) {
    const academicYear =
      await this.prisma.academicYear.findUnique({
        where: {
          id: dto.academicYearId,
        },
      });

    if (!academicYear) {
      return {
        success: false,
        errors: ['Academic year not found'],
      };
    }

    if (academicYear.studyPlanId !== dto.studyPlanId) {
      return {
        success: false,
        errors: [
          'Academic year does not belong to the selected study plan',
        ],
      };
    }

    if (!dto.items || dto.items.length === 0) {
      return {
        success: false,
        errors: ['No courses provided for reordering'],
      };
    }

    const ids = dto.items.map((item) => item.id);

    if (new Set(ids).size !== ids.length) {
      return {
        success: false,
        errors: ['Duplicate course IDs are not allowed'],
      };
    }

    const priorities = dto.items.map(
      (item) => item.priority,
    );

    if (
      priorities.some(
        (priority) =>
          !Number.isInteger(priority) || priority < 1,
      )
    ) {
      return {
        success: false,
        errors: [
          'Priority must be a positive integer',
        ],
      };
    }

    if (
      new Set(priorities).size !== priorities.length
    ) {
      return {
        success: false,
        errors: ['Duplicate priorities are not allowed'],
      };
    }

    const planCourses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          id: {
            in: ids,
          },

          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
        },

        select: {
          id: true,
        },
      });

    if (planCourses.length !== dto.items.length) {
      return {
        success: false,
        errors: [
          'One or more courses do not belong to this study plan and academic year',
        ],
      };
    }

    /*
     * لدينا unique constraint على priority.
     *
     * لذلك لا نستطيع تبديل:
     * 1 -> 2
     * 2 -> 1
     *
     * مباشرة، لأن PostgreSQL قد يرفض أول update
     * بسبب وجود priority = 2 مسبقاً.
     *
     * لذلك ننقل القيم أولاً إلى نطاق مؤقت سالب،
     * ثم نضع الترتيب النهائي.
     */

    await this.prisma.$transaction(async (tx) => {
      for (let index = 0; index < dto.items.length; index++) {
        const item = dto.items[index];

        await tx.studyPlanCourse.update({
          where: {
            id: item.id,
          },

          data: {
            priority: -(index + 1),
          },
        });
      }

      for (const item of dto.items) {
        await tx.studyPlanCourse.update({
          where: {
            id: item.id,
          },

          data: {
            priority: item.priority,
          },
        });
      }
    });

    return this.findByPlanAndYear(
      dto.studyPlanId,
      dto.academicYearId,
    );
  }

  async remove(id: string) {
    const planCourse =
      await this.prisma.studyPlanCourse.findUnique({
        where: {
          id,
        },

        include: {
          course: true,
        },
      });

    if (!planCourse) {
      return {
        success: false,
        errors: ['Study plan course not found'],
      };
    }

    await this.prisma.studyPlanCourse.delete({
      where: {
        id,
      },
    });

    return {
      success: true,
      message: 'Course removed from study plan successfully',

      removedCourse: {
        id: planCourse.course.id,
        code: planCourse.course.code,
        nameAr: planCourse.course.nameAr,
      },
    };
  }
}
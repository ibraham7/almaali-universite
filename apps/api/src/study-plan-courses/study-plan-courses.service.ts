import { Injectable } from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateStudyPlanCourseDto } from './dto/create-study-plan-course.dto.js';
import { ReorderStudyPlanCoursesDto } from './dto/reorder-study-plan-courses.dto.js';

@Injectable()
export class StudyPlanCoursesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStudyPlanCourseDto) {
    // ============================================================
    // 1. التحقق من الخطة الدراسية
    // ============================================================

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

    // ============================================================
    // 2. التحقق من المستوى
    // AcademicYear حاليًا يمثل المستوى داخل الخطة
    // ============================================================

    const academicYear =
      await this.prisma.academicYear.findUnique({
        where: {
          id: dto.academicYearId,
        },
      });

    if (!academicYear) {
      return {
        success: false,
        errors: ['Academic level not found'],
      };
    }

    if (academicYear.studyPlanId !== dto.studyPlanId) {
      return {
        success: false,
        errors: [
          'Academic level does not belong to the selected study plan',
        ],
      };
    }

    // ============================================================
    // 3. التحقق من الفصل
    // ============================================================

    const semester = await this.prisma.semester.findUnique({
      where: {
        id: dto.semesterId,
      },
    });

    if (!semester) {
      return {
        success: false,
        errors: ['Semester not found'],
      };
    }

    if (semester.academicYearId !== dto.academicYearId) {
      return {
        success: false,
        errors: [
          'Semester does not belong to the selected academic level',
        ],
      };
    }

    // ============================================================
    // 4. التحقق من المقرر
    // ============================================================

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

    // ============================================================
    // 5. منع تكرار المقرر داخل نفس الخطة والمستوى والفصل
    // ============================================================

    const existingCourse =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          semesterId: dto.semesterId,
          courseId: dto.courseId,
        },
      });

    if (existingCourse) {
      return {
        success: false,
        errors: [
          'Course already exists in this study plan, academic level and semester',
        ],
      };
    }

    // ============================================================
    // 6. منع تكرار priority داخل نفس الفصل
    //
    // priority للترتيب فقط.
    // لا يعني أن المادة ذات priority 2 تعتمد على priority 1.
    // المتطلبات السابقة محفوظة بشكل مستقل في CoursePrerequisite.
    // ============================================================

    const existingPriority =
      await this.prisma.studyPlanCourse.findFirst({
        where: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          semesterId: dto.semesterId,
          priority: dto.priority,
        },
      });

    if (existingPriority) {
      return {
        success: false,
        errors: [
          `Priority ${dto.priority} is already used in this semester`,
        ],
      };
    }

    // ============================================================
    // 7. إنشاء مقرر الخطة
    // ============================================================

    const planCourse =
      await this.prisma.studyPlanCourse.create({
        data: {
          studyPlanId: dto.studyPlanId,
          academicYearId: dto.academicYearId,
          semesterId: dto.semesterId,
          courseId: dto.courseId,
          priority: dto.priority,
          requirement: dto.requirement,
        },

        include: {
          course: true,
          academicYear: true,
          semester: true,
          studyPlan: true,
        },
      });

    return {
      success: true,
      planCourse,
    };
  }

  // ============================================================
  // مقررات الخطة حسب المستوى
  //
  // أبقينا هذه الدالة للتوافق مع الكود الحالي.
  // تعيد جميع فصول المستوى مرتبة حسب الفصل ثم priority.
  // ============================================================

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
          semester: true,
        },

        orderBy: [
          {
            semester: {
              semesterNumber: 'asc',
            },
          },
          {
            priority: 'asc',
          },
        ],
      });

    return {
      success: true,
      count: courses.length,
      courses,
    };
  }

  // ============================================================
  // مقررات الخطة حسب المستوى والفصل
  // ============================================================

  async findByPlanYearAndSemester(
    studyPlanId: string,
    academicYearId: string,
    semesterId: string,
  ) {
    const semester = await this.prisma.semester.findUnique({
      where: {
        id: semesterId,
      },
    });

    if (!semester) {
      return {
        success: false,
        errors: ['Semester not found'],
      };
    }

    if (semester.academicYearId !== academicYearId) {
      return {
        success: false,
        errors: [
          'Semester does not belong to the selected academic level',
        ],
      };
    }

    const courses =
      await this.prisma.studyPlanCourse.findMany({
        where: {
          studyPlanId,
          academicYearId,
          semesterId,
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
          semester: true,
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

  // ============================================================
  // إعادة ترتيب مقررات المستوى
  //
  // DTO الحالي لا يحتوي semesterId بعد.
  // لذلك نحدد الفصل من المقررات نفسها ونمنع إعادة ترتيب
  // مقررات من أكثر من فصل في نفس العملية.
  // ============================================================

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
        errors: ['Academic level not found'],
      };
    }

    if (academicYear.studyPlanId !== dto.studyPlanId) {
      return {
        success: false,
        errors: [
          'Academic level does not belong to the selected study plan',
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
          semesterId: true,
        },
      });

    if (planCourses.length !== dto.items.length) {
      return {
        success: false,
        errors: [
          'One or more courses do not belong to this study plan and academic level',
        ],
      };
    }

    // جميع المواد التي يعاد ترتيبها يجب أن تكون من نفس الفصل.
    const semesterIds = new Set(
      planCourses.map(
        (planCourse) => planCourse.semesterId,
      ),
    );

    if (semesterIds.size !== 1) {
      return {
        success: false,
        errors: [
          'Courses from different semesters cannot be reordered together',
        ],
      };
    }

    const semesterId = planCourses[0].semesterId;

    /*
     * لدينا unique constraint على:
     *
     * studyPlanId
     * academicYearId
     * semesterId
     * priority
     *
     * لذلك لا نستطيع تبديل:
     *
     * 1 -> 2
     * 2 -> 1
     *
     * مباشرة.
     *
     * ننقل القيم أولاً إلى نطاق سالب مؤقت،
     * ثم نضع القيم النهائية.
     */

    await this.prisma.$transaction(async (tx) => {
      for (
        let index = 0;
        index < dto.items.length;
        index++
      ) {
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

    return this.findByPlanYearAndSemester(
      dto.studyPlanId,
      dto.academicYearId,
      semesterId,
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
          semester: true,
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
      message:
        'Course removed from study plan successfully',

      removedCourse: {
        id: planCourse.course.id,
        code: planCourse.course.code,
        nameAr: planCourse.course.nameAr,
        semesterId: planCourse.semesterId,
      },
    };
  }
}
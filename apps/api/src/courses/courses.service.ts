import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';

import { CreateCoursePrerequisiteDto } from './dto/create-course-prerequisite.dto.js';

@Injectable()
export class CoursesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async addPrerequisite(
    dto: CreateCoursePrerequisiteDto,
  ) {
    if (
      dto.courseId ===
      dto.prerequisiteId
    ) {
      return {
        success: false,

        errors: [
          'A course cannot be its own prerequisite',
        ],
      };
    }

    const [course, prerequisite] =
      await Promise.all([
        this.prisma.course.findUnique({
          where: {
            id: dto.courseId,
          },
        }),

        this.prisma.course.findUnique({
          where: {
            id: dto.prerequisiteId,
          },
        }),
      ]);

    if (!course) {
      return {
        success: false,
        errors: ['Course not found'],
      };
    }

    if (!prerequisite) {
      return {
        success: false,

        errors: [
          'Prerequisite course not found',
        ],
      };
    }

    const existingPrerequisite =
      await this.prisma.coursePrerequisite.findFirst(
        {
          where: {
            courseId: dto.courseId,

            prerequisiteId:
              dto.prerequisiteId,
          },
        },
      );

    if (existingPrerequisite) {
      return {
        success: false,

        errors: [
          'This prerequisite is already assigned to the course',
        ],
      };
    }

    const relation =
      await this.prisma.coursePrerequisite.create(
        {
          data: {
            courseId: dto.courseId,

            prerequisiteId:
              dto.prerequisiteId,
          },

          include: {
            course: true,
            prerequisite: true,
          },
        },
      );

    return {
      success: true,
      prerequisite: relation,
    };
  }

  async removePrerequisite(
    courseId: string,
    prerequisiteId: string,
  ) {
    const relation =
      await this.prisma.coursePrerequisite.findFirst(
        {
          where: {
            courseId,
            prerequisiteId,
          },

          include: {
            prerequisite: true,
          },
        },
      );

    if (!relation) {
      return {
        success: false,

        errors: [
          'Course prerequisite relation not found',
        ],
      };
    }

    await this.prisma.coursePrerequisite.delete({
      where: {
        id: relation.id,
      },
    });

    return {
      success: true,

      message:
        'Course prerequisite removed successfully',

      removedPrerequisite: {
        id: relation.prerequisite.id,

        code:
          relation.prerequisite.code,

        nameAr:
          relation.prerequisite.nameAr,
      },
    };
  }

  async create(
    createCourseDto: CreateCourseDto,
  ) {
    const existing =
      await this.prisma.course.findFirst({
        where: {
          code: createCourseDto.code,
        },
      });

    if (existing) {
      throw new BadRequestException(
        'Course code already exists',
      );
    }

    return this.prisma.course.create({
      data: {
        code:
          createCourseDto.code.trim(),

        nameAr:
          createCourseDto.nameAr.trim(),

        nameEn:
          createCourseDto.nameEn?.trim(),

        credits:
          createCourseDto.credits,

        ects:
          createCourseDto.ects,

        type:
          createCourseDto.type,

        requirement:
          createCourseDto.requirement,

        description:
          createCourseDto.description?.trim(),

        status:
          createCourseDto.status ??
          'ACTIVE',
      },

      include: {
        prerequisites: {
          include: {
            prerequisite: true,
          },
        },
      },
    });
  }

  async update(
    id: string,
    dto: UpdateCourseDto,
  ) {
    const course =
      await this.prisma.course.findUnique({
        where: {
          id,
        },
      });

    if (!course) {
      throw new NotFoundException(
        'Course not found',
      );
    }

    if (
      dto.code &&
      dto.code !== course.code
    ) {
      const existing =
        await this.prisma.course.findFirst({
          where: {
            code: dto.code,

            NOT: {
              id,
            },
          },
        });

      if (existing) {
        throw new BadRequestException(
          'Course code already exists',
        );
      }
    }

    return this.prisma.course.update({
      where: {
        id,
      },

      data: {
        ...(dto.code !== undefined
          ? {
              code: dto.code.trim(),
            }
          : {}),

        ...(dto.nameAr !== undefined
          ? {
              nameAr:
                dto.nameAr.trim(),
            }
          : {}),

        ...(dto.nameEn !== undefined
          ? {
              nameEn:
                dto.nameEn?.trim() ||
                null,
            }
          : {}),

        ...(dto.credits !== undefined
          ? {
              credits: dto.credits,
            }
          : {}),

        ...(dto.ects !== undefined
          ? {
              ects: dto.ects,
            }
          : {}),

        ...(dto.type !== undefined
          ? {
              type: dto.type,
            }
          : {}),

        ...(dto.requirement !==
        undefined
          ? {
              requirement:
                dto.requirement,
            }
          : {}),

        ...(dto.description !==
        undefined
          ? {
              description:
                dto.description?.trim() ||
                null,
            }
          : {}),

        ...(dto.status !== undefined
          ? {
              status: dto.status,
            }
          : {}),
      },

      include: {
        prerequisites: {
          include: {
            prerequisite: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const course =
      await this.prisma.course.findUnique({
        where: {
          id,
        },

        include: {
          prerequisites: {
            include: {
              prerequisite: true,
            },
          },

          planCourses: {
            include: {
              academicYear: true,
              semester: true,
              studyPlan: true,
            },

            orderBy: {
              priority: 'asc',
            },
          },

          sections: {
            include: {
              teacher: true,
              classroom: true,
              schedules: true,
            },
          },
        },
      });

    if (!course) {
      throw new NotFoundException(
        'Course not found',
      );
    }

    return course;
  }

  async findAll() {
    const courses =
      await this.prisma.course.findMany({
        include: {
          prerequisites: {
            include: {
              prerequisite: true,
            },
          },
        },

        orderBy: {
          code: 'asc',
        },
      });

    return {
      success: true,

      count: courses.length,

      courses,
    };
  }

  async findAvailableForStudent(
    studentId: string,
  ) {
    const student =
      await this.prisma.student.findUnique({
        where: {
          id: studentId,
        },

        select: {
          id: true,

          universityId: true,

          firstName: true,

          middleName: true,

          familyName: true,

          status: true,

          studyPlanId: true,

          academicYearId: true,

          semesterId: true,
        },
      });

    if (!student) {
      return {
        success: false,

        errors: [
          'Student not found',
        ],
      };
    }

    if (!student.studyPlanId) {
      return {
        success: false,

        errors: [
          'Student is not assigned to a study plan',
        ],
      };
    }

    if (!student.academicYearId) {
      return {
        success: false,

        errors: [
          'Student is not assigned to an academic year',
        ],
      };
    }

    const planCourses =
      await this.prisma.studyPlanCourse.findMany(
        {
          where: {
            studyPlanId:
              student.studyPlanId,

            academicYearId:
              student.academicYearId,

            course: {
              status: 'ACTIVE',
            },
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
        },
      );

    const registrationHistory =
      await this.prisma.enrollmentItem.findMany(
        {
          where: {
            enrollment: {
              studentId:
                student.id,

              status: {
                notIn: [
                  'CANCELLED',
                  'DROPPED',
                ],
              },
            },
          },

          select: {
            courseId: true,
          },
        },
      );

    const registeredCourseIds =
      new Set(
        registrationHistory.map(
          (item) => item.courseId,
        ),
      );

    const courses =
      planCourses.map(
        (planCourse) => {
          const missingPrerequisites =
            planCourse.course.prerequisites
              .filter(
                (prerequisite) =>
                  !registeredCourseIds.has(
                    prerequisite.prerequisiteId,
                  ),
              )

              .map(
                (prerequisite) => ({
                  id: prerequisite
                    .prerequisite.id,

                  code: prerequisite
                    .prerequisite.code,

                  nameAr:
                    prerequisite
                      .prerequisite
                      .nameAr,
                }),
              );

          const alreadyRegistered =
            registeredCourseIds.has(
              planCourse.courseId,
            );

          return {
            id:
              planCourse.course.id,

            code:
              planCourse.course.code,

            nameAr:
              planCourse.course
                .nameAr,

            nameEn:
              planCourse.course
                .nameEn,

            credits:
              planCourse.course
                .credits,

            ects:
              planCourse.course
                .ects,

            type:
              planCourse.course.type,

            requirement:
              planCourse.requirement,

            priority:
              planCourse.priority,

            academicYear: {
              id:
                planCourse
                  .academicYear.id,

              nameAr:
                planCourse
                  .academicYear
                  .nameAr,

              nameEn:
                planCourse
                  .academicYear
                  .nameEn,
            },

            alreadyRegistered,

            prerequisitesSatisfied:
              missingPrerequisites.length ===
              0,

            missingPrerequisites,

            canRegister:
              !alreadyRegistered &&
              missingPrerequisites.length ===
                0,
          };
        },
      );

    return {
      success: true,

      student: {
        id:
          student.id,

        universityId:
          student.universityId,

        firstName:
          student.firstName,

        middleName:
          student.middleName,

        familyName:
          student.familyName,

        status:
          student.status,

        studyPlanId:
          student.studyPlanId,

        academicYearId:
          student.academicYearId,

        semesterId:
          student.semesterId,
      },

      courses,
    };
  }
}
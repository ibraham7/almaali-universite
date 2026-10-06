import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
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

  private async advisorProgramIds(actor: { id: string; role: string }) {
    if (actor.role !== 'ADVISOR') return null;
    const rows = await this.prisma.advisorProgramAssignment.findMany({ where: { advisorId: actor.id }, select: { programId: true } });
    return rows.map((row) => row.programId);
  }

  private async assertPlanScope(studyPlanId: string, actor: { id: string; role: string }) {
    const allowed = await this.advisorProgramIds(actor);
    if (allowed && !allowed.length) throw new ForbiddenException('لم يعيّن المدير أي اختصاص لهذا الحساب.');
    if (allowed && !(await this.prisma.studyPlan.findFirst({ where: { id: studyPlanId, programId: { in: allowed } }, select: { id: true } }))) {
      throw new ForbiddenException('لا تملك صلاحية إدارة مقررات هذا الاختصاص.');
    }
  }

  private async assertCourseScope(courseId: string, actor: { id: string; role: string }) {
    const allowed = await this.advisorProgramIds(actor);
    if (!allowed) return;
    if (!allowed.length) throw new ForbiddenException('لم يعيّن المدير أي اختصاص لهذا الحساب.');
    const links = await this.prisma.studyPlanCourse.findMany({
      where: { courseId, studyPlan: { programId: { in: allowed } } },
      select: { studyPlan: { select: { programId: true } } },
    });
    const allPrograms = await this.prisma.studyPlanCourse.findMany({
      where: { courseId },
      select: { studyPlan: { select: { programId: true } } },
    });
    const allProgramIds = new Set(allPrograms.map((link) => link.studyPlan.programId));
    if (!links.length || [...allProgramIds].some((programId) => !allowed.includes(programId))) {
      throw new ForbiddenException('لا تملك صلاحية إدارة هذا المقرر في جميع الاختصاصات المرتبطة به.');
    }
  }

  async addPrerequisitesBulk(courseId: string, prerequisiteIds: string[], actor: { id: string; role: string }) {
    await this.assertCourseScope(courseId, actor);
    if (!prerequisiteIds.length) {
      throw new BadRequestException('اختر متطلبًا سابقًا واحدًا على الأقل');
    }
    if (prerequisiteIds.includes(courseId)) {
      throw new BadRequestException('لا يمكن أن يكون المقرر متطلبًا سابقًا لنفسه');
    }

    const [course, prerequisites, existing] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: courseId }, select: { id: true } }),
      this.prisma.course.findMany({ where: { id: { in: prerequisiteIds } }, select: { id: true } }),
      this.prisma.coursePrerequisite.findMany({
        where: { courseId, prerequisiteId: { in: prerequisiteIds } },
        select: { prerequisiteId: true },
      }),
    ]);

    if (!course) throw new NotFoundException('المقرر المطلوب غير موجود');
    if (prerequisites.length !== prerequisiteIds.length) {
      throw new BadRequestException('تأكد من أن جميع المقررات المختارة موجودة');
    }
    if (existing.length) {
      throw new ConflictException('بعض المتطلبات المختارة مضافة مسبقًا؛ حدّث القائمة ثم حاول مجددًا');
    }

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.coursePrerequisite.createMany({
          data: prerequisiteIds.map((prerequisiteId) => ({ courseId, prerequisiteId })),
        });
        const added = await tx.coursePrerequisite.findMany({
          where: { courseId, prerequisiteId: { in: prerequisiteIds } },
          include: { course: true, prerequisite: true },
        });
        return { success: true, added };
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('تغيّرت المتطلبات بالتزامن؛ حدّث القائمة وحاول مجددًا');
      }
      throw error;
    }
  }

  async addPrerequisite(dto: CreateCoursePrerequisiteDto, actor: { id: string; role: string }) {
    await this.assertCourseScope(dto.courseId, actor);
    if (dto.courseId === dto.prerequisiteId) {
      return {
        success: false,
        errors: ['A course cannot be its own prerequisite'],
      };
    }

    const [course, prerequisite] = await Promise.all([
      this.prisma.course.findUnique({ where: { id: dto.courseId } }),
      this.prisma.course.findUnique({ where: { id: dto.prerequisiteId } }),
    ]);

    if (!course) {
      return { success: false, errors: ['Course not found'] };
    }

    if (!prerequisite) {
      return {
        success: false,
        errors: ['Prerequisite course not found'],
      };
    }

    const existingPrerequisite = await this.prisma.coursePrerequisite.findFirst({
      where: {
        courseId: dto.courseId,
        prerequisiteId: dto.prerequisiteId,
      },
    });

    if (existingPrerequisite) {
      return {
        success: false,
        errors: ['This prerequisite is already assigned to the course'],
      };
    }

    const relation = await this.prisma.coursePrerequisite.create({
      data: {
        courseId: dto.courseId,
        prerequisiteId: dto.prerequisiteId,
      },
      include: {
        course: true,
        prerequisite: true,
      },
    });

    return {
      success: true,
      prerequisite: relation,
    };
  }

  async removePrerequisite(courseId: string, prerequisiteId: string, actor: { id: string; role: string }) {
    await this.assertCourseScope(courseId, actor);
    const relation = await this.prisma.coursePrerequisite.findFirst({
      where: { courseId, prerequisiteId },
      include: { prerequisite: true },
    });

    if (!relation) {
      return {
        success: false,
        errors: ['Course prerequisite relation not found'],
      };
    }

    await this.prisma.coursePrerequisite.delete({
      where: { id: relation.id },
    });

    return {
      success: true,
      message: 'Course prerequisite removed successfully',
      removedPrerequisite: {
        id: relation.prerequisite.id,
        code: relation.prerequisite.code,
        nameAr: relation.prerequisite.nameAr,
      },
    };
  }

  async create(createCourseDto: CreateCourseDto, actor: { id: string; role: string }) {
    const existing = await this.prisma.course.findFirst({
      where: {
        code: createCourseDto.code.trim(),
      },
    });

    if (existing) {
      throw new BadRequestException('Course code already exists');
    }

    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: { id: createCourseDto.studyPlanId },
      include: {
        program: {
          include: {
            department: {
              include: {
                college: true,
              },
            },
          },
        },
      },
    });

    if (!studyPlan) {
      throw new BadRequestException('الخطة الدراسية غير موجودة');
    }
    await this.assertPlanScope(studyPlan.id, actor);

    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id: createCourseDto.academicYearId },
    });

    if (!academicYear || academicYear.studyPlanId !== studyPlan.id) {
      throw new BadRequestException(
        'السنة/المستوى المحدد لا يتبع الخطة الدراسية المختارة',
      );
    }

    const semester = await this.prisma.semester.findUnique({
      where: { id: createCourseDto.semesterId },
    });

    if (!semester || semester.academicYearId !== academicYear.id) {
      throw new BadRequestException(
        'الفصل المحدد لا يتبع السنة/المستوى المختار',
      );
    }

    const lastPlanCourse = await this.prisma.studyPlanCourse.findFirst({
      where: {
        studyPlanId: studyPlan.id,
        academicYearId: academicYear.id,
        semesterId: semester.id,
      },
      orderBy: {
        priority: 'desc',
      },
      select: {
        priority: true,
      },
    });

    const priority = (lastPlanCourse?.priority ?? 0) + 1;

    return this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          code: createCourseDto.code.trim(),
          nameAr: createCourseDto.nameAr.trim(),
          nameEn: createCourseDto.nameEn?.trim(),
          credits: createCourseDto.credits,
          ects: createCourseDto.ects,
          type: createCourseDto.type,
          requirement: createCourseDto.requirement,
          description: createCourseDto.description?.trim(),
          status: createCourseDto.status ?? 'ACTIVE',
        },
      });

      await tx.studyPlanCourse.create({
        data: {
          studyPlanId: studyPlan.id,
          academicYearId: academicYear.id,
          semesterId: semester.id,
          courseId: course.id,
          priority,
          requirement: createCourseDto.requirement,
        },
      });

      return tx.course.findUniqueOrThrow({
        where: { id: course.id },
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
              studyPlan: {
                include: {
                  program: {
                    include: {
                      college: true,
                      department: {
                        include: {
                          college: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    });
  }

  async update(id: string, dto: UpdateCourseDto, actor: { id: string; role: string }) {
    await this.assertCourseScope(id, actor);
    const course = await this.prisma.course.findUnique({
      where: { id },
    });

    if (!course) {
      throw new NotFoundException('Course not found');
    }

    if (dto.code && dto.code !== course.code) {
      const existing = await this.prisma.course.findFirst({
        where: {
          code: dto.code,
          NOT: { id },
        },
      });

      if (existing) {
        throw new BadRequestException('Course code already exists');
      }
    }

    return this.prisma.course.update({
      where: { id },
      data: {
        ...(dto.code !== undefined ? { code: dto.code.trim() } : {}),
        ...(dto.nameAr !== undefined ? { nameAr: dto.nameAr.trim() } : {}),
        ...(dto.nameEn !== undefined
          ? { nameEn: dto.nameEn?.trim() || null }
          : {}),
        ...(dto.credits !== undefined ? { credits: dto.credits } : {}),
        ...(dto.ects !== undefined ? { ects: dto.ects } : {}),
        ...(dto.type !== undefined ? { type: dto.type } : {}),
        ...(dto.requirement !== undefined
          ? { requirement: dto.requirement }
          : {}),
        ...(dto.description !== undefined
          ? { description: dto.description?.trim() || null }
          : {}),
        ...(dto.status !== undefined ? { status: dto.status } : {}),
      },
      include: {
        prerequisites: {
          include: { prerequisite: true },
        },
      },
    });
  }

  async findOne(id: string, actor: { id: string; role: string }) {
    await this.assertCourseScope(id, actor);
    const course = await this.prisma.course.findUnique({
      where: { id },
      include: {
        prerequisites: {
          include: { prerequisite: true },
        },
        planCourses: {
          include: {
            academicYear: true,
            semester: true,
            studyPlan: {
              include: {
                program: {
                  include: {
                    college: true,
                    department: {
                      include: {
                        college: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { priority: 'asc' },
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
      throw new NotFoundException('Course not found');
    }

    return course;
  }

  async findAll(actor: { id: string; role: string }) {
    const allowed = await this.advisorProgramIds(actor);
    const courses = await this.prisma.course.findMany({
      ...(allowed ? { where: { planCourses: { some: { studyPlan: { programId: { in: allowed } } } } } } : {}),
      include: {
        prerequisites: {
          include: { prerequisite: true },
        },
        planCourses: {
          include: {
            academicYear: true,
            semester: true,
            studyPlan: {
              include: {
                program: {
                  include: {
                    college: true,
                    department: {
                      include: {
                        college: true,
                      },
                    },
                  },
                },
              },
            },
          },
          orderBy: { priority: 'asc' },
        },
      },
      orderBy: { code: 'asc' },
    });

    return {
      success: true,
      count: courses.length,
      courses,
    };
  }

  async findAvailableForStudent(studentId: string) {
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
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
      return { success: false, errors: ['Student not found'] };
    }

    if (!student.studyPlanId) {
      return {
        success: false,
        errors: ['Student is not assigned to a study plan'],
      };
    }

    if (!student.academicYearId) {
      return {
        success: false,
        errors: ['Student is not assigned to an academic year'],
      };
    }

    const planCourses = await this.prisma.studyPlanCourse.findMany({
      where: {
        studyPlanId: student.studyPlanId,
        academicYearId: student.academicYearId,
        course: { status: 'ACTIVE' },
      },
      include: {
        course: {
          include: {
            prerequisites: {
              include: { prerequisite: true },
            },
          },
        },
        academicYear: true,
      },
      orderBy: { priority: 'asc' },
    });

    const registrationHistory = await this.prisma.enrollmentItem.findMany({
      where: {
        enrollment: {
          studentId: student.id,
          status: {
            notIn: ['CANCELLED', 'DROPPED'],
          },
        },
      },
      select: { courseId: true },
    });

    const registeredCourseIds = new Set(
      registrationHistory.map((item) => item.courseId),
    );

    const courses = planCourses.map((planCourse) => {
      const missingPrerequisites = planCourse.course.prerequisites
        .filter(
          (prerequisite) =>
            !registeredCourseIds.has(prerequisite.prerequisiteId),
        )
        .map((prerequisite) => ({
          id: prerequisite.prerequisite.id,
          code: prerequisite.prerequisite.code,
          nameAr: prerequisite.prerequisite.nameAr,
        }));

      const alreadyRegistered = registeredCourseIds.has(planCourse.courseId);

      return {
        id: planCourse.course.id,
        code: planCourse.course.code,
        nameAr: planCourse.course.nameAr,
        nameEn: planCourse.course.nameEn,
        credits: planCourse.course.credits,
        ects: planCourse.course.ects,
        type: planCourse.course.type,
        requirement: planCourse.requirement,
        priority: planCourse.priority,
        academicYear: {
          id: planCourse.academicYear.id,
          nameAr: planCourse.academicYear.nameAr,
          nameEn: planCourse.academicYear.nameEn,
        },
        alreadyRegistered,
        prerequisitesSatisfied: missingPrerequisites.length === 0,
        missingPrerequisites,
        canRegister:
          !alreadyRegistered && missingPrerequisites.length === 0,
      };
    });

    return {
      success: true,
      student: {
        id: student.id,
        universityId: student.universityId,
        firstName: student.firstName,
        middleName: student.middleName,
        familyName: student.familyName,
        status: student.status,
        studyPlanId: student.studyPlanId,
        academicYearId: student.academicYearId,
        semesterId: student.semesterId,
      },
      courses,
    };
  }
}

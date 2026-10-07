import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CollegesService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: {
    universityId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.college.create({
      data: {
        universityId:
          data.universityId,

        nameAr:
          data.nameAr.trim(),

        nameEn:
          data.nameEn?.trim(),
      },
    });
  }

  async update(
    id: string,
    data: {
      nameAr?: string;
      nameEn?: string;
    },
  ) {
    const college =
      await this.prisma.college.findUnique({
        where: { id },
      });

    if (!college) {
      throw new NotFoundException(
        'College not found',
      );
    }

    return this.prisma.college.update({
      where: { id },

      data: {
        ...(data.nameAr !== undefined
          ? {
            nameAr:
              data.nameAr.trim(),
          }
          : {}),

        ...(data.nameEn !== undefined
          ? {
            nameEn:
              data.nameEn.trim() ||
              null,
          }
          : {}),
      },
    });
  }

  async findAll() {
    return this.prisma.college.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.college.findUnique({
      where: { id },
    });
  }

  async findByUniversity(
    universityId: string,
  ) {
    return this.prisma.college.findMany({
      where: {
        universityId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async remove(id: string, actingUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const college = await tx.college.findUnique({ where: { id }, select: { id: true } });
      if (!college) throw new NotFoundException('الكلية غير موجودة.');

      const departments = await tx.department.findMany({ where: { collegeId: id }, select: { id: true } });
      const departmentIds = departments.map((item) => item.id);
      const programs = await tx.program.findMany({
        where: { OR: [{ collegeId: id }, ...(departmentIds.length ? [{ departmentId: { in: departmentIds } }] : [])] },
        select: { id: true },
      });
      const programIds = programs.map((item) => item.id);
      const plans = programIds.length
        ? await tx.studyPlan.findMany({ where: { programId: { in: programIds } }, select: { id: true } })
        : [];
      const planIds = plans.map((item) => item.id);
      const levels = planIds.length
        ? await tx.academicYear.findMany({ where: { studyPlanId: { in: planIds } }, select: { id: true } })
        : [];
      const levelIds = levels.map((item) => item.id);
      const semesters = levelIds.length
        ? await tx.semester.findMany({ where: { academicYearId: { in: levelIds } }, select: { id: true } })
        : [];
      const semesterIds = semesters.map((item) => item.id);
      const sections = semesterIds.length
        ? await tx.courseSection.findMany({ where: { semesterId: { in: semesterIds } }, select: { id: true } })
        : [];
      const sectionIds = sections.map((item) => item.id);

      const studentLinks = await tx.student.count({
        where: {
          OR: [
            { collegeId: id },
            ...(departmentIds.length ? [{ departmentId: { in: departmentIds } }] : []),
            ...(programIds.length ? [{ programId: { in: programIds } }] : []),
            ...(planIds.length ? [{ studyPlanId: { in: planIds } }] : []),
            ...(levelIds.length ? [{ academicYearId: { in: levelIds } }] : []),
            ...(semesterIds.length ? [{ semesterId: { in: semesterIds } }] : []),
          ],
        },
      });
      const enrollments = semesterIds.length
        ? await tx.studentEnrollment.count({ where: { semesterId: { in: semesterIds } } })
        : 0;
      const results = semesterIds.length
        ? await tx.courseResult.count({ where: { semesterId: { in: semesterIds } } })
        : 0;
      const sectionEnrollments = sectionIds.length
        ? await tx.enrollmentItem.count({ where: { sectionId: { in: sectionIds } } })
        : 0;

      if (studentLinks || enrollments || results || sectionEnrollments) {
        throw new ConflictException('لا يمكن حذف الكلية لارتباطها بطلاب أو تسجيلات أو نتائج.');
      }

      if (semesterIds.length) await tx.registrationPeriod.deleteMany({ where: { semesterId: { in: semesterIds } } });
      if (sectionIds.length) {
        await tx.sectionSchedule.deleteMany({ where: { sectionId: { in: sectionIds } } });
        await tx.courseSection.deleteMany({ where: { id: { in: sectionIds } } });
      }
      if (planIds.length) {
        await tx.studyPlanCourse.deleteMany({ where: { studyPlanId: { in: planIds } } });
        await tx.studyPlanCurriculumCourse.deleteMany({ where: { studyPlanId: { in: planIds } } });
        await tx.studyPlanCurriculumQuota.deleteMany({ where: { studyPlanId: { in: planIds } } });
      }
      if (semesterIds.length) await tx.semester.deleteMany({ where: { id: { in: semesterIds } } });
      if (levelIds.length) await tx.academicYear.deleteMany({ where: { id: { in: levelIds } } });
      if (planIds.length) await tx.studyPlan.deleteMany({ where: { id: { in: planIds } } });
      if (programIds.length) await tx.program.deleteMany({ where: { id: { in: programIds } } });
      if (departmentIds.length) await tx.department.deleteMany({ where: { id: { in: departmentIds } } });
      await tx.college.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          action: 'COLLEGE_DELETED',
          entity: 'College',
          entityId: id,
          userId: actingUserId,
          details: JSON.stringify({ departments: departmentIds.length, programs: programIds.length, plans: planIds.length }),
        },
      });
      return { message: 'تم حذف الكلية وبنيتها الأكاديمية المرتبطة بها.' };
    }, { maxWait: 10_000, timeout: 30_000 });
  }
}

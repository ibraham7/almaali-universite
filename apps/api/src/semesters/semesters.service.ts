import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SemestersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async assertLevelAccess(academicYearId: string, actor: { id: string; role: string }) {
    if (actor.role !== 'ADVISOR') return;
    const level = await this.prisma.academicYear.findUnique({ where: { id: academicYearId }, select: { studyPlan: { select: { programId: true } } } });
    if (!level) throw new NotFoundException('المستوى الدراسي غير موجود');
    const assignment = await this.prisma.advisorProgramAssignment.findFirst({ where: { advisorId: actor.id, programId: level.studyPlan.programId }, select: { id: true } });
    if (!assignment) throw new ForbiddenException('لا تملك صلاحية إدارة هذا الفصل.');
  }

  private async resolveSemesterNumber(
    academicYearId: string,
    requestedSemesterNumber: number,
    excludeId?: string,
  ) {
    if (
      !Number.isInteger(requestedSemesterNumber) ||
      requestedSemesterNumber < 1
    ) {
      throw new BadRequestException(
        'رقم الفصل يجب أن يكون عددًا صحيحًا أكبر من صفر',
      );
    }

    const duplicate = await this.prisma.semester.findFirst({
      where: {
        academicYearId,
        semesterNumber: requestedSemesterNumber,
        ...(excludeId
          ? {
              NOT: {
                id: excludeId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (!duplicate) {
      return requestedSemesterNumber;
    }

    if (excludeId) {
      throw new BadRequestException(
        'رقم الفصل مستخدم مسبقًا ضمن هذا المستوى',
      );
    }

    const lastSemester = await this.prisma.semester.findFirst({
      where: {
        academicYearId,
      },
      orderBy: {
        semesterNumber: 'desc',
      },
      select: {
        semesterNumber: true,
      },
    });

    return (lastSemester?.semesterNumber ?? 0) + 1;
  }

  async create(data: {
    academicYearId: string;
    nameAr: string;
    nameEn?: string;
    semesterNumber: number;
    requireMandatoryCourses?: boolean;
  }, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertLevelAccess(data.academicYearId, actor);
    const academicYear = await this.prisma.academicYear.findUnique({
      where: {
        id: data.academicYearId,
      },
      select: {
        id: true,
      },
    });

    if (!academicYear) {
      throw new NotFoundException(
        'المستوى الدراسي غير موجود',
      );
    }

    const semesterNumber = await this.resolveSemesterNumber(
      data.academicYearId,
      data.semesterNumber,
    );

    return this.prisma.semester.create({
      data: {
        academicYearId: data.academicYearId,
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn?.trim(),
        semesterNumber,
        requireMandatoryCourses:
          data.requireMandatoryCourses ?? false,
      },
    });
  }

  async update(
    id: string,
    data: {
      nameAr?: string;
      nameEn?: string;
      semesterNumber?: number;
      requireMandatoryCourses?: boolean;
    },
    actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' },
  ) {
    const semester = await this.prisma.semester.findUnique({
      where: { id },
    });

    if (!semester) {
      throw new NotFoundException(
        'Semester not found',
      );
    }
    await this.assertLevelAccess(semester.academicYearId, actor);

    const semesterNumber =
      data.semesterNumber !== undefined
        ? await this.resolveSemesterNumber(
            semester.academicYearId,
            data.semesterNumber,
            id,
          )
        : undefined;

    return this.prisma.semester.update({
      where: { id },
      data: {
        ...(data.nameAr !== undefined
          ? {
              nameAr: data.nameAr.trim(),
            }
          : {}),
        ...(data.nameEn !== undefined
          ? {
              nameEn: data.nameEn.trim() || null,
            }
          : {}),
        ...(semesterNumber !== undefined
          ? {
              semesterNumber,
            }
          : {}),
        ...(data.requireMandatoryCourses !== undefined
          ? {
              requireMandatoryCourses:
                data.requireMandatoryCourses,
            }
          : {}),
      },
    });
  }

  async findAll(actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    const allowed = actor.role === 'ADVISOR'
      ? (await this.prisma.advisorProgramAssignment.findMany({ where: { advisorId: actor.id }, select: { programId: true } })).map((row) => row.programId)
      : null;
    return this.prisma.semester.findMany({
      ...(allowed ? { where: { academicYear: { studyPlan: { programId: { in: allowed } } } } } : {}),
      orderBy: [
        {
          academicYearId: 'asc',
        },
        {
          semesterNumber: 'asc',
        },
      ],
    });
  }

  async findById(id: string, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    const semester = await this.prisma.semester.findUnique({ where: { id }, select: { id: true, academicYearId: true } });
    if (!semester) return null;
    await this.assertLevelAccess(semester.academicYearId, actor);
    return this.prisma.semester.findUnique({ where: { id } });
  }

  async findByAcademicYear(academicYearId: string, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertLevelAccess(academicYearId, actor);
    return this.prisma.semester.findMany({
      where: {
        academicYearId,
      },
      orderBy: {
        semesterNumber: 'asc',
      },
    });
  }
}

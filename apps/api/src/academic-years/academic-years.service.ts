import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AcademicYearsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async assertPlanAccess(studyPlanId: string, actor: { id: string; role: string }) {
    if (actor.role !== 'ADVISOR') return;
    const plan = await this.prisma.studyPlan.findUnique({ where: { id: studyPlanId }, select: { programId: true } });
    if (!plan) throw new NotFoundException('الخطة الدراسية غير موجودة');
    const assignment = await this.prisma.advisorProgramAssignment.findFirst({
      where: { advisorId: actor.id, programId: plan.programId },
      select: { id: true },
    });
    if (!assignment) throw new ForbiddenException('لا تملك صلاحية إدارة هذه الخطة الدراسية.');
  }

  private async resolveLevelNumber(
    studyPlanId: string,
    requestedLevelNumber: number,
    excludeId?: string,
  ) {
    if (!Number.isInteger(requestedLevelNumber) || requestedLevelNumber < 1) {
      throw new BadRequestException(
        'رقم المستوى يجب أن يكون عددًا صحيحًا أكبر من صفر',
      );
    }

    const duplicate = await this.prisma.academicYear.findFirst({
      where: {
        studyPlanId,
        levelNumber: requestedLevelNumber,
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
      return requestedLevelNumber;
    }

    if (excludeId) {
      throw new BadRequestException(
        'رقم المستوى مستخدم مسبقًا ضمن هذه الخطة الدراسية',
      );
    }

    const lastLevel = await this.prisma.academicYear.findFirst({
      where: {
        studyPlanId,
      },
      orderBy: {
        levelNumber: 'desc',
      },
      select: {
        levelNumber: true,
      },
    });

    return (lastLevel?.levelNumber ?? 0) + 1;
  }

  async create(data: {
    studyPlanId: string;
    nameAr: string;
    nameEn?: string;
    levelNumber: number;
  }, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertPlanAccess(data.studyPlanId, actor);
    const studyPlan = await this.prisma.studyPlan.findUnique({
      where: {
        id: data.studyPlanId,
      },
      select: {
        id: true,
      },
    });

    if (!studyPlan) {
      throw new NotFoundException(
        'الخطة الدراسية غير موجودة',
      );
    }

    const levelNumber = await this.resolveLevelNumber(
      data.studyPlanId,
      data.levelNumber,
    );

    return this.prisma.academicYear.create({
      data: {
        studyPlanId: data.studyPlanId,
        nameAr: data.nameAr.trim(),
        nameEn: data.nameEn?.trim(),
        levelNumber,
      },
    });
  }

  async update(
    id: string,
    data: {
      nameAr?: string;
      nameEn?: string;
      levelNumber?: number;
    },
    actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' },
  ) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!academicYear) {
      throw new NotFoundException(
        'Academic level not found',
      );
    }
    await this.assertPlanAccess(academicYear.studyPlanId, actor);

    const levelNumber =
      data.levelNumber !== undefined
        ? await this.resolveLevelNumber(
            academicYear.studyPlanId,
            data.levelNumber,
            id,
          )
        : undefined;

    return this.prisma.academicYear.update({
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
        ...(levelNumber !== undefined
          ? {
              levelNumber,
            }
          : {}),
      },
    });
  }

  async findAll(actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    const allowed = actor.role === 'ADVISOR'
      ? (await this.prisma.advisorProgramAssignment.findMany({ where: { advisorId: actor.id }, select: { programId: true } })).map((row) => row.programId)
      : null;
    return this.prisma.academicYear.findMany({
      ...(allowed ? { where: { studyPlan: { programId: { in: allowed } } } } : {}),
      orderBy: [
        {
          studyPlanId: 'asc',
        },
        {
          levelNumber: 'asc',
        },
      ],
    });
  }

  async findById(id: string, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    const level = await this.prisma.academicYear.findUnique({
      where: { id },
      select: { id: true, studyPlanId: true },
    });
    if (!level) return null;
    await this.assertPlanAccess(level.studyPlanId, actor);
    return this.prisma.academicYear.findUnique({ where: { id } });
  }

  async findByStudyPlan(studyPlanId: string, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertPlanAccess(studyPlanId, actor);
    return this.prisma.academicYear.findMany({
      where: {
        studyPlanId,
      },
      orderBy: {
        levelNumber: 'asc',
      },
    });
  }
}

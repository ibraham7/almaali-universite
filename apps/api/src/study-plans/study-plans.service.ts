import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StudyPlansService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private async assignedProgramIds(actor: { id: string; role: string }) {
    if (actor.role !== 'ADVISOR') return null;
    const rows = await this.prisma.advisorProgramAssignment.findMany({
      where: { advisorId: actor.id },
      select: { programId: true },
    });
    return rows.map((row) => row.programId);
  }

  private async assertProgramAccess(programId: string, actor: { id: string; role: string }) {
    const allowed = await this.assignedProgramIds(actor);
    if (allowed && !allowed.includes(programId)) {
      throw new ForbiddenException('لا تملك صلاحية إدارة هذا الاختصاص.');
    }
  }

  private async assertPlanAccess(id: string, actor: { id: string; role: string }) {
    const plan = await this.prisma.studyPlan.findUnique({ where: { id }, select: { id: true, programId: true } });
    if (!plan) throw new NotFoundException('الخطة الدراسية غير موجودة');
    await this.assertProgramAccess(plan.programId, actor);
    return plan;
  }

  async create(data: {
    programId: string;
    nameAr: string;
    nameEn?: string;
  }, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertProgramAccess(data.programId, actor);
    return this.prisma.studyPlan.create({
      data: {
        programId:
          data.programId,

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
    actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' },
  ) {
    await this.assertPlanAccess(id, actor);

    return this.prisma.studyPlan.update({
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

  async findAll(actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    const allowed = await this.assignedProgramIds(actor);
    return this.prisma.studyPlan.findMany({
      ...(allowed ? { where: { programId: { in: allowed } } } : {}),
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string, actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' }) {
    await this.assertPlanAccess(id, actor);
    return this.prisma.studyPlan.findUnique({ where: { id } });
  }

  async findByProgram(
    programId: string,
    actor: { id: string; role: string } = { id: '', role: 'SYSTEM_ADMIN' },
  ) {
    await this.assertProgramAccess(programId, actor);
    return this.prisma.studyPlan.findMany({
      where: {
        programId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import type { ProgramLevel } from '../generated/prisma/client.js';
import { assertSelectable } from '../academic-structure/active-structure.js';

export const PROGRAM_LEVELS: Record<ProgramLevel, { nameAr: string; nameEn: string }> = {
  BACHELOR: { nameAr: 'بكالوريوس', nameEn: 'Bachelor' },
  DIPLOMA: { nameAr: 'دبلوم', nameEn: 'Diploma' },
  MASTER: { nameAr: 'ماجستير', nameEn: 'Master' },
  DOCTORATE: { nameAr: 'دكتوراه', nameEn: 'Doctorate' },
};

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: {
    departmentId?: string;
    level?: string;
  }) {
    if (!data.departmentId) {
      throw new BadRequestException('اختر القسم/الاختصاص أولًا لإضافة البرنامج.');
    }
    const level = this.parseLevel(data.level);
    const department = await this.prisma.department.findUnique({
      where: { id: data.departmentId },
      select: { collegeId: true },
    });
    if (!department) throw new NotFoundException('القسم المحدد غير موجود.');
    await assertSelectable(this.prisma, { departmentId: data.departmentId });
    const exists = await this.prisma.program.findFirst({
      where: { departmentId: data.departmentId, level },
      select: { id: true },
    });
    if (exists) throw new BadRequestException(`برنامج ${PROGRAM_LEVELS[level].nameAr} موجود مسبقًا لهذا القسم.`);
    return this.prisma.program.create({
      data: {
        departmentId: data.departmentId,
        collegeId: department.collegeId,
        level,
        nameAr: PROGRAM_LEVELS[level].nameAr,
        nameEn: PROGRAM_LEVELS[level].nameEn,
      },
    });
  }

  async update(
    id: string,
    data: { level?: string; isActive?: boolean },
    actingUserId?: string,
  ) {
    const program = await this.prisma.program.findUnique({ where: { id }, include: { department: { include: { college: true } }, college: true } });
    if (!program) throw new NotFoundException('Program not found');
    const patch: { level?: ProgramLevel; nameAr?: string; nameEn?: string; isActive?: boolean } = {};
    if (data.level !== undefined) {
      const level = this.parseLevel(data.level);
      if (level !== program.level) {
        const exists = await this.prisma.program.findFirst({
          where: { departmentId: program.departmentId, level, NOT: { id } },
          select: { id: true },
        });
        if (exists) throw new BadRequestException(`برنامج ${PROGRAM_LEVELS[level].nameAr} موجود مسبقًا لهذا القسم.`);
        Object.assign(patch, { level, nameAr: PROGRAM_LEVELS[level].nameAr, nameEn: PROGRAM_LEVELS[level].nameEn });
      }
    }
    if (typeof data.isActive === 'boolean' && data.isActive !== program.isActive) {
      // لا يُفعَّل برنامج داخل قسم أو كلية معطّلة.
      if (data.isActive) {
        const parent = program.department && !program.department.isActive ? `قسم «${program.department.nameAr}»` : (program.department?.college ?? program.college)?.isActive === false ? `كلية «${(program.department?.college ?? program.college)!.nameAr}»` : null;
        if (parent) throw new BadRequestException(`فعّل ${parent} أولاً.`);
      }
      patch.isActive = data.isActive;
    }
    if (Object.keys(patch).length === 0) return program;
    const updated = await this.prisma.program.update({ where: { id }, data: patch });
    if (patch.isActive !== undefined) {
      await this.prisma.auditLog.create({ data: { action: patch.isActive ? 'PROGRAM_ENABLED' : 'PROGRAM_DISABLED', entity: 'Program', entityId: id, userId: actingUserId, details: JSON.stringify({ nameAr: program.nameAr }) } });
    }
    return updated;
  }

  private parseLevel(value?: string): ProgramLevel {
    if (!value || !(value in PROGRAM_LEVELS)) {
      throw new BadRequestException('اختر نوع البرنامج: بكالوريوس أو دبلوم أو ماجستير أو دكتوراه.');
    }
    return value as ProgramLevel;
  }

  async findAll() {
    return this.prisma.program.findMany({
      include: {
        college: true,
        department: {
          include: { college: true },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.program.findUnique({
      where: { id },
    });
  }

  async findByDepartment(
    departmentId: string,
  ) {
    return this.prisma.program.findMany({
      where: {
        departmentId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}

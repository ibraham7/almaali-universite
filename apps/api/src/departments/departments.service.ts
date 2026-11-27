import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { assertSelectable } from '../academic-structure/active-structure.js';

@Injectable()
export class DepartmentsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: {
    collegeId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    await assertSelectable(this.prisma, { collegeId: data.collegeId });
    return this.prisma.department.create({
      data: {
        collegeId:
          data.collegeId,

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
      isActive?: boolean;
    },
    actingUserId?: string,
  ) {
    const department =
      await this.prisma.department.findUnique({
        where: { id },
      });

    if (!department) {
      throw new NotFoundException(
        'Department not found',
      );
    }

    // لا يُفعَّل قسم داخل كلية معطّلة.
    if (data.isActive === true && !department.isActive) {
      const college = await this.prisma.college.findUnique({ where: { id: department.collegeId }, select: { nameAr: true, isActive: true } });
      if (college && !college.isActive) throw new BadRequestException(`فعّل كلية «${college.nameAr}» أولاً.`);
    }
    const updated = await this.prisma.department.update({
      where: { id },

      data: {
        ...(typeof data.isActive === 'boolean' ? { isActive: data.isActive } : {}),
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
    if (typeof data.isActive === 'boolean' && data.isActive !== department.isActive) {
      await this.prisma.auditLog.create({ data: { action: data.isActive ? 'DEPARTMENT_ENABLED' : 'DEPARTMENT_DISABLED', entity: 'Department', entityId: id, userId: actingUserId, details: JSON.stringify({ nameAr: department.nameAr }) } });
    }
    return updated;
  }

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
    });
  }

  async findByCollege(
    collegeId: string,
  ) {
    return this.prisma.department.findMany({
      where: {
        collegeId,
      },

      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
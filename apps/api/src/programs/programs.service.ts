import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProgramsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: {
    departmentId?: string;
    collegeId?: string;
    nameAr: string;
    nameEn?: string;
  }) {
    if (!data.departmentId && !data.collegeId) {
      throw new BadRequestException('اختر الكلية أو القسم لإنشاء الاختصاص.');
    }
    const department = data.departmentId
      ? await this.prisma.department.findUnique({ where: { id: data.departmentId }, select: { collegeId: true } })
      : null;
    if (data.departmentId && !department) {
      throw new NotFoundException('القسم المحدد غير موجود.');
    }
    const collegeId = department?.collegeId ?? data.collegeId;
    if (!collegeId) throw new NotFoundException('الكلية المحددة غير موجودة.');
    if (!department) {
      const college = await this.prisma.college.findUnique({ where: { id: collegeId }, select: { id: true } });
      if (!college) throw new NotFoundException('الكلية المحددة غير موجودة.');
    }
    return this.prisma.program.create({
      data: {
        departmentId: data.departmentId,
        collegeId,

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
    const program =
      await this.prisma.program.findUnique({
        where: { id },
      });

    if (!program) {
      throw new NotFoundException(
        'Program not found',
      );
    }

    return this.prisma.program.update({
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

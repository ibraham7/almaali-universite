import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

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
    },
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

    return this.prisma.department.update({
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
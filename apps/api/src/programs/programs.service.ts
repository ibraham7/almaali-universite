import {
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
    departmentId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.program.create({
      data: {
        departmentId:
          data.departmentId,

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
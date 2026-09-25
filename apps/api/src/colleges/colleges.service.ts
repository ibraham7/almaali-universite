import {
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
}
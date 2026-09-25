import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StudyPlansService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(data: {
    programId: string;
    nameAr: string;
    nameEn?: string;
  }) {
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
  ) {
    const studyPlan =
      await this.prisma.studyPlan.findUnique({
        where: { id },
      });

    if (!studyPlan) {
      throw new NotFoundException(
        'Study plan not found',
      );
    }

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

  async findAll() {
    return this.prisma.studyPlan.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.studyPlan.findUnique({
      where: { id },
    });
  }

  async findByProgram(
    programId: string,
  ) {
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
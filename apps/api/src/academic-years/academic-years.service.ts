import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AcademicYearsService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: {
    studyPlanId: string;
    nameAr: string;
    nameEn?: string;
    levelNumber: number;
  }) {
    return this.prisma.academicYear.create({
      data: {
        studyPlanId:
          data.studyPlanId,

        nameAr:
          data.nameAr.trim(),

        nameEn:
          data.nameEn?.trim(),

        levelNumber:
          data.levelNumber,
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
  ) {
    const academicYear =
      await this.prisma.academicYear.findUnique({
        where: { id },
      });

    if (!academicYear) {
      throw new NotFoundException(
        'Academic level not found',
      );
    }

    return this.prisma.academicYear.update({
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

        ...(data.levelNumber !== undefined
          ? {
            levelNumber:
              data.levelNumber,
          }
          : {}),
      },
    });
  }

  async findAll() {
    return this.prisma.academicYear.findMany({
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

  async findById(id: string) {
    return this.prisma.academicYear.findUnique({
      where: { id },
    });
  }

  async findByStudyPlan(
    studyPlanId: string,
  ) {
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
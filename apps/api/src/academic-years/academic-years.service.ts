import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AcademicYearsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

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
  }) {
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
  ) {
    const academicYear = await this.prisma.academicYear.findUnique({
      where: { id },
    });

    if (!academicYear) {
      throw new NotFoundException(
        'Academic level not found',
      );
    }

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

  async findByStudyPlan(studyPlanId: string) {
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

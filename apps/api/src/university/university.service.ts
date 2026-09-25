import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

interface UpdateUniversityData {
  nameAr?: string;
  nameEn?: string;

  minGpaForFutureYears?: number;

  allowedFutureYears?: number;

  requiredElectiveCredits?: number;
}

@Injectable()
export class UniversityService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async create(data: {
    nameAr: string;
    nameEn: string;
  }) {
    const nameAr =
      data.nameAr.trim();

    const nameEn =
      data.nameEn.trim();

    if (!nameAr) {
      throw new BadRequestException(
        'Arabic university name is required',
      );
    }

    if (!nameEn) {
      throw new BadRequestException(
        'English university name is required',
      );
    }

    return this.prisma.university.create({
      data: {
        nameAr,
        nameEn,
      },
    });
  }

  async findAll() {
    return this.prisma.university.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    const university =
      await this.prisma.university.findUnique({
        where: {
          id,
        },
      });

    if (!university) {
      throw new NotFoundException(
        'University not found',
      );
    }

    return university;
  }

  async update(
    id: string,
    data: UpdateUniversityData,
    actingUserId: string,
  ) {
    const university =
      await this.prisma.university.findUnique({
        where: {
          id,
        },
      });

    if (!university) {
      throw new NotFoundException(
        'University not found',
      );
    }

    if (
      data.nameAr !== undefined &&
      !data.nameAr.trim()
    ) {
      throw new BadRequestException(
        'Arabic university name cannot be empty',
      );
    }

    if (
      data.nameEn !== undefined &&
      !data.nameEn.trim()
    ) {
      throw new BadRequestException(
        'English university name cannot be empty',
      );
    }

    if (
      data.minGpaForFutureYears !== undefined
    ) {
      if (
        !Number.isFinite(
          data.minGpaForFutureYears,
        ) ||
        data.minGpaForFutureYears < 0
      ) {
        throw new BadRequestException(
          'Minimum GPA must be zero or greater',
        );
      }
    }

    if (
      data.allowedFutureYears !== undefined
    ) {
      if (
        !Number.isInteger(
          data.allowedFutureYears,
        ) ||
        data.allowedFutureYears < 0
      ) {
        throw new BadRequestException(
          'Allowed future levels must be a non-negative integer',
        );
      }
    }

    if (
      data.requiredElectiveCredits !==
      undefined
    ) {
      if (
        !Number.isInteger(
          data.requiredElectiveCredits,
        ) ||
        data.requiredElectiveCredits < 0
      ) {
        throw new BadRequestException(
          'Required elective credits must be a non-negative integer',
        );
      }
    }

    const updated =
      await this.prisma.university.update({
        where: {
          id,
        },

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
                  data.nameEn.trim(),
              }
            : {}),

          ...(data.minGpaForFutureYears !==
          undefined
            ? {
                minGpaForFutureYears:
                  data.minGpaForFutureYears,
              }
            : {}),

          ...(data.allowedFutureYears !==
          undefined
            ? {
                allowedFutureYears:
                  data.allowedFutureYears,
              }
            : {}),

          ...(data.requiredElectiveCredits !==
          undefined
            ? {
                requiredElectiveCredits:
                  data.requiredElectiveCredits,
              }
            : {}),
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action:
          'UNIVERSITY_SETTINGS_UPDATED',

        entity:
          'University',

        entityId:
          university.id,

        userId:
          actingUserId,

        details: JSON.stringify({
          before: {
            nameAr:
              university.nameAr,

            nameEn:
              university.nameEn,

            minGpaForFutureYears:
              String(
                university.minGpaForFutureYears,
              ),

            allowedFutureYears:
              university.allowedFutureYears,

            requiredElectiveCredits:
              university.requiredElectiveCredits,
          },

          after: {
            nameAr:
              updated.nameAr,

            nameEn:
              updated.nameEn,

            minGpaForFutureYears:
              String(
                updated.minGpaForFutureYears,
              ),

            allowedFutureYears:
              updated.allowedFutureYears,

            requiredElectiveCredits:
              updated.requiredElectiveCredits,
          },
        }),
      },
    });

    return updated;
  }
}
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

interface CreateGradeScaleInput {
  universityId: string;
  label: string;
  minScore: number;
  maxScore: number;
  gradePoint: number;
  passed: boolean;
  isActive?: boolean;
}

interface UpdateGradeScaleInput {
  label?: string;
  minScore?: number;
  maxScore?: number;
  gradePoint?: number;
  passed?: boolean;
  isActive?: boolean;
}

@Injectable()
export class GradeScalesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  private validateNumbers(
    minScore: number,
    maxScore: number,
    gradePoint: number,
  ) {
    if (
      !Number.isFinite(minScore) ||
      !Number.isFinite(maxScore) ||
      !Number.isFinite(gradePoint)
    ) {
      throw new BadRequestException(
        'Grade scale values must be valid numbers',
      );
    }

    if (minScore > maxScore) {
      throw new BadRequestException(
        'Minimum score cannot be greater than maximum score',
      );
    }

    if (gradePoint < 0) {
      throw new BadRequestException(
        'Grade point cannot be negative',
      );
    }
  }

  private async ensureNoOverlap(
    universityId: string,
    minScore: number,
    maxScore: number,
    excludeId?: string,
  ) {
    const overlap =
      await this.prisma.gradeScale.findFirst({
        where: {
          universityId,
          isActive: true,
          ...(excludeId
            ? {
                id: {
                  not: excludeId,
                },
              }
            : {}),
          minScore: {
            lte: maxScore,
          },
          maxScore: {
            gte: minScore,
          },
        },
      });

    if (overlap) {
      throw new BadRequestException(
        `Grade range overlaps with "${overlap.label}"`,
      );
    }
  }

  async findAll(universityId?: string) {
    return this.prisma.gradeScale.findMany({
      where: universityId
        ? {
            universityId,
          }
        : undefined,
      orderBy: [
        {
          minScore: 'desc',
        },
        {
          createdAt: 'asc',
        },
      ],
    });
  }

  async create(
    data: CreateGradeScaleInput,
    actingUserId: string,
  ) {
    const university =
      await this.prisma.university.findUnique({
        where: {
          id: data.universityId,
        },
      });

    if (!university) {
      throw new NotFoundException(
        'University not found',
      );
    }

    const label = data.label.trim();

    if (!label) {
      throw new BadRequestException(
        'Grade label is required',
      );
    }

    this.validateNumbers(
      data.minScore,
      data.maxScore,
      data.gradePoint,
    );

    const duplicateLabel =
      await this.prisma.gradeScale.findFirst({
        where: {
          universityId: data.universityId,
          label,
        },
      });

    if (duplicateLabel) {
      throw new BadRequestException(
        'Grade label already exists',
      );
    }

    if (data.isActive !== false) {
      await this.ensureNoOverlap(
        data.universityId,
        data.minScore,
        data.maxScore,
      );
    }

    const created =
      await this.prisma.gradeScale.create({
        data: {
          universityId: data.universityId,
          label,
          minScore: data.minScore,
          maxScore: data.maxScore,
          gradePoint: data.gradePoint,
          passed: data.passed,
          isActive: data.isActive ?? true,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'GRADE_SCALE_CREATED',
        entity: 'GradeScale',
        entityId: created.id,
        userId: actingUserId,
        details: JSON.stringify({
          universityId: created.universityId,
          label: created.label,
          minScore: String(created.minScore),
          maxScore: String(created.maxScore),
          gradePoint: String(created.gradePoint),
          passed: created.passed,
          isActive: created.isActive,
        }),
      },
    });

    return created;
  }

  async update(
    id: string,
    data: UpdateGradeScaleInput,
    actingUserId: string,
  ) {
    const current =
      await this.prisma.gradeScale.findUnique({
        where: {
          id,
        },
      });

    if (!current) {
      throw new NotFoundException(
        'Grade scale not found',
      );
    }

    const label =
      data.label !== undefined
        ? data.label.trim()
        : current.label;

    if (!label) {
      throw new BadRequestException(
        'Grade label is required',
      );
    }

    const minScore =
      data.minScore ??
      Number(current.minScore);

    const maxScore =
      data.maxScore ??
      Number(current.maxScore);

    const gradePoint =
      data.gradePoint ??
      Number(current.gradePoint);

    const isActive =
      data.isActive ??
      current.isActive;

    this.validateNumbers(
      minScore,
      maxScore,
      gradePoint,
    );

    const duplicateLabel =
      await this.prisma.gradeScale.findFirst({
        where: {
          universityId: current.universityId,
          label,
          id: {
            not: id,
          },
        },
      });

    if (duplicateLabel) {
      throw new BadRequestException(
        'Grade label already exists',
      );
    }

    if (isActive) {
      await this.ensureNoOverlap(
        current.universityId,
        minScore,
        maxScore,
        id,
      );
    }

    const updated =
      await this.prisma.gradeScale.update({
        where: {
          id,
        },
        data: {
          label,
          minScore,
          maxScore,
          gradePoint,
          passed:
            data.passed ??
            current.passed,
          isActive,
        },
      });

    await this.prisma.auditLog.create({
      data: {
        action: 'GRADE_SCALE_UPDATED',
        entity: 'GradeScale',
        entityId: updated.id,
        userId: actingUserId,
        details: JSON.stringify({
          before: {
            label: current.label,
            minScore: String(current.minScore),
            maxScore: String(current.maxScore),
            gradePoint: String(current.gradePoint),
            passed: current.passed,
            isActive: current.isActive,
          },
          after: {
            label: updated.label,
            minScore: String(updated.minScore),
            maxScore: String(updated.maxScore),
            gradePoint: String(updated.gradePoint),
            passed: updated.passed,
            isActive: updated.isActive,
          },
        }),
      },
    });

    return updated;
  }

  async remove(
    id: string,
    actingUserId: string,
  ) {
    const current =
      await this.prisma.gradeScale.findUnique({
        where: {
          id,
        },
      });

    if (!current) {
      throw new NotFoundException(
        'Grade scale not found',
      );
    }

    const resultCount =
      await this.prisma.courseResult.count({
        where: {
          gradeScaleId: id,
        },
      });

    if (resultCount > 0) {
      throw new BadRequestException(
        'This grade scale is already used by course results. Disable it instead of deleting it.',
      );
    }

    await this.prisma.gradeScale.delete({
      where: {
        id,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        action: 'GRADE_SCALE_DELETED',
        entity: 'GradeScale',
        entityId: id,
        userId: actingUserId,
        details: JSON.stringify({
          label: current.label,
          universityId: current.universityId,
        }),
      },
    });

    return {
      success: true,
      message: 'Grade scale deleted successfully',
    };
  }
}

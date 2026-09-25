import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SemestersService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  async create(data: {
    academicYearId: string;

    nameAr: string;

    nameEn?: string;

    semesterNumber: number;

    requireMandatoryCourses?: boolean;
  }) {
    return this.prisma.semester.create({
      data: {
        academicYearId:
          data.academicYearId,

        nameAr:
          data.nameAr.trim(),

        nameEn:
          data.nameEn?.trim(),

        semesterNumber:
          data.semesterNumber,

        requireMandatoryCourses:
          data.requireMandatoryCourses ??
          false,
      },
    });
  }

  async update(
    id: string,
    data: {
      nameAr?: string;

      nameEn?: string;

      semesterNumber?: number;

      requireMandatoryCourses?: boolean;
    },
  ) {
    const semester =
      await this.prisma.semester.findUnique({
        where: { id },
      });

    if (!semester) {
      throw new NotFoundException(
        'Semester not found',
      );
    }

    return this.prisma.semester.update({
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

        ...(data.semesterNumber !==
          undefined
          ? {
            semesterNumber:
              data.semesterNumber,
          }
          : {}),

        ...(data.requireMandatoryCourses !==
          undefined
          ? {
            requireMandatoryCourses:
              data.requireMandatoryCourses,
          }
          : {}),
      },
    });
  }

  async findAll() {
    return this.prisma.semester.findMany({
      orderBy: [
        {
          academicYearId: 'asc',
        },
        {
          semesterNumber: 'asc',
        },
      ],
    });
  }

  async findById(id: string) {
    return this.prisma.semester.findUnique({
      where: { id },
    });
  }

  async findByAcademicYear(
    academicYearId: string,
  ) {
    return this.prisma.semester.findMany({
      where: {
        academicYearId,
      },

      orderBy: {
        semesterNumber: 'asc',
      },
    });
  }
}
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SemestersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    academicYearId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.semester.create({
      data: {
        academicYearId: data.academicYearId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
      },
    });
  }

  async findAll() {
    return this.prisma.semester.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.semester.findUnique({
      where: { id },
    });
  }

  async findByAcademicYear(academicYearId: string) {
    return this.prisma.semester.findMany({
      where: {
        academicYearId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
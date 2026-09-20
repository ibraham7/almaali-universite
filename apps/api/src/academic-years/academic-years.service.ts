import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AcademicYearsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    studyPlanId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.academicYear.create({
      data: {
        studyPlanId: data.studyPlanId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
      },
    });
  }

  async findAll() {
    return this.prisma.academicYear.findMany({
      orderBy: {
        createdAt: 'asc',
      },
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
        createdAt: 'asc',
      },
    });
  }
}
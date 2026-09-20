import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class StudyPlansService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    programId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.studyPlan.create({
      data: {
        programId: data.programId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
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

  async findByProgram(programId: string) {
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
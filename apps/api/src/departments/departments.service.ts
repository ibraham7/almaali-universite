import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DepartmentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    collegeId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.department.create({
      data: {
        collegeId: data.collegeId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
      },
    });
  }

  async findAll() {
    return this.prisma.department.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.department.findUnique({
      where: { id },
    });
  }

  async findByCollege(collegeId: string) {
    return this.prisma.department.findMany({
      where: {
        collegeId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
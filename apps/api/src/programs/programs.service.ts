import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ProgramsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    departmentId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.program.create({
      data: {
        departmentId: data.departmentId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
      },
    });
  }

  async findAll() {
    return this.prisma.program.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.program.findUnique({
      where: { id },
    });
  }

  async findByDepartment(departmentId: string) {
    return this.prisma.program.findMany({
      where: {
        departmentId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
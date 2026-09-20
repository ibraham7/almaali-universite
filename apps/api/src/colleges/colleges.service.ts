import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CollegesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    universityId: string;
    nameAr: string;
    nameEn?: string;
  }) {
    return this.prisma.college.create({
      data: {
        universityId: data.universityId,
        nameAr: data.nameAr,
        nameEn: data.nameEn,
      },
    });
  }

  async findAll() {
    return this.prisma.college.findMany({
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.college.findUnique({
      where: { id },
    });
  }

  async findByUniversity(universityId: string) {
    return this.prisma.college.findMany({
      where: {
        universityId,
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
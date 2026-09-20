import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class UniversityService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    nameAr: string;
    nameEn: string;
  }) {
    return this.prisma.university.create({
      data: {
        nameAr: data.nameAr,
        nameEn: data.nameEn,
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
    return this.prisma.university.findUnique({
      where: { id },
    });
  }
}
import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class CollegesService {
  constructor(
    private readonly prisma: PrismaService,
  ) { }

  // رمز الكلية: رقمان بالضبط (جزء من الرقم الجامعي)
  private async validCode(code: string | null | undefined, universityId: string, excludeId?: string) {
    const value = code?.trim();
    if (!value) return null;
    if (!/^\d{2}$/.test(value)) throw new BadRequestException('رمز الكلية: أدخل رقمين بالضبط (مثل 01).');
    const taken = await this.prisma.college.findFirst({
      where: { universityId, code: value, ...(excludeId ? { id: { not: excludeId } } : {}) },
      select: { nameAr: true },
    });
    if (taken) throw new ConflictException(`رمز الكلية ${value} مستخدم لكلية «${taken.nameAr}».`);
    return value;
  }

  async create(data: {
    universityId: string;
    nameAr: string;
    nameEn?: string;
    code?: string;
  }) {
    if (!data.code?.trim()) throw new BadRequestException('رمز الكلية: مطلوب (رقمان، مثل 01). يدخل في الرقم الجامعي.');
    const code = await this.validCode(data.code, data.universityId);
    return this.prisma.college.create({
      data: {
        code,
        universityId:
          data.universityId,

        nameAr:
          data.nameAr.trim(),

        nameEn:
          data.nameEn?.trim(),
      },
    });
  }

  async update(
    id: string,
    data: {
      nameAr?: string;
      nameEn?: string;
      code?: string | null;
    },
  ) {
    const college =
      await this.prisma.college.findUnique({
        where: { id },
      });

    if (!college) {
      throw new NotFoundException(
        'College not found',
      );
    }

    const code = data.code !== undefined ? await this.validCode(data.code, college.universityId, id) : undefined;

    return this.prisma.college.update({
      where: { id },

      data: {
        ...(code !== undefined ? { code } : {}),
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

  async findByUniversity(
    universityId: string,
  ) {
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

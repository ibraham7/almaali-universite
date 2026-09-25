import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

type CreateTeacherInput = {
  name: string;
  email?: string | null;
  phone?: string | null;
};

type UpdateTeacherInput = Partial<CreateTeacherInput>;

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeRequired(
    value: string,
    fieldName: string,
  ) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(
        `${fieldName} مطلوب.`,
      );
    }

    return normalized;
  }

  private normalizeOptional(
    value?: string | null,
  ) {
    if (value === undefined) return undefined;
    if (value === null) return null;

    const normalized = value.trim();
    return normalized || null;
  }

  async create(input: CreateTeacherInput) {
    const teacher = await this.prisma.teacher.create({
      data: {
        name: this.normalizeRequired(
          input.name,
          'اسم المدرس',
        ),
        email: this.normalizeOptional(input.email),
        phone: this.normalizeOptional(input.phone),
      },
    });

    return {
      success: true,
      teacher,
    };
  }

  async findAll() {
    const teachers = await this.prisma.teacher.findMany({
      include: {
        _count: {
          select: {
            sections: true,
          },
        },
      },
      orderBy: {
        name: 'asc',
      },
    });

    return {
      success: true,
      count: teachers.length,
      teachers,
    };
  }

  async findOne(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      include: {
        sections: {
          include: {
            course: true,
            classroom: true,
            schedules: {
              orderBy: [
                { day: 'asc' },
                { startTime: 'asc' },
              ],
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('المدرس غير موجود.');
    }

    return {
      success: true,
      teacher,
    };
  }

  async update(
    id: string,
    input: UpdateTeacherInput,
  ) {
    const existing = await this.prisma.teacher.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!existing) {
      throw new NotFoundException('المدرس غير موجود.');
    }

    const teacher = await this.prisma.teacher.update({
      where: { id },
      data: {
        ...(input.name !== undefined
          ? {
              name: this.normalizeRequired(
                input.name,
                'اسم المدرس',
              ),
            }
          : {}),
        ...(input.email !== undefined
          ? {
              email: this.normalizeOptional(
                input.email,
              ),
            }
          : {}),
        ...(input.phone !== undefined
          ? {
              phone: this.normalizeOptional(
                input.phone,
              ),
            }
          : {}),
      },
    });

    return {
      success: true,
      teacher,
    };
  }

  async remove(id: string) {
    const teacher = await this.prisma.teacher.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            sections: true,
          },
        },
      },
    });

    if (!teacher) {
      throw new NotFoundException('المدرس غير موجود.');
    }

    if (teacher._count.sections > 0) {
      throw new BadRequestException(
        'لا يمكن حذف مدرس مرتبط بشعب دراسية. أزل ارتباطه بالشعب أولًا.',
      );
    }

    await this.prisma.teacher.delete({
      where: { id },
    });

    return {
      success: true,
      removedTeacher: {
        id: teacher.id,
        name: teacher.name,
      },
    };
  }
}

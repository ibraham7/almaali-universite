import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

type CreateClassroomInput = {
  name: string;
  capacity?: number | null;
};

type UpdateClassroomInput = Partial<CreateClassroomInput>;

@Injectable()
export class ClassroomsService {
  constructor(private readonly prisma: PrismaService) {}

  private normalizeName(value: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException(
        'اسم القاعة مطلوب.',
      );
    }

    return normalized;
  }

  private validateCapacity(
    capacity?: number | null,
  ) {
    if (
      capacity !== undefined &&
      capacity !== null &&
      (!Number.isInteger(capacity) || capacity < 1)
    ) {
      throw new BadRequestException(
        'سعة القاعة يجب أن تكون عددًا صحيحًا أكبر من صفر.',
      );
    }
  }

  async create(input: CreateClassroomInput) {
    this.validateCapacity(input.capacity);

    const classroom =
      await this.prisma.classroom.create({
        data: {
          name: this.normalizeName(input.name),
          capacity: input.capacity ?? null,
        },
      });

    return {
      success: true,
      classroom,
    };
  }

  async findAll() {
    const classrooms =
      await this.prisma.classroom.findMany({
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
      count: classrooms.length,
      classrooms,
    };
  }

  async findOne(id: string) {
    const classroom =
      await this.prisma.classroom.findUnique({
        where: { id },
        include: {
          sections: {
            include: {
              course: true,
              teacher: true,
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

    if (!classroom) {
      throw new NotFoundException('القاعة غير موجودة.');
    }

    return {
      success: true,
      classroom,
    };
  }

  async update(
    id: string,
    input: UpdateClassroomInput,
  ) {
    const existing =
      await this.prisma.classroom.findUnique({
        where: { id },
        include: {
          sections: {
            select: {
              id: true,
              maxCapacity: true,
            },
          },
        },
      });

    if (!existing) {
      throw new NotFoundException('القاعة غير موجودة.');
    }

    if (input.capacity !== undefined) {
      this.validateCapacity(input.capacity);

      if (input.capacity !== null) {
        const oversizedSection =
          existing.sections.find(
            (section) =>
              section.maxCapacity > input.capacity!,
          );

        if (oversizedSection) {
          throw new BadRequestException(
            'لا يمكن تقليل سعة القاعة إلى أقل من سعة إحدى الشعب المرتبطة بها.',
          );
        }
      }
    }

    const classroom =
      await this.prisma.classroom.update({
        where: { id },
        data: {
          ...(input.name !== undefined
            ? {
                name: this.normalizeName(
                  input.name,
                ),
              }
            : {}),
          ...(input.capacity !== undefined
            ? {
                capacity: input.capacity,
              }
            : {}),
        },
      });

    return {
      success: true,
      classroom,
    };
  }

  async remove(id: string) {
    const classroom =
      await this.prisma.classroom.findUnique({
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

    if (!classroom) {
      throw new NotFoundException('القاعة غير موجودة.');
    }

    if (classroom._count.sections > 0) {
      throw new BadRequestException(
        'لا يمكن حذف قاعة مرتبطة بشعب دراسية. أزل ارتباطها بالشعب أولًا.',
      );
    }

    await this.prisma.classroom.delete({
      where: { id },
    });

    return {
      success: true,
      removedClassroom: {
        id: classroom.id,
        name: classroom.name,
      },
    };
  }
}

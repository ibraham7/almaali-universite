import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { SectionStatus } from '../generated/prisma/enums.js';

type ScheduleInput = {
  day: string;
  startTime: string;
  endTime: string;
};

type CreateCourseSectionInput = {
  sectionNumber: string;
  courseId: string;
  semesterId: string;
  teacherId?: string | null;
  classroomId?: string | null;
  maxCapacity: number;
  minEnrollment?: number | null;
  status?: SectionStatus;
  schedules?: ScheduleInput[];
};

type UpdateCourseSectionInput = Partial<
  Omit<CreateCourseSectionInput, 'schedules'>
> & {
  schedules?: ScheduleInput[];
};

@Injectable()
export class CourseSectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private readonly include = {
    course: true,
    teacher: true,
    classroom: true,
    schedules: {
      orderBy: [
        { day: 'asc' as const },
        { startTime: 'asc' as const },
      ],
    },
  };

  private normalizeSectionNumber(value: string) {
    const normalized = value.trim();

    if (!normalized) {
      throw new BadRequestException('رقم الشعبة مطلوب.');
    }

    return normalized;
  }

  private validateCapacity(
    maxCapacity: number,
    minEnrollment?: number | null,
    enrolledCount = 0,
  ) {
    if (!Number.isInteger(maxCapacity) || maxCapacity < 1) {
      throw new BadRequestException(
        'الحد الأعلى لسعة الشعبة يجب أن يكون عددًا صحيحًا أكبر من صفر.',
      );
    }

    if (
      minEnrollment !== undefined &&
      minEnrollment !== null &&
      (!Number.isInteger(minEnrollment) || minEnrollment < 0)
    ) {
      throw new BadRequestException(
        'الحد الأدنى لعدد الطلاب يجب أن يكون عددًا صحيحًا غير سالب.',
      );
    }

    if (
      minEnrollment !== undefined &&
      minEnrollment !== null &&
      minEnrollment > maxCapacity
    ) {
      throw new BadRequestException(
        'الحد الأدنى لعدد الطلاب لا يمكن أن يتجاوز سعة الشعبة.',
      );
    }

    if (maxCapacity < enrolledCount) {
      throw new BadRequestException(
        `لا يمكن جعل سعة الشعبة أقل من عدد الطلاب المسجلين حاليًا (${enrolledCount}).`,
      );
    }
  }

  private validateTime(value: string, fieldName: string) {
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw new BadRequestException(
        `${fieldName} يجب أن يكون بصيغة HH:MM مثل 09:30.`,
      );
    }
  }

  private normalizeSchedules(schedules: ScheduleInput[]) {
    const normalized = schedules.map((schedule) => {
      const day = schedule.day.trim();

      if (!day) {
        throw new BadRequestException('يوم المحاضرة مطلوب.');
      }

      this.validateTime(schedule.startTime, 'وقت البداية');
      this.validateTime(schedule.endTime, 'وقت النهاية');

      if (schedule.startTime >= schedule.endTime) {
        throw new BadRequestException(
          `وقت نهاية المحاضرة يجب أن يكون بعد وقت البداية في يوم ${day}.`,
        );
      }

      return {
        day,
        startTime: schedule.startTime,
        endTime: schedule.endTime,
      };
    });

    const keys = new Set<string>();

    for (const schedule of normalized) {
      const key = `${schedule.day}|${schedule.startTime}|${schedule.endTime}`;

      if (keys.has(key)) {
        throw new BadRequestException(
          'يوجد موعد مكرر داخل جدول الشعبة.',
        );
      }

      keys.add(key);
    }

    return normalized;
  }

  private async validateReferences(input: {
    courseId: string;
    semesterId: string;
    teacherId?: string | null;
    classroomId?: string | null;
  }) {
    const [course, semester, teacher, classroom] =
      await Promise.all([
        this.prisma.course.findUnique({
          where: { id: input.courseId },
          select: { id: true, status: true },
        }),
        this.prisma.semester.findUnique({
          where: { id: input.semesterId },
          select: { id: true },
        }),
        input.teacherId
          ? this.prisma.teacher.findUnique({
              where: { id: input.teacherId },
              select: { id: true },
            })
          : Promise.resolve(null),
        input.classroomId
          ? this.prisma.classroom.findUnique({
              where: { id: input.classroomId },
              select: { id: true, capacity: true },
            })
          : Promise.resolve(null),
      ]);

    if (!course) {
      throw new NotFoundException('المقرر غير موجود.');
    }

    if (course.status !== 'ACTIVE') {
      throw new BadRequestException(
        'لا يمكن إنشاء شعبة لمقرر غير نشط.',
      );
    }

    if (!semester) {
      throw new NotFoundException('الفصل الدراسي غير موجود.');
    }

    if (input.teacherId && !teacher) {
      throw new NotFoundException('المدرس غير موجود.');
    }

    if (input.classroomId && !classroom) {
      throw new NotFoundException('القاعة غير موجودة.');
    }

    return { classroom };
  }

  private async ensureUniqueSection(
    courseId: string,
    semesterId: string,
    sectionNumber: string,
    excludeId?: string,
  ) {
    const existing =
      await this.prisma.courseSection.findFirst({
        where: {
          courseId,
          semesterId,
          sectionNumber,
          ...(excludeId
            ? {
                id: {
                  not: excludeId,
                },
              }
            : {}),
        },
        select: { id: true },
      });

    if (existing) {
      throw new ConflictException(
        'رقم الشعبة مستخدم بالفعل لهذا المقرر في هذا الفصل.',
      );
    }
  }

  async create(input: CreateCourseSectionInput) {
    const sectionNumber =
      this.normalizeSectionNumber(input.sectionNumber);

    this.validateCapacity(
      input.maxCapacity,
      input.minEnrollment,
    );

    const schedules = this.normalizeSchedules(
      input.schedules ?? [],
    );

    const { classroom } =
      await this.validateReferences(input);

    if (
      classroom?.capacity !== null &&
      classroom?.capacity !== undefined &&
      input.maxCapacity > classroom.capacity
    ) {
      throw new BadRequestException(
        `سعة الشعبة (${input.maxCapacity}) أكبر من سعة القاعة (${classroom.capacity}).`,
      );
    }

    await this.ensureUniqueSection(
      input.courseId,
      input.semesterId,
      sectionNumber,
    );

    const section =
      await this.prisma.courseSection.create({
        data: {
          sectionNumber,
          courseId: input.courseId,
          semesterId: input.semesterId,
          teacherId: input.teacherId ?? null,
          classroomId: input.classroomId ?? null,
          maxCapacity: input.maxCapacity,
          minEnrollment:
            input.minEnrollment ?? null,
          status: input.status ?? SectionStatus.OPEN,
          schedules:
            schedules.length > 0
              ? {
                  create: schedules,
                }
              : undefined,
        },
        include: this.include,
      });

    return {
      success: true,
      section,
    };
  }

  async findAll(filters?: {
    semesterId?: string;
    courseId?: string;
  }) {
    const sections =
      await this.prisma.courseSection.findMany({
        where: {
          ...(filters?.semesterId
            ? { semesterId: filters.semesterId }
            : {}),
          ...(filters?.courseId
            ? { courseId: filters.courseId }
            : {}),
        },
        include: this.include,
        orderBy: [
          { course: { code: 'asc' } },
          { sectionNumber: 'asc' },
        ],
      });

    return {
      success: true,
      count: sections.length,
      sections,
    };
  }

  async findOne(id: string) {
    const section =
      await this.prisma.courseSection.findUnique({
        where: { id },
        include: this.include,
      });

    if (!section) {
      throw new NotFoundException('الشعبة غير موجودة.');
    }

    return {
      success: true,
      section,
    };
  }

  async update(
    id: string,
    input: UpdateCourseSectionInput,
  ) {
    const existing =
      await this.prisma.courseSection.findUnique({
        where: { id },
        include: {
          classroom: true,
        },
      });

    if (!existing) {
      throw new NotFoundException('الشعبة غير موجودة.');
    }

    const sectionNumber =
      input.sectionNumber !== undefined
        ? this.normalizeSectionNumber(
            input.sectionNumber,
          )
        : existing.sectionNumber;

    const courseId =
      input.courseId ?? existing.courseId;

    const semesterId =
      input.semesterId ?? existing.semesterId;

    const teacherId =
      input.teacherId !== undefined
        ? input.teacherId
        : existing.teacherId;

    const classroomId =
      input.classroomId !== undefined
        ? input.classroomId
        : existing.classroomId;

    const maxCapacity =
      input.maxCapacity ?? existing.maxCapacity;

    const minEnrollment =
      input.minEnrollment !== undefined
        ? input.minEnrollment
        : existing.minEnrollment;

    this.validateCapacity(
      maxCapacity,
      minEnrollment,
      existing.enrolledCount,
    );

    const { classroom } =
      await this.validateReferences({
        courseId,
        semesterId,
        teacherId,
        classroomId,
      });

    if (
      classroom?.capacity !== null &&
      classroom?.capacity !== undefined &&
      maxCapacity > classroom.capacity
    ) {
      throw new BadRequestException(
        `سعة الشعبة (${maxCapacity}) أكبر من سعة القاعة (${classroom.capacity}).`,
      );
    }

    await this.ensureUniqueSection(
      courseId,
      semesterId,
      sectionNumber,
      id,
    );

    const schedules =
      input.schedules !== undefined
        ? this.normalizeSchedules(input.schedules)
        : undefined;

    const section =
      await this.prisma.$transaction(async (tx) => {
        if (schedules !== undefined) {
          await tx.sectionSchedule.deleteMany({
            where: { sectionId: id },
          });
        }

        return tx.courseSection.update({
          where: { id },
          data: {
            sectionNumber,
            courseId,
            semesterId,
            teacherId,
            classroomId,
            maxCapacity,
            minEnrollment,
            status:
              input.status ?? existing.status,
            ...(schedules !== undefined
              ? {
                  schedules: {
                    create: schedules,
                  },
                }
              : {}),
          },
          include: this.include,
        });
      });

    return {
      success: true,
      section,
    };
  }

  async remove(id: string) {
    const section =
      await this.prisma.courseSection.findUnique({
        where: { id },
        select: {
          id: true,
          sectionNumber: true,
          enrolledCount: true,
          course: {
            select: {
              code: true,
              nameAr: true,
            },
          },
          _count: {
            select: {
              enrollmentItems: true,
            },
          },
        },
      });

    if (!section) {
      throw new NotFoundException('الشعبة غير موجودة.');
    }

    if (
      section.enrolledCount > 0 ||
      section._count.enrollmentItems > 0
    ) {
      throw new BadRequestException(
        'لا يمكن حذف شعبة تحتوي على طلاب مسجلين. أغلق الشعبة بدلًا من حذفها.',
      );
    }

    await this.prisma.courseSection.delete({
      where: { id },
    });

    return {
      success: true,
      removedSection: {
        id: section.id,
        sectionNumber: section.sectionNumber,
        course: section.course,
      },
    };
  }
}

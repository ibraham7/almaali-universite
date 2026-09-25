import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRegistrationPeriodDto } from './dto/create-registration-period.dto.js';

type UpdateRegistrationPeriodDto = Partial<CreateRegistrationPeriodDto>;

@Injectable()
export class RegistrationPeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  private parseDate(value: string | Date, fieldName: string) {
    const date = value instanceof Date ? value : new Date(value);

    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException(`${fieldName} غير صالح`);
    }

    return date;
  }

  private validateCredits(
    minCredits: number | null | undefined,
    maxCredits: number | null | undefined,
  ) {
    if (minCredits == null) {
      throw new BadRequestException(
        'الحد الأدنى للساعات مطلوب',
      );
    }

    if (maxCredits == null) {
      throw new BadRequestException(
        'الحد الأقصى للساعات مطلوب',
      );
    }

    if (!Number.isInteger(minCredits) || minCredits < 0) {
      throw new BadRequestException(
        'الحد الأدنى للساعات يجب أن يكون عددًا صحيحًا غير سالب',
      );
    }

    if (!Number.isInteger(maxCredits) || maxCredits < 1) {
      throw new BadRequestException(
        'الحد الأقصى للساعات يجب أن يكون عددًا صحيحًا أكبر من صفر',
      );
    }

    if (minCredits > maxCredits) {
      throw new BadRequestException(
        'الحد الأدنى للساعات لا يمكن أن يكون أكبر من الحد الأقصى',
      );
    }
  }

  private validateDates(
    startDateTime: Date,
    endDateTime: Date,
    addDropDeadline?: Date | null,
  ) {
    if (endDateTime <= startDateTime) {
      throw new BadRequestException(
        'نهاية فترة التسجيل يجب أن تكون بعد بدايتها',
      );
    }

    if (addDropDeadline && addDropDeadline < startDateTime) {
      throw new BadRequestException(
        'موعد انتهاء الإضافة والحذف لا يمكن أن يكون قبل بداية فترة التسجيل',
      );
    }
  }

  private async ensureSemesterExists(semesterId: string) {
    const semester = await this.prisma.semester.findUnique({
      where: { id: semesterId },
    });

    if (!semester) {
      throw new NotFoundException('الفصل الدراسي غير موجود');
    }
  }

  async create(dto: CreateRegistrationPeriodDto) {
    await this.ensureSemesterExists(dto.semesterId);

    const startDateTime = this.parseDate(
      dto.startDateTime,
      'تاريخ بداية التسجيل',
    );

    const endDateTime = this.parseDate(
      dto.endDateTime,
      'تاريخ نهاية التسجيل',
    );

    const addDropDeadline = dto.addDropDeadline
      ? this.parseDate(
          dto.addDropDeadline,
          'موعد انتهاء الإضافة والحذف',
        )
      : null;

    this.validateCredits(dto.minCredits, dto.maxCredits);

    if (dto.minCredits == null || dto.maxCredits == null) {
      throw new BadRequestException(
        'الحد الأدنى والأقصى للساعات مطلوبان',
      );
    }

    this.validateDates(
      startDateTime,
      endDateTime,
      addDropDeadline,
    );

    return this.prisma.registrationPeriod.create({
      data: {
        semesterId: dto.semesterId,
        startDateTime,
        endDateTime,
        minCredits: dto.minCredits,
        maxCredits: dto.maxCredits,
        advisorApprovalRequired:
          dto.advisorApprovalRequired,
        dropAllowed: dto.dropAllowed,
        addDropDeadline,
      },
    });
  }

  async findAll() {
    return this.prisma.registrationPeriod.findMany({
      orderBy: {
        startDateTime: 'desc',
      },
    });
  }

  async findBySemester(semesterId: string) {
    await this.ensureSemesterExists(semesterId);

    return this.prisma.registrationPeriod.findMany({
      where: {
        semesterId,
      },
      orderBy: {
        startDateTime: 'desc',
      },
    });
  }

  async findOne(id: string) {
    const period =
      await this.prisma.registrationPeriod.findUnique({
        where: { id },
      });

    if (!period) {
      throw new NotFoundException(
        'فترة التسجيل غير موجودة',
      );
    }

    return period;
  }

  async update(
    id: string,
    dto: UpdateRegistrationPeriodDto,
  ) {
    const current = await this.findOne(id);

    const semesterId =
      dto.semesterId ?? current.semesterId;

    await this.ensureSemesterExists(semesterId);

    const startDateTime = dto.startDateTime
      ? this.parseDate(
          dto.startDateTime,
          'تاريخ بداية التسجيل',
        )
      : current.startDateTime;

    const endDateTime = dto.endDateTime
      ? this.parseDate(
          dto.endDateTime,
          'تاريخ نهاية التسجيل',
        )
      : current.endDateTime;

    const addDropDeadline =
      dto.addDropDeadline === undefined
        ? current.addDropDeadline
        : dto.addDropDeadline
          ? this.parseDate(
              dto.addDropDeadline,
              'موعد انتهاء الإضافة والحذف',
            )
          : null;

    const minCredits =
      dto.minCredits ?? current.minCredits;

    const maxCredits =
      dto.maxCredits ?? current.maxCredits;

    this.validateCredits(minCredits, maxCredits);

    if (minCredits == null || maxCredits == null) {
      throw new BadRequestException(
        'الحد الأدنى والأقصى للساعات مطلوبان',
      );
    }

    this.validateDates(
      startDateTime,
      endDateTime,
      addDropDeadline,
    );

    return this.prisma.registrationPeriod.update({
      where: { id },
      data: {
        semesterId,
        startDateTime,
        endDateTime,
        minCredits,
        maxCredits,
        advisorApprovalRequired:
          dto.advisorApprovalRequired ??
          current.advisorApprovalRequired,
        dropAllowed:
          dto.dropAllowed ?? current.dropAllowed,
        addDropDeadline,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);

    await this.prisma.registrationPeriod.delete({
      where: { id },
    });

    return {
      success: true,
      message: 'تم حذف فترة التسجيل بنجاح',
    };
  }
}

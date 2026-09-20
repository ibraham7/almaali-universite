import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateRegistrationPeriodDto } from './dto/create-registration-period.dto.js';

@Injectable()
export class RegistrationPeriodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateRegistrationPeriodDto) {
    return this.prisma.registrationPeriod.create({
      data: {
        semesterId: dto.semesterId,
        startDateTime: new Date(dto.startDateTime),
        endDateTime: new Date(dto.endDateTime),
        minCredits: dto.minCredits,
        maxCredits: dto.maxCredits,
        advisorApprovalRequired: dto.advisorApprovalRequired,
        dropAllowed: dto.dropAllowed,
        addDropDeadline: dto.addDropDeadline
          ? new Date(dto.addDropDeadline)
          : undefined,
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
    return this.prisma.registrationPeriod.findMany({
      where: {
        semesterId,
      },
      orderBy: {
        startDateTime: 'desc',
      },
    });
  }
}
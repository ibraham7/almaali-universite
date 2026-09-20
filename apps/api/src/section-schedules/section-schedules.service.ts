import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateSectionScheduleDto } from './dto/create-section-schedule.dto.js';

@Injectable()
export class SectionSchedulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateSectionScheduleDto) {
    return this.prisma.sectionSchedule.create({
      data: {
        sectionId: dto.sectionId,
        day: dto.day,
        startTime: dto.startTime,
        endTime: dto.endTime,
      },
    });
  }

  async findBySection(sectionId: string) {
    return this.prisma.sectionSchedule.findMany({
      where: {
        sectionId,
      },
      orderBy: {
        startTime: 'asc',
      },
    });
  }
}
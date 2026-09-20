import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SectionSchedulesService } from './section-schedules.service.js';
import { CreateSectionScheduleDto } from './dto/create-section-schedule.dto.js';

@Controller('section-schedules')
export class SectionSchedulesController {
  constructor(
    private readonly sectionSchedulesService: SectionSchedulesService,
  ) {}

  @Post()
  create(@Body() dto: CreateSectionScheduleDto) {
    return this.sectionSchedulesService.create(dto);
  }

  @Get('section/:sectionId')
  findBySection(@Param('sectionId') sectionId: string) {
    return this.sectionSchedulesService.findBySection(sectionId);
  }
}
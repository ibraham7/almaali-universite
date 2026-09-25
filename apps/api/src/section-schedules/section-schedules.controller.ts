import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';

import { SectionSchedulesService } from './section-schedules.service.js';

import { CreateSectionScheduleDto } from './dto/create-section-schedule.dto.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('section-schedules')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class SectionSchedulesController {
  constructor(
    private readonly sectionSchedulesService: SectionSchedulesService,
  ) {}

  @Post()
  create(
    @Body()
    dto: CreateSectionScheduleDto,
  ) {
    return this.sectionSchedulesService.create(
      dto,
    );
  }

  @Get('section/:sectionId')
  findBySection(
    @Param('sectionId')
    sectionId: string,
  ) {
    return this.sectionSchedulesService.findBySection(
      sectionId,
    );
  }
}
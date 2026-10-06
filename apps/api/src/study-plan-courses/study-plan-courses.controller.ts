import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { StudyPlanCoursesService } from './study-plan-courses.service.js';

import { CreateStudyPlanCourseDto } from './dto/create-study-plan-course.dto.js';

import { ReorderStudyPlanCoursesDto } from './dto/reorder-study-plan-courses.dto.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('study-plan-courses')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class StudyPlanCoursesController {
  constructor(
    private readonly studyPlanCoursesService: StudyPlanCoursesService,
  ) {}

  @Post()
  create(
    @Body()
    dto: CreateStudyPlanCourseDto,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlanCoursesService.create(
      dto,
      request.user,
    );
  }

  @Get()
  findByPlanAndYear(
    @Query('studyPlanId')
    studyPlanId: string,

    @Query('academicYearId')
    academicYearId: string,

    @Req() request: Request & { user: { id: string; role: string } },

    @Query('semesterId')
    semesterId?: string,
  ) {
    if (semesterId) {
      return this.studyPlanCoursesService.findByPlanYearAndSemester(
        studyPlanId,
        academicYearId,
        semesterId,
        request.user,
      );
    }

    return this.studyPlanCoursesService.findByPlanAndYear(
      studyPlanId,
      academicYearId,
      request.user,
    );
  }

  @Post('reorder')
  reorder(
    @Body()
    dto: ReorderStudyPlanCoursesDto,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlanCoursesService.reorder(
      dto,
      request.user,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlanCoursesService.remove(
      id,
      request.user,
    );
  }
}

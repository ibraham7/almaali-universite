import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

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
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    dto: CreateStudyPlanCourseDto,
  ) {
    return this.studyPlanCoursesService.create(
      dto,
    );
  }

  @Get()
  findByPlanAndYear(
    @Query('studyPlanId')
    studyPlanId: string,

    @Query('academicYearId')
    academicYearId: string,

    @Query('semesterId')
    semesterId?: string,
  ) {
    if (semesterId) {
      return this.studyPlanCoursesService.findByPlanYearAndSemester(
        studyPlanId,
        academicYearId,
        semesterId,
      );
    }

    return this.studyPlanCoursesService.findByPlanAndYear(
      studyPlanId,
      academicYearId,
    );
  }

  @Post('reorder')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  reorder(
    @Body()
    dto: ReorderStudyPlanCoursesDto,
  ) {
    return this.studyPlanCoursesService.reorder(
      dto,
    );
  }

  @Delete(':id')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  remove(
    @Param('id')
    id: string,
  ) {
    return this.studyPlanCoursesService.remove(
      id,
    );
  }
}
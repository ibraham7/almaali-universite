import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';

import { StudyPlanCoursesService } from './study-plan-courses.service.js';

import { CreateStudyPlanCourseDto } from './dto/create-study-plan-course.dto.js';

import { ReorderStudyPlanCoursesDto } from './dto/reorder-study-plan-courses.dto.js';

@Controller('study-plan-courses')
export class StudyPlanCoursesController {
  constructor(
    private readonly studyPlanCoursesService: StudyPlanCoursesService,
  ) {}

  @Post()
  create(
    @Body() dto: CreateStudyPlanCourseDto,
  ) {
    return this.studyPlanCoursesService.create(dto);
  }

  @Get()
  findByPlanAndYear(
    @Query('studyPlanId') studyPlanId: string,
    @Query('academicYearId') academicYearId: string,
  ) {
    return this.studyPlanCoursesService.findByPlanAndYear(
      studyPlanId,
      academicYearId,
    );
  }

  @Post('reorder')
  reorder(
    @Body() dto: ReorderStudyPlanCoursesDto,
  ) {
    return this.studyPlanCoursesService.reorder(dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.studyPlanCoursesService.remove(id);
  }
}
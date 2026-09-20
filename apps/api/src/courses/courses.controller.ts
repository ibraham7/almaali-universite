import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { CreateCoursePrerequisiteDto } from './dto/create-course-prerequisite.dto.js';

@Controller('courses')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
  ) {}

  @Post()
  create(@Body() createCourseDto: CreateCourseDto) {
    return this.coursesService.create(createCourseDto);
  }

  @Post('prerequisites')
  addPrerequisite(
    @Body() dto: CreateCoursePrerequisiteDto,
  ) {
    return this.coursesService.addPrerequisite(dto);
  }

  @Get('available-for-student/:studentId')
  findAvailableForStudent(
    @Param('studentId') studentId: string,
  ) {
    return this.coursesService.findAvailableForStudent(
      studentId,
    );
  }
}
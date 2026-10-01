import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';

import { CoursesService } from './courses.service.js';
import { CreateCourseDto } from './dto/create-course.dto.js';
import { UpdateCourseDto } from './dto/update-course.dto.js';
import { CreateCoursePrerequisiteDto } from './dto/create-course-prerequisite.dto.js';
import { SetCoursePrerequisitesDto } from './dto/set-course-prerequisites.dto.js';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('courses')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN')
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
  ) {}

  @Post()
  @Roles('ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN')
  create(@Body() createCourseDto: CreateCourseDto, @Req() request: Request & { user: { id: string; role: string } }) {
    return this.coursesService.create(createCourseDto, request.user);
  }

  @Patch(':id')
  @Roles('ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateCourseDto,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.coursesService.update(id, dto, request.user);
  }

  @Post('prerequisites')
  @Roles('ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN')
  addPrerequisite(
    @Body() dto: CreateCoursePrerequisiteDto,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.coursesService.addPrerequisite(dto, request.user);
  }

  @Post(':courseId/prerequisites/bulk')
  @Roles('ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN')
  addPrerequisitesBulk(
    @Param('courseId') courseId: string,
    @Body() dto: SetCoursePrerequisitesDto,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.coursesService.addPrerequisitesBulk(
      courseId,
      dto.prerequisiteIds,
      request.user,
    );
  }

  @Delete(':courseId/prerequisites/:prerequisiteId')
  @Roles('ADVISOR', 'REGISTRAR', 'SYSTEM_ADMIN')
  removePrerequisite(
    @Param('courseId') courseId: string,
    @Param('prerequisiteId') prerequisiteId: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.coursesService.removePrerequisite(
      courseId,
      prerequisiteId,
      request.user,
    );
  }

  @Get()
  findAll(@Req() request: Request & { user: { id: string; role: string } }) {
    return this.coursesService.findAll(request.user);
  }

  @Get('available-for-student/:studentId')
  findAvailableForStudent(
    @Param('studentId') studentId: string,
  ) {
    return this.coursesService.findAvailableForStudent(studentId);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @Req() request: Request & { user: { id: string; role: string } }) {
    return this.coursesService.findOne(id, request.user);
  }
}

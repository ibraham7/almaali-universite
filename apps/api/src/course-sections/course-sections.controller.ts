import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { CourseSectionsService } from './course-sections.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('course-sections')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class CourseSectionsController {
  constructor(
    private readonly courseSectionsService: CourseSectionsService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      sectionNumber: string;
      courseId: string;
      semesterId: string;

      teacherId?: string | null;

      classroomId?: string | null;

      maxCapacity: number;

      minEnrollment?: number | null;

      status?: 'OPEN' | 'CLOSED';

      schedules?: Array<{
        day: string;
        startTime: string;
        endTime: string;
      }>;
    },
  ) {
    return this.courseSectionsService.create(
      body,
    );
  }

  @Get()
  findAll(
    @Query('semesterId')
    semesterId?: string,

    @Query('courseId')
    courseId?: string,
  ) {
    return this.courseSectionsService.findAll({
      semesterId,
      courseId,
    });
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.courseSectionsService.findOne(
      id,
    );
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    body: {
      sectionNumber?: string;

      courseId?: string;

      semesterId?: string;

      teacherId?: string | null;

      classroomId?: string | null;

      maxCapacity?: number;

      minEnrollment?: number | null;

      status?: 'OPEN' | 'CLOSED';

      schedules?: Array<{
        day: string;
        startTime: string;
        endTime: string;
      }>;
    },
  ) {
    return this.courseSectionsService.update(
      id,
      body,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.courseSectionsService.remove(
      id,
    );
  }
}
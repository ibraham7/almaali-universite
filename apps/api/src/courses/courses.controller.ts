import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import {
  CoursesService,
} from './courses.service.js';

import {
  CreateCourseDto,
} from './dto/create-course.dto.js';

import {
  UpdateCourseDto,
} from './dto/update-course.dto.js';

import {
  CreateCoursePrerequisiteDto,
} from './dto/create-course-prerequisite.dto.js';

import {
  JwtGuard,
} from '../auth/guards/jwt/jwt.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles/roles.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

@Controller('courses')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class CoursesController {
  constructor(
    private readonly coursesService: CoursesService,
  ) { }

  @Post()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    createCourseDto: CreateCourseDto,
  ) {
    return this.coursesService.create(
      createCourseDto,
    );
  }

  @Patch(':id')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  update(
    @Param('id')
    id: string,

    @Body()
    dto: UpdateCourseDto,
  ) {
    return this.coursesService.update(
      id,
      dto,
    );
  }

  @Post('prerequisites')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  addPrerequisite(
    @Body()
    dto: CreateCoursePrerequisiteDto,
  ) {
    return this.coursesService.addPrerequisite(
      dto,
    );
  }

  @Delete(
    ':courseId/prerequisites/:prerequisiteId',
  )
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  removePrerequisite(
    @Param('courseId')
    courseId: string,

    @Param('prerequisiteId')
    prerequisiteId: string,
  ) {
    return this.coursesService.removePrerequisite(
      courseId,
      prerequisiteId,
    );
  }

  @Get()
  findAll() {
    return this.coursesService.findAll();
  }

  @Get(
    'available-for-student/:studentId',
  )
  findAvailableForStudent(
    @Param('studentId')
    studentId: string,
  ) {
    return this.coursesService.findAvailableForStudent(
      studentId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.coursesService.findOne(
      id,
    );
  }
}
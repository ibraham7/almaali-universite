import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { StudentEnrollmentsService } from './student-enrollments.service.js';

import { CreateStudentEnrollmentDto } from './dto/create-student-enrollment.dto.js';

import { AddEnrollmentItemDto } from './dto/add-enrollment-item.dto.js';

import { DropEnrollmentItemDto } from './dto/drop-enrollment-item.dto.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest
  extends Request {
  user: AuthenticatedUser;
}

interface AddMyEnrollmentItemBody {
  courseId: string;
  sectionId: string;
}

interface DropMyEnrollmentItemBody {
  enrollmentItemId: string;
}

@Controller('student-enrollments')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
export class StudentEnrollmentsController {
  constructor(
    private readonly studentEnrollmentsService: StudentEnrollmentsService,
  ) {}

  /*
   * =========================
   * Student self-service API
   * =========================
   */

  @Get('me/registration')
  @Roles('STUDENT')
  getMyRegistration(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.studentEnrollmentsService.getMyRegistration(
      request.user.id,
    );
  }

  @Post('me')
  @Roles('STUDENT')
  createMyEnrollment(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.studentEnrollmentsService.createMyEnrollment(
      request.user.id,
    );
  }

  @Post('me/items')
  @Roles('STUDENT')
  addMyItem(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    body: AddMyEnrollmentItemBody,
  ) {
    return this.studentEnrollmentsService.addMyItem(
      request.user.id,
      body.courseId,
      body.sectionId,
    );
  }

  @Post('me/confirm')
  @Roles('STUDENT')
  confirmMyEnrollment(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.studentEnrollmentsService.confirmMyEnrollment(
      request.user.id,
    );
  }

  @Post('me/items/drop')
  @Roles('STUDENT')
  dropMyItem(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    body: DropMyEnrollmentItemBody,
  ) {
    return this.studentEnrollmentsService.dropMyItem(
      request.user.id,
      body.enrollmentItemId,
    );
  }

  /*
   * =========================
   * Management API
   * =========================
   */

  @Post('items/drop')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  dropItem(
    @Body()
    dto: DropEnrollmentItemDto,
  ) {
    return this.studentEnrollmentsService.dropItem(
      dto,
    );
  }

  @Post(':enrollmentId/confirm')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  confirm(
    @Param('enrollmentId')
    enrollmentId: string,
  ) {
    return this.studentEnrollmentsService.confirm(
      enrollmentId,
    );
  }

  @Post('items')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  addItem(
    @Body()
    dto: AddEnrollmentItemDto,
  ) {
    return this.studentEnrollmentsService.addItem(
      dto,
    );
  }

  @Post()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    dto: CreateStudentEnrollmentDto,
  ) {
    return this.studentEnrollmentsService.create(
      dto,
    );
  }

  @Get()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  findAll() {
    return this.studentEnrollmentsService.findAll();
  }

  @Get('student/:studentId')
  @Roles(
    'ADVISOR',
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  findByStudent(
    @Param('studentId')
    studentId: string,
  ) {
    return this.studentEnrollmentsService.findByStudent(
      studentId,
    );
  }
}
import {
  Controller,
  Body,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import { StudentsService } from './students.service.js';
import { StudentInputDto, UpdateStudentDto } from './dto/student-input.dto.js';

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

@Controller('students')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
  ) {}

  @Post()
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  create(@Body() body: StudentInputDto, @Req() request: AuthenticatedRequest) {
    return this.studentsService.create(body, request.user.id);
  }

  @Patch(':id')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  update(@Param('id') id: string, @Body() body: UpdateStudentDto, @Req() request: AuthenticatedRequest) {
    return this.studentsService.update(id, body, request.user.id);
  }

  @Get('advisors')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  findAdvisors() {
    return this.studentsService.findAdvisors();
  }

  @Get('me')
  @Roles('STUDENT')
  findMe(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.studentsService.findMe(
      request.user.id,
    );
  }

  @Get()
  @Roles(
    'ADVISOR',
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  findAll(
    @Query('search')
    search?: string,

    @Query('status')
    status?: string,

    @Query('accountStatus')
    accountStatus?: string,
  ) {
    return this.studentsService.findAll({
      search,
      status,
      accountStatus,
    });
  }

  @Get(':id')
  @Roles(
    'ADVISOR',
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  findById(
    @Param('id')
    id: string,
  ) {
    return this.studentsService.findById(
      id,
    );
  }
}

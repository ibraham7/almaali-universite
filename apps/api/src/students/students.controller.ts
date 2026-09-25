import {
  Controller,
  Get,
  Param,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import { StudentsService } from './students.service.js';

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
  ) {
    return this.studentsService.findAll({
      search,
      status,
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
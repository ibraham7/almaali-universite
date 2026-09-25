import {
  Body,
  Controller,
  Delete,
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

import {
  JwtGuard,
} from '../auth/guards/jwt/jwt.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles/roles.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

import {
  GradeScalesService,
} from './grade-scales.service.js';

interface AuthenticatedRequest
  extends Request {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('grade-scales')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class GradeScalesController {
  constructor(
    private readonly gradeScalesService: GradeScalesService,
  ) {}

  @Get()
  findAll(
    @Query('universityId')
    universityId?: string,
  ) {
    return this.gradeScalesService.findAll(
      universityId,
    );
  }

  @Post()
  @Roles('SYSTEM_ADMIN')
  create(
    @Req()
    request: AuthenticatedRequest,

    @Body()
    body: {
      universityId: string;
      label: string;
      minScore: number;
      maxScore: number;
      gradePoint: number;
      passed: boolean;
      isActive?: boolean;
    },
  ) {
    return this.gradeScalesService.create(
      body,
      request.user.id,
    );
  }

  @Patch(':id')
  @Roles('SYSTEM_ADMIN')
  update(
    @Req()
    request: AuthenticatedRequest,

    @Param('id')
    id: string,

    @Body()
    body: {
      label?: string;
      minScore?: number;
      maxScore?: number;
      gradePoint?: number;
      passed?: boolean;
      isActive?: boolean;
    },
  ) {
    return this.gradeScalesService.update(
      id,
      body,
      request.user.id,
    );
  }

  @Delete(':id')
  @Roles('SYSTEM_ADMIN')
  remove(
    @Req()
    request: AuthenticatedRequest,

    @Param('id')
    id: string,
  ) {
    return this.gradeScalesService.remove(
      id,
      request.user.id,
    );
  }
}

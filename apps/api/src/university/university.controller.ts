import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import type {
  Request,
} from 'express';

import {
  UniversityService,
} from './university.service.js';

import {
  JwtGuard,
} from '../auth/guards/jwt/jwt.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles/roles.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest
  extends Request {
  user: AuthenticatedUser;
}

@Controller('university')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class UniversityController {
  constructor(
    private readonly universityService: UniversityService,
  ) {}

  @Post()
  @Roles('SYSTEM_ADMIN')
  create(
    @Body()
    body: {
      nameAr: string;
      nameEn: string;
    },
  ) {
    return this.universityService.create(
      body,
    );
  }

  @Get()
  findAll() {
    return this.universityService.findAll();
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.universityService.findById(
      id,
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
      nameAr?: string;

      nameEn?: string;

      minGpaForFutureYears?: number;

      allowedFutureYears?: number;

      requiredElectiveCredits?: number;
    },
  ) {
    return this.universityService.update(
      id,
      body,
      request.user.id,
    );
  }
}
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
import type { Request } from 'express';

import { StudyPlansService } from './study-plans.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('study-plans')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class StudyPlansController {
  constructor(
    private readonly studyPlansService: StudyPlansService,
  ) {}

  @Post()
  create(
    @Req() request: Request & { user: { id: string; role: string } },
    @Body()
    body: {
      programId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.studyPlansService.create(body, request.user);
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    body: {
      nameAr?: string;
      nameEn?: string;
    },
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.update(id, body, request.user);
  }

  @Get()
  findAll(@Req() request: Request & { user: { id: string; role: string } }) {
    return this.studyPlansService.findAll(request.user);
  }

  @Get('program/:programId')
  findByProgram(
    @Param('programId')
    programId: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.findByProgram(
      programId,
      request.user,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.findById(
      id,
      request.user,
    );
  }
}

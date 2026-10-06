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

import { SemestersService } from './semesters.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('semesters')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class SemestersController {
  constructor(
    private readonly semestersService: SemestersService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      academicYearId: string;
      nameAr: string;
      nameEn?: string;
      semesterNumber: number;
      requireMandatoryCourses?: boolean;
    },
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.semestersService.create(body, request.user);
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    body: {
      nameAr?: string;
      nameEn?: string;
      semesterNumber?: number;
      requireMandatoryCourses?: boolean;
    },
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.semestersService.update(id, body, request.user);
  }

  @Get()
  findAll(@Req() request: Request & { user: { id: string; role: string } }) {
    return this.semestersService.findAll(request.user);
  }

  @Get('academic-year/:academicYearId')
  findByAcademicYear(
    @Param('academicYearId')
    academicYearId: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.semestersService.findByAcademicYear(
      academicYearId,
      request.user,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.semestersService.findById(
      id,
      request.user,
    );
  }
}

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

import { AcademicYearsService } from './academic-years.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('academic-years')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class AcademicYearsController {
  constructor(
    private readonly academicYearsService: AcademicYearsService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      studyPlanId: string;
      nameAr: string;
      nameEn?: string;
      levelNumber: number;
    },
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.academicYearsService.create(body, request.user);
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    body: {
      nameAr?: string;
      nameEn?: string;
      levelNumber?: number;
    },
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.academicYearsService.update(id, body, request.user);
  }

  @Get()
  findAll(@Req() request: Request & { user: { id: string; role: string } }) {
    return this.academicYearsService.findAll(request.user);
  }

  @Get('study-plan/:studyPlanId')
  findByStudyPlan(
    @Param('studyPlanId')
    studyPlanId: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.academicYearsService.findByStudyPlan(
      studyPlanId,
      request.user,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.academicYearsService.findById(
      id,
      request.user,
    );
  }
}

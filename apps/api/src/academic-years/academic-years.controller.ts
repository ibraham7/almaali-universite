import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

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
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    body: {
      studyPlanId: string;
      nameAr: string;
      nameEn?: string;
      levelNumber: number;
    },
  ) {
    return this.academicYearsService.create(
      body,
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
    body: {
      nameAr?: string;
      nameEn?: string;
      levelNumber?: number;
    },
  ) {
    return this.academicYearsService.update(
      id,
      body,
    );
  }

  @Get()
  findAll() {
    return this.academicYearsService.findAll();
  }

  @Get('study-plan/:studyPlanId')
  findByStudyPlan(
    @Param('studyPlanId')
    studyPlanId: string,
  ) {
    return this.academicYearsService.findByStudyPlan(
      studyPlanId,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.academicYearsService.findById(
      id,
    );
  }
}
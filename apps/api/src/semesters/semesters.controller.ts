import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

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
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    body: {
      academicYearId: string;
      nameAr: string;
      nameEn?: string;
      semesterNumber: number;
      requireMandatoryCourses?: boolean;
    },
  ) {
    return this.semestersService.create(
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
      semesterNumber?: number;
      requireMandatoryCourses?: boolean;
    },
  ) {
    return this.semestersService.update(
      id,
      body,
    );
  }

  @Get()
  findAll() {
    return this.semestersService.findAll();
  }

  @Get('academic-year/:academicYearId')
  findByAcademicYear(
    @Param('academicYearId')
    academicYearId: string,
  ) {
    return this.semestersService.findByAcademicYear(
      academicYearId,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.semestersService.findById(
      id,
    );
  }
}
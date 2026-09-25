import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

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
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    body: {
      programId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.studyPlansService.create(
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
    },
  ) {
    return this.studyPlansService.update(
      id,
      body,
    );
  }

  @Get()
  findAll() {
    return this.studyPlansService.findAll();
  }

  @Get('program/:programId')
  findByProgram(
    @Param('programId')
    programId: string,
  ) {
    return this.studyPlansService.findByProgram(
      programId,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.studyPlansService.findById(
      id,
    );
  }
}
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
      cohortYear?: number | null;
      effectiveFrom?: string | null;
      graduationCredits?: number | null;
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
      cohortYear?: number | null;
      effectiveFrom?: string | null;
      graduationCredits?: number | null;
    },
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.update(id, body, request.user);
  }

  // الاعتماد وإنشاء إصدار جديد: للمسجّل ومدير النظام. المرشد يجهّز المسودات فقط.
  @Post(':id/approve')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  approve(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.approve(id, request.user);
  }

  // مرحلة التجريب: حذف خطة بكل محتواها (مدير النظام فقط، ويحتاج ALLOW_TEST_DELETE على السيرفر).
  @Delete(':id')
  @Roles('SYSTEM_ADMIN')
  remove(
    @Param('id') id: string,
    @Body() body: { confirm?: string },
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.deleteForTest(id, body?.confirm ?? '', request.user);
  }

  @Post(':id/new-version')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  createVersion(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.createVersion(id, request.user);
  }

  // هل حذف الخطط (مرحلة التجريب) مفعَّل لهذا المستخدم؟
  @Get('capabilities')
  capabilities(@Req() request: Request & { user: { id: string; role: string } }) {
    return { deletePlans: StudyPlansService.deleteEnabled() && request.user.role === 'SYSTEM_ADMIN' };
  }

  @Get('suggest')
  suggest(
    @Query('programId') programId: string,
    @Query('admissionYear') admissionYear?: string,
  ) {
    return this.studyPlansService.suggestForAdmission(programId, admissionYear ? Number(admissionYear) : undefined);
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

  @Get(':id/versions')
  versions(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.versions(id, request.user);
  }

  @Get(':id/structure')
  structure(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.studyPlansService.structure(id, request.user);
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

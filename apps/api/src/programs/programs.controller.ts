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

import { ProgramsService } from './programs.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('programs')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class ProgramsController {
  constructor(
    private readonly programsService: ProgramsService,
  ) {}

  @Post()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    body: {
      departmentId?: string;
      level?: string;
    },
  ) {
    return this.programsService.create(
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
      level?: string;
      isActive?: boolean;
    },
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.programsService.update(
      id,
      body,
      request.user.id,
    );
  }

  @Get()
  findAll() {
    return this.programsService.findAll();
  }

  @Get('department/:departmentId')
  findByDepartment(
    @Param('departmentId')
    departmentId: string,
  ) {
    return this.programsService.findByDepartment(
      departmentId,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.programsService.findById(
      id,
    );
  }
}

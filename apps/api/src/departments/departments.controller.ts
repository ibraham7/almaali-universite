import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { DepartmentsService } from './departments.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('departments')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class DepartmentsController {
  constructor(
    private readonly departmentsService: DepartmentsService,
  ) {}

  @Post()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    body: {
      collegeId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.departmentsService.create(
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
    return this.departmentsService.update(
      id,
      body,
    );
  }

  @Get()
  findAll() {
    return this.departmentsService.findAll();
  }

  @Get('college/:collegeId')
  findByCollege(
    @Param('collegeId')
    collegeId: string,
  ) {
    return this.departmentsService.findByCollege(
      collegeId,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.departmentsService.findById(
      id,
    );
  }
}
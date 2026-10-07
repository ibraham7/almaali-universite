import {
  Body,
  Delete,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import {
  CollegesService,
} from './colleges.service.js';

import {
  JwtGuard,
} from '../auth/guards/jwt/jwt.guard.js';

import {
  RolesGuard,
} from '../auth/guards/roles/roles.guard.js';

import {
  Roles,
} from '../auth/decorators/roles.decorator.js';

@Controller('colleges')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class CollegesController {
  constructor(
    private readonly collegesService: CollegesService,
  ) { }

  @Post()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  create(
    @Body()
    body: {
      universityId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.collegesService.create(
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
    return this.collegesService.update(
      id,
      body,
    );
  }

  @Delete(':id')
  @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  remove(
    @Param('id') id: string,
    @Req() request: Request & { user: { id: string } },
  ) {
    return this.collegesService.remove(id, request.user.id);
  }

  @Get()
  findAll() {
    return this.collegesService.findAll();
  }

  @Get(
    'university/:universityId',
  )
  findByUniversity(
    @Param('universityId')
    universityId: string,
  ) {
    return this.collegesService.findByUniversity(
      universityId,
    );
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.collegesService.findById(
      id,
    );
  }
}

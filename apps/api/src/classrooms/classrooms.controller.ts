import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { ClassroomsService } from './classrooms.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('classrooms')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class ClassroomsController {
  constructor(
    private readonly classroomsService: ClassroomsService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      name: string;
      capacity?: number | null;
    },
  ) {
    return this.classroomsService.create(
      body,
    );
  }

  @Get()
  findAll() {
    return this.classroomsService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.classroomsService.findOne(
      id,
    );
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    body: {
      name?: string;
      capacity?: number | null;
    },
  ) {
    return this.classroomsService.update(
      id,
      body,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.classroomsService.remove(
      id,
    );
  }
}
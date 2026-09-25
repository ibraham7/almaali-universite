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

import { TeachersService } from './teachers.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('teachers')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class TeachersController {
  constructor(
    private readonly teachersService: TeachersService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      name: string;
      email?: string | null;
      phone?: string | null;
    },
  ) {
    return this.teachersService.create(
      body,
    );
  }

  @Get()
  findAll() {
    return this.teachersService.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.teachersService.findOne(
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
      email?: string | null;
      phone?: string | null;
    },
  ) {
    return this.teachersService.update(
      id,
      body,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.teachersService.remove(
      id,
    );
  }
}
import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { UsersService } from './users.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest
  extends Request {
  user: AuthenticatedUser;
}

@Controller('users')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles('SYSTEM_ADMIN')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) { }

  @Get()
  findAll(
    @Query('search')
    search?: string,

    @Query('status')
    status?: string,

    @Query('role')
    role?: string,
  ) {
    return this.usersService.findAll({
      search,
      status,
      role,
    });
  }

  @Get('roles')
  findRoles() {
    return this.usersService.findRoles();
  }

  @Get(':id')
  findById(
    @Param('id')
    id: string,
  ) {
    return this.usersService.findById(
      id,
    );
  }

  @Patch(':id/status')
  updateStatus(
    @Req()
    request: AuthenticatedRequest,

    @Param('id')
    id: string,

    @Body()
    body: {
      status:
      | 'ACTIVE'
      | 'SUSPENDED'
      | 'LOCKED'
      | 'DISABLED';
    },
  ) {
    return this.usersService.updateStatus(
      id,
      body.status,
      request.user.id,
    );
  }

  @Patch(':id/role')
  updateRole(
    @Req()
    request: AuthenticatedRequest,

    @Param('id')
    id: string,

    @Body()
    body: {
      roleCode:
      | 'STUDENT'
      | 'ADVISOR'
      | 'REGISTRAR'
      | 'SYSTEM_ADMIN';
    },
  ) {
    return this.usersService.updateRole(
      id,
      body.roleCode,
      request.user.id,
    );
  }
}
import {
  Controller,
  Get,
  Param,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { StudentsService } from './students.service.js';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

interface AuthenticatedUser {
  id: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}

@Controller('students')
@UseGuards(JwtGuard)
export class StudentsController {
  constructor(
    private readonly studentsService: StudentsService,
  ) {}

  @Get('me')
  findMe(
    @Req() request: AuthenticatedRequest,
  ) {
    return this.studentsService.findMe(
      request.user.id,
    );
  }

  @Get()
  findAll() {
    return this.studentsService.findAll();
  }

  @Get(':id')
  findById(
    @Param('id') id: string,
  ) {
    return this.studentsService.findById(id);
  }
}
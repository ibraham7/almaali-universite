import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';

import { RegistrationPeriodsService } from './registration-periods.service.js';

import { CreateRegistrationPeriodDto } from './dto/create-registration-period.dto.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('registration-periods')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'ADVISOR',
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class RegistrationPeriodsController {
  constructor(
    private readonly registrationPeriodsService: RegistrationPeriodsService,
  ) { }

  @Post()
  create(
    @Body()
    dto: CreateRegistrationPeriodDto,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.registrationPeriodsService.create(
      dto,
      request.user,
    );
  }

  @Get()
  findAll(@Req() request: Request & { user: { id: string; role: string } }) {
    return this.registrationPeriodsService.findAll(request.user);
  }

  @Get('semester/:semesterId')
  findBySemester(
    @Param('semesterId')
    semesterId: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.registrationPeriodsService.findBySemester(
      semesterId,
      request.user,
    );
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.registrationPeriodsService.findOne(
      id,
      request.user,
    );
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: Partial<CreateRegistrationPeriodDto>,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.registrationPeriodsService.update(
      id,
      dto,
      request.user,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,
    @Req() request: Request & { user: { id: string; role: string } },
  ) {
    return this.registrationPeriodsService.remove(
      id,
      request.user,
    );
  }
}

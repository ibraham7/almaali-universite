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
  ) {
    return this.registrationPeriodsService.create(
      dto,
    );
  }

  @Get()
  findAll() {
    return this.registrationPeriodsService.findAll();
  }

  @Get('semester/:semesterId')
  findBySemester(
    @Param('semesterId')
    semesterId: string,
  ) {
    return this.registrationPeriodsService.findBySemester(
      semesterId,
    );
  }

  @Get(':id')
  findOne(
    @Param('id')
    id: string,
  ) {
    return this.registrationPeriodsService.findOne(
      id,
    );
  }

  @Patch(':id')
  update(
    @Param('id')
    id: string,

    @Body()
    dto: Partial<CreateRegistrationPeriodDto>,
  ) {
    return this.registrationPeriodsService.update(
      id,
      dto,
    );
  }

  @Delete(':id')
  remove(
    @Param('id')
    id: string,
  ) {
    return this.registrationPeriodsService.remove(
      id,
    );
  }
}
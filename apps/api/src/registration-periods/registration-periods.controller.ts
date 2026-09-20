import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { RegistrationPeriodsService } from './registration-periods.service.js';
import { CreateRegistrationPeriodDto } from './dto/create-registration-period.dto.js';

@Controller('registration-periods')
export class RegistrationPeriodsController {
  constructor(
    private readonly registrationPeriodsService: RegistrationPeriodsService,
  ) {}

  @Post()
  create(@Body() dto: CreateRegistrationPeriodDto) {
    return this.registrationPeriodsService.create(dto);
  }

  @Get()
  findAll() {
    return this.registrationPeriodsService.findAll();
  }

  @Get('semester/:semesterId')
  findBySemester(@Param('semesterId') semesterId: string) {
    return this.registrationPeriodsService.findBySemester(semesterId);
  }
}
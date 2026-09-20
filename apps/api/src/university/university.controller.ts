import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { UniversityService } from './university.service.js';

@Controller('university')
export class UniversityController {
  constructor(private readonly universityService: UniversityService) {}

  @Post()
  create(
    @Body()
    body: {
      nameAr: string;
      nameEn: string;
    },
  ) {
    return this.universityService.create(body);
  }

  @Get()
  findAll() {
    return this.universityService.findAll();
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.universityService.findById(id);
  }
}
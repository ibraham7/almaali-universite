import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CollegesService } from './colleges.service.js';

@Controller('colleges')
export class CollegesController {
  constructor(private readonly collegesService: CollegesService) {}

  @Post()
  create(
    @Body()
    body: {
      universityId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.collegesService.create(body);
  }

  @Get()
  findAll() {
    return this.collegesService.findAll();
  }

  @Get('university/:universityId')
  findByUniversity(@Param('universityId') universityId: string) {
    return this.collegesService.findByUniversity(universityId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.collegesService.findById(id);
  }
}
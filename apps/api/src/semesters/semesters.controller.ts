import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { SemestersService } from './semesters.service.js';

@Controller('semesters')
export class SemestersController {
  constructor(private readonly semestersService: SemestersService) {}

  @Post()
  create(
    @Body()
    body: {
      academicYearId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.semestersService.create(body);
  }

  @Get()
  findAll() {
    return this.semestersService.findAll();
  }

  @Get('academic-year/:academicYearId')
  findByAcademicYear(
    @Param('academicYearId') academicYearId: string,
  ) {
    return this.semestersService.findByAcademicYear(academicYearId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.semestersService.findById(id);
  }
}
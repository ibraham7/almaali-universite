import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AcademicYearsService } from './academic-years.service.js';

@Controller('academic-years')
export class AcademicYearsController {
  constructor(
    private readonly academicYearsService: AcademicYearsService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      studyPlanId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.academicYearsService.create(body);
  }

  @Get()
  findAll() {
    return this.academicYearsService.findAll();
  }

  @Get('study-plan/:studyPlanId')
  findByStudyPlan(@Param('studyPlanId') studyPlanId: string) {
    return this.academicYearsService.findByStudyPlan(studyPlanId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.academicYearsService.findById(id);
  }
}
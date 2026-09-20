import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { StudyPlansService } from './study-plans.service.js';

@Controller('study-plans')
export class StudyPlansController {
  constructor(
    private readonly studyPlansService: StudyPlansService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      programId: string;
      nameAr: string;
      nameEn?: string;
    },
  ) {
    return this.studyPlansService.create(body);
  }

  @Get()
  findAll() {
    return this.studyPlansService.findAll();
  }

  @Get('program/:programId')
  findByProgram(@Param('programId') programId: string) {
    return this.studyPlansService.findByProgram(programId);
  }

  @Get(':id')
  findById(@Param('id') id: string) {
    return this.studyPlansService.findById(id);
  }
}
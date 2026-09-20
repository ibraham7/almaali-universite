import { Module } from '@nestjs/common';
import { CourseSectionsService } from './course-sections.service.js';
import { CourseSectionsController } from './course-sections.controller.js';

@Module({
  providers: [CourseSectionsService],
  controllers: [CourseSectionsController]
})
export class CourseSectionsModule {}

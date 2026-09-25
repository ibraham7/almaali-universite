import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { CourseSectionsService } from './course-sections.service.js';
import { CourseSectionsController } from './course-sections.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [CourseSectionsService],
  controllers: [CourseSectionsController],
  exports: [CourseSectionsService],
})
export class CourseSectionsModule {}

import { Module } from '@nestjs/common';
import { StudyPlanCoursesController } from './study-plan-courses.controller.js';
import { StudyPlanCoursesService } from './study-plan-courses.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],

  controllers: [
    StudyPlanCoursesController,
  ],

  providers: [
    StudyPlanCoursesService,
  ],

  exports: [
    StudyPlanCoursesService,
  ],
})
export class StudyPlanCoursesModule {}
import { Module } from '@nestjs/common';
import { CoursesService } from './courses.service.js';
import { CoursesController } from './courses.controller.js';
import { CourseImportsController } from './course-imports.controller.js';
import { CourseImportsService } from './course-imports.service.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [CoursesController, CourseImportsController],
  providers: [CoursesService, CourseImportsService],
})
export class CoursesModule {}
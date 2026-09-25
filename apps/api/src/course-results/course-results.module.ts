import { Module } from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  CourseResultsService,
} from './course-results.service.js';

import {
  CourseResultsController,
} from './course-results.controller.js';

@Module({
  imports: [
    PrismaModule,
  ],

  providers: [
    CourseResultsService,
  ],

  controllers: [
    CourseResultsController,
  ],

  exports: [
    CourseResultsService,
  ],
})
export class CourseResultsModule {}

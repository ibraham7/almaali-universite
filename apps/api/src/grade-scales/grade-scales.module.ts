import { Module } from '@nestjs/common';

import {
  PrismaModule,
} from '../prisma/prisma.module.js';

import {
  GradeScalesService,
} from './grade-scales.service.js';

import {
  GradeScalesController,
} from './grade-scales.controller.js';

@Module({
  imports: [
    PrismaModule,
  ],

  providers: [
    GradeScalesService,
  ],

  controllers: [
    GradeScalesController,
  ],

  exports: [
    GradeScalesService,
  ],
})
export class GradeScalesModule {}

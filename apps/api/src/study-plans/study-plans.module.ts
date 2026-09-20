import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { StudyPlansService } from './study-plans.service.js';
import { StudyPlansController } from './study-plans.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [StudyPlansService],
  controllers: [StudyPlansController],
  exports: [StudyPlansService],
})
export class StudyPlansModule {}
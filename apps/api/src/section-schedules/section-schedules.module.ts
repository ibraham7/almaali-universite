import { Module } from '@nestjs/common';
import { SectionSchedulesService } from './section-schedules.service.js';
import { SectionSchedulesController } from './section-schedules.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [SectionSchedulesController],
  providers: [SectionSchedulesService],
})
export class SectionSchedulesModule {}
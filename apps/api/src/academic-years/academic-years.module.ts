import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AcademicYearsService } from './academic-years.service.js';
import { AcademicYearsController } from './academic-years.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [AcademicYearsService],
  controllers: [AcademicYearsController],
  exports: [AcademicYearsService],
})
export class AcademicYearsModule {}
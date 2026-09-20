import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { UniversityService } from './university.service.js';
import { UniversityController } from './university.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [UniversityService],
  controllers: [UniversityController],
})
export class UniversityModule {}
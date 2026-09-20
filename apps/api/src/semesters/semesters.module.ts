import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { SemestersService } from './semesters.service.js';
import { SemestersController } from './semesters.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [SemestersService],
  controllers: [SemestersController],
  exports: [SemestersService],
})
export class SemestersModule {}
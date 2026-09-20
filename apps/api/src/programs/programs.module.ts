import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { ProgramsService } from './programs.service.js';
import { ProgramsController } from './programs.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [ProgramsService],
  controllers: [ProgramsController],
  exports: [ProgramsService],
})
export class ProgramsModule {}
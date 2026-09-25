import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { TeachersService } from './teachers.service.js';
import { TeachersController } from './teachers.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [TeachersService],
  controllers: [TeachersController],
  exports: [TeachersService],
})
export class TeachersModule {}

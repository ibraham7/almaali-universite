import { Module } from '@nestjs/common';
import { TeachersService } from './teachers.service.js';
import { TeachersController } from './teachers.controller.js';

@Module({
  providers: [TeachersService],
  controllers: [TeachersController]
})
export class TeachersModule {}

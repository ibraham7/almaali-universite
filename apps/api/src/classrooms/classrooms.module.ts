import { Module } from '@nestjs/common';
import { ClassroomsService } from './classrooms.service.js';
import { ClassroomsController } from './classrooms.controller.js';

@Module({
  providers: [ClassroomsService],
  controllers: [ClassroomsController]
})
export class ClassroomsModule {}

import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { StudentsController } from './students.controller.js';
import { StudentsService } from './students.service.js';
import { StudentImportsController } from './student-imports.controller.js';
import { StudentImportsService } from './student-imports.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    StudentsController,
    StudentImportsController,
  ],

  providers: [
    StudentsService,
    StudentImportsService,
  ],

  exports: [
    StudentsService,
  ],
})
export class StudentsModule {}

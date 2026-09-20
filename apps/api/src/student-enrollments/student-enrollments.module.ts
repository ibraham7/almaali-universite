import { Module } from '@nestjs/common';
import { StudentEnrollmentsService } from './student-enrollments.service.js';
import { StudentEnrollmentsController } from './student-enrollments.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';
import { RegistrationValidationService } from '../registration-validation/registration-validation.service.js';
import { AuditLogsModule } from '../audit-logs/audit-logs.module.js';

@Module({
  imports: [
    PrismaModule,
    AuditLogsModule,
  ],
  controllers: [
    StudentEnrollmentsController,
  ],
  providers: [
    StudentEnrollmentsService,
    RegistrationValidationService,
  ],
})
export class StudentEnrollmentsModule { }
import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { EnrollmentMessagesController } from './enrollment-messages.controller.js';
import { EnrollmentMessagesService } from './enrollment-messages.service.js';

@Module({
  imports: [PrismaModule],
  controllers: [EnrollmentMessagesController],
  providers: [EnrollmentMessagesService],
})
export class EnrollmentMessagesModule {}

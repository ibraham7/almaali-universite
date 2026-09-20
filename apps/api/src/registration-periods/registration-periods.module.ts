import { Module } from '@nestjs/common';
import { RegistrationPeriodsService } from './registration-periods.service.js';
import { RegistrationPeriodsController } from './registration-periods.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [RegistrationPeriodsController],
  providers: [RegistrationPeriodsService],
})
export class RegistrationPeriodsModule {}
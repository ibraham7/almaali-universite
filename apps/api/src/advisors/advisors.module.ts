import { Module } from '@nestjs/common';
import { AdvisorsService } from './advisors.service.js';
import { AdvisorsController } from './advisors.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  providers: [AdvisorsService],
  controllers: [AdvisorsController]
})
export class AdvisorsModule {}

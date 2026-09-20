import { Module } from '@nestjs/common';
import { AdvisorApprovalsService } from './advisor-approvals.service.js';
import { AdvisorApprovalsController } from './advisor-approvals.controller.js';
import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AdvisorApprovalsController],
  providers: [AdvisorApprovalsService],
})
export class AdvisorApprovalsModule {}
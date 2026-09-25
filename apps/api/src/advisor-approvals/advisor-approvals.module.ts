import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';

import { PrismaModule } from '../prisma/prisma.module.js';

import { AdvisorApprovalsController } from './advisor-approvals.controller.js';
import { AdvisorApprovalsService } from './advisor-approvals.service.js';

@Module({
  imports: [
    PrismaModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [
    AdvisorApprovalsController,
  ],

  providers: [
    AdvisorApprovalsService,
  ],

  exports: [
    AdvisorApprovalsService,
  ],
})
export class AdvisorApprovalsModule { }
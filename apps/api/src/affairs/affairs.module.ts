import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AffairsController } from './affairs.controller.js';
import { AffairsService } from './affairs.service.js';
import { AffairsAttachmentsService } from './affairs-attachments.service.js';
import { AffairsReferralsService } from './affairs-referrals.service.js';
import { AffairsFilesService } from './affairs-files.service.js';

@Module({ imports: [PrismaModule], controllers: [AffairsController], providers: [AffairsService, AffairsAttachmentsService, AffairsReferralsService, AffairsFilesService] })
export class AffairsModule {}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AffairsController, PublicDocumentsController } from './affairs.controller.js';
import { AffairsDocumentsService } from './affairs-documents.service.js';
import { AffairsService } from './affairs.service.js';
import { AffairsAttachmentsService } from './affairs-attachments.service.js';
import { AffairsReferralsService } from './affairs-referrals.service.js';
import { AffairsFilesService } from './affairs-files.service.js';

@Module({ imports: [PrismaModule], controllers: [AffairsController, PublicDocumentsController], providers: [AffairsService, AffairsAttachmentsService, AffairsReferralsService, AffairsFilesService, AffairsDocumentsService] })
export class AffairsModule {}

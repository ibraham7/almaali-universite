import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AffairsController, PublicDocumentsController } from './affairs.controller.js';
import { AdvisorAffairsController } from './advisor-affairs.controller.js';
import { AdvisorAffairsService } from './advisor-affairs.service.js';
import { AffairsDocumentsService } from './affairs-documents.service.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { AffairsReportsService } from './affairs-reports.service.js';
import { AffairsNotificationsService } from './affairs-notifications.service.js';
import { AffairsService } from './affairs.service.js';
import { AffairsAttachmentsService } from './affairs-attachments.service.js';
import { AffairsReferralsService } from './affairs-referrals.service.js';
import { AffairsFilesService } from './affairs-files.service.js';

@Module({ imports: [PrismaModule], controllers: [AffairsController, AdvisorAffairsController, PublicDocumentsController], providers: [AdvisorAffairsService, AffairsService, AffairsAttachmentsService, AffairsReferralsService, AffairsFilesService, AffairsDocumentsService, AffairsSettingsService, AffairsReportsService, AffairsNotificationsService] })
export class AffairsModule {}

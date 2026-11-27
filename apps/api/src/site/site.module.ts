import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { SiteAdminController } from './site-admin.controller.js';
import { SiteAdminService } from './site-admin.service.js';
import { SiteMediaService } from './site-media.service.js';
import { SitePublicController } from './site-public.controller.js';
import { SitePublicService } from './site-public.service.js';
import { RateLimitGuard } from './rate-limit.guard.js';

@Module({
  imports: [PrismaModule],
  controllers: [SitePublicController, SiteAdminController],
  providers: [SitePublicService, SiteAdminService, SiteMediaService, RateLimitGuard],
})
export class SiteModule {}

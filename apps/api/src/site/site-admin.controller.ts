import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { SiteAdminService } from './site-admin.service.js';
import { MAX_MEDIA_BYTES } from './site.constants.js';
import { SiteMediaService, type UploadedBinary } from './site-media.service.js';
import {
  ChangeStatusDto, CreateEntryDto, UpdateEntryDto, CreateItemDto, CreateNewsDto, CreateTestimonialDto, MessageStatusDto, UpdateItemDto, UpdateMediaDto, UpdateNewsDto,
  UpdateSettingsDto, UpdateTestimonialDto, UpsertProfileDto,
} from './dto/site.dto.js';

type AdminRequest = Request & { user: { id: string; role: string } };

// لوحة إدارة الموقع: مدير النظام ومحرر الموقع فقط (صلاحيات منفصلة عن المنظومة الأكاديمية).
@Controller('site-admin')
@UseGuards(JwtGuard, RolesGuard)
@Roles('SYSTEM_ADMIN', 'SITE_EDITOR')
export class SiteAdminController {
  constructor(private readonly admin: SiteAdminService, private readonly media: SiteMediaService) {}

  @Get('settings') settings() { return this.admin.getSettings(); }
  @Put('settings') updateSettings(@Body() body: UpdateSettingsDto, @Req() req: AdminRequest) { return this.admin.updateSettings(body.values, req.user.id); }

  @Get('items') items(@Query('kind') kind?: string) { return this.admin.listItems(kind); }
  @Post('items') createItem(@Body() body: CreateItemDto, @Req() req: AdminRequest) { return this.admin.createItem(body, req.user.id); }
  @Patch('items/:id') updateItem(@Param('id') id: string, @Body() body: UpdateItemDto, @Req() req: AdminRequest) { return this.admin.updateItem(id, body, req.user.id); }
  @Post('items/:id/status') itemStatus(@Param('id') id: string, @Body() body: ChangeStatusDto, @Req() req: AdminRequest) { return this.admin.setItemStatus(id, body.status, req.user.id); }

  @Get('news') news() { return this.admin.listNews(); }
  @Post('news') createNews(@Body() body: CreateNewsDto, @Req() req: AdminRequest) { return this.admin.createNews(body, req.user.id); }
  @Patch('news/:id') updateNews(@Param('id') id: string, @Body() body: UpdateNewsDto, @Req() req: AdminRequest) { return this.admin.updateNews(id, body, req.user.id); }
  @Post('news/:id/status') newsStatus(@Param('id') id: string, @Body() body: ChangeStatusDto, @Req() req: AdminRequest) { return this.admin.setNewsStatus(id, body.status, req.user.id); }

  @Get('entries') entries(@Query('kind') kind?: string) { return this.admin.listEntries(kind); }
  @Post('entries') createEntry(@Body() body: CreateEntryDto, @Req() req: AdminRequest) { return this.admin.createEntry(body, req.user.id); }
  @Patch('entries/:id') updateEntry(@Param('id') id: string, @Body() body: UpdateEntryDto, @Req() req: AdminRequest) { return this.admin.updateEntry(id, body, req.user.id); }
  @Post('entries/:id/status') entryStatus(@Param('id') id: string, @Body() body: ChangeStatusDto, @Req() req: AdminRequest) { return this.admin.setEntryStatus(id, body.status, req.user.id); }
  @Delete('entries/:id') deleteEntry(@Param('id') id: string, @Req() req: AdminRequest) { return this.admin.deleteEntry(id, req.user.id); }

  @Get('testimonials') testimonials() { return this.admin.listTestimonials(); }
  @Post('testimonials') createTestimonial(@Body() body: CreateTestimonialDto, @Req() req: AdminRequest) { return this.admin.createTestimonial(body, req.user.id); }
  @Patch('testimonials/:id') updateTestimonial(@Param('id') id: string, @Body() body: UpdateTestimonialDto, @Req() req: AdminRequest) { return this.admin.updateTestimonial(id, body, req.user.id); }
  @Post('testimonials/:id/status') testimonialStatus(@Param('id') id: string, @Body() body: ChangeStatusDto, @Req() req: AdminRequest) { return this.admin.setTestimonialStatus(id, body.status, req.user.id); }

  @Get('academic') academic() { return this.admin.academic(); }
  @Put('academic/:kind/:refId') profile(@Param('kind') kind: string, @Param('refId') refId: string, @Body() body: UpsertProfileDto, @Req() req: AdminRequest) { return this.admin.upsertProfile(kind, refId, body, req.user.id); }

  @Get('media') mediaList(@Query('archived') archived?: string) { return this.media.list(archived === '1'); }
  @Post('media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_MEDIA_BYTES + 1, files: 1 } }))
  upload(@UploadedFile() file: UploadedBinary | undefined, @Body('altText') altText: string | undefined, @Req() req: AdminRequest) { return this.media.upload(file, altText, req.user.id); }
  @Patch('media/:id') updateMedia(@Param('id') id: string, @Body() body: UpdateMediaDto, @Req() req: AdminRequest) { return this.media.updateAlt(id, body.altText, req.user.id); }
  @Post('media/:id/archive') archiveMedia(@Param('id') id: string, @Req() req: AdminRequest) { return this.media.setArchived(id, true, req.user.id); }
  @Post('media/:id/restore') restoreMedia(@Param('id') id: string, @Req() req: AdminRequest) { return this.media.setArchived(id, false, req.user.id); }

  @Get('messages') messages(@Query('status') status?: string) { return this.admin.listMessages(status); }
  @Post('messages/:id/status') messageStatus(@Param('id') id: string, @Body() body: MessageStatusDto, @Req() req: AdminRequest) { return this.admin.setMessageStatus(id, body.status, req.user.id); }
}

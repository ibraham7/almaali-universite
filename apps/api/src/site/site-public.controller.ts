import { Body, Controller, Get, Header, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { SitePublicService } from './site-public.service.js';
import { SiteMediaService } from './site-media.service.js';
import { RateLimit, RateLimitGuard, clientIp } from './rate-limit.guard.js';
import { ContactMessageDto, GraduateUpdateDto } from './dto/site.dto.js';

// نقاط الموقع العامة: بلا تسجيل دخول، للقراءة فقط (ما عدا رسالة التواصل)، وعليها حد للطلبات.
@Controller('site')
@UseGuards(RateLimitGuard)
export class SitePublicController {
  constructor(private readonly service: SitePublicService, private readonly media: SiteMediaService) {}

  @Get('content')
  @Header('Cache-Control', 'public, max-age=60')
  content() { return this.service.content(); }

  @Get('news')
  @Header('Cache-Control', 'public, max-age=60')
  news(@Query('page') page?: string, @Query('type') type?: string, @Query('q') q?: string, @Query('category') category?: string) { return this.service.newsList(Number(page) || 1, 9, type, q, category); }

  @Get('news/:id')
  @Header('Cache-Control', 'public, max-age=60')
  newsOne(@Param('id') id: string) { return this.service.newsOne(id); }

  @Get('entries/:kind')
  @Header('Cache-Control', 'public, max-age=60')
  entries(@Param('kind') kind: string, @Query('page') page?: string, @Query('when') when?: string, @Query('category') category?: string, @Query('q') q?: string) { return this.service.entriesList(kind.toUpperCase().replace('-', '_'), Number(page) || 1, 9, { when, category, q }); }

  @Get('entry/:id')
  @Header('Cache-Control', 'public, max-age=60')
  entry(@Param('id') id: string) { return this.service.entryOne(id); }

  @Post('graduates/update')
  @RateLimit(5, 60 * 60_000)
  graduateUpdate(@Body() body: GraduateUpdateDto, @Req() request: Request) { return this.service.submitGraduateUpdate(body, clientIp(request)); }

  @Get('media/:id')
  @RateLimit(600, 60_000)
  async mediaFile(@Param('id') id: string, @Res() res: Response) {
    const file = await this.media.serve(id);
    res.setHeader('Content-Type', file.mimeType);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.fileName)}`);
    res.setHeader('Content-Security-Policy', "default-src 'none'; sandbox");
    res.send(file.data);
  }

  @Post('contact')
  @RateLimit(5, 60 * 60_000)
  contact(@Body() body: ContactMessageDto, @Req() request: Request) { return this.service.submitMessage(body, clientIp(request)); }
}

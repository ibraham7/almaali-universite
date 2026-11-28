import { Body, Controller, Get, Param, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { AdvisorAffairsService } from './advisor-affairs.service.js';
import { RespondReferralDto, ListStudentsQueryDto } from './dto/affairs.dto.js';
import type { AffairsUser } from './affairs.service.js';

type AdvisorRequest = Request & { user: AffairsUser & { email: string } };
const pageOf = (page?: string) => { const n = Number(page ?? 1); return Number.isInteger(n) && n >= 1 ? Math.min(n, 100000) : 1; };

// مساحة المشرف الأكاديمي بوحدة شؤون الطلاب: كلها محصورة بنطاقه (كلياته وبرامجه) وبما أُحيل إليه.
@Controller('advisor-affairs')
@UseGuards(JwtGuard, RolesGuard)
@Roles('ADVISOR')
export class AdvisorAffairsController {
  constructor(private readonly advisor: AdvisorAffairsService) {}

  @Get('overview')
  overview(@Req() req: AdvisorRequest) { return this.advisor.overview(req.user); }

  @Get('inbox')
  inbox(@Query('filter') filter: string | undefined, @Query('page') page: string | undefined, @Req() req: AdvisorRequest) { return this.advisor.inbox(req.user, filter, pageOf(page)); }

  @Get('referrals/:id')
  referral(@Param('id') id: string, @Req() req: AdvisorRequest) { return this.advisor.referral(id, req.user); }

  @Post('referrals/:id/respond')
  respond(@Param('id') id: string, @Body() body: RespondReferralDto, @Req() req: AdvisorRequest) { return this.advisor.respond(id, body, req.user); }

  @Get('referrals/:id/attachments/:attId/download')
  async download(@Param('id') id: string, @Param('attId') attId: string, @Req() req: AdvisorRequest, @Res() res: Response) {
    const att = await this.advisor.attachment(id, attId, req.user);
    res.setHeader('Content-Type', att.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(Buffer.from(att.data));
  }

  @Get('requests')
  requests(@Query('filter') filter: string | undefined, @Query('page') page: string | undefined, @Req() req: AdvisorRequest) { return this.advisor.requests(req.user, filter, pageOf(page)); }

  @Get('students')
  students(@Query() query: ListStudentsQueryDto, @Req() req: AdvisorRequest) { return this.advisor.students(req.user, query.search, query.page ?? 1); }

  @Get('students/:id/file')
  studentFile(@Param('id') id: string, @Req() req: AdvisorRequest) { return this.advisor.studentFile(req.user, id); }
}

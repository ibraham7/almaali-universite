import { Body, Controller, Get, Param, Patch, Post, Query, Req, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request, Response } from 'express';
import { AffairsService, AffairsUser } from './affairs.service.js';
import { AffairsAttachmentsService, MAX_ATTACHMENT_BYTES, type UploadedBinary } from './affairs-attachments.service.js';
import { AffairsReferralsService } from './affairs-referrals.service.js';
import { AffairsFilesService } from './affairs-files.service.js';
import { AffairsDocumentsService } from './affairs-documents.service.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { AffairsReportsService } from './affairs-reports.service.js';
import { AffairsNotificationsService } from './affairs-notifications.service.js';
import {
  DelayReasonDto, ListNotificationsQueryDto, ReportFiltersDto, RunReportDto, SummaryQueryDto, UpdateSettingsDto, CreateDocumentTypeDto, ListDocumentsQueryDto, RevokeDocumentDto, UpdateDocumentTypeDto,
  ArchiveAttachmentDto, CancelReferralDto, CreateReferralDto, ListReferralsQueryDto, ListStudentsQueryDto, RespondReferralDto,
  AssignRequestDto, ChangeStatusDto, CommentDto, CreateServiceDto, CreateStaffDto, ListRequestsQueryDto,
  ProxyCreateRequestDto, StudentCreateRequestDto, StudentSearchQueryDto, UpdateServiceDto, UpdateStaffDto,
} from './dto/affairs.dto.js';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

interface AuthenticatedRequest extends Request {
  user: AffairsUser & { email: string };
}

// الأدوار التي تدخل مسارات الموظفين. المشرف الأكاديمي لا يدخلها: له مسارات مستقلة محصورة بكليته (advisor-affairs).
const STAFF = ['REGISTRAR', 'SYSTEM_ADMIN', 'AFFAIRS_STAFF'] as const;

@Controller('affairs')
@UseGuards(JwtGuard, RolesGuard)
export class AffairsController {
  constructor(
    private readonly affairs: AffairsService,
    private readonly attachments: AffairsAttachmentsService,
    private readonly referrals: AffairsReferralsService,
    private readonly files: AffairsFilesService,
    private readonly documents: AffairsDocumentsService,
    private readonly settings: AffairsSettingsService,
    private readonly reports: AffairsReportsService,
    private readonly notifications: AffairsNotificationsService,
  ) {}

  private send(res: Response, att: { fileName: string; mimeType: string; data: Uint8Array }) {
    res.setHeader('Content-Type', att.mimeType);
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${encodeURIComponent(att.fileName)}`);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(Buffer.from(att.data));
  }

  // ----- staff side (REGISTRAR, SYSTEM_ADMIN) -----
  @Get('summary') @Roles(...STAFF)
  summary(@Query() query: SummaryQueryDto, @Req() req: AuthenticatedRequest) { return this.affairs.summary(req.user, query); }

  @Get('operations') @Roles(...STAFF)
  operations(@Query('page') page?: string) {
    const n = Number(page ?? 1);
    return this.affairs.operations(Number.isInteger(n) && n >= 1 ? Math.min(n, 100000) : 1);
  }

  @Get('services') @Roles(...STAFF)
  listServices() { return this.affairs.listServices(); }

  @Post('services') @Roles(...STAFF)
  createService(@Body() body: CreateServiceDto, @Req() req: AuthenticatedRequest) { return this.affairs.createService(body, req.user); }

  @Patch('services/:id') @Roles(...STAFF)
  updateService(@Param('id') id: string, @Body() body: UpdateServiceDto, @Req() req: AuthenticatedRequest) { return this.affairs.updateService(id, body, req.user); }

  @Get('staff') @Roles(...STAFF)
  listStaff() { return this.affairs.listStaff(); }

  // Must come before `staff/:id` routes (different verb/shape, but keep the literal path first).
  @Get('staff/candidates') @Roles(...STAFF)
  staffCandidates() { return this.affairs.staffCandidates(); }

  @Post('staff') @Roles('SYSTEM_ADMIN')
  createStaff(@Body() body: CreateStaffDto, @Req() req: AuthenticatedRequest) { return this.affairs.createStaff(body, req.user); }

  @Patch('staff/:id') @Roles(...STAFF)
  updateStaff(@Param('id') id: string, @Body() body: UpdateStaffDto, @Req() req: AuthenticatedRequest) { return this.affairs.updateStaff(id, body, req.user); }

  @Get('students/search') @Roles(...STAFF)
  searchStudents(@Query() query: StudentSearchQueryDto) { return this.affairs.searchStudents(query.q); }

  @Get('requests') @Roles(...STAFF)
  listRequests(@Query() query: ListRequestsQueryDto, @Req() req: AuthenticatedRequest) { return this.affairs.listRequests(query, req.user); }

  @Post('requests') @Roles(...STAFF)
  createRequest(@Body() body: ProxyCreateRequestDto, @Req() req: AuthenticatedRequest) { return this.affairs.createByProxy(body, req.user); }

  @Get('requests/:id') @Roles(...STAFF)
  getRequest(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.affairs.getRequest(id, req.user); }

  @Post('requests/:id/assign') @Roles(...STAFF)
  assign(@Param('id') id: string, @Body() body: AssignRequestDto, @Req() req: AuthenticatedRequest) { return this.affairs.assign(id, body, req.user); }

  @Post('requests/:id/status') @Roles(...STAFF)
  changeStatus(@Param('id') id: string, @Body() body: ChangeStatusDto, @Req() req: AuthenticatedRequest) { return this.affairs.changeStatus(id, body, req.user); }

  @Post('requests/:id/delay-reason') @Roles(...STAFF)
  delayReason(@Param('id') id: string, @Body() body: DelayReasonDto, @Req() req: AuthenticatedRequest) { return this.affairs.setDelayReason(id, body, req.user); }

  @Get('stuck') @Roles(...STAFF)
  stuck(@Req() req: AuthenticatedRequest) { return this.affairs.stuck(req.user); }

  @Post('requests/:id/comment') @Roles(...STAFF)
  comment(@Param('id') id: string, @Body() body: CommentDto, @Req() req: AuthenticatedRequest) { return this.affairs.comment(id, body, req.user); }

  // ----- student files (read only) -----
  @Get('students') @Roles(...STAFF)
  listStudents(@Query() query: ListStudentsQueryDto) { return this.files.list(query.search, query.page ?? 1); }

  @Get('students/:id/file') @Roles(...STAFF)
  studentFile(@Param('id') id: string) { return this.files.get(id); }

  // ----- attachments -----
  @Post('requests/:id/attachments') @Roles(...STAFF)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES + 1, files: 1 } }))
  addAttachment(@Param('id') id: string, @UploadedFile() file: UploadedBinary | undefined, @Req() req: AuthenticatedRequest) { return this.attachments.addByStaff(id, file, req.user); }

  @Post('requests/:id/attachments/:attId/archive') @Roles(...STAFF)
  archiveAttachment(@Param('id') id: string, @Param('attId') attId: string, @Body() body: ArchiveAttachmentDto, @Req() req: AuthenticatedRequest) { return this.attachments.archive(id, attId, body.reason, req.user); }

  @Get('requests/:id/attachments/:attId/download') @Roles(...STAFF)
  async downloadAttachment(@Param('id') id: string, @Param('attId') attId: string, @Res() res: Response) { this.send(res, await this.attachments.downloadForStaff(id, attId)); }

  @Get('lookups/advisors') @Roles(...STAFF)
  advisorOptions(@Query('collegeId') collegeId: string) { return this.affairs.advisorOptions(collegeId); }

  @Get('lookups/colleges') @Roles(...STAFF)
  collegeOptions() { return this.affairs.collegeOptions(); }

  @Get('me') @Roles(...STAFF)
  me(@Req() req: AuthenticatedRequest) { return this.affairs.me(req.user); }

  // ----- notifications (everyone reads only their own) -----
  @Get('notifications') @Roles('STUDENT', 'ADVISOR', ...STAFF)
  listNotifications(@Query() query: ListNotificationsQueryDto, @Req() req: AuthenticatedRequest) { return this.notifications.list(req.user, query.unread === 'true', query.page ?? 1); }

  @Get('notifications/unread-count') @Roles('STUDENT', 'ADVISOR', ...STAFF)
  unreadCount(@Req() req: AuthenticatedRequest) { return this.notifications.unreadCount(req.user); }

  @Post('notifications/read-all') @Roles('STUDENT', 'ADVISOR', ...STAFF)
  readAll(@Req() req: AuthenticatedRequest) { return this.notifications.markAllRead(req.user); }

  @Post('notifications/:id/read') @Roles('STUDENT', 'ADVISOR', ...STAFF)
  readOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.notifications.markRead(id, req.user); }

  // ----- reports -----
  @Get('reports/catalog') @Roles(...STAFF)
  reportCatalog(@Req() req: AuthenticatedRequest) { return this.reports.catalog(req.user); }

  @Get('reports/overview') @Roles(...STAFF)
  reportOverview(@Query() query: ReportFiltersDto, @Req() req: AuthenticatedRequest) { return this.reports.overview(query, req.user); }

  @Post('reports/run') @Roles(...STAFF)
  runReport(@Body() body: RunReportDto, @Req() req: AuthenticatedRequest) { return this.reports.run(body, req.user); }

  @Post('reports/export') @Roles(...STAFF)
  async exportReport(@Body() body: RunReportDto, @Req() req: AuthenticatedRequest, @Res() res: Response) {
    const csv = await this.reports.exportCsv(body, req.user);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="report.csv"');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Cache-Control', 'private, no-store');
    res.end(csv);
  }

  // ----- settings -----
  @Get('settings') @Roles(...STAFF)
  getSettings() { return this.settings.view(); }

  @Patch('settings') @Roles('SYSTEM_ADMIN')
  updateSettings(@Body() body: UpdateSettingsDto, @Req() req: AuthenticatedRequest) { return this.settings.update(body.values, req.user); }

  // ----- documents -----
  @Get('documents/types') @Roles(...STAFF)
  documentTypes() { return this.documents.listTypes(); }

  @Post('documents/types') @Roles('SYSTEM_ADMIN')
  createDocumentType(@Body() body: CreateDocumentTypeDto, @Req() req: AuthenticatedRequest) { return this.documents.createType(body, req.user); }

  @Patch('documents/types/:id') @Roles('SYSTEM_ADMIN')
  updateDocumentType(@Param('id') id: string, @Body() body: UpdateDocumentTypeDto, @Req() req: AuthenticatedRequest) { return this.documents.updateType(id, body, req.user); }

  @Get('documents') @Roles(...STAFF)
  listDocuments(@Query() query: ListDocumentsQueryDto) { return this.documents.list(query); }

  @Get('documents/:id') @Roles(...STAFF, 'STUDENT')
  getDocument(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.documents.get(id, req.user); }

  @Post('requests/:id/documents') @Roles(...STAFF)
  issueDocument(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.documents.issue(id, req.user); }

  @Post('documents/:id/revoke') @Roles(...STAFF)
  revokeDocument(@Param('id') id: string, @Body() body: RevokeDocumentDto, @Req() req: AuthenticatedRequest) { return this.documents.revoke(id, body.reason, req.user); }

  // ----- referrals -----
  @Get('referrals') @Roles(...STAFF)
  listReferrals(@Query() query: ListReferralsQueryDto) { return this.referrals.list(query); }

  @Post('requests/:id/referrals') @Roles(...STAFF)
  createReferral(@Param('id') id: string, @Body() body: CreateReferralDto, @Req() req: AuthenticatedRequest) { return this.referrals.create(id, body, req.user); }

  @Post('referrals/:id/respond') @Roles(...STAFF)
  respondReferral(@Param('id') id: string, @Body() body: RespondReferralDto, @Req() req: AuthenticatedRequest) { return this.referrals.respond(id, body, req.user); }

  @Post('referrals/:id/cancel') @Roles(...STAFF)
  cancelReferral(@Param('id') id: string, @Body() body: CancelReferralDto, @Req() req: AuthenticatedRequest) { return this.referrals.cancel(id, body, req.user); }

  // ----- student side -----
  @Get('my/services') @Roles('STUDENT')
  myServices() { return this.affairs.myServices(); }

  @Get('my/requests') @Roles('STUDENT')
  myRequests(@Req() req: AuthenticatedRequest) { return this.affairs.myRequests(req.user); }

  @Post('my/requests') @Roles('STUDENT')
  createMine(@Body() body: StudentCreateRequestDto, @Req() req: AuthenticatedRequest) { return this.affairs.createMine(body, req.user); }

  @Get('my/requests/:id') @Roles('STUDENT')
  myRequest(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.affairs.myRequest(id, req.user); }

  // What the student portal needs to know before showing the form.
  @Get('my/config') @Roles('STUDENT')
  async myConfig() { return { onlineSubmissionEnabled: await this.settings.get<boolean>('studentOnlineSubmission'), maxAttachmentMb: await this.settings.get<number>('maxAttachmentMb') }; }

  @Get('my/documents') @Roles('STUDENT')
  myDocuments(@Req() req: AuthenticatedRequest) { return this.documents.mine(req.user); }

  @Post('my/requests/:id/attachments') @Roles('STUDENT')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: MAX_ATTACHMENT_BYTES + 1, files: 1 } }))
  addMyAttachment(@Param('id') id: string, @UploadedFile() file: UploadedBinary | undefined, @Req() req: AuthenticatedRequest) { return this.attachments.addByStudent(id, file, req.user); }

  @Get('my/requests/:id/attachments/:attId/download') @Roles('STUDENT')
  async downloadMyAttachment(@Param('id') id: string, @Param('attId') attId: string, @Req() req: AuthenticatedRequest, @Res() res: Response) { this.send(res, await this.attachments.downloadForStudent(id, attId, req.user)); }
}

// Public check of a document by its verification code: no login, minimal data.
@Controller('documents')
export class PublicDocumentsController {
  constructor(private readonly documents: AffairsDocumentsService) {}

  @Get('verify/:code')
  verify(@Param('code') code: string) { return this.documents.verify(code); }
}

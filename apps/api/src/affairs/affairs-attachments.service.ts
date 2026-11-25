import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import type { AffairsUser } from './affairs.service.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { audit, loadRequestForAction } from './affairs-access.js';
import { notifyUsers } from './affairs-notifications.js';
import { isTerminal, type RequestStatus } from './affairs.rules.js';

export const MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;
export const MAX_ATTACHMENTS_PER_REQUEST = 10;

export interface UploadedBinary { buffer: Buffer; originalname: string; size: number }

// Allowed types are decided by the file content (magic bytes), not by the name or the declared type.
export function detectType(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  return null;
}

function safeName(name: string, ext: string) {
  const base = (name || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\.[^.]*$/, '').trim().slice(0, 80) || 'file';
  return `${base}.${ext}`;
}

@Injectable()
export class AffairsAttachmentsService {
  constructor(private readonly prisma: PrismaService, private readonly settings: AffairsSettingsService) {}

  private async validate(file: UploadedBinary | undefined) {
    if (!file || !file.buffer?.length) throw new BadRequestException('اختر ملفاً.');
    const maxMb = await this.settings.get<number>('maxAttachmentMb');
    if (file.buffer.length > Math.min(maxMb, 5) * 1024 * 1024) throw new BadRequestException(`حجم الملف أكبر من ${maxMb} ميغابايت.`);
    const type = detectType(file.buffer);
    if (!type) throw new BadRequestException('النوع غير مسموح: PDF أو JPG أو PNG فقط.');
    return type;
  }

  private async store(tx: any, requestId: string, file: UploadedBinary, user: AffairsUser, visibleToStudent: boolean) {
    const type = await this.validate(file);
    const count = await tx.studentRequestAttachment.count({ where: { requestId, isArchived: false } });
    if (count >= Math.min(await this.settings.get<number>('maxAttachmentsPerRequest'), MAX_ATTACHMENTS_PER_REQUEST)) throw new BadRequestException('وصلت للحد الأقصى من المرفقات لهذا الطلب.');
    const row = await tx.studentRequestAttachment.create({
      data: { requestId, fileName: safeName(file.originalname, type.ext), mimeType: type.mime, sizeBytes: file.buffer.length, data: file.buffer, visibleToStudent, uploadedByUserId: user.id },
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true, visibleToStudent: true, createdAt: true },
    });
    await tx.studentRequestEvent.create({ data: { requestId, type: 'ATTACHMENT_ADDED', note: row.fileName, visibleToStudent, actorUserId: user.id } });
    return row;
  }

  // Staff upload: only the assigned staff member or a system admin. Hidden from the student.
  async addByStaff(requestId: string, file: UploadedBinary | undefined, user: AffairsUser) {
    return this.prisma.$transaction(async (tx) => {
      const request = await loadRequestForAction(tx as never, requestId, user);
      if (isTerminal(request.status as RequestStatus)) throw new BadRequestException('الطلب منتهٍ ولا يمكن إضافة مرفقات.');
      const row = await this.store(tx, requestId, file as UploadedBinary, user, false);
      await audit(tx, 'AFFAIRS_ATTACHMENT_ADDED', requestId, user.id, { number: request.number, attachmentId: row.id, by: 'staff' });
      return row;
    });
  }

  // Student upload on their own open request. Visible to the student and staff.
  async addByStudent(requestId: string, file: UploadedBinary | undefined, user: AffairsUser) {
    return this.prisma.$transaction(async (tx) => {
      const student = await tx.student.findUnique({ where: { userId: user.id }, select: { id: true } });
      if (!student) throw new ForbiddenException('حسابك غير مرتبط بملف طالب.');
      const request = await tx.studentRequest.findFirst({ where: { id: requestId, studentId: student.id }, select: { id: true, number: true, status: true, assignedStaff: { select: { userId: true } } } });
      if (!request) throw new NotFoundException('الطلب غير موجود.');
      if (isTerminal(request.status as RequestStatus)) throw new BadRequestException('الطلب منتهٍ ولا يمكن إضافة مرفقات.');
      const row = await this.store(tx, requestId, file as UploadedBinary, user, true);
      await audit(tx, 'AFFAIRS_ATTACHMENT_ADDED', requestId, user.id, { number: request.number, attachmentId: row.id, by: 'student' });
      await notifyUsers(tx, [request.assignedStaff?.userId], { kind: 'ATTACHMENT_FROM_STUDENT', title: 'أضاف الطالب مرفقاً', body: `الطلب ${request.number}`, requestId });
      return row;
    });
  }

  // Archive (never delete) with a reason.
  async archive(requestId: string, attachmentId: string, reason: string, user: AffairsUser) {
    const why = (reason ?? '').trim();
    if (!why) throw new BadRequestException('سبب الأرشفة مطلوب.');
    return this.prisma.$transaction(async (tx) => {
      const request = await loadRequestForAction(tx as never, requestId, user);
      const att = await tx.studentRequestAttachment.findFirst({ where: { id: attachmentId, requestId, isArchived: false }, select: { id: true, fileName: true } });
      if (!att) throw new NotFoundException('المرفق غير موجود.');
      await tx.studentRequestAttachment.update({ where: { id: att.id }, data: { isArchived: true, archivedReason: why } });
      await tx.studentRequestEvent.create({ data: { requestId, type: 'ATTACHMENT_ARCHIVED', note: `${att.fileName}: ${why}`, visibleToStudent: false, actorUserId: user.id } });
      await audit(tx, 'AFFAIRS_ATTACHMENT_ARCHIVED', requestId, user.id, { number: request.number, attachmentId: att.id, reason: why });
      return { ok: true };
    });
  }

  // Staff download (any staff member may read, like the request itself).
  async downloadForStaff(requestId: string, attachmentId: string) {
    const att = await this.prisma.studentRequestAttachment.findFirst({ where: { id: attachmentId, requestId, isArchived: false } });
    if (!att) throw new NotFoundException('المرفق غير موجود.');
    return att;
  }

  // Student download: own request and only attachments marked visible.
  async downloadForStudent(requestId: string, attachmentId: string, user: AffairsUser) {
    const att = await this.prisma.studentRequestAttachment.findFirst({
      where: { id: attachmentId, requestId, isArchived: false, visibleToStudent: true, request: { student: { userId: user.id } } },
    });
    if (!att) throw new NotFoundException('المرفق غير موجود.');
    return att;
  }
}

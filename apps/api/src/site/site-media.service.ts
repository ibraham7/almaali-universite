import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { MAX_MEDIA_BYTES } from './site.constants.js';

export interface UploadedBinary { buffer: Buffer; originalname: string; size: number }

// النوع يُحدَّد من محتوى الملف (أول بايتات) لا من اسمه ولا من النوع المعلن. المسموح: PDF وJPG وPNG وWebP.
export function detectMedia(buffer: Buffer): { mime: string; ext: string } | null {
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('latin1') === '%PDF-') return { mime: 'application/pdf', ext: 'pdf' };
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { mime: 'image/png', ext: 'png' };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('latin1') === 'RIFF' && buffer.subarray(8, 12).toString('latin1') === 'WEBP') return { mime: 'image/webp', ext: 'webp' };
  return null;
}

function safeName(name: string, ext: string) {
  const base = (name || 'file').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/\.[^.]*$/, '').trim().slice(0, 80) || 'file';
  return `${base}.${ext}`;
}

@Injectable()
export class SiteMediaService {
  constructor(private readonly prisma: PrismaService) {}

  async upload(file: UploadedBinary | undefined, altText: string | undefined, userId: string) {
    if (!file || !file.buffer?.length) throw new BadRequestException('اختر ملفاً.');
    if (file.buffer.length > MAX_MEDIA_BYTES) throw new BadRequestException(`حجم الملف أكبر من ${MAX_MEDIA_BYTES / 1024 / 1024} ميغابايت.`);
    const type = detectMedia(file.buffer);
    if (!type) throw new BadRequestException('النوع غير مسموح: PDF أو JPG أو PNG أو WebP فقط.');
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.siteMedia.create({
        data: { fileName: safeName(file.originalname, type.ext), mimeType: type.mime, sizeBytes: file.buffer.length, data: new Uint8Array(file.buffer), altText: altText?.trim().slice(0, 250) || null, uploadedById: userId },
        select: { id: true, fileName: true, mimeType: true, sizeBytes: true, altText: true, createdAt: true },
      });
      await tx.auditLog.create({ data: { action: 'SITE_MEDIA_UPLOADED', entity: 'SiteMedia', entityId: row.id, userId, details: JSON.stringify({ fileName: row.fileName, mime: row.mimeType, size: row.sizeBytes }) } });
      return row;
    });
  }

  list(includeArchived = false) {
    return this.prisma.siteMedia.findMany({
      where: includeArchived ? {} : { isArchived: false }, orderBy: { createdAt: 'desc' }, take: 200,
      select: { id: true, fileName: true, mimeType: true, sizeBytes: true, altText: true, isArchived: true, createdAt: true },
    });
  }

  async updateAlt(id: string, altText: string | undefined, userId: string) {
    const found = await this.prisma.siteMedia.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('الملف غير موجود.');
    return this.prisma.siteMedia.update({ where: { id }, data: { altText: altText?.trim().slice(0, 250) || null }, select: { id: true, altText: true } })
      .then(async (row) => { await this.prisma.auditLog.create({ data: { action: 'SITE_MEDIA_UPDATED', entity: 'SiteMedia', entityId: id, userId } }); return row; });
  }

  // أرشفة لا حذف: الملف يبقى بالقاعدة لكنه لا يُخدم للعامة.
  async setArchived(id: string, archived: boolean, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.siteMedia.findUnique({ where: { id }, select: { id: true, fileName: true } });
      if (!found) throw new NotFoundException('الملف غير موجود.');
      await tx.siteMedia.update({ where: { id }, data: { isArchived: archived } });
      await tx.auditLog.create({ data: { action: archived ? 'SITE_MEDIA_ARCHIVED' : 'SITE_MEDIA_RESTORED', entity: 'SiteMedia', entityId: id, userId, details: JSON.stringify({ fileName: found.fileName }) } });
      return { id, isArchived: archived };
    });
  }

  // خدمة الملف للعامة: غير المؤرشف فقط.
  async serve(id: string) {
    const row = await this.prisma.siteMedia.findFirst({ where: { id, isArchived: false }, select: { fileName: true, mimeType: true, data: true } });
    if (!row) throw new NotFoundException('الملف غير موجود.');
    return { fileName: row.fileName, mimeType: row.mimeType, data: Buffer.from(row.data) };
  }

  // يتأكد أن معرّف صورة صالح (موجود وغير مؤرشف وصورة) قبل ربطه بمحتوى.
  async assertImage(id: string | null | undefined) {
    if (!id) return null;
    const row = await this.prisma.siteMedia.findFirst({ where: { id, isArchived: false }, select: { id: true, mimeType: true } });
    if (!row || !row.mimeType.startsWith('image/')) throw new BadRequestException('الصورة المختارة غير موجودة أو ليست صورة.');
    return row.id;
  }
}

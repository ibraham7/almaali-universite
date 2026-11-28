import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { SiteMediaService } from './site-media.service.js';
import { SETTING_DEFS, SETTING_KEYS } from './site.constants.js';
import { ENTRY_CATEGORIES, MAX_GALLERY, MAX_VIDEOS, VIDEO_FILE_RE, YOUTUBE_RE } from './site.constants.js';
import type { CreateEntryDto, UpdateEntryDto, CreateItemDto, CreateNewsDto, CreateTestimonialDto, UpdateItemDto, UpdateNewsDto, UpdateTestimonialDto, UpsertProfileDto } from './dto/site.dto.js';

type Status = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
const PROFILE_KINDS = ['COLLEGE', 'DEPARTMENT', 'PROGRAM'] as const;

// إدارة محتوى الموقع (مدير النظام فقط). لا حذف نهائي: كل تغيير حالة يُسجَّل بالتدقيق.
@Injectable()
export class SiteAdminService {
  constructor(private readonly prisma: PrismaService, private readonly media: SiteMediaService) {}

  private audit(tx: any, action: string, entity: string, entityId: string, userId: string, details?: Record<string, unknown>) {
    return tx.auditLog.create({ data: { action, entity, entityId, userId, details: details ? JSON.stringify(details) : undefined } });
  }

  // ---------- النصوص المفردة ----------
  async getSettings() {
    const rows = await this.prisma.siteSetting.findMany();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { defs: SETTING_DEFS, values };
  }

  async updateSettings(input: Record<string, string>, userId: string) {
    const entries = Object.entries(input);
    for (const [key, raw] of entries) {
      const def = SETTING_DEFS.find((item) => item.key === key);
      if (!def || !SETTING_KEYS.has(key)) throw new BadRequestException(`حقل غير معروف: ${key}`);
      if (typeof raw !== 'string') throw new BadRequestException(`قيمة غير صالحة: ${def.label}`);
      if (raw.length > def.max) throw new BadRequestException(`«${def.label}» أطول من ${def.max} حرفًا.`);
      const value = raw.trim();
      if (value && def.kind === 'url' && !/^https:\/\/[^\s]+$/i.test(value)) throw new BadRequestException(`«${def.label}» يجب أن يكون رابط https.`);
      if (value && def.key === 'contactEmail' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) throw new BadRequestException('البريد الإلكتروني غير صالح.');
      if (value && def.kind === 'media') await this.media.assertImage(value);
    }
    return this.prisma.$transaction(async (tx) => {
      for (const [key, raw] of entries) {
        const value = raw.trim();
        await tx.siteSetting.upsert({ where: { key }, update: { value, updatedById: userId }, create: { key, value, updatedById: userId } });
      }
      await this.audit(tx, 'SITE_SETTINGS_UPDATED', 'SiteSetting', 'settings', userId, { keys: entries.map(([key]) => key) });
      return { updated: entries.length };
    });
  }

  // ---------- عناصر المحتوى (أرقام، قيم، أهداف، مراحل، خطوات، أسئلة) ----------
  listItems(kind?: string) {
    return this.prisma.siteContentItem.findMany({ where: kind ? { kind: kind as 'FAQ' } : {}, orderBy: [{ kind: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }] });
  }

  // الهيكل التنظيمي: «الحقل الإضافي» معرّف الوحدة الأعلى (فارغ للجذر). الرابط السريع: مسار داخلي أو https.
  private async checkItemExtra(kind: string, extra: string | undefined, selfId?: string) {
    const value = extra?.trim() ?? '';
    if (kind === 'QUICK_LINK') {
      if (!value || !(/^\/(?!\/)/.test(value) || /^https:\/\/[^\s]+$/i.test(value))) throw new BadRequestException('الرابط يجب أن يبدأ بـ / (صفحة داخلية) أو https://');
    }
    if (kind === 'ORG_NODE' && value) {
      if (value === selfId) throw new BadRequestException('لا يمكن جعل الوحدة تابعة لنفسها.');
      let cursor: string | null = value;
      for (let depth = 0; cursor && depth < 12; depth += 1) {
        const parent: { id: string; kind: string; extra: string | null } | null = await this.prisma.siteContentItem.findUnique({ where: { id: cursor }, select: { id: true, kind: true, extra: true } });
        if (!parent || parent.kind !== 'ORG_NODE') throw new BadRequestException('الوحدة الأعلى غير موجودة.');
        if (selfId && parent.extra === selfId) throw new BadRequestException('هذا الاختيار يُنشئ حلقة مغلقة في الهيكل.');
        cursor = parent.extra;
      }
    }
  }

  async createItem(dto: CreateItemDto, userId: string) {
    await this.checkItemExtra(dto.kind, dto.extra);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.siteContentItem.create({ data: { kind: dto.kind, title: dto.title.trim(), text: dto.text?.trim() ?? '', extra: dto.extra?.trim() || null, sortOrder: dto.sortOrder ?? 0, status: dto.status ?? 'PUBLISHED', updatedById: userId } });
      await this.audit(tx, 'SITE_ITEM_CREATED', 'SiteContentItem', item.id, userId, { kind: item.kind, title: item.title });
      return item;
    });
  }

  async updateItem(id: string, dto: UpdateItemDto, userId: string) {
    const found = await this.prisma.siteContentItem.findUnique({ where: { id }, select: { id: true, kind: true } });
    if (!found) throw new NotFoundException('العنصر غير موجود.');
    if (dto.extra !== undefined) await this.checkItemExtra(found.kind, dto.extra, id);
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.siteContentItem.update({ where: { id }, data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}), ...(dto.text !== undefined ? { text: dto.text.trim() } : {}),
        ...(dto.extra !== undefined ? { extra: dto.extra.trim() || null } : {}), ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}), updatedById: userId,
      } });
      await this.audit(tx, 'SITE_ITEM_UPDATED', 'SiteContentItem', id, userId);
      return item;
    });
  }

  async setItemStatus(id: string, status: Status, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.siteContentItem.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!found) throw new NotFoundException('العنصر غير موجود.');
      const item = await tx.siteContentItem.update({ where: { id }, data: { status, updatedById: userId } });
      await this.audit(tx, 'SITE_ITEM_STATUS', 'SiteContentItem', id, userId, { from: found.status, to: status });
      return item;
    });
  }

  // ---------- الأخبار والإعلانات ----------
  listNews() {
    return this.prisma.siteNews.findMany({ orderBy: [{ createdAt: 'desc' }], take: 300 });
  }

  async createNews(dto: CreateNewsDto, userId: string) {
    const coverMediaId = await this.media.assertImage(dto.coverMediaId);
    return this.prisma.$transaction(async (tx) => {
      const news = await tx.siteNews.create({ data: { type: dto.type ?? 'NEWS', title: dto.title.trim(), category: dto.category?.trim() ?? '', summary: dto.summary?.trim() ?? '', body: dto.body?.trim() ?? '', coverMediaId, status: 'DRAFT', updatedById: userId } });
      await this.audit(tx, 'SITE_NEWS_CREATED', 'SiteNews', news.id, userId, { title: news.title });
      return news;
    });
  }

  async updateNews(id: string, dto: UpdateNewsDto, userId: string) {
    const found = await this.prisma.siteNews.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('الخبر غير موجود.');
    const coverMediaId = dto.coverMediaId === undefined ? undefined : await this.media.assertImage(dto.coverMediaId);
    return this.prisma.$transaction(async (tx) => {
      const news = await tx.siteNews.update({ where: { id }, data: {
        ...(dto.type !== undefined ? { type: dto.type } : {}), ...(dto.title !== undefined ? { title: dto.title.trim() } : {}),
        ...(dto.category !== undefined ? { category: dto.category.trim() } : {}), ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}), ...(dto.body !== undefined ? { body: dto.body.trim() } : {}),
        ...(coverMediaId !== undefined ? { coverMediaId } : {}), updatedById: userId,
      } });
      await this.audit(tx, 'SITE_NEWS_UPDATED', 'SiteNews', id, userId);
      return news;
    });
  }

  // النشر يضع تاريخ النشر أول مرة. الأرشفة تخفيه من العامة ويمكن إعادته.
  async setNewsStatus(id: string, status: Status, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.siteNews.findUnique({ where: { id }, select: { id: true, status: true, publishedAt: true, title: true } });
      if (!found) throw new NotFoundException('الخبر غير موجود.');
      if (status === 'PUBLISHED' && !found.title.trim()) throw new BadRequestException('اكتب عنوان الخبر قبل النشر.');
      const news = await tx.siteNews.update({ where: { id }, data: { status, updatedById: userId, ...(status === 'PUBLISHED' && !found.publishedAt ? { publishedAt: new Date() } : {}) } });
      await this.audit(tx, 'SITE_NEWS_STATUS', 'SiteNews', id, userId, { from: found.status, to: status });
      return news;
    });
  }

  // ---------- الشهادات ----------
  listTestimonials() {
    return this.prisma.siteTestimonial.findMany({ orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }] });
  }

  createTestimonial(dto: CreateTestimonialDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.siteTestimonial.create({ data: { text: dto.text.trim(), name: dto.name.trim(), role: dto.role?.trim() ?? '', sortOrder: dto.sortOrder ?? 0, status: 'DRAFT', updatedById: userId } });
      await this.audit(tx, 'SITE_TESTIMONIAL_CREATED', 'SiteTestimonial', row.id, userId);
      return row;
    });
  }

  async updateTestimonial(id: string, dto: UpdateTestimonialDto, userId: string) {
    const found = await this.prisma.siteTestimonial.findUnique({ where: { id }, select: { id: true } });
    if (!found) throw new NotFoundException('الشهادة غير موجودة.');
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.siteTestimonial.update({ where: { id }, data: {
        ...(dto.text !== undefined ? { text: dto.text.trim() } : {}), ...(dto.name !== undefined ? { name: dto.name.trim() } : {}),
        ...(dto.role !== undefined ? { role: dto.role.trim() } : {}), ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}), updatedById: userId,
      } });
      await this.audit(tx, 'SITE_TESTIMONIAL_UPDATED', 'SiteTestimonial', id, userId);
      return row;
    });
  }

  async setTestimonialStatus(id: string, status: Status, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.siteTestimonial.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!found) throw new NotFoundException('الشهادة غير موجودة.');
      const row = await tx.siteTestimonial.update({ where: { id }, data: { status, updatedById: userId } });
      await this.audit(tx, 'SITE_TESTIMONIAL_STATUS', 'SiteTestimonial', id, userId, { from: found.status, to: status });
      return row;
    });
  }

  // ---------- الكليات والأقسام والبرامج (الأسماء من الهيكل الأكاديمي، والنبذة والصورة والظهور من الموقع) ----------
  async academic() {
    const [colleges, profiles] = await Promise.all([
      this.prisma.college.findMany({
        where: { isActive: true }, orderBy: { createdAt: 'asc' },
        select: { id: true, nameAr: true, departments: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, nameAr: true, programs: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, nameAr: true } } } } },
      }),
      this.prisma.siteAcademicProfile.findMany(),
    ]);
    const profile = (kind: string, refId: string) => {
      const row = profiles.find((item) => item.kind === kind && item.refId === refId);
      return { summary: row?.summary ?? '', details: row?.details ?? '', mediaId: row?.mediaId ?? null, sortOrder: row?.sortOrder ?? 0, // الكلية لا تظهر إلا بقرار صريح، أما القسم والبرنامج فيظهران تحت كلية ظاهرة ما لم يُخفَيا
      isVisible: row?.isVisible ?? kind !== 'COLLEGE', saved: Boolean(row) };
    };
    return colleges.map((college) => ({
      id: college.id, nameAr: college.nameAr, ...profile('COLLEGE', college.id),
      departments: college.departments.map((department) => ({
        id: department.id, nameAr: department.nameAr, ...profile('DEPARTMENT', department.id),
        programs: department.programs.map((program) => ({ id: program.id, nameAr: program.nameAr, ...profile('PROGRAM', program.id) })),
      })),
    }));
  }

  async upsertProfile(kind: string, refId: string, dto: UpsertProfileDto, userId: string) {
    if (!(PROFILE_KINDS as readonly string[]).includes(kind)) throw new BadRequestException('نوع غير معروف.');
    const exists = kind === 'COLLEGE' ? await this.prisma.college.findUnique({ where: { id: refId }, select: { id: true } })
      : kind === 'DEPARTMENT' ? await this.prisma.department.findUnique({ where: { id: refId }, select: { id: true } })
        : await this.prisma.program.findUnique({ where: { id: refId }, select: { id: true } });
    if (!exists) throw new NotFoundException('العنصر غير موجود بالهيكل الأكاديمي.');
    const mediaId = dto.mediaId === undefined ? undefined : await this.media.assertImage(dto.mediaId);
    return this.prisma.$transaction(async (tx) => {
      const data = {
        ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}), ...(dto.details !== undefined ? { details: dto.details.trim() } : {}), ...(mediaId !== undefined ? { mediaId } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}), ...(dto.isVisible !== undefined ? { isVisible: dto.isVisible } : {}), updatedById: userId,
      };
      const row = await tx.siteAcademicProfile.upsert({ where: { kind_refId: { kind: kind as 'COLLEGE', refId } }, update: data, create: { kind: kind as 'COLLEGE', refId, isVisible: kind !== 'COLLEGE', ...data } });
      await this.audit(tx, 'SITE_PROFILE_UPDATED', 'SiteAcademicProfile', row.id, userId, { kind, refId, isVisible: row.isVisible });
      return row;
    });
  }

  // ---------- رسائل التواصل ----------
  listMessages(status?: string) {
    return this.prisma.siteContactMessage.findMany({ where: status ? { status: status as 'NEW' } : {}, orderBy: { createdAt: 'desc' }, take: 300, select: { id: true, name: true, contact: true, subject: true, message: true, status: true, createdAt: true, handledAt: true } });
  }

  async setMessageStatus(id: string, status: 'NEW' | 'READ' | 'ARCHIVED', userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.siteContactMessage.findUnique({ where: { id }, select: { id: true, status: true } });
      if (!found) throw new NotFoundException('الرسالة غير موجودة.');
      const row = await tx.siteContactMessage.update({ where: { id }, data: { status, handledById: status === 'NEW' ? null : userId, handledAt: status === 'NEW' ? null : new Date() }, select: { id: true, status: true } });
      await this.audit(tx, 'SITE_MESSAGE_STATUS', 'SiteContactMessage', id, userId, { from: found.status, to: status });
      return row;
    });
  }

  // ---------- الفعاليات والبحث العلمي والخريجون والحياة الجامعية ----------
  listEntries(kind?: string) {
    return this.prisma.siteEntry.findMany({ where: kind ? { kind: kind as 'EVENT' } : {}, orderBy: [{ kind: 'asc' }, { startsAt: 'desc' }, { createdAt: 'desc' }], take: 500 });
  }

  private parseDate(value: string | null | undefined, label: string) {
    if (value === undefined) return undefined;
    if (value === null || value === '') return null;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new BadRequestException(`${label} غير صحيح.`);
    return date;
  }

  private async gallery(ids: string[] | undefined) {
    if (ids === undefined) return undefined;
    const unique = [...new Set(ids)].slice(0, MAX_GALLERY);
    if (unique.length === 0) return [];
    const rows = await this.prisma.siteMedia.findMany({ where: { id: { in: unique }, isArchived: false, mimeType: { startsWith: 'image/' } }, select: { id: true } });
    if (rows.length !== unique.length) throw new BadRequestException('إحدى صور المعرض غير موجودة أو مؤرشفة.');
    return unique;
  }

  private checkVideos(list: string[] | undefined) {
    if (list === undefined) return undefined;
    const clean = [...new Set(list.map((value) => value.trim()).filter(Boolean))];
    if (clean.length > MAX_VIDEOS) throw new BadRequestException(`الحد الأقصى ${MAX_VIDEOS} روابط فيديو.`);
    for (const link of clean) if (!YOUTUBE_RE.test(link) && !VIDEO_FILE_RE.test(link)) throw new BadRequestException('رابط الفيديو يجب أن يكون من يوتيوب أو ملف mp4/webm/ogg بعنوان https.');
    return clean;
  }

  private checkCategory(kind: string, category: string | undefined) {
    const allowed = ENTRY_CATEGORIES[kind as keyof typeof ENTRY_CATEGORIES] ?? [];
    if (category && allowed.length > 0 && !allowed.includes(category)) throw new BadRequestException('التصنيف غير معروف لهذا النوع.');
  }

  private checkDates(startsAt: Date | null | undefined, endsAt: Date | null | undefined) {
    if (startsAt && endsAt && endsAt < startsAt) throw new BadRequestException('تاريخ النهاية قبل تاريخ البداية.');
  }

  async createEntry(dto: CreateEntryDto, userId: string) {
    this.checkCategory(dto.kind, dto.category?.trim());
    const startsAt = this.parseDate(dto.startsAt, 'تاريخ البداية');
    const endsAt = this.parseDate(dto.endsAt, 'تاريخ النهاية');
    this.checkDates(startsAt, endsAt);
    const coverMediaId = await this.media.assertImage(dto.coverMediaId);
    const galleryIds = (await this.gallery(dto.galleryIds)) ?? [];
    const videos = this.checkVideos(dto.videos) ?? [];
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.siteEntry.create({ data: {
        kind: dto.kind, category: dto.category?.trim() ?? '', title: dto.title.trim(), summary: dto.summary?.trim() ?? '', body: dto.body?.trim() ?? '', location: dto.location?.trim() ?? '',
        startsAt: startsAt ?? null, endsAt: endsAt ?? null, coverMediaId, galleryIds, videos, sortOrder: dto.sortOrder ?? 0, status: 'DRAFT', updatedById: userId,
      } });
      await this.audit(tx, 'SITE_ENTRY_CREATED', 'SiteEntry', row.id, userId, { kind: row.kind, title: row.title });
      return row;
    });
  }

  async updateEntry(id: string, dto: UpdateEntryDto, userId: string) {
    const found = await this.prisma.siteEntry.findUnique({ where: { id }, select: { id: true, kind: true, startsAt: true, endsAt: true } });
    if (!found) throw new NotFoundException('العنصر غير موجود.');
    this.checkCategory(found.kind, dto.category?.trim());
    const startsAt = this.parseDate(dto.startsAt, 'تاريخ البداية');
    const endsAt = this.parseDate(dto.endsAt, 'تاريخ النهاية');
    this.checkDates(startsAt === undefined ? found.startsAt : startsAt, endsAt === undefined ? found.endsAt : endsAt);
    const coverMediaId = dto.coverMediaId === undefined ? undefined : await this.media.assertImage(dto.coverMediaId);
    const galleryIds = await this.gallery(dto.galleryIds);
    const videos = this.checkVideos(dto.videos);
    return this.prisma.$transaction(async (tx) => {
      const row = await tx.siteEntry.update({ where: { id }, data: {
        ...(dto.title !== undefined ? { title: dto.title.trim() } : {}), ...(dto.category !== undefined ? { category: dto.category.trim() } : {}),
        ...(dto.summary !== undefined ? { summary: dto.summary.trim() } : {}), ...(dto.body !== undefined ? { body: dto.body.trim() } : {}), ...(dto.location !== undefined ? { location: dto.location.trim() } : {}),
        ...(startsAt !== undefined ? { startsAt } : {}), ...(endsAt !== undefined ? { endsAt } : {}), ...(coverMediaId !== undefined ? { coverMediaId } : {}),
        ...(galleryIds !== undefined ? { galleryIds } : {}), ...(videos !== undefined ? { videos } : {}), ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}), updatedById: userId,
      } });
      await this.audit(tx, 'SITE_ENTRY_UPDATED', 'SiteEntry', id, userId);
      return row;
    });
  }

  async setEntryStatus(id: string, status: Status, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.siteEntry.findUnique({ where: { id }, select: { id: true, status: true, publishedAt: true, title: true, kind: true, startsAt: true } });
      if (!found) throw new NotFoundException('العنصر غير موجود.');
      if (status === 'PUBLISHED' && !found.title.trim()) throw new BadRequestException('اكتب العنوان قبل النشر.');
      if (status === 'PUBLISHED' && found.kind === 'EVENT' && !found.startsAt) throw new BadRequestException('حدّد تاريخ الفعالية قبل النشر.');
      const row = await tx.siteEntry.update({ where: { id }, data: { status, updatedById: userId, ...(status === 'PUBLISHED' && !found.publishedAt ? { publishedAt: new Date() } : {}) } });
      await this.audit(tx, 'SITE_ENTRY_STATUS', 'SiteEntry', id, userId, { from: found.status, to: status });
      return row;
    });
  }

  // الحذف النهائي مسموح لهذه الأنواع (الفعاليات وغيرها) ويُسجَّل بالتدقيق.
  async deleteEntry(id: string, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const found = await tx.siteEntry.findUnique({ where: { id }, select: { id: true, title: true, kind: true } });
      if (!found) throw new NotFoundException('العنصر غير موجود.');
      await tx.siteEntry.delete({ where: { id } });
      await this.audit(tx, 'SITE_ENTRY_DELETED', 'SiteEntry', id, userId, { kind: found.kind, title: found.title });
      return { ok: true };
    });
  }
}

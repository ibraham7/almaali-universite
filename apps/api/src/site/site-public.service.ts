import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { ENTRY_KINDS, SETTING_DEFS } from './site.constants.js';
import type { ContactMessageDto, GraduateUpdateDto } from './dto/site.dto.js';

export interface OrgNode { name: string; role: string; children: OrgNode[] }

const ENTRY_CARD = { id: true, kind: true, category: true, title: true, summary: true, location: true, startsAt: true, endsAt: true, coverMediaId: true, publishedAt: true, galleryIds: true, videos: true } as const;
// نخرج عدد الصور والفيديوهات بدل القوائم في البطاقات
const card = <T extends { galleryIds: string[]; videos: string[] }>(row: T) => { const { galleryIds, videos, ...rest } = row; return { ...rest, imageCount: galleryIds.length, videoCount: videos.length }; };

const PUBLIC_SETTING_KEYS = new Set(SETTING_DEFS.map((def) => def.key));

// القراءة العامة للموقع (بلا تسجيل دخول): المنشور فقط، وبالحد الأدنى من الحقول. لا شيء يُخترع: ما ليس له بيانات لا يُرجَع.
@Injectable()
export class SitePublicService {
  constructor(private readonly prisma: PrismaService) {}

  private items(rows: Array<{ kind: string; title: string; text: string; extra: string | null }>, kind: string) {
    return rows.filter((row) => row.kind === kind).map((row) => ({ title: row.title, text: row.text, extra: row.extra }));
  }

  // الهيكل التنظيمي: كل وحدة تشير إلى أعلاها بالحقل الإضافي. ما لا أب له (أو أبوه غير موجود) جذر.
  private orgTree(rows: Array<{ kind: string; id?: string; title: string; text: string; extra: string | null }>) {
    const nodes = rows.filter((row) => row.kind === 'ORG_NODE') as Array<{ id: string; title: string; text: string; extra: string | null }>;
    const byId = new Map<string, OrgNode>(nodes.map((row) => [row.id, { name: row.title, role: row.text, children: [] }]));
    const roots: OrgNode[] = [];
    for (const row of nodes) {
      const parent = row.extra ? byId.get(row.extra) : undefined;
      if (parent) parent.children.push(byId.get(row.id)!); else roots.push(byId.get(row.id)!);
    }
    return roots;
  }

  async content() {
    const [settings, items, testimonials, news, announcements, profiles, colleges, entryCounts, nextEvent] = await Promise.all([
      this.prisma.siteSetting.findMany(),
      this.prisma.siteContentItem.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { id: true, kind: true, title: true, text: true, extra: true } }),
      this.prisma.siteTestimonial.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], select: { text: true, name: true, role: true } }),
      this.prisma.siteNews.findMany({ where: { status: 'PUBLISHED', type: 'NEWS' }, orderBy: { publishedAt: 'desc' }, take: 3, select: { id: true, type: true, title: true, category: true, summary: true, coverMediaId: true, publishedAt: true } }),
      this.prisma.siteNews.findMany({ where: { status: 'PUBLISHED', type: 'ANNOUNCEMENT' }, orderBy: { publishedAt: 'desc' }, take: 5, select: { id: true, type: true, title: true, category: true, summary: true, coverMediaId: true, publishedAt: true } }),
      this.prisma.siteAcademicProfile.findMany(),
      this.prisma.college.findMany({
        where: { isActive: true }, orderBy: { createdAt: 'asc' },
        select: { id: true, nameAr: true, departments: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, nameAr: true, programs: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, nameAr: true, level: true } } } } },
      }),
      this.prisma.siteEntry.groupBy({ by: ['kind'], where: { status: 'PUBLISHED' }, _count: { _all: true } }),
      this.prisma.siteEntry.findMany({ where: { status: 'PUBLISHED', kind: 'EVENT', OR: [{ startsAt: { gte: new Date() } }, { endsAt: { gte: new Date() } }] }, orderBy: { startsAt: 'asc' }, take: 3, select: ENTRY_CARD }),
    ]);
    const values: Record<string, string> = {};
    for (const row of settings) if (PUBLIC_SETTING_KEYS.has(row.key) && row.value.trim()) values[row.key] = row.value;
    const profile = (kind: string, refId: string) => profiles.find((item) => item.kind === kind && item.refId === refId);
    // الكلية لا تظهر إلا بقرار صريح. القسم/البرنامج يظهران تحت كلية ظاهرة إلا إذا أُخفيا صراحة.
    const visibleColleges = colleges
      .filter((college) => profile('COLLEGE', college.id)?.isVisible)
      .sort((a, b) => (profile('COLLEGE', a.id)?.sortOrder ?? 0) - (profile('COLLEGE', b.id)?.sortOrder ?? 0))
      .map((college) => ({
        id: college.id, nameAr: college.nameAr, summary: profile('COLLEGE', college.id)?.summary ?? '', details: profile('COLLEGE', college.id)?.details ?? '', mediaId: profile('COLLEGE', college.id)?.mediaId ?? null,
        departments: college.departments.filter((department) => profile('DEPARTMENT', department.id)?.isVisible !== false).map((department) => ({
          nameAr: department.nameAr, summary: profile('DEPARTMENT', department.id)?.summary ?? '',
          programs: department.programs.filter((program) => profile('PROGRAM', program.id)?.isVisible !== false).map((program) => ({ nameAr: program.nameAr, summary: profile('PROGRAM', program.id)?.summary ?? '' })),
        })),
      }));
    return {
      settings: values,
      stats: this.items(items, 'STAT'), values: this.items(items, 'VALUE'), goals: this.items(items, 'GOAL'), milestones: this.items(items, 'MILESTONE'),
      admissionSteps: this.items(items, 'ADMISSION_STEP'), faq: this.items(items, 'FAQ'), newsCategories: this.items(items, 'NEWS_CATEGORY').map((row) => row.title),
      entryCounts: Object.fromEntries(entryCounts.map((row) => [row.kind, row._count._all])), upcomingEvents: nextEvent.map(card), orgTree: this.orgTree(items), quickLinks: this.items(items, 'QUICK_LINK'),
      colleges: visibleColleges, testimonials, latestNews: news, latestAnnouncements: announcements,
    };
  }

  // type: خبر أو إعلان. q: بحث بالعنوان والملخص (حد أقصى 80 حرفًا).
  async newsList(page = 1, pageSize = 9, type?: string, q?: string, category?: string) {
    const take = Math.min(Math.max(pageSize, 1), 24);
    const skip = (Math.max(page, 1) - 1) * take;
    const term = q?.trim().slice(0, 80);
    const where = {
      status: 'PUBLISHED' as const,
      ...(type === 'NEWS' || type === 'ANNOUNCEMENT' ? { type: type as 'NEWS' | 'ANNOUNCEMENT' } : {}),
      ...(category?.trim() ? { category: category.trim().slice(0, 120) } : {}),
      ...(term ? { OR: [{ title: { contains: term, mode: 'insensitive' as const } }, { summary: { contains: term, mode: 'insensitive' as const } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.siteNews.count({ where }),
      this.prisma.siteNews.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take, select: { id: true, type: true, title: true, category: true, summary: true, coverMediaId: true, publishedAt: true } }),
    ]);
    return { total, page: Math.max(page, 1), pageSize: take, items: rows };
  }

  async newsOne(id: string) {
    const row = await this.prisma.siteNews.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true, type: true, title: true, category: true, summary: true, body: true, coverMediaId: true, publishedAt: true } });
    if (!row) throw new NotFoundException('الخبر غير موجود.');
    return row;
  }

  // رسالة من نموذج التواصل: حقل الفخ يجب أن يبقى فارغًا (وإلا نتجاهلها بصمت)، ولا يُحفظ العنوان الخام لصاحبها.
  async submitMessage(dto: ContactMessageDto, ip: string) {
    const name = dto.name.trim();
    const contact = dto.contact.trim();
    const message = dto.message.trim();
    if (!name || !contact || !message) throw new BadRequestException('أكمل الاسم ووسيلة التواصل والرسالة.');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact) && !/^[+\d][\d\s()-]{6,}$/.test(contact)) throw new BadRequestException('اكتب بريدًا إلكترونيًا أو رقم هاتف صحيحًا.');
    if (dto.website?.trim()) return { ok: true };
    const secret = process.env.JWT_SECRET ?? 'site';
    await this.prisma.siteContactMessage.create({ data: { name, contact, subject: dto.subject?.trim() ?? '', message, ipHash: createHash('sha256').update(`${secret}:${ip}`).digest('hex') } });
    return { ok: true };
  }

  // قائمة عامة لنوع واحد. الفعاليات: when=upcoming|past (حسب تاريخ البداية)، وغيرها بترتيب الإدخال ثم الأحدث.
  async entriesList(kind: string, page = 1, pageSize = 9, opts: { when?: string; category?: string; q?: string } = {}) {
    if (!(ENTRY_KINDS as readonly string[]).includes(kind)) throw new NotFoundException();
    const take = Math.min(Math.max(pageSize, 1), 24);
    const skip = (Math.max(page, 1) - 1) * take;
    const now = new Date();
    const isEvent = kind === 'EVENT';
    const term = opts.q?.trim().slice(0, 80);
    const and: object[] = [];
    if (isEvent) and.push(opts.when === 'past' ? { startsAt: { lt: now }, NOT: { endsAt: { gte: now } } } : { OR: [{ startsAt: { gte: now } }, { endsAt: { gte: now } }] });
    if (term) and.push({ OR: [{ title: { contains: term, mode: 'insensitive' } }, { summary: { contains: term, mode: 'insensitive' } }, { location: { contains: term, mode: 'insensitive' } }] });
    const base = { kind: kind as 'EVENT', status: 'PUBLISHED' as const };
    const where = { ...base, ...(opts.category?.trim() ? { category: opts.category.trim().slice(0, 120) } : {}), AND: and };
    const orderBy = isEvent ? [{ startsAt: opts.when === 'past' ? ('desc' as const) : ('asc' as const) }] : [{ sortOrder: 'asc' as const }, { publishedAt: 'desc' as const }];
    const [total, rows, cats] = await Promise.all([
      this.prisma.siteEntry.count({ where }),
      this.prisma.siteEntry.findMany({ where, orderBy, skip, take, select: ENTRY_CARD }),
      this.prisma.siteEntry.findMany({ where: { ...base, category: { not: '' } }, distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' }, take: 40 }),
    ]);
    return { total, page: Math.max(page, 1), pageSize: take, items: rows.map(card), categories: cats.map((row) => row.category) };
  }

  async entryOne(id: string) {
    const row = await this.prisma.siteEntry.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true, kind: true, category: true, title: true, summary: true, body: true, location: true, startsAt: true, endsAt: true, coverMediaId: true, galleryIds: true, videos: true, publishedAt: true } });
    if (!row) throw new NotFoundException('غير موجود.');
    return row;
  }

  // نموذج تحديث بيانات الخريج: يصل صندوق رسائل الموقع بعنوان ثابت.
  async submitGraduateUpdate(dto: GraduateUpdateDto, ip: string) {
    const lines = [
      dto.graduationYear?.trim() && `سنة التخرج: ${dto.graduationYear.trim()}`,
      dto.program?.trim() && `البرنامج/الاختصاص: ${dto.program.trim()}`,
      dto.workplace?.trim() && `العمل الحالي: ${dto.workplace.trim()}`,
      dto.message?.trim(),
    ].filter(Boolean) as string[];
    return this.submitMessage({ name: dto.name, contact: dto.contact, subject: 'تحديث بيانات خريج', message: lines.join('\n') || 'طلب تحديث بيانات خريج', website: dto.website } as ContactMessageDto, ip);
  }
}

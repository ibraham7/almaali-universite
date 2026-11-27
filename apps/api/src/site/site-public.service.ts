import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { SETTING_DEFS } from './site.constants.js';
import type { ContactMessageDto } from './dto/site.dto.js';

const PUBLIC_SETTING_KEYS = new Set(SETTING_DEFS.map((def) => def.key));

// القراءة العامة للموقع (بلا تسجيل دخول): المنشور فقط، وبالحد الأدنى من الحقول. لا شيء يُخترع: ما ليس له بيانات لا يُرجَع.
@Injectable()
export class SitePublicService {
  constructor(private readonly prisma: PrismaService) {}

  private items(rows: Array<{ kind: string; title: string; text: string; extra: string | null }>, kind: string) {
    return rows.filter((row) => row.kind === kind).map((row) => ({ title: row.title, text: row.text, extra: row.extra }));
  }

  async content() {
    const [settings, items, testimonials, news, profiles, colleges] = await Promise.all([
      this.prisma.siteSetting.findMany(),
      this.prisma.siteContentItem.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }], select: { kind: true, title: true, text: true, extra: true } }),
      this.prisma.siteTestimonial.findMany({ where: { status: 'PUBLISHED' }, orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }], select: { text: true, name: true, role: true } }),
      this.prisma.siteNews.findMany({ where: { status: 'PUBLISHED' }, orderBy: { publishedAt: 'desc' }, take: 3, select: { id: true, type: true, title: true, summary: true, coverMediaId: true, publishedAt: true } }),
      this.prisma.siteAcademicProfile.findMany(),
      this.prisma.college.findMany({
        where: { isActive: true }, orderBy: { createdAt: 'asc' },
        select: { id: true, nameAr: true, departments: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, nameAr: true, programs: { where: { isActive: true }, orderBy: { createdAt: 'asc' }, select: { id: true, nameAr: true, level: true } } } } },
      }),
    ]);
    const values: Record<string, string> = {};
    for (const row of settings) if (PUBLIC_SETTING_KEYS.has(row.key) && row.value.trim()) values[row.key] = row.value;
    const profile = (kind: string, refId: string) => profiles.find((item) => item.kind === kind && item.refId === refId);
    // الكلية لا تظهر إلا بقرار صريح. القسم/البرنامج يظهران تحت كلية ظاهرة إلا إذا أُخفيا صراحة.
    const visibleColleges = colleges
      .filter((college) => profile('COLLEGE', college.id)?.isVisible)
      .sort((a, b) => (profile('COLLEGE', a.id)?.sortOrder ?? 0) - (profile('COLLEGE', b.id)?.sortOrder ?? 0))
      .map((college) => ({
        nameAr: college.nameAr, summary: profile('COLLEGE', college.id)?.summary ?? '', mediaId: profile('COLLEGE', college.id)?.mediaId ?? null,
        departments: college.departments.filter((department) => profile('DEPARTMENT', department.id)?.isVisible !== false).map((department) => ({
          nameAr: department.nameAr, summary: profile('DEPARTMENT', department.id)?.summary ?? '',
          programs: department.programs.filter((program) => profile('PROGRAM', program.id)?.isVisible !== false).map((program) => ({ nameAr: program.nameAr, summary: profile('PROGRAM', program.id)?.summary ?? '' })),
        })),
      }));
    return {
      settings: values,
      stats: this.items(items, 'STAT'), values: this.items(items, 'VALUE'), goals: this.items(items, 'GOAL'), milestones: this.items(items, 'MILESTONE'),
      admissionSteps: this.items(items, 'ADMISSION_STEP'), faq: this.items(items, 'FAQ'),
      colleges: visibleColleges, testimonials, latestNews: news,
    };
  }

  async newsList(page = 1, pageSize = 9) {
    const take = Math.min(Math.max(pageSize, 1), 24);
    const skip = (Math.max(page, 1) - 1) * take;
    const where = { status: 'PUBLISHED' as const };
    const [total, rows] = await Promise.all([
      this.prisma.siteNews.count({ where }),
      this.prisma.siteNews.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take, select: { id: true, type: true, title: true, summary: true, coverMediaId: true, publishedAt: true } }),
    ]);
    return { total, page: Math.max(page, 1), pageSize: take, items: rows };
  }

  async newsOne(id: string) {
    const row = await this.prisma.siteNews.findFirst({ where: { id, status: 'PUBLISHED' }, select: { id: true, type: true, title: true, summary: true, body: true, coverMediaId: true, publishedAt: true } });
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
}

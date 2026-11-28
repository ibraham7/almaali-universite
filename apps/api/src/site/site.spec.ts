import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, HttpException, NotFoundException } from '@nestjs/common';
import { detectMedia, SiteMediaService } from './site-media.service.js';
import { RateLimitGuard, clientIp } from './rate-limit.guard.js';
import { SitePublicService } from './site-public.service.js';
import { SiteAdminService } from './site-admin.service.js';
import { MAX_MEDIA_BYTES } from './site.constants.js';
import { PrismaService } from '../prisma/prisma.service.js';

const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(20, 1)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20, 2)]);
const jpg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20, 3)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([1, 0, 0, 0]), Buffer.from('WEBP'), Buffer.alloc(10, 4)]);
const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(30, 5)]);
const admin = 'u-admin';

function db(over: Record<string, any> = {}) {
  const prisma: any = {
    siteMedia: { create: vi.fn(async ({ data }: any) => ({ id: 'm1', ...data })), findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue({ id: 'm1', fileName: 'a.png' }), update: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
    siteSetting: { upsert: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
    siteContentItem: { findMany: vi.fn().mockResolvedValue([]), create: vi.fn(async ({ data }: any) => ({ id: 'i1', ...data })), findUnique: vi.fn().mockResolvedValue({ id: 'i1', status: 'PUBLISHED' }), update: vi.fn(async ({ data }: any) => ({ id: 'i1', ...data })) },
    siteNews: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue({ id: 'n1', status: 'DRAFT', publishedAt: null, title: 'عنوان' }), update: vi.fn(async ({ data }: any) => ({ id: 'n1', ...data })), create: vi.fn(async ({ data }: any) => ({ id: 'n1', ...data })) },
    siteTestimonial: { findMany: vi.fn().mockResolvedValue([]) },
    siteAcademicProfile: { findMany: vi.fn().mockResolvedValue([]), upsert: vi.fn(async ({ create }: any) => ({ id: 'p1', ...create })) },
    siteEntry: { groupBy: vi.fn().mockResolvedValue([]), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn().mockResolvedValue(null), findUnique: vi.fn().mockResolvedValue({ id: 'e1', kind: 'EVENT', status: 'DRAFT', publishedAt: null, title: 'فعالية', startsAt: null, endsAt: null }), create: vi.fn(async ({ data }: any) => ({ id: 'e1', ...data })), update: vi.fn(async ({ data }: any) => ({ id: 'e1', ...data })), delete: vi.fn().mockResolvedValue({}) },
    siteContactMessage: { create: vi.fn().mockResolvedValue({}) },
    college: { findMany: vi.fn().mockResolvedValue([]), findUnique: vi.fn().mockResolvedValue({ id: 'c1' }) },
    department: { findUnique: vi.fn() }, program: { findUnique: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...over,
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}

describe('site media files', () => {
  it('the type is decided by the content, not the name: PDF, JPG, PNG and WebP only', () => {
    expect(detectMedia(pdf)?.ext).toBe('pdf');
    expect(detectMedia(png)?.ext).toBe('png');
    expect(detectMedia(jpg)?.ext).toBe('jpg');
    expect(detectMedia(webp)?.ext).toBe('webp');
    expect(detectMedia(exe)).toBeNull();
    expect(detectMedia(Buffer.from('<svg onload=alert(1)>'))).toBeNull();
  });

  it('refuses a disguised or oversized file and stores a valid one with the real type, logged in the audit trail', async () => {
    const prisma = db();
    const service = new SiteMediaService(prisma as PrismaService);
    await expect(service.upload({ buffer: exe, originalname: 'photo.png', size: exe.length }, undefined, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.upload({ buffer: Buffer.concat([png, Buffer.alloc(MAX_MEDIA_BYTES)]), originalname: 'big.png', size: 1 }, undefined, admin)).rejects.toThrow('أكبر');
    await expect(service.upload(undefined, undefined, admin)).rejects.toThrow('اختر');
    expect(prisma.siteMedia.create).not.toHaveBeenCalled();
    const row: any = await service.upload({ buffer: png, originalname: '../../evil name.exe', size: png.length }, ' نص بديل ', admin);
    expect(row).toMatchObject({ mimeType: 'image/png' });
    expect(row.fileName.endsWith('.png')).toBe(true);
    expect(row.fileName).not.toMatch(/[\\/]/);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SITE_MEDIA_UPLOADED', userId: admin }) });
  });

  it('serves only a file that is not archived, and archiving keeps it (no delete)', async () => {
    const prisma = db();
    await expect(new SiteMediaService(prisma as PrismaService).serve('x')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.siteMedia.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'x', isArchived: false } }));
    await new SiteMediaService(prisma as PrismaService).setArchived('m1', true, admin);
    expect(prisma.siteMedia.update).toHaveBeenCalledWith({ where: { id: 'm1' }, data: { isArchived: true } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SITE_MEDIA_ARCHIVED' }) });
  });

  it('a linked picture must exist and be an image', async () => {
    const prisma = db();
    const service = new SiteMediaService(prisma as PrismaService);
    await expect(service.assertImage('nope')).rejects.toBeInstanceOf(BadRequestException);
    prisma.siteMedia.findFirst.mockResolvedValue({ id: 'm1', mimeType: 'application/pdf' });
    await expect(service.assertImage('m1')).rejects.toBeInstanceOf(BadRequestException);
    prisma.siteMedia.findFirst.mockResolvedValue({ id: 'm1', mimeType: 'image/png' });
    await expect(service.assertImage('m1')).resolves.toBe('m1');
    await expect(service.assertImage(null)).resolves.toBeNull();
  });
});

describe('public rate limit', () => {
  const guard = (limit: number) => {
    const reflector: any = { getAllAndOverride: () => ({ limit, windowMs: 60_000 }) };
    return new RateLimitGuard(reflector);
  };
  const ctx = (ip: string, forwarded?: string): any => ({
    switchToHttp: () => ({ getRequest: () => ({ socket: { remoteAddress: ip }, headers: forwarded ? { 'x-forwarded-for': forwarded } : {} }) }),
    getHandler: () => function contact() {}, getClass: () => class X {},
  });

  it('allows the limit then answers 429, per address', () => {
    const g = guard(2);
    expect(g.canActivate(ctx('8.8.8.8'))).toBe(true);
    expect(g.canActivate(ctx('8.8.8.8'))).toBe(true);
    expect(() => g.canActivate(ctx('8.8.8.8'))).toThrow(HttpException);
    expect(g.canActivate(ctx('9.9.9.9'))).toBe(true);
  });

  it('a request from an internal proxy without a forwarded address gets a wider limit, so one shared key never blocks every visitor', () => {
    const g = guard(1);
    for (let i = 0; i < 20; i += 1) expect(g.canActivate(ctx('127.0.0.1'))).toBe(true);
    expect(() => g.canActivate(ctx('127.0.0.1'))).toThrow(HttpException);
  });

  it('trusts X-Forwarded-For only when the connection comes from an internal proxy', () => {
    expect(clientIp({ socket: { remoteAddress: '172.18.0.1' }, headers: { 'x-forwarded-for': '5.5.5.5, 10.0.0.1' } } as any)).toBe('5.5.5.5');
    expect(clientIp({ socket: { remoteAddress: '8.8.8.8' }, headers: { 'x-forwarded-for': '5.5.5.5' } } as any)).toBe('8.8.8.8');
    const g = guard(1);
    expect(g.canActivate(ctx('127.0.0.1', '1.1.1.1'))).toBe(true);
    expect(g.canActivate(ctx('127.0.0.1', '2.2.2.2'))).toBe(true);
    expect(() => g.canActivate(ctx('127.0.0.1', '1.1.1.1'))).toThrow(HttpException);
  });
});

describe('public site content', () => {
  it('returns only published content with a minimal field set, and nothing invented when empty', async () => {
    const prisma = db();
    const empty: any = await new SitePublicService(prisma as PrismaService).content();
    expect(empty).toMatchObject({ settings: {}, stats: [], colleges: [], testimonials: [], latestNews: [], latestAnnouncements: [], faq: [] });
    expect(prisma.siteContentItem.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PUBLISHED' } }));
    expect(prisma.siteTestimonial.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PUBLISHED' } }));
    expect(prisma.siteNews.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PUBLISHED', type: 'NEWS' } }));
    expect(prisma.siteNews.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: 'PUBLISHED', type: 'ANNOUNCEMENT' } }));
  });

  it('exposes only whitelisted, non-empty settings; a college appears only when the admin made it visible', async () => {
    const prisma = db();
    prisma.siteSetting.findMany.mockResolvedValue([{ key: 'tagline', value: 'شعار' }, { key: 'secret', value: 'x' }, { key: 'vision', value: '   ' }]);
    prisma.college.findMany.mockResolvedValue([
      { id: 'c1', nameAr: 'كلية ظاهرة', departments: [{ id: 'd1', nameAr: 'قسم ظاهر', programs: [{ id: 'p1', nameAr: 'بكالوريوس', level: 'BACHELOR' }, { id: 'p2', nameAr: 'مخفي', level: 'DIPLOMA' }] }] },
      { id: 'c2', nameAr: 'كلية بلا قرار', departments: [] },
    ]);
    prisma.siteAcademicProfile.findMany.mockResolvedValue([
      { kind: 'COLLEGE', refId: 'c1', isVisible: true, summary: 'نبذة', mediaId: null, sortOrder: 1 }, { kind: 'PROGRAM', refId: 'p2', isVisible: false, summary: '', mediaId: null, sortOrder: 0 },
    ]);
    const content: any = await new SitePublicService(prisma as PrismaService).content();
    expect(content.settings).toEqual({ tagline: 'شعار' });
    expect(content.colleges.map((college: any) => college.nameAr)).toEqual(['كلية ظاهرة']);
    expect(content.colleges[0].departments[0].programs.map((program: any) => program.nameAr)).toEqual(['بكالوريوس']);
    expect(JSON.stringify(content)).not.toContain('"id"');
  });

  it('a news item is public only when published', async () => {
    const prisma = db();
    await expect(new SitePublicService(prisma as PrismaService).newsOne('n1')).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.siteNews.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'n1', status: 'PUBLISHED' } }));
    await new SitePublicService(prisma as PrismaService).newsList(1, 500);
    expect(prisma.siteNews.findMany).toHaveBeenCalledWith(expect.objectContaining({ take: 24 }));
    // the home page lists news and announcements separately; the list filters by type and searches title and summary
    await new SitePublicService(prisma as PrismaService).content();
    const wheres = prisma.siteNews.findMany.mock.calls.map((call: any) => call[0].where.type);
    expect(wheres).toEqual(expect.arrayContaining(['NEWS', 'ANNOUNCEMENT']));
    await new SitePublicService(prisma as PrismaService).newsList(1, 9, 'ANNOUNCEMENT', '  تسجيل  ');
    const filtered = prisma.siteNews.findMany.mock.calls.at(-1)[0].where;
    expect(filtered).toMatchObject({ status: 'PUBLISHED', type: 'ANNOUNCEMENT' });
    expect(filtered.OR[0].title.contains).toBe('تسجيل');
    await new SitePublicService(prisma as PrismaService).newsList(1, 9, 'HACK', 'x');
    expect(prisma.siteNews.findMany.mock.calls.at(-1)[0].where.type).toBeUndefined();
  });

  it('a contact message needs a valid email or phone, ignores bots silently, and stores a hashed address only', async () => {
    const prisma = db();
    const service = new SitePublicService(prisma as PrismaService);
    await expect(service.submitMessage({ name: 'س', contact: 'ليس بريدا', message: 'م' }, '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.submitMessage({ name: ' ', contact: 'a@b.co', message: 'م' }, '1.1.1.1')).rejects.toBeInstanceOf(BadRequestException);
    expect(await service.submitMessage({ name: 'روبوت', contact: 'a@b.co', message: 'سبام', website: 'http://spam' }, '1.1.1.1')).toEqual({ ok: true });
    expect(prisma.siteContactMessage.create).not.toHaveBeenCalled();
    await service.submitMessage({ name: 'سارة', contact: '0912345678', message: 'استفسار' }, '1.1.1.1');
    const data = prisma.siteContactMessage.create.mock.calls[0][0].data;
    expect(data.ipHash).toMatch(/^[0-9a-f]{64}$/);
    expect(JSON.stringify(data)).not.toContain('1.1.1.1');
  });
});

describe('site administration', () => {
  it('accepts only known setting keys within their limits, https map links and a valid email, and logs it', async () => {
    const prisma = db();
    const service = new SiteAdminService(prisma as PrismaService, new SiteMediaService(prisma as PrismaService));
    await expect(service.updateSettings({ nothing: 'x' }, admin)).rejects.toThrow('غير معروف');
    await expect(service.updateSettings({ tagline: 'x'.repeat(201) }, admin)).rejects.toThrow('أطول');
    await expect(service.updateSettings({ contactMapUrl: 'http://x.com' }, admin)).rejects.toThrow('https');
    await expect(service.updateSettings({ contactEmail: 'ليس بريد' }, admin)).rejects.toThrow('البريد');
    expect(prisma.siteSetting.upsert).not.toHaveBeenCalled();
    await service.updateSettings({ tagline: ' شعار ', contactEmail: 'info@x.edu' }, admin);
    expect(prisma.siteSetting.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { key: 'tagline' }, update: { value: 'شعار', updatedById: admin } }));
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SITE_SETTINGS_UPDATED' }) });
  });

  it('news starts as a draft, publishing sets the date once, and archiving hides it without deleting', async () => {
    const prisma = db();
    const service = new SiteAdminService(prisma as PrismaService, new SiteMediaService(prisma as PrismaService));
    expect(await service.createNews({ title: 'خبر' }, admin)).toMatchObject({ status: 'DRAFT' });
    await service.setNewsStatus('n1', 'PUBLISHED', admin);
    expect(prisma.siteNews.update).toHaveBeenCalledWith({ where: { id: 'n1' }, data: expect.objectContaining({ status: 'PUBLISHED', publishedAt: expect.any(Date) }) });
    prisma.siteNews.findUnique.mockResolvedValue({ id: 'n1', status: 'PUBLISHED', publishedAt: new Date('2026-01-01'), title: 'عنوان' });
    await service.setNewsStatus('n1', 'ARCHIVED', admin);
    expect(prisma.siteNews.update).toHaveBeenLastCalledWith({ where: { id: 'n1' }, data: { status: 'ARCHIVED', updatedById: admin } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SITE_NEWS_STATUS' }) });
  });

  it('a college profile needs an existing college and keeps it hidden until the admin shows it', async () => {
    const prisma = db();
    const service = new SiteAdminService(prisma as PrismaService, new SiteMediaService(prisma as PrismaService));
    await expect(service.upsertProfile('BOGUS', 'c1', {}, admin)).rejects.toBeInstanceOf(BadRequestException);
    prisma.college.findUnique.mockResolvedValue(null);
    await expect(service.upsertProfile('COLLEGE', 'zz', {}, admin)).rejects.toBeInstanceOf(NotFoundException);
    prisma.college.findUnique.mockResolvedValue({ id: 'c1' });
    const row: any = await service.upsertProfile('COLLEGE', 'c1', { summary: ' نبذة ' }, admin);
    expect(row).toMatchObject({ kind: 'COLLEGE', refId: 'c1', summary: 'نبذة' });
    expect(prisma.siteAcademicProfile.upsert.mock.calls[0][0].create.isVisible).toBe(false);
    // a department or program saved with only a summary stays visible (it is hidden only on purpose)
    prisma.department.findUnique.mockResolvedValue({ id: 'd1' });
    await service.upsertProfile('DEPARTMENT', 'd1', { summary: 'x' }, admin);
    expect(prisma.siteAcademicProfile.upsert.mock.calls[1][0].create.isVisible).toBe(true);
  });
});

describe('site entries (events, research, graduates, campus)', () => {
  const adminService = (prisma: any) => new SiteAdminService(prisma as PrismaService, new SiteMediaService(prisma as PrismaService));

  it('an event needs a date to be published, ends cannot precede starts, and it is deleted for real with an audit record', async () => {
    const prisma = db();
    const service = adminService(prisma);
    await expect(service.createEntry({ kind: 'EVENT', title: 'ندوة', startsAt: '2026-12-10T10:00:00Z', endsAt: '2026-12-09T10:00:00Z' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(await service.createEntry({ kind: 'EVENT', title: 'ندوة', startsAt: '2026-12-10T10:00:00Z' }, admin)).toMatchObject({ status: 'DRAFT', kind: 'EVENT' });
    await expect(service.setEntryStatus('e1', 'PUBLISHED', admin)).rejects.toThrow('تاريخ الفعالية');
    await service.deleteEntry('e1', admin);
    expect(prisma.siteEntry.delete).toHaveBeenCalledWith({ where: { id: 'e1' } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'SITE_ENTRY_DELETED' }) });
    prisma.siteEntry.findUnique.mockResolvedValue(null);
    await expect(service.deleteEntry('zz', admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('research and campus categories come from a fixed list, and gallery images must exist and be active images', async () => {
    const prisma = db();
    const service = adminService(prisma);
    await expect(service.createEntry({ kind: 'RESEARCH', title: 'بحث', category: 'تصنيف مخترع' }, admin)).rejects.toThrow('التصنيف');
    await service.createEntry({ kind: 'RESEARCH', title: 'بحث', category: 'أبحاث ودراسات' }, admin);
    prisma.siteMedia.findMany.mockResolvedValue([]);
    await expect(service.createEntry({ kind: 'CAMPUS', title: 'نشاط', galleryIds: ['11111111-1111-4111-8111-111111111111'] }, admin)).rejects.toThrow('معرض');
  });

  it('public lists show only published entries, split events into upcoming and past, and reject unknown kinds', async () => {
    const prisma = db();
    const service = new SitePublicService(prisma as PrismaService);
    await expect(service.entriesList('NOPE')).rejects.toBeInstanceOf(NotFoundException);
    await service.entriesList('EVENT', 1, 9, { when: 'past' });
    const past = prisma.siteEntry.findMany.mock.calls.at(-1)[0];
    expect(past.where).toMatchObject({ kind: 'EVENT', status: 'PUBLISHED' });
    expect(past.where.startsAt.lt).toBeInstanceOf(Date);
    await service.entriesList('EVENT', 1, 9);
    expect(prisma.siteEntry.findMany.mock.calls.at(-1)[0].where.OR).toHaveLength(2);
    expect(await service.entryOne('x').catch((error) => error)).toBeInstanceOf(NotFoundException);
  });

  it('a graduate update goes to the contact inbox with a fixed subject and ignores bots', async () => {
    const prisma = db();
    const service = new SitePublicService(prisma as PrismaService);
    await service.submitGraduateUpdate({ name: 'خريج', contact: '0912345678', graduationYear: '2024', workplace: 'شركة' }, '2.2.2.2');
    const data = prisma.siteContactMessage.create.mock.calls[0][0].data;
    expect(data.subject).toBe('تحديث بيانات خريج');
    expect(data.message).toContain('سنة التخرج: 2024');
    await service.submitGraduateUpdate({ name: 'بوت', contact: 'a@b.co', website: 'spam' }, '2.2.2.2');
    expect(prisma.siteContactMessage.create).toHaveBeenCalledTimes(1);
  });
});

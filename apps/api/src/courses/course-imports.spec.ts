import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { COURSE_IMPORT_HEADERS, CourseImportsService } from './course-imports.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const book = (rows: unknown[][], headers: readonly string[] = COURSE_IMPORT_HEADERS) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([[...headers], ...rows]), 'Sheet1');
  return { buffer: Buffer.from(XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })) };
};
const row = (code: string, name: string, credits: unknown, extra: Partial<Record<number, unknown>> = {}) => {
  const base: unknown[] = [code, name, '', credits, '', '', '', '', '', ''];
  for (const [index, value] of Object.entries(extra)) base[Number(index)] = value;
  return base;
};
const existing = (code: string, over: Record<string, unknown> = {}) => ({ id: `id-${code}`, code, nameAr: 'اسم قديم', nameEn: null, credits: 3, ects: null, type: 'THEORY', requirement: 'MANDATORY', description: null, status: 'ACTIVE', ...over });

function db(courses: unknown[] = [], edges: unknown[] = []) {
  const prisma: any = {
    course: { findMany: vi.fn().mockResolvedValue(courses), create: vi.fn(async ({ data }: any) => ({ id: `new-${data.code}` })), update: vi.fn().mockResolvedValue({}) },
    coursePrerequisite: { findMany: vi.fn().mockResolvedValue(edges), createMany: vi.fn(async ({ data }: any) => ({ count: data.length })) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  // after creating, the catalogue lookup inside the transaction returns everything known
  prisma.course.findMany.mockImplementation(async (args: any) => (args?.select?.id && !args?.select?.nameAr
    ? [...courses.map((c: any) => ({ id: c.id, code: c.code })), ...prisma.course.create.mock.calls.map((c: any) => ({ id: `new-${c[0].data.code}`, code: c[0].data.code }))]
    : courses));
  return prisma;
}
const service = (prisma: any) => new CourseImportsService(prisma as PrismaService);

describe('course import from Excel', () => {
  it('needs a real .xlsx with the code, name and credits columns, and reads Arabic digits', async () => {
    await expect(service(db()).preview(undefined, {})).rejects.toThrow('لم يتم رفع ملف');
    await expect(service(db()).preview({ buffer: Buffer.from('a,b\n1,2') }, {})).rejects.toThrow('ليس ملف Excel');
    await expect(service(db()).preview(book([['x']], ['عمود']), {})).rejects.toThrow('الأعمدة المطلوبة');
    const preview = await service(db()).preview(book([row('CS101', 'مقدمة', '٣')]), {});
    expect(preview.totals).toMatchObject({ rows: 1, new: 1, errors: 0 });
  });

  it('flags missing fields, bad credits, bad type/requirement/status, and duplicate codes inside the file', async () => {
    const result = await service(db()).preview(book([
      row('', 'بلا رمز', 3), row('A1', '', 3), row('A2', 'ساعات خاطئة', 0), row('A3', 'نوع', 3, { 5: 'x' }), row('A4', 'طبيعة', 3, { 6: 'ربما' }), row('A5', 'حالة', 3, { 8: 'قيد' }),
      row('D1', 'أول', 3), row('d1', 'مكرر', 3),
    ]), {});
    const messages = result.errors.map((e) => e.message).join('|');
    for (const part of ['رمز المقرر مطلوب', 'اسم المقرر مطلوب', 'الساعات', 'النوع', 'طبيعة المقرر', 'الحالة', 'مكرر في الملف']) expect(messages).toContain(part);
    expect(result.totals.errors).toBe(7);
    expect(result.totals.new).toBe(1);
  });

  it('existing codes are skipped unless updating is requested; an update lists the exact changes and ignores blank optional cells', async () => {
    const courses = [existing('CS101')];
    const file = book([row('CS101', 'اسم جديد', 4)]);
    expect((await service(db(courses)).preview(file, {})).totals).toMatchObject({ skipped: 1, new: 0 });
    const update = await service(db(courses)).preview(file, { updateExisting: true });
    expect(update.totals).toMatchObject({ update: 1 });
    expect(update.rows[0].changes.join(' ')).toContain('اسم المقرر: اسم قديم ← اسم جديد');
    expect(update.rows[0].changes.join(' ')).toContain('الساعات: 3 ← 4');
    expect(update.rows[0].changes.join(' ')).not.toContain('النوع');
    expect((await service(db(courses)).preview(book([row('CS101', 'اسم قديم', 3)]), { updateExisting: true })).totals.unchanged).toBe(1);
  });

  it('prerequisites must exist (catalogue or file), not be the course itself, and never form a cycle', async () => {
    const result = await service(db([existing('OLD')], [])).preview(book([
      row('A', 'أ', 3, { 9: 'OLD' }), row('B', 'ب', 3, { 9: 'A' }), row('C', 'ج', 3, { 9: 'ZZZ' }), row('D', 'د', 3, { 9: 'D' }),
      row('E', 'هـ', 3, { 9: 'F' }), row('F', 'و', 3, { 9: 'E' }),
    ]), {});
    const byCode = Object.fromEntries(result.rows.map((r) => [r.code, r.action]));
    expect(byCode).toMatchObject({ A: 'NEW', B: 'NEW', C: 'ERROR', D: 'ERROR' });
    expect(result.errors.map((e) => e.message).join('|')).toContain('غير موجود');
    expect(result.errors.map((e) => e.message).join('|')).toContain('لنفسه');
    expect(result.errors.map((e) => e.message).join('|')).toContain('حلقة');
    // a cycle through an existing edge is caught too
    const cyc = await service(db([existing('X')], [{ course: { code: 'X' }, prerequisite: { code: 'Y' } }, { course: { code: 'Y' }, prerequisite: { code: 'Z' } }])).preview(book([row('Z', 'ز', 3, { 9: 'X' })]), {});
    expect(cyc.errors.map((e) => e.message).join('|')).toContain('حلقة');
  });

  it('confirm refuses a file with errors unless invalid rows are skipped; it then creates, updates, adds prerequisites and audits', async () => {
    const courses = [existing('CS101')];
    const file = book([row('CS101', 'اسم جديد', 4), row('NEW1', 'جديد', 3, { 9: 'CS101' }), row('BAD', '', 3)]);
    const prisma = db(courses);
    await expect(service(prisma).confirm(file, 'u1', { updateExisting: true })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.course.create).not.toHaveBeenCalled();
    const result = await service(prisma).confirm(file, 'u1', { updateExisting: true, skipInvalid: true });
    expect(result).toMatchObject({ created: 1, updated: 1, prerequisitesAdded: 1, invalidRows: 1 });
    expect(prisma.course.create.mock.calls[0][0].data).toMatchObject({ code: 'NEW1', type: 'UNSPECIFIED', requirement: 'MANDATORY', status: 'ACTIVE' });
    expect(prisma.course.update).toHaveBeenCalledWith({ where: { id: 'id-CS101' }, data: expect.objectContaining({ nameAr: 'اسم جديد', credits: 4 }) });
    expect(prisma.coursePrerequisite.createMany).toHaveBeenCalledWith({ data: [{ courseId: 'new-NEW1', prerequisiteId: 'id-CS101' }], skipDuplicates: true });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'COURSES_IMPORTED', userId: 'u1' }) });
  });

  it('the downloadable template is itself a valid file for the importer', async () => {
    const template = service(db()).template();
    const result = await service(db()).preview({ buffer: template }, {});
    expect(result.totals).toMatchObject({ rows: 2, new: 2, errors: 0 });
    expect(result.rows[1].prerequisites).toEqual(['CS101']);
  });
});

import { BadRequestException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service.js';
import { normalizeDigits } from '../students/student-data-validation.js';

// استيراد المقررات (كتالوج المقررات) من Excel: معاينة ثم تأكيد. لا حذف نهائي: التحديث يعدّل الموجود، والمتطلبات السابقة تُضاف ولا تُزال.
export const MAX_COURSE_IMPORT_ROWS = 2000;
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

export const COURSE_IMPORT_HEADERS = ['رمز المقرر', 'اسم المقرر', 'الاسم بالإنجليزية', 'الساعات المعتمدة', 'ECTS', 'النوع', 'طبيعة المقرر', 'الوصف', 'الحالة', 'المتطلبات السابقة'] as const;
type Key = 'code' | 'nameAr' | 'nameEn' | 'credits' | 'ects' | 'type' | 'requirement' | 'description' | 'status' | 'prerequisites';
const ALIASES: Record<Key, string[]> = {
  code: ['رمز المقرر', 'رمز', 'الرمز', 'كود المقرر', 'كود', 'code', 'course code'],
  nameAr: ['اسم المقرر', 'اسم المقرر بالعربية', 'الاسم بالعربية', 'الاسم العربي', 'المقرر', 'namear', 'name'],
  nameEn: ['الاسم بالانجليزية', 'اسم المقرر بالانجليزية', 'الاسم الانجليزي', 'nameen', 'english name'],
  credits: ['الساعات المعتمدة', 'الساعات', 'عدد الساعات', 'ساعات', 'credits', 'credit hours'],
  ects: ['ects', 'رصيد ects', 'الرصيد الاوروبي'],
  type: ['النوع', 'نوع المقرر', 'type'],
  requirement: ['طبيعة المقرر', 'الطبيعة', 'اجباري اختياري', 'اجباري/اختياري', 'requirement'],
  description: ['الوصف', 'وصف المقرر', 'description'],
  status: ['الحالة', 'status'],
  prerequisites: ['المتطلبات السابقة', 'المتطلب السابق', 'المتطلبات', 'prerequisites'],
};
const REQUIRED: Key[] = ['code', 'nameAr', 'credits'];
const LABEL: Record<Key, string> = { code: 'رمز المقرر', nameAr: 'اسم المقرر', nameEn: 'الاسم بالإنجليزية', credits: 'الساعات', ects: 'ECTS', type: 'النوع', requirement: 'طبيعة المقرر', description: 'الوصف', status: 'الحالة', prerequisites: 'المتطلبات السابقة' };
const TYPE_LABEL: Record<string, string> = { THEORY: 'نظري', PRACTICAL: 'عملي', UNSPECIFIED: 'غير محدد' };
const REQ_LABEL: Record<string, string> = { MANDATORY: 'إجباري', ELECTIVE: 'اختياري' };

export interface ImportFile { buffer: Buffer; originalname?: string }
export interface CourseRowError { rowNumber: number; code: string; column?: string; message: string }
export type RowAction = 'NEW' | 'UPDATE' | 'UNCHANGED' | 'SKIPPED' | 'ERROR';
export interface CoursePreviewRow { rowNumber: number; code: string; nameAr: string; action: RowAction; changes: string[]; prerequisites: string[] }
export interface CourseImportOptions { sheet?: string; updateExisting?: boolean; skipInvalid?: boolean }

interface Parsed {
  rowNumber: number; code: string; nameAr: string; nameEn?: string; credits: number; ects?: number | null; type?: 'THEORY' | 'PRACTICAL' | 'UNSPECIFIED'; requirement?: 'MANDATORY' | 'ELECTIVE';
  description?: string; status?: 'ACTIVE' | 'INACTIVE'; prerequisites: string[];
}

const norm = (value: unknown) => String(value ?? '').toLowerCase().replace(/[ً-ٟـ]/g, '').replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه').replace(/[^\p{L}\p{N}\s/]/gu, ' ').replace(/\s+/g, ' ').trim();
const ALIAS_INDEX = new Map<string, Key>(Object.entries(ALIASES).flatMap(([key, list]) => list.map((alias) => [norm(alias), key as Key] as const)));

@Injectable()
export class CourseImportsService {
  constructor(private readonly prisma: PrismaService) {}

  private cell(cell: XLSX.CellObject | undefined) {
    if (!cell || cell.v === undefined || cell.v === null) return '';
    if (typeof cell.v === 'number') return Number.isInteger(cell.v) ? String(cell.v) : String(cell.w ?? cell.v);
    return String(cell.v).trim();
  }

  private grid(file?: ImportFile, sheet?: string) {
    if (!file?.buffer?.length) throw new BadRequestException('لم يتم رفع ملف، اختر ملف Excel بامتداد .xlsx');
    if (file.buffer.length > MAX_FILE_BYTES) throw new BadRequestException('حجم الملف أكبر من 5 ميغابايت.');
    if (file.buffer.subarray(0, 2).toString() !== 'PK') throw new BadRequestException('الملف ليس ملف Excel بصيغة .xlsx. احفظه من Excel بصيغة «مصنف Excel».');
    let workbook: XLSX.WorkBook;
    try { workbook = XLSX.read(file.buffer, { type: 'buffer' }); } catch { throw new BadRequestException('تعذر قراءة ملف Excel، تأكد أنه غير تالف ولا محمي بكلمة سر.'); }
    const name = sheet && workbook.SheetNames.includes(sheet) ? sheet : workbook.SheetNames[0];
    const ws = workbook.Sheets[name];
    if (!ws?.['!ref']) throw new BadRequestException('الورقة فارغة.');
    const range = XLSX.utils.decode_range(ws['!ref']);
    const rows: string[][] = [];
    for (let r = range.s.r; r <= range.e.r; r += 1) {
      const row: string[] = [];
      for (let c = range.s.c; c <= range.e.c; c += 1) row.push(this.cell(ws[XLSX.utils.encode_cell({ r, c })]));
      rows.push(row);
    }
    return { sheetName: name, sheets: workbook.SheetNames, rows };
  }

  // الصف الأول الذي يحوي عمود الرمز واسم المقرر والساعات هو صف العناوين.
  private locate(rows: string[][]) {
    for (let index = 0; index < Math.min(rows.length, 15); index += 1) {
      const map = new Map<Key, number>();
      rows[index].forEach((value, column) => { const key = ALIAS_INDEX.get(norm(value)); if (key && !map.has(key)) map.set(key, column); });
      if (REQUIRED.every((key) => map.has(key))) return { headerRow: index, map };
    }
    const have = new Set<Key>();
    for (const row of rows.slice(0, 15)) row.forEach((value) => { const key = ALIAS_INDEX.get(norm(value)); if (key) have.add(key); });
    const missing = REQUIRED.filter((key) => !have.has(key)).map((key) => LABEL[key]);
    throw new BadRequestException(`لم أجد صف العناوين. الأعمدة المطلوبة: رمز المقرر، اسم المقرر، الساعات المعتمدة${missing.length ? ` (الناقص: ${missing.join('، ')})` : ''}. نزّل القالب واستعمله.`);
  }

  private parse(rows: string[][]) {
    const { headerRow, map } = this.locate(rows);
    const errors: CourseRowError[] = [];
    const parsed: Parsed[] = [];
    const seen = new Map<string, number>();
    const data = rows.slice(headerRow + 1).map((cells, offset) => ({ rowNumber: headerRow + offset + 2, cells })).filter((row) => row.cells.some((value) => value.trim() !== ''));
    if (data.length === 0) throw new BadRequestException('لا توجد صفوف بيانات تحت العناوين.');
    if (data.length > MAX_COURSE_IMPORT_ROWS) throw new BadRequestException(`الحد الأقصى ${MAX_COURSE_IMPORT_ROWS} صف في الملف الواحد.`);
    const get = (cells: string[], key: Key) => normalizeDigits((cells[map.get(key) ?? -1] ?? '').normalize('NFKC').trim());
    for (const { rowNumber, cells } of data) {
      const fail = (column: Key, message: string) => errors.push({ rowNumber, code: get(cells, 'code'), column: LABEL[column], message });
      const before = errors.length;
      const code = get(cells, 'code');
      const nameAr = get(cells, 'nameAr').replace(/\s+/g, ' ');
      if (!code) fail('code', 'رمز المقرر مطلوب.'); else if (code.length > 50 || /[\u0000-\u001f]/.test(code)) fail('code', 'رمز المقرر غير صالح (حتى 50 حرفًا بلا رموز تحكم).');
      if (!nameAr) fail('nameAr', 'اسم المقرر مطلوب.'); else if (nameAr.length > 255) fail('nameAr', 'اسم المقرر أطول من 255 حرفًا.');
      const key = code.toLowerCase();
      if (code) {
        if (seen.has(key)) fail('code', `الرمز مكرر في الملف (سبق في الصف ${seen.get(key)}).`);
        else seen.set(key, rowNumber);
      }
      const creditsRaw = get(cells, 'credits');
      const credits = Number(creditsRaw);
      if (!creditsRaw) fail('credits', 'عدد الساعات مطلوب.'); else if (!Number.isInteger(credits) || credits < 1 || credits > 30) fail('credits', 'الساعات: رقم صحيح من 1 إلى 30.');
      const row: Parsed = { rowNumber, code, nameAr, credits, prerequisites: [] };
      const nameEn = get(cells, 'nameEn');
      if (nameEn) { if (nameEn.length > 255) fail('nameEn', 'الاسم بالإنجليزية أطول من 255 حرفًا.'); else row.nameEn = nameEn; }
      const ectsRaw = get(cells, 'ects');
      if (ectsRaw) { const ects = Number(ectsRaw); if (!Number.isFinite(ects) || ects < 0 || ects > 100) fail('ects', 'ECTS: رقم من 0 إلى 100.'); else row.ects = ects; }
      const type = norm(get(cells, 'type'));
      if (type) {
        if (['نظري', 'نظريه', 'theory'].includes(type)) row.type = 'THEORY';
        else if (['عملي', 'عمليه', 'practical'].includes(type)) row.type = 'PRACTICAL';
        else if (['غير محدد', 'unspecified'].includes(type)) row.type = 'UNSPECIFIED';
        else fail('type', 'النوع: نظري أو عملي أو غير محدد.');
      }
      const requirement = norm(get(cells, 'requirement'));
      if (requirement) {
        if (['اجباري', 'اجباريه', 'mandatory'].includes(requirement)) row.requirement = 'MANDATORY';
        else if (['اختياري', 'اختياريه', 'elective'].includes(requirement)) row.requirement = 'ELECTIVE';
        else fail('requirement', 'طبيعة المقرر: إجباري أو اختياري.');
      }
      const description = get(cells, 'description');
      if (description) { if (description.length > 2000) fail('description', 'الوصف أطول من 2000 حرف.'); else row.description = description; }
      const status = norm(get(cells, 'status'));
      if (status) {
        if (['فعال', 'فعاله', 'active', 'نعم'].includes(status)) row.status = 'ACTIVE';
        else if (['غير فعال', 'غير فعاله', 'موقوف', 'inactive', 'لا'].includes(status)) row.status = 'INACTIVE';
        else fail('status', 'الحالة: فعّال أو غير فعّال.');
      }
      row.prerequisites = [...new Set(get(cells, 'prerequisites').split(/[,،;؛|\n]+/).map((value) => value.trim()).filter(Boolean))];
      if (errors.length === before) parsed.push(row);
    }
    return { parsed, errors, headerRow, totalRows: data.length };
  }

  // يقارن بالكتالوج الحالي ويقرر لكل صف: جديد، تحديث، بلا تغيير، متجاوز (موجود ولم يُطلب التحديث)، أو خطأ (متطلب غير موجود أو حلقة).
  private async plan(file: ImportFile | undefined, options: CourseImportOptions) {
    const { sheetName, sheets, rows } = this.grid(file, options.sheet);
    const { parsed, errors, totalRows } = this.parse(rows);
    const existing = await this.prisma.course.findMany({ select: { id: true, code: true, nameAr: true, nameEn: true, credits: true, ects: true, type: true, requirement: true, description: true, status: true } });
    const byCode = new Map(existing.map((course) => [course.code.toLowerCase(), course]));
    const fileCodes = new Map(parsed.map((row) => [row.code.toLowerCase(), row]));
    const bad = new Set(errors.map((error) => error.rowNumber));
    const out: CoursePreviewRow[] = [];

    const edges = new Map<string, Set<string>>();
    const link = (from: string, to: string) => { const set = edges.get(from) ?? new Set(); set.add(to); edges.set(from, set); };
    for (const edge of await this.prisma.coursePrerequisite.findMany({ select: { course: { select: { code: true } }, prerequisite: { select: { code: true } } } })) link(edge.course.code.toLowerCase(), edge.prerequisite.code.toLowerCase());

    const decisions: Array<{ row: Parsed; action: RowAction; changes: string[]; found?: (typeof existing)[number] }> = [];
    for (const row of parsed) {
      const found = byCode.get(row.code.toLowerCase());
      let action: RowAction = 'NEW';
      const changes: string[] = [];
      if (found) {
        if (!options.updateExisting) action = 'SKIPPED';
        else {
          const diffs: Array<[Key, unknown, unknown]> = [['nameAr', found.nameAr, row.nameAr], ['credits', found.credits, row.credits]];
          if (row.nameEn !== undefined) diffs.push(['nameEn', found.nameEn ?? '', row.nameEn]);
          if (row.ects !== undefined) diffs.push(['ects', found.ects === null ? '' : Number(found.ects), row.ects]);
          if (row.type) diffs.push(['type', found.type, row.type]);
          if (row.requirement) diffs.push(['requirement', found.requirement, row.requirement]);
          if (row.description !== undefined) diffs.push(['description', found.description ?? '', row.description]);
          if (row.status) diffs.push(['status', found.status, row.status]);
          for (const [key, before, after] of diffs) if (String(before) !== String(after)) changes.push(`${LABEL[key]}: ${key === 'type' ? TYPE_LABEL[String(before)] : key === 'requirement' ? REQ_LABEL[String(before)] : String(before) || '—'} ← ${key === 'type' ? TYPE_LABEL[String(after)] : key === 'requirement' ? REQ_LABEL[String(after)] : String(after) || '—'}`);
          action = changes.length ? 'UPDATE' : 'UNCHANGED';
        }
      }
      decisions.push({ row, action, changes, found });
    }

    // المتطلبات: كل رمز يجب أن يكون موجودًا بالكتالوج أو بالملف، ولا يكون المقرر متطلبًا لنفسه، ولا تتشكل حلقة.
    const newEdges: Array<[string, string, number]> = [];
    for (const decision of decisions) {
      if (decision.action === 'SKIPPED') continue;
      const key = decision.row.code.toLowerCase();
      for (const raw of decision.row.prerequisites) {
        const target = raw.toLowerCase();
        if (target === key) { errors.push({ rowNumber: decision.row.rowNumber, code: decision.row.code, column: LABEL.prerequisites, message: 'لا يمكن أن يكون المقرر متطلبًا سابقًا لنفسه.' }); decision.action = 'ERROR'; continue; }
        const inFile = fileCodes.get(target);
        if (!byCode.has(target) && !inFile) { errors.push({ rowNumber: decision.row.rowNumber, code: decision.row.code, column: LABEL.prerequisites, message: `المتطلب «${raw}» غير موجود لا بالنظام ولا بالملف.` }); decision.action = 'ERROR'; continue; }
        if (inFile && (bad.has(inFile.rowNumber))) { errors.push({ rowNumber: decision.row.rowNumber, code: decision.row.code, column: LABEL.prerequisites, message: `المتطلب «${raw}» صفه في الملف به خطأ.` }); decision.action = 'ERROR'; continue; }
        newEdges.push([key, target, decision.row.rowNumber]);
      }
    }
    for (const [from, to] of newEdges) link(from, to);
    const reaches = (start: string, goal: string) => {
      const stack = [start]; const visited = new Set<string>();
      while (stack.length) { const node = stack.pop()!; if (node === goal) return true; if (visited.has(node)) continue; visited.add(node); for (const next of edges.get(node) ?? []) stack.push(next); }
      return false;
    };
    for (const [from, to, rowNumber] of newEdges) {
      if (reaches(to, from)) {
        const decision = decisions.find((item) => item.row.rowNumber === rowNumber)!;
        if (decision.action !== 'ERROR') { errors.push({ rowNumber, code: decision.row.code, column: LABEL.prerequisites, message: `المتطلب «${to}» يعتمد بدوره على هذا المقرر (حلقة مغلقة).` }); decision.action = 'ERROR'; }
      }
    }

    const errorRows = new Set(errors.map((error) => error.rowNumber));
    for (const decision of decisions) out.push({ rowNumber: decision.row.rowNumber, code: decision.row.code, nameAr: decision.row.nameAr, action: errorRows.has(decision.row.rowNumber) ? 'ERROR' : decision.action, changes: decision.changes, prerequisites: decision.row.prerequisites });
    for (const error of errors) if (!out.some((row) => row.rowNumber === error.rowNumber)) out.push({ rowNumber: error.rowNumber, code: error.code, nameAr: '', action: 'ERROR', changes: [], prerequisites: [] });
    out.sort((a, b) => a.rowNumber - b.rowNumber);
    const count = (action: RowAction) => out.filter((row) => row.action === action).length;
    return {
      sheet: sheetName, sheets, decisions, rows: out, errors: errors.sort((a, b) => a.rowNumber - b.rowNumber),
      totals: { rows: totalRows, new: count('NEW'), update: count('UPDATE'), unchanged: count('UNCHANGED'), skipped: count('SKIPPED'), errors: new Set(errors.map((e) => e.rowNumber)).size },
    };
  }

  async preview(file: ImportFile | undefined, options: CourseImportOptions) {
    const { decisions: _decisions, rows, ...rest } = await this.plan(file, options);
    void _decisions;
    return { ...rest, rows: rows.slice(0, 400), truncated: rows.length > 400 };
  }

  async confirm(file: ImportFile | undefined, userId: string, options: CourseImportOptions) {
    const plan = await this.plan(file, options);
    if (plan.errors.length > 0 && !options.skipInvalid) throw new BadRequestException(`في الملف ${plan.totals.errors} صفًا به أخطاء. صحّحها أو فعّل «تجاوز الصفوف الخاطئة»، ثم أعد المعاينة.`);
    const actionable = plan.decisions.filter((decision) => ['NEW', 'UPDATE'].includes(decision.action) || (decision.action === 'UNCHANGED' && decision.row.prerequisites.length > 0));
    const errorRows = new Set(plan.errors.map((error) => error.rowNumber));
    const work = actionable.filter((decision) => !errorRows.has(decision.row.rowNumber));
    if (work.length === 0) throw new BadRequestException('لا شيء للاستيراد: كل الصفوف إما موجودة بلا تغيير أو بها أخطاء.');
    const result = await this.prisma.$transaction(async (tx) => {
      const ids = new Map<string, string>();
      let created = 0; let updated = 0;
      for (const { row, action, found } of work) {
        if (action === 'NEW') {
          const course = await tx.course.create({ data: { code: row.code, nameAr: row.nameAr, nameEn: row.nameEn ?? null, credits: row.credits, ects: row.ects ?? null, type: row.type ?? 'UNSPECIFIED', requirement: row.requirement ?? 'MANDATORY', description: row.description ?? null, status: row.status ?? 'ACTIVE' }, select: { id: true } });
          ids.set(row.code.toLowerCase(), course.id); created += 1;
        } else if (found) {
          ids.set(row.code.toLowerCase(), found.id);
          if (action === 'UPDATE') {
            await tx.course.update({ where: { id: found.id }, data: { nameAr: row.nameAr, credits: row.credits, ...(row.nameEn !== undefined ? { nameEn: row.nameEn } : {}), ...(row.ects !== undefined ? { ects: row.ects } : {}), ...(row.type ? { type: row.type } : {}), ...(row.requirement ? { requirement: row.requirement } : {}), ...(row.description !== undefined ? { description: row.description } : {}), ...(row.status ? { status: row.status } : {}) } });
            updated += 1;
          }
        }
      }
      const codeToId = new Map((await tx.course.findMany({ select: { id: true, code: true } })).map((course) => [course.code.toLowerCase(), course.id]));
      const links: Array<{ courseId: string; prerequisiteId: string }> = [];
      for (const { row } of work) {
        const courseId = codeToId.get(row.code.toLowerCase());
        for (const raw of row.prerequisites) { const prerequisiteId = codeToId.get(raw.toLowerCase()); if (courseId && prerequisiteId) links.push({ courseId, prerequisiteId }); }
      }
      const added = links.length ? await tx.coursePrerequisite.createMany({ data: links, skipDuplicates: true }) : { count: 0 };
      await tx.auditLog.create({ data: { action: 'COURSES_IMPORTED', entity: 'Course', userId, details: JSON.stringify({ created, updated, prerequisitesAdded: added.count, skippedInvalid: errorRows.size, codes: work.map((item) => item.row.code).slice(0, 300) }) } });
      return { created, updated, prerequisitesAdded: added.count };
    });
    return { ...result, skippedExisting: plan.totals.skipped, unchanged: plan.totals.unchanged, invalidRows: errorRows.size };
  }

  // قالب جاهز: ورقة المقررات بمثالين، وورقة تعليمات.
  template(): Buffer {
    const sample = [
      COURSE_IMPORT_HEADERS as unknown as string[],
      ['CS101', 'مقدمة في البرمجة', 'Introduction to Programming', '3', '5', 'نظري', 'إجباري', 'مدخل إلى أساسيات البرمجة', 'فعّال', ''],
      ['CS102', 'مختبر البرمجة', 'Programming Lab', '1', '2', 'عملي', 'إجباري', '', 'فعّال', 'CS101'],
    ];
    const help = [
      ['الحقل', 'مطلوب؟', 'القيم / الملاحظات'],
      ['رمز المقرر', 'نعم', 'فريد لكل مقرر (حتى 50 حرفًا). إن كان موجودًا بالنظام يُتجاوز أو يُحدَّث حسب خيار الاستيراد.'],
      ['اسم المقرر', 'نعم', 'بالعربية (حتى 255 حرفًا).'],
      ['الاسم بالإنجليزية', 'لا', ''],
      ['الساعات المعتمدة', 'نعم', 'رقم صحيح من 1 إلى 30.'],
      ['ECTS', 'لا', 'رقم من 0 إلى 100.'],
      ['النوع', 'لا', 'نظري أو عملي أو غير محدد (الافتراضي: غير محدد).'],
      ['طبيعة المقرر', 'لا', 'إجباري أو اختياري (الافتراضي: إجباري).'],
      ['الوصف', 'لا', ''],
      ['الحالة', 'لا', 'فعّال أو غير فعّال (الافتراضي: فعّال).'],
      ['المتطلبات السابقة', 'لا', 'رموز مقررات مفصولة بفاصلة، ويجب أن تكون موجودة بالنظام أو بنفس الملف. تُضاف المتطلبات ولا تُحذف عبر الاستيراد.'],
    ];
    const workbook = XLSX.utils.book_new();
    const sheet = XLSX.utils.aoa_to_sheet(sample);
    sheet['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 34 }, { wch: 18 }, { wch: 8 }, { wch: 12 }, { wch: 14 }, { wch: 40 }, { wch: 12 }, { wch: 26 }];
    const helpSheet = XLSX.utils.aoa_to_sheet(help);
    helpSheet['!cols'] = [{ wch: 22 }, { wch: 10 }, { wch: 90 }];
    XLSX.utils.book_append_sheet(workbook, sheet, 'المقررات');
    XLSX.utils.book_append_sheet(workbook, helpSheet, 'تعليمات');
    workbook.Workbook = { Views: [{ RTL: true }] };
    return Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }));
  }
}

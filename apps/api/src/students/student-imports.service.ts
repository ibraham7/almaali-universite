import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service.js';
import { IMPORT_FIELDS, IMPORT_LIMITS, IMPORT_RULES_AR } from './student-import-fields.js';
import { digitVariants, isDigitsOnly, isPersonName, isPlaceName, isSyrianMobile, isSyrianNationalId, normalizeDigits, normalizeGender, normalizeText } from './student-data-validation.js';

export const STUDENT_IMPORT_HEADERS = [
  'الرقم الجامعي', 'الاسم الأول', 'اسم الأب', 'اسم العائلة', 'الاسم بالإنجليزية',
  'الجنس', 'تاريخ الميلاد', 'الجنسية', 'رقم الهوية أو جواز السفر',
  'البريد الجامعي', 'رقم الهاتف', 'الكلية', 'القسم', 'البرنامج',
  'الخطة الدراسية', 'المستوى الأكاديمي', 'الفصل الدراسي', 'حالة الطالب',
  'بريد المرشد', 'تاريخ القبول', 'اسم الأم', 'الرقم الوطني', 'رقم الاكتتاب', 'مكان الولادة',
] as const;

const SILENT = '\u0000silent';

interface ImportFile { buffer: Buffer; originalname: string }
export interface ImportError { rowNumber: number; universityId: string; column?: string; message: string }
export interface ImportOptions {
  sheet?: string; headerRow?: number; mapping?: Record<string, number | null>;
  // مصدر الرقم الجامعي: عمود بالملف (الأصل)، أو رقم الاكتتاب، أو توليد تلقائي ببادئة وتسلسل
  universityIdSource?: { mode: 'column' | 'applicationNumber' | 'generate'; prefix?: string };
  defaults?: { collegeId?: string; departmentId?: string; programId?: string; studyPlanId?: string; academicYearId?: string; semesterId?: string };
}
interface ParsedRow { rowNumber: number; cells: string[] }

@Injectable()
export class StudentImportsService {
  constructor(private readonly prisma: PrismaService) {}

  // ===== قراءة الملف (أي ورقة، أي صف بداية، أي ترتيب أعمدة) =====
  private static normalizeHeader(value: string) {
    return String(value ?? '')
      .toLowerCase()
      .replace(/[ً-ٟـ]/g, '')
      .replace(/[أإآ]/g, 'ا').replace(/ى/g, 'ي').replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  // رقم الترتيب من نص مثل «السنة الأولى» أو «الفصل الثاني» أو «1» أو «٣»
  private static ordinalOf(text: string): number | null {
    const value = StudentImportsService.normalizeHeader(normalizeDigits(String(text ?? '')));
    const digit = /(?:^|\s)(\d{1,2})(?:\s|$)/.exec(value);
    if (digit) return Number(digit[1]);
    const stems: Array<[string, number]> = [['اول', 1], ['ثان', 2], ['ثالث', 3], ['رابع', 4], ['خامس', 5], ['سادس', 6], ['سابع', 7], ['ثامن', 8]];
    for (const word of value.split(' ')) {
      const clean = word.replace(/^ال/, '');
      const hit = stems.find(([stem]) => clean.startsWith(stem));
      if (hit) return hit[1];
    }
    return null;
  }

  private static columnLetter(index: number) {
    let n = index; let out = '';
    do { out = String.fromCharCode(65 + (n % 26)) + out; n = Math.floor(n / 26) - 1; } while (n >= 0);
    return out;
  }

  private static cellText(cell: XLSX.CellObject | undefined) {
    if (!cell || cell.v === undefined || cell.v === null) return '';
    if (cell.v instanceof Date) {
      const d = cell.v;
      return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
    }
    if (typeof cell.v === 'number') return Number.isInteger(cell.v) ? String(cell.v) : String(cell.w ?? cell.v);
    return String(cell.v).trim();
  }

  private openWorkbook(file?: ImportFile) {
    if (!file?.buffer?.length) throw new BadRequestException('لم يتم رفع ملف، اختر ملف Excel بامتداد .xlsx');
    // يُفحص محتوى الملف لا اسمه: ملفات الواتساب والتنزيلات قد يكون اسمها غير منتهٍ بـ .xlsx
    if (file.buffer.subarray(0, 2).toString() !== 'PK') {
      throw new BadRequestException('الملف ليس ملف Excel بصيغة .xlsx (قد يكون .xls قديماً أو .csv). احفظه من Excel بصيغة «مصنف Excel (.xlsx)» ثم أعد المحاولة');
    }
    try { return XLSX.read(file.buffer, { type: 'buffer', cellDates: true }); }
    catch { throw new BadRequestException('تعذر قراءة ملف Excel، تأكد أنه غير تالف ولا محمي بكلمة سر'); }
  }

  private sheetGrid(workbook: XLSX.WorkBook, sheetName: string) {
    const sheet = workbook.Sheets[sheetName];
    if (!sheet?.['!ref']) return [] as string[][];
    const bounds = XLSX.utils.decode_range(sheet['!ref']);
    if (bounds.e.c + 1 > IMPORT_LIMITS.maxColumns) {
      throw new BadRequestException(`عدد الأعمدة في ورقة «${sheetName}» أكبر من الحد المسموح (${IMPORT_LIMITS.maxColumns} عموداً)`);
    }
    if (bounds.e.r + 1 > IMPORT_LIMITS.maxRows + 50) {
      throw new BadRequestException(`عدد الصفوف في ورقة «${sheetName}» أكبر من الحد المسموح (${IMPORT_LIMITS.maxRows} طالب في الملف الواحد). قسّم الملف إلى أجزاء`);
    }
    const grid: string[][] = [];
    for (let r = 0; r <= bounds.e.r; r++) {
      const row: string[] = [];
      for (let c = 0; c <= bounds.e.c; c++) row.push(StudentImportsService.cellText(sheet[XLSX.utils.encode_cell({ r, c })]));
      grid.push(row);
    }
    return grid;
  }

  private detectHeaderRow(grid: string[][]) {
    const aliases = new Set(IMPORT_FIELDS.flatMap((field) => field.aliases.map((alias) => StudentImportsService.normalizeHeader(alias))));
    let best = -1; let bestScore = 0; let firstNonEmpty = -1;
    for (let r = 0; r < Math.min(grid.length, 20); r++) {
      const filled = grid[r].filter(Boolean).length;
      if (filled && firstNonEmpty < 0) firstNonEmpty = r;
      const score = grid[r].filter((cell) => cell && aliases.has(StudentImportsService.normalizeHeader(cell))).length;
      if (score > bestScore) { bestScore = score; best = r; }
    }
    return (bestScore >= 2 ? best : Math.max(firstNonEmpty, 0)) + 1; // رقم الصف كما يظهر في Excel
  }

  private suggestMapping(headers: string[]) {
    const normalized = headers.map((header) => StudentImportsService.normalizeHeader(header));
    const used = new Set<number>();
    const mapping: Record<string, number | null> = {};
    for (const field of IMPORT_FIELDS) mapping[field.key] = null;
    const pass = (test: (header: string, alias: string) => boolean) => {
      for (const field of IMPORT_FIELDS) {
        if (mapping[field.key] !== null) continue;
        const aliasList = field.aliases.map((alias) => StudentImportsService.normalizeHeader(alias));
        const index = normalized.findIndex((header, i) => header && !used.has(i) && aliasList.some((alias) => test(header, alias)));
        if (index >= 0) { mapping[field.key] = index; used.add(index); }
      }
    };
    pass((header, alias) => header === alias);
    pass((header, alias) => alias.length >= 5 && header.includes(alias));
    return mapping;
  }

  inspect(file: ImportFile | undefined, options: { sheet?: string; headerRow?: number } = {}) {
    const workbook = this.openWorkbook(file);
    const sheets = workbook.SheetNames.map((name) => ({
      name, rowCount: Math.max((workbook.Sheets[name]?.['!ref'] ? XLSX.utils.decode_range(workbook.Sheets[name]['!ref']!).e.r + 1 : 0), 0),
    }));
    const sheet = options.sheet && workbook.SheetNames.includes(options.sheet)
      ? options.sheet : (sheets.find((item) => item.rowCount > 0)?.name ?? workbook.SheetNames[0]);
    if (!sheet) throw new BadRequestException('الملف لا يحتوي على أي ورقة عمل');
    const grid = this.sheetGrid(workbook, sheet);
    if (!grid.some((row) => row.some(Boolean))) throw new BadRequestException(`ورقة العمل «${sheet}» فارغة`);
    const headerRow = options.headerRow && options.headerRow >= 1 ? options.headerRow : this.detectHeaderRow(grid);
    const headers = (grid[headerRow - 1] ?? []).map((value) => value.trim());
    const dataRows = grid.slice(headerRow).filter((row) => row.some(Boolean));
    return {
      sheets, sheet, headerRow, dataRowCount: dataRows.length,
      columns: headers.map((header, index) => ({
        index, letter: StudentImportsService.columnLetter(index), header,
        samples: dataRows.slice(0, 3).map((row) => row[index] ?? '').filter(Boolean),
      })).filter((column) => column.header || column.samples.length),
      suggestedMapping: this.suggestMapping(headers),
      fields: IMPORT_FIELDS.map(({ key, label, required, group }) => ({ key, label, required, group })),
      rules: IMPORT_RULES_AR,
      limits: IMPORT_LIMITS,
    };
  }

  private parse(file: ImportFile | undefined, options: ImportOptions) {
    const workbook = this.openWorkbook(file);
    const info = this.inspect(file, { sheet: options.sheet, headerRow: options.headerRow });
    const grid = this.sheetGrid(workbook, info.sheet);
    const mapping = options.mapping ?? info.suggestedMapping;
    const columnHeaders = new Map(info.columns.map((column) => [column.index, column.header || `العمود ${column.letter}`]));
    const fileErrors: ImportError[] = [];
    const universityIdColumn = mapping.universityId;
    const uniMode = options.universityIdSource?.mode ?? 'column';
    if (uniMode === 'generate' && !normalizeText(options.universityIdSource?.prefix ?? '')) {
      fileErrors.push({ rowNumber: 0, universityId: '', column: 'الرقم الجامعي', message: 'اكتب بادئة الرقم الجامعي المولَّد (مثل 2026) حتى لا تتكرر الأرقام' });
    }
    if (uniMode === 'column' && (universityIdColumn === null || universityIdColumn === undefined)) {
      fileErrors.push({ rowNumber: 0, universityId: '', column: 'الرقم الجامعي', message: 'الحقل «الرقم الجامعي» غير مربوط بأي عمود. اربطه بعمود الرقم الجامعي، أو اختر استخدام رقم الاكتتاب أو توليد الرقم تلقائياً' });
    }
    const unmappedRequired = IMPORT_FIELDS.filter((field) => field.required && field.key !== 'universityId' && (mapping[field.key] === null || mapping[field.key] === undefined));
    for (const field of unmappedRequired) {
      fileErrors.push({ rowNumber: 0, universityId: '', column: field.label, message: `الحقل المطلوب «${field.label}» غير مربوط بأي عمود` });
    }
    const records = grid.slice(info.headerRow).map((values, index) => ({
      rowNumber: info.headerRow + index + 1,
      cells: IMPORT_FIELDS.map((field) => {
        const column = mapping[field.key];
        return column === null || column === undefined ? '' : String(values[column] ?? '').trim();
      }),
    })).filter((row) => row.cells.some(Boolean));
    if (!records.length) throw new BadRequestException('لا توجد صفوف بيانات بعد صف العناوين في الورقة المحددة');
    if (records.length > IMPORT_LIMITS.maxRows) {
      throw new BadRequestException(`عدد الطلاب في الملف (${records.length}) أكبر من الحد المسموح (${IMPORT_LIMITS.maxRows}). قسّم الملف إلى أجزاء`);
    }
    return {
      records, fileErrors, mapping, columnHeaders,
      unmappedRequiredKeys: new Set(unmappedRequired.map((field) => field.key)),
    };
  }

  private parseDate(value: string, label: string, errors: string[]): Date | null {
    if (!value) return null;
    let iso = value.trim();
    const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(iso);
    if (dmy) iso = `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
      errors.push(`${label}: استخدم YYYY-MM-DD أو DD/MM/YYYY (القيمة بالملف: «${value}»)`);
      return null;
    }
    const date = new Date(`${iso}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== iso) {
      errors.push(`${label}: تاريخ غير صالح («${value}»)`);
      return null;
    }
    return date;
  }

  private async validate(file: ImportFile | undefined, options: ImportOptions = {}) {
    const { records: parsed, fileErrors, columnHeaders, mapping, unmappedRequiredKeys } = this.parse(file, options);
    const uniMode = options.universityIdSource?.mode ?? 'column';
    if (uniMode === 'applicationNumber') for (const row of parsed) row.cells[0] = normalizeDigits(row.cells[22].trim());
    const fieldByLabel = new Map(IMPORT_FIELDS.map((field) => [field.label, field]));
    const columnOf = (label: string) => {
      const field = fieldByLabel.get(label);
      const index = field ? mapping[field.key] : null;
      return index === null || index === undefined ? label : `${columnHeaders.get(index) ?? label}`;
    };
    const [colleges, departments, programs, plans, years, semesters, advisors, existing] = await Promise.all([
      this.prisma.college.findMany(), this.prisma.department.findMany(),
      this.prisma.program.findMany(), this.prisma.studyPlan.findMany(),
      this.prisma.academicYear.findMany(), this.prisma.semester.findMany(),
      this.prisma.user.findMany({ where: { role: { code: 'ADVISOR' }, status: 'ACTIVE' }, select: { id: true, email: true } }),
      this.prisma.student.findMany({ where: { OR: [
        { universityId: { in: parsed.map((row) => row.cells[0]).filter(Boolean) } },
        { nationalId: { in: parsed.flatMap((row) => row.cells[21] ? digitVariants(row.cells[21]) : []) } },
      ] } }),
    ]);
    if (uniMode !== 'column') {
      const prefix = normalizeText(options.universityIdSource?.prefix ?? '');
      let counter = 0;
      if (uniMode === 'generate') {
        const taken = await this.prisma.student.findMany({ where: { universityId: { startsWith: prefix } }, select: { universityId: true } });
        for (const item of taken) {
          const suffix = Number(item.universityId.slice(prefix.length));
          if (Number.isInteger(suffix) && suffix > counter) counter = suffix;
        }
      }
      for (const row of parsed) {
        const nationalKey = normalizeDigits(row.cells[21].trim());
        const owner = nationalKey ? existing.find((item) => item.nationalId && normalizeDigits(item.nationalId) === nationalKey) : undefined;
        // الطالب الموجود (بنفس الرقم الوطني) يحتفظ برقمه الجامعي حتى لا يتكرر عند إعادة الاستيراد
        if (owner) row.cells[0] = owner.universityId;
        else if (uniMode === 'generate') row.cells[0] = `${prefix}${String(++counter).padStart(4, '0')}`;
      }
    }
    const seen = new Set<string>();
    const existingById = new Map(existing.map((item) => [item.universityId, item]));
    const existingByNationalId = new Map(existing.filter((item) => item.nationalId).map((item) => [normalizeDigits(item.nationalId!), item]));
    const errors: ImportError[] = [...fileErrors];
    let rowsWithErrors = 0;
    let duplicateCount = 0;
    const seenNationalIds = new Set<string>();
    const valid: Array<{ rowNumber: number; isUpdate: boolean; providedColumns: boolean[]; data: {
      universityId: string; firstName: string; middleName: string | null; familyName: string;
      fullName: string; meritNumber: string | null; motherName: string; nationalId: string; applicationNumber: string; birthPlace: string;
      englishName: string | null; gender: string | null; dateOfBirth: Date | null;
      nationality: string | null; idOrPassport: string | null; universityEmail: string | null;
      phone: string | null; collegeId: string | null; departmentId: string | null;
      programId: string | null; studyPlanId: string | null; academicYearId: string | null;
      semesterId: string | null; status: string; advisorId: string | null; admissionDate: Date | null;
    }; college: string; program: string }> = [];

    // عمود مربوط لكن فارغ بكل الصفوف: يُبلَّغ عنه مرة واحدة بدل خطأ لكل صف
    const emptyColumns = new Set<string>();
    IMPORT_FIELDS.forEach((field, index) => {
      const column = mapping[field.key];
      if (field.required && column !== null && column !== undefined && parsed.every((row) => !row.cells[index])) {
        emptyColumns.add(field.key);
        errors.push({ rowNumber: 0, universityId: '', column: columnOf(field.label), message: field.key === 'universityId'
          ? 'العمود فارغ في كل الصفوف (الرقم الجامعي تعطيه الجامعة). عبّئه في الملف، أو اختر من «مصدر الرقم الجامعي» توليداً تلقائياً أو استخدام رقم الاكتتاب'
          : 'العمود فارغ في كل الصفوف. عبّئه في الملف أو اختر عموداً آخر' });
      }
    });
    const defaults = options.defaults ?? {};
    const ignored = new Map<string, number>();
    const defaultNames = {
      college: colleges.find((item) => item.id === defaults.collegeId)?.nameAr ?? '',
      department: departments.find((item) => item.id === defaults.departmentId)?.nameAr ?? '',
      program: programs.find((item) => item.id === defaults.programId)?.nameAr ?? '',
      plan: plans.find((item) => item.id === defaults.studyPlanId)?.nameAr ?? '',
      year: years.find((item) => item.id === defaults.academicYearId)?.nameAr ?? '',
      semester: semesters.find((item) => item.id === defaults.semesterId)?.nameAr ?? '',
    };
    for (const row of parsed) {
      const [universityId, firstName, middleName, familyName, englishName, gender, birth, nationality,
        idOrPassport, universityEmail, phoneCell, collegeCell, departmentCell, programCell, planCell,
        yearCell, semesterCell, status, advisorEmail, admitted, motherName, nationalId,
        applicationNumber, birthPlace, meritNumber] = row.cells;
      // رقم الهاتف المخزّن كرقم بـ Excel يفقد الصفر الأول (9 أرقام تبدأ بـ 9)
      const phone = /^9\d{8}$/.test(normalizeDigits(phoneCell)) ? `0${normalizeDigits(phoneCell)}` : phoneCell;
      const knownStudent = existingById.get(normalizeText(universityId));
      // القيم الافتراضية تُطبَّق على الطلاب الجدد فقط، ولا تغيّر خطة طالب موجود
      const collegeName = collegeCell || (knownStudent ? '' : defaultNames.college);
      const departmentName = departmentCell || (knownStudent ? '' : defaultNames.department);
      const programName = programCell || (knownStudent ? '' : defaultNames.program);
      const planName = planCell || (knownStudent ? '' : defaultNames.plan);
      const yearName = yearCell || (knownStudent ? '' : defaultNames.year);
      const semesterName = semesterCell || (knownStudent ? '' : defaultNames.semester);
      const normalizedUniversityId = normalizeText(universityId);
      const normalizedFirstName = normalizeText(firstName);
      const normalizedMiddleName = normalizeText(middleName);
      const normalizedFamilyName = normalizeText(familyName);
      const normalizedMotherName = normalizeText(motherName);
      const normalizedNationalId = normalizeDigits(nationalId.trim());
      const normalizedApplicationNumber = normalizeDigits(applicationNumber.trim());
      const normalizedGender = normalizeGender(gender);
      const problems: string[] = [];
      const previous = existingById.get(normalizedUniversityId);
      const values = {
        middleName: normalizedMiddleName || previous?.middleName || '',
        motherName: normalizedMotherName || previous?.motherName || '',
        nationalId: normalizedNationalId || (previous?.nationalId ? normalizeDigits(previous.nationalId) : ''),
        applicationNumber: normalizedApplicationNumber || (previous?.applicationNumber ? normalizeDigits(previous.applicationNumber) : ''),
        birthPlace: normalizeText(birthPlace) || previous?.birthPlace || '',
      };
      if (normalizedFamilyName.length > 100) problems.push('اسم العائلة: أطول من المسموح (100 حرف)');
      for (const [label, key, value, max] of [
        ['الرقم الجامعي', 'universityId', normalizedUniversityId, 50], ['الاسم الأول', 'firstName', normalizedFirstName, 100],
        ['اسم الأب', 'middleName', values.middleName, 100],
        ['اسم الأم', 'motherName', values.motherName, 100], ['الرقم الوطني', 'nationalId', values.nationalId, 100],
        ['رقم الاكتتاب', 'applicationNumber', values.applicationNumber, 100], ['مكان الولادة', 'birthPlace', values.birthPlace, 100],
      ] as const) {
        const uniUnmapped = key === 'universityId' && uniMode === 'column' && (mapping.universityId === null || mapping.universityId === undefined);
        if (!value && !unmappedRequiredKeys.has(key) && !uniUnmapped) {
          // العمود الفارغ بكل الصفوف أُبلغ عنه مرة واحدة: يبقى الصف غير صالح دون تكرار الرسالة
          problems.push(emptyColumns.has(key) ? SILENT : `${label}: مطلوب لإنشاء حساب الطالب`);
        }
        if (value.length > max) problems.push(`${label}: أطول من المسموح (${max} حرفاً)`);
      }
      if (universityEmail.length > 200) problems.push('البريد الجامعي: أطول من المسموح (200 حرف)');
      if (phone.length > 50) problems.push('رقم الهاتف: أطول من المسموح (50 حرفاً)');
      for (const [label, value] of [['الاسم الأول', normalizedFirstName], ['اسم الأب', values.middleName],
        ['اسم العائلة', normalizedFamilyName], ['اسم الأم', values.motherName]] as const) {
        if (value && !isPersonName(value)) problems.push(`${label}: استخدم الحروف والمسافات والشرطة أو الفاصلة العليا فقط`);
      }
      if (englishName && !isPersonName(englishName)) problems.push('الاسم بالإنجليزية: يحتوي على محارف غير مسموحة');
      if (values.nationalId && !isDigitsOnly(values.nationalId)) problems.push('الرقم الوطني: أرقام فقط');
      else if (values.nationalId && !isSyrianNationalId(values.nationalId)) problems.push('الرقم الوطني: أدخل 11 رقمًا');
      if (values.applicationNumber && !isDigitsOnly(values.applicationNumber)) problems.push('رقم الاكتتاب: أرقام فقط');
      if (phone && !isSyrianMobile(phone)) problems.push('رقم الهاتف: أدخل رقمًا سوريًا محليًا من 10 أرقام يبدأ بـ 09');
      if (gender && !normalizedGender) problems.push('الجنس: استخدم ذكر أو أنثى');
      if (nationality && !isPersonName(nationality)) problems.push('الجنسية: استخدم الحروف والمسافات فقط');
      if (values.birthPlace && !isPlaceName(values.birthPlace)) problems.push('مكان الولادة: أدخل اسم المكان بصيغة صحيحة');
      const repeatedInFile = Boolean(normalizedUniversityId && seen.has(normalizedUniversityId));
      if (repeatedInFile) problems.push('الرقم الجامعي: مكرر داخل الملف');
      seen.add(normalizedUniversityId);
      const repeatedNationalInFile = Boolean(values.nationalId && seenNationalIds.has(values.nationalId));
      if (repeatedNationalInFile) problems.push('الرقم الوطني: مكرر داخل الملف');
      if (repeatedInFile || repeatedNationalInFile) duplicateCount++;
      if (values.nationalId) seenNationalIds.add(values.nationalId);
      const existingStudent = existingById.get(normalizedUniversityId);
      const nationalOwner = existingByNationalId.get(values.nationalId);
      if (nationalOwner && nationalOwner.universityId !== normalizedUniversityId) problems.push('الرقم الوطني: مسجل لطالب آخر بالنظام');
      if (universityEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(universityEmail)) problems.push('البريد الجامعي: غير صالح');
      const dateOfBirth = birth ? this.parseDate(birth, 'تاريخ الميلاد', problems) : existingStudent?.dateOfBirth ?? null;
      const admissionDate = admitted ? this.parseDate(admitted, 'تاريخ القبول', problems) : existingStudent?.admissionDate ?? null;

      const resolve = <T extends { id: string; nameAr: string }>(name: string, entries: T[], parentId: string | null, parentKey: keyof T | undefined, label: string, fallbackId?: string | null, ordinal = false, skipWhenNoParent = false) => {
        if (!name) {
          if (!fallbackId) return null;
          const previous = entries.find((entry) => entry.id === fallbackId);
          if (!previous || (parentKey && previous[parentKey] !== parentId)) {
            problems.push(`${label}: أدخل القيمة لتتوافق مع المستوى الأكاديمي الجديد`);
            return null;
          }
          return fallbackId;
        }
        if (parentKey && !parentId) {
          // الخطة غير محددة (تُحدَّد عند اعتماد التسجيل): تُتجاهل هذه الخلية ويُنبَّه المستخدم بدل اعتبارها خطأ
          if (skipWhenNoParent) { ignored.set(label, (ignored.get(label) ?? 0) + 1); return null; }
          problems.push(`${label}: اختر المستوى الأكاديمي السابق`);
          return null;
        }
        const scoped = entries.filter((entry) => !parentKey || entry[parentKey] === parentId);
        // مطابقة متدرجة: اسم مطابق تماماً، ثم بعد توحيد الحروف والمسافات، ثم الترتيب (الأولى = 1)، ثم احتواء فريد
        const norm = StudentImportsService.normalizeHeader;
        const attempts: Array<(entry: T) => boolean> = [
          (entry) => entry.nameAr === name,
          (entry) => norm(entry.nameAr) === norm(name),
          ...(ordinal ? [(entry: T) => { const a = StudentImportsService.ordinalOf(name); return a !== null && a === StudentImportsService.ordinalOf(entry.nameAr); }] : []),
          (entry) => norm(name).length >= 3 && (norm(entry.nameAr).includes(norm(name)) || norm(name).includes(norm(entry.nameAr))),
        ];
        let matches: T[] = [];
        for (const attempt of attempts) { matches = scoped.filter(attempt); if (matches.length === 1) break; if (matches.length > 1) break; }
        if (matches.length !== 1) problems.push(`${label}: القيمة «${name}» غير موجودة بالنظام أو غير محددة بشكل فريد`);
        return matches.length === 1 ? matches[0].id : null;
      };
      const collegeId = resolve(collegeName, colleges, null, undefined, 'الكلية', existingStudent?.collegeId);
      const departmentId = resolve(departmentName, departments, collegeId, 'collegeId', 'القسم', existingStudent?.departmentId);
      let programId: string | null = null;
      if (departmentId) programId = resolve(programName, programs, departmentId, 'departmentId', 'البرنامج', existingStudent?.programId, false, true);
      else if (programName) ignored.set('البرنامج', (ignored.get('البرنامج') ?? 0) + 1);
      const studyPlanId = resolve(planName, plans, programId, 'programId', 'الخطة الدراسية', existingStudent?.studyPlanId, false, true);
      const academicYearId = resolve(yearName, years, studyPlanId, 'studyPlanId', 'المستوى الأكاديمي', existingStudent?.academicYearId, true, true);
      const semesterId = resolve(semesterName, semesters, academicYearId, 'academicYearId', 'الفصل الدراسي', existingStudent?.semesterId, true, true);
      const matchingAdvisors = advisorEmail ? advisors.filter((person) => person.email.toLowerCase() === advisorEmail.toLowerCase()) : [];
      if (advisorEmail && matchingAdvisors.length !== 1) problems.push('بريد المرشد: غير موجود أو الحساب غير نشط');

      if (problems.length) {
        rowsWithErrors++;
        for (const problem of problems) {
          if (problem === SILENT) continue;
          const separator = problem.indexOf(':');
          const label = separator > 0 ? problem.slice(0, separator) : '';
          errors.push({ rowNumber: row.rowNumber, universityId, column: label ? columnOf(label) : undefined, message: separator > 0 ? problem.slice(separator + 1).trim() : problem });
        }
      } else {
        valid.push({ rowNumber: row.rowNumber, isUpdate: Boolean(existingStudent), providedColumns: row.cells.map(Boolean), college: collegeName, program: programName,
          data: { universityId: normalizedUniversityId, firstName: normalizedFirstName, middleName: values.middleName, familyName: normalizedFamilyName || previous?.familyName || '',
            meritNumber: meritNumber?.trim() || existingStudent?.meritNumber || null,
            fullName: [normalizedFirstName, values.middleName, normalizedFamilyName || previous?.familyName].filter(Boolean).join(' '),
            motherName: values.motherName, nationalId: values.nationalId,
            applicationNumber: values.applicationNumber, birthPlace: values.birthPlace,
            englishName: englishName ? normalizeText(englishName) : existingStudent?.englishName || null, gender: normalizedGender || existingStudent?.gender || null, dateOfBirth,
            nationality: nationality || existingStudent?.nationality || null, idOrPassport: idOrPassport || existingStudent?.idOrPassport || null,
            universityEmail: universityEmail || existingStudent?.universityEmail || null, phone: phone ? normalizeDigits(phone) : existingStudent?.phone || null,
            collegeId, departmentId, programId, studyPlanId, academicYearId,
            semesterId, status: status || existingStudent?.status || 'ACTIVE', advisorId: matchingAdvisors[0]?.id ?? existingStudent?.advisorId ?? null,
            admissionDate },
        });
      }
    }

    const notes = [...ignored].map(([label, count]) => `تم تجاهل «${label}» في ${count} صف لأن الخطة الدراسية غير محددة. يُربط الطالب بالخطة والمستوى والفصل لاحقاً عند اعتماد التسجيل من صفحة الطلاب.`);
    const globalErrors = errors.filter((item) => item.rowNumber === 0).length;
    return {
      total: parsed.length, validCount: valid.length, updateCount: valid.filter((item) => item.isUpdate).length, errorCount: rowsWithErrors + globalErrors, notes, problemCount: errors.length, duplicateCount, errors,
      rows: valid.map((item) => ({ rowNumber: item.rowNumber, universityId: item.data.universityId,
        name: [item.data.firstName, item.data.middleName, item.data.familyName].filter(Boolean).join(' '),
        college: item.college, program: item.program, action: item.isUpdate ? 'تحديث' : 'إضافة' })),
      valid,
    };
  }

  async preview(file?: ImportFile, options: ImportOptions = {}) {
    const { valid, ...publicResult } = await this.validate(file, options);
    return publicResult;
  }

  async confirm(file: ImportFile | undefined, actingUserId: string, options: ImportOptions = {}) {
    const result = await this.validate(file, options);
    if (result.errors.length) throw new BadRequestException('يوجد أخطاء بالملف. صحّحها وأعد معاينة الملف قبل الاستيراد');
    let imported = 0;
    let updated = 0;
    const fieldColumns: Record<string, number> = {
      firstName: 1, middleName: 2, familyName: 3, englishName: 4, gender: 5,
      dateOfBirth: 6, nationality: 7, idOrPassport: 8, universityEmail: 9,
      phone: 10, collegeId: 11, departmentId: 12, programId: 13,
      studyPlanId: 14, academicYearId: 15, semesterId: 16, status: 17,
      advisorId: 18, admissionDate: 19, motherName: 20, nationalId: 21,
      applicationNumber: 22, birthPlace: 23, meritNumber: 24,
    };
    try {
      await this.prisma.$transaction(async (tx) => {
        for (const row of result.valid) {
          if (row.isUpdate) {
            const nameProvided = row.providedColumns[1] || row.providedColumns[2] || row.providedColumns[3];
            const updateData = Object.fromEntries(Object.entries(row.data).filter(([key]) => {
              if (key === 'universityId') return false;
              if (key === 'fullName') return nameProvided;
              return row.providedColumns[fieldColumns[key] ?? -1];
            }));
            await tx.student.update({ where: { universityId: row.data.universityId }, data: updateData });
            updated++;
          } else {
            await tx.student.create({ data: row.data });
            imported++;
          }
        }
        await tx.auditLog.create({ data: {
          action: 'STUDENTS_IMPORTED', entity: 'Student', userId: actingUserId,
          details: JSON.stringify({ imported, updated, count: result.total }),
        } });
      });
    } catch (error) {
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        throw new ConflictException('Student data changed; preview the file again');
      }
      throw error;
    }
    return { total: result.total, imported, updated, errors: 0, duplicates: result.duplicateCount };
  }
}

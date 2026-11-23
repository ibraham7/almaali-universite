import { readFileSync } from 'node:fs';
import { BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { StudentImportsService, STUDENT_IMPORT_HEADERS } from './student-imports.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function file(rows: string[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([STUDENT_IMPORT_HEADERS, ...rows]), 'الطلاب');
  return { originalname: 'students.xlsx', buffer: XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer };
}

function row(universityId: string, firstName: string, familyName: string, birth = '') {
  const numericId = universityId.replace(/\D/g, '') || '999';
  const cells = Array<string>(STUDENT_IMPORT_HEADERS.length).fill('');
  Object.assign(cells, {
    0: universityId, 1: firstName, 2: 'عمر', 3: familyName, 6: birth,
    11: 'كلية التربية', 12: 'قسم معلم صف', 13: 'معلم صف', 14: 'خطة معلم صف', 15: 'السنة الأولى', 16: 'الفصل الأول',
    20: 'منى', 21: `1234${numericId}`, 22: `456${numericId}`, 23: 'حلب',
  });
  return cells;
}

function withoutPlacement(cells: string[]) {
  const copy = [...cells];
  for (const column of [11, 12, 13, 14, 15, 16]) copy[column] = '';
  return copy;
}

function database(ids: string[] = [], existingHasPlan = false) {
  const findMany = vi.fn().mockResolvedValue([]);
  const create = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  const audit = vi.fn().mockResolvedValue({});
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({ student: { create, update }, auditLog: { create: audit } }));
  const prisma = {
    college: { findMany: vi.fn().mockResolvedValue([{ id: 'college-1', nameAr: 'كلية التربية', code: '01' }, { id: 'college-2', nameAr: 'كلية بلا رمز', code: null }]) },
    department: { findMany: vi.fn().mockResolvedValue([{ id: 'dep-1', nameAr: 'قسم معلم صف', collegeId: 'college-1' }]) },
    program: { findMany: vi.fn().mockResolvedValue([{ id: 'program-1', nameAr: 'معلم صف', collegeId: 'college-1', departmentId: 'dep-1' }]) },
    studyPlan: { findMany: vi.fn().mockResolvedValue([{ id: 'plan-1', nameAr: 'خطة معلم صف', programId: 'program-1' }]) },
    academicYear: { findMany: vi.fn().mockResolvedValue([{ id: 'year-1', nameAr: 'السنة الأولى', studyPlanId: 'plan-1' }]) },
    semester: { findMany: vi.fn().mockResolvedValue([{ id: 'semester-1', nameAr: 'الفصل الأول', academicYearId: 'year-1' }]) },
    user: { findMany }, student: { findMany: vi.fn().mockResolvedValue(ids.map((universityId) => ({
      universityId, firstName: 'سارة', middleName: 'عمر', familyName: 'علي', fullName: 'سارة عمر علي',
      motherName: 'منى', nationalId: 'N-OLD', applicationNumber: 'A-OLD', birthPlace: 'حلب', englishName: null,
      gender: null, dateOfBirth: null, nationality: null, idOrPassport: null,
      universityEmail: null, phone: null,
      collegeId: existingHasPlan ? 'college-1' : null, departmentId: existingHasPlan ? 'dep-1' : null, programId: existingHasPlan ? 'program-1' : null,
      studyPlanId: existingHasPlan ? 'plan-1' : null, academicYearId: existingHasPlan ? 'year-1' : null,
      semesterId: existingHasPlan ? 'semester-1' : null, status: 'ACTIVE', advisorId: null,
      admissionDate: null,
    }))) },
    studentNumberHistory: { findMany: vi.fn().mockResolvedValue([]) },
    $transaction: transaction,
  } as unknown as PrismaService;
  return { prisma, transaction, create, update, audit };
}

const problems = (result: { errors: Array<{ column?: string; message: string }> }) => result.errors.map((item) => `${item.column ?? ''}: ${item.message}`).join(' | ');

describe('Student Excel import', () => {
  it('ships a template with the exact headers accepted by the importer', () => {
    const bytes = readFileSync('../web/public/templates/students-temp.xlsx');
    const workbook = XLSX.read(bytes, { type: 'buffer' });
    const headings = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets['الطلاب'], { header: 1 })[0];
    expect(headings).toEqual(STUDENT_IMPORT_HEADERS);
  });

  it('previews duplicates and invalid dates without writing', async () => {
    const { prisma, transaction } = database(['2026001']);
    const rows = [
      row('2026001', 'سارة', 'علي'),
      row('2026002', 'هند', 'خالد', '2026-02-30'),
      row('2026002', 'منى', 'مثال'),
    ];
    const result = await new StudentImportsService(prisma).preview(file(rows));
    expect(result).toMatchObject({ total: 3, validCount: 1, updateCount: 1, errorCount: 2, duplicateCount: 1 });
    expect(result.errors[0].rowNumber).toBe(3);
    expect(result.errors[0].message).toContain('تاريخ غير صالح');
    expect(result.errors[1].message).toContain('مكرر داخل الملف');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('confirms valid rows and an audit event atomically', async () => {
    const { prisma, create, audit } = database();
    const result = await new StudentImportsService(prisma).confirm(file([row('2026003', 'هند', 'خالد')]), 'registrar-1');
    expect(result).toMatchObject({ imported: 1, errors: 0 });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      universityId: '2026003', firstName: 'هند', fullName: 'هند عمر خالد',
      motherName: 'منى', nationalId: '12342026003', applicationNumber: '4562026003', birthPlace: 'حلب',
    }) });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENTS_IMPORTED', userId: 'registrar-1' }) });
  });

  it('updates an existing student writing only the fields that actually changed', async () => {
    const { prisma, update } = database(['2026001']);
    const result = await new StudentImportsService(prisma).confirm(file([row('2026001', 'مريم', 'علي')]), 'registrar-1');
    expect(result).toMatchObject({ imported: 0, updated: 1, unchanged: 0 });
    // اسم الأب والعائلة والأم ومكان الولادة مطابقة لما بالمنظومة فلا تُكتب
    expect(update).toHaveBeenCalledWith({
      where: { universityId: '2026001' },
      data: {
        firstName: 'مريم', fullName: 'مريم عمر علي',
        nationalId: '12342026001', applicationNumber: '4562026001',
        collegeId: 'college-1', departmentId: 'dep-1', programId: 'program-1', studyPlanId: 'plan-1',
        academicYearId: 'year-1', semesterId: 'semester-1',
      },
    });
  });

  it('skips a student whose data matches exactly and reports it as unchanged', async () => {
    const { prisma, update, audit } = database(['2026001'], true);
    const [base] = await prisma.student.findMany();
    vi.mocked(prisma.student.findMany).mockResolvedValue([{ ...base, nationalId: '12342026001', applicationNumber: '4562026001' }] as never);
    const service = new StudentImportsService(prisma);
    const upload = file([row('2026001', 'سارة', 'علي')]);
    expect(await service.preview(upload)).toMatchObject({ validCount: 1, newCount: 0, updateCount: 0, unchangedCount: 1 });
    expect(await service.confirm(upload, 'registrar-1')).toMatchObject({ imported: 0, updated: 0, unchanged: 1 });
    expect(update).not.toHaveBeenCalled();
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENTS_IMPORTED' }) });
  });

  it('shows what changed (before and after) in the preview and logs it in the audit', async () => {
    const { prisma, update, audit } = database(['2026001'], true);
    const [base] = await prisma.student.findMany();
    vi.mocked(prisma.student.findMany).mockResolvedValue([{ ...base, nationalId: '12342026001', applicationNumber: '4562026001' }] as never);
    const service = new StudentImportsService(prisma);
    const upload = file([row('2026001', 'مريم', 'علي')]);
    const preview = await service.preview(upload);
    expect(preview).toMatchObject({ newCount: 0, updateCount: 1, unchangedCount: 0 });
    expect(preview.rows[0]).toMatchObject({ action: 'تحديث', changes: [{ field: 'firstName', label: 'الاسم الأول', before: 'سارة', after: 'مريم' }] });
    await service.confirm(upload, 'registrar-1');
    expect(update).toHaveBeenCalledWith({ where: { universityId: '2026001' }, data: { firstName: 'مريم', fullName: 'مريم عمر علي' } });
    const details = JSON.parse(audit.mock.calls[0][0].data.details);
    expect(details).toMatchObject({ updated: 1, unchanged: 0, changes: [{ universityId: '2026001', changes: [{ field: 'firstName' }] }] });
  });

  it('does not import a file containing an invalid row', async () => {
    const { prisma, transaction } = database();
    const service = new StudentImportsService(prisma);
    await expect(service.confirm(file([row('', 'هند', 'خالد')]), 'registrar-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('rejects a new student row missing the sign-up matching data', async () => {
    const { prisma, transaction } = database();
    const incomplete = row('2026004', 'هند', 'خالد');
    incomplete[20] = '';
    const result = await new StudentImportsService(prisma).preview(file([incomplete, row('2026005', 'سارة', 'علي')]));
    expect(result).toMatchObject({ validCount: 1, errorCount: 1 });
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toMatchObject({ rowNumber: 2, column: 'اسم الأم' });
    expect(result.errors[0].message).toContain('مطلوب');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('flags invalid names, non-numeric identifiers, and unsupported gender values during preview', async () => {
    const { prisma, transaction } = database();
    const invalid = row('2026008', 'سارة1', 'مثال');
    invalid[5] = 'غير محدد';
    invalid[21] = '12A34';
    const result = await new StudentImportsService(prisma).preview(file([invalid]));
    expect(result.errorCount).toBe(1);
    expect(problems(result)).toContain('الاسم الأول: استخدم الحروف');
    expect(problems(result)).toContain('الرقم الوطني: أرقام فقط');
    expect(problems(result)).toContain('الجنس: استخدم ذكر أو أنثى');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('requires the provisional national ID and mobile formats before allowing Excel import', async () => {
    const { prisma, transaction } = database();
    const invalid = row('2026010', 'هند', 'خالد');
    invalid[21] = '12345';
    invalid[10] = '+963 944 123 456';
    const result = await new StudentImportsService(prisma).preview(file([invalid]));
    expect(result.errorCount).toBe(1);
    expect(problems(result)).toContain('الرقم الوطني: أدخل 11 رقمًا');
    expect(problems(result)).toContain('رقمًا سوريًا محليًا من 10 أرقام');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('accepts and normalizes Arabic-Indic digits in identity numbers', async () => {
    const { prisma } = database();
    const arabicDigits = row('2026009', 'هند', 'خالد');
    arabicDigits[21] = '١٢٣٤٥٦٧٨٩٠١';
    arabicDigits[22] = '٦٧٨٩';
    const result = await new StudentImportsService(prisma).confirm(file([arabicDigits]), 'registrar-1');
    expect(result.imported).toBe(1);
  });

  it('imports a new student without a plan: the plan is linked later when the registration is approved', async () => {
    const { prisma, create } = database();
    const result = await new StudentImportsService(prisma).confirm(file([withoutPlacement(row('2026011', 'هند', 'خالد'))]), 'registrar-1');
    expect(result).toMatchObject({ imported: 1, errors: 0 });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ studyPlanId: null, collegeId: null, semesterId: null }) });
  });

  it('accepts a student without a family name and keeps the ministry number', async () => {
    const { prisma, create } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['رقم الاكتتاب', 'اسم الطالب', 'الأب', 'الأم', 'الرقم الوطني', 'مكان الولادة', 'الرقم الجامعي', 'الرقم الجامعي المولد على نظام الوزارة'],
      [['7001', 'هند', 'عمر', 'منى', '12345678901', 'حلب', '2026012', '9988776655']]);
    const info = service.inspect(upload);
    expect(info.suggestedMapping.meritNumber).toBe(7);
    expect(info.suggestedMapping.universityId).toBe(6);
    await service.confirm(upload, 'registrar-1', { mapping: info.suggestedMapping });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ universityId: '2026012', familyName: '', fullName: 'هند عمر', meritNumber: '9988776655', studyPlanId: null }) });
  });

  it('keeps the plan of an existing student when the placement columns are left blank', async () => {
    const { prisma } = database(['2026001'], true);
    const result = await new StudentImportsService(prisma).preview(file([withoutPlacement(row('2026001', 'سارة', 'علي'))]));
    expect(result).toMatchObject({ validCount: 1, errorCount: 0, updateCount: 1 });
  });

  // ===== استيراد مرن: أي ورقة، أي صف بداية، أي ترتيب وأسماء أعمدة =====
  const ministryFile = (headers: string[], rows: string[][], sheet = 'Sheet1', blankRows = 0) => {
    const workbook = XLSX.utils.book_new();
    const aoa: string[][] = [...Array.from({ length: blankRows }, () => ['بيانات وزارة التعليم العالي']), headers, ...rows];
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(aoa), sheet);
    return { buffer: Buffer.from(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })), originalname: 'ministry.xlsx' };
  };
  const ministryHeaders = ['م', 'رقم الاكتتاب', 'الاسم', 'الأب', 'الكنية', 'الأم', 'الرقم الوطني', 'مكان الولادة', 'الرقم الجامعي', 'الجنس', 'ملاحظات'];

  it('reads any sheet name, a header row that is not row 1, and suggests the column mapping by name', () => {
    const { prisma } = database();
    const info = new StudentImportsService(prisma).inspect(ministryFile(ministryHeaders, [['1', '999', 'هند', 'عمر', 'خالد', 'منى', '12345678901', 'حلب', '2026500', 'أنثى', '']], 'القبول', 2));
    expect(info.sheet).toBe('القبول');
    expect(info.headerRow).toBe(3);
    expect(info.dataRowCount).toBe(1);
    expect(info.suggestedMapping).toMatchObject({ applicationNumber: 1, firstName: 2, middleName: 3, familyName: 4, motherName: 5, nationalId: 6, birthPlace: 7, universityId: 8, gender: 9 });
    expect(info.suggestedMapping.college).toBeNull();
  });

  it('previews a ministry-shaped file using the chosen mapping and the default placement', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(ministryHeaders, [['1', '999', 'هند', 'عمر', 'خالد', 'منى', '12345678901', 'حلب', '2026500', 'أنثى', '']]);
    const info = service.inspect(upload);
    const result = await service.preview(upload, { mapping: info.suggestedMapping, defaults: { collegeId: 'college-1', programId: 'program-1', studyPlanId: 'plan-1', academicYearId: 'year-1', semesterId: 'semester-1' } });
    expect(result).toMatchObject({ total: 1, validCount: 1, errorCount: 0 });
  });

  it('reports every problem at once with the row, the file column and the reason', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(ministryHeaders, [
      ['1', '999', 'هند1', 'عمر', 'خالد', 'منى', '123', 'حلب', '2026501', 'غير محدد', ''],
      ['2', '998', 'سارة', 'علي', 'أحمد', '', '12345678902', 'دمشق', '2026502', 'أنثى', ''],
    ]);
    const result = await service.preview(upload, { mapping: service.inspect(upload).suggestedMapping, defaults: { collegeId: 'college-1', programId: 'program-1', studyPlanId: 'plan-1', academicYearId: 'year-1', semesterId: 'semester-1' } });
    expect(result.errorCount).toBe(2);
    const found = result.errors.map((item) => `${item.rowNumber}|${item.column}`);
    expect(found).toEqual(expect.arrayContaining(['2|الاسم', '2|الرقم الوطني', '2|الجنس', '3|الأم']));
  });

  it('reports a required field that is not mapped once, not once per row', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['الرقم الجامعي', 'الاسم', 'الأب', 'الكنية'], [['2026600', 'هند', 'عمر', 'خالد'], ['2026601', 'سارة', 'علي', 'أحمد']]);
    const result = await service.preview(upload, { mapping: service.inspect(upload).suggestedMapping });
    const unmapped = result.errors.filter((item) => item.rowNumber === 0).map((item) => item.column);
    expect(unmapped).toEqual(expect.arrayContaining(['اسم الأم', 'رقم الاكتتاب']));
    // الرقم الوطني ومكان الولادة لم يعودا مطلوبين (ملف الوزارة لا يتضمنهما)
    expect(unmapped).not.toContain('الرقم الوطني');
    expect(unmapped).not.toContain('مكان الولادة');
    expect(result.errors.filter((item) => item.message.includes('مطلوب لإنشاء حساب الطالب'))).toHaveLength(0);
  });

  it('accepts DD/MM/YYYY dates and restores the leading zero of a phone stored as a number', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const headers = [...ministryHeaders.slice(1, 9), 'تاريخ الميلاد', 'رقم الهاتف'];
    const upload = ministryFile(headers, [['999', 'هند', 'عمر', 'خالد', 'منى', '12345678901', 'حلب', '2026700', '25/03/2004', '944123456']]);
    const result = await service.preview(upload, { mapping: service.inspect(upload).suggestedMapping, defaults: { collegeId: 'college-1', programId: 'program-1', studyPlanId: 'plan-1', academicYearId: 'year-1', semesterId: 'semester-1' } });
    expect(result).toMatchObject({ validCount: 1, errorCount: 0 });
  });

  it('explains clearly when the file is not an .xlsx', () => {
    const { prisma } = database();
    expect(() => new StudentImportsService(prisma).inspect({ buffer: Buffer.from('a,b'), originalname: 'x.csv' })).toThrow(/xlsx/);
  });

  it('accepts a real .xlsx whose file name does not end with .xlsx (WhatsApp-style names)', () => {
    const { prisma } = database();
    const upload = { ...ministryFile(['رقم الجامعي', 'الاسم'], [['2026900', 'هند']]), originalname: 'التربية الخاصة xlsx.1794656071505' };
    expect(new StudentImportsService(prisma).inspect(upload).dataRowCount).toBe(1);
  });

  const noUniversityId = ['رقم الاكتتاب', 'الاسم', 'الأب', 'الكنية', 'الأم', 'الرقم الوطني', 'مكان الولادة'];
  const noIdRows = [['7001', 'هند', 'عمر', 'خالد', 'منى', '12345678901', 'حلب'], ['7002', 'سارة', 'علي', 'أحمد', 'ليلى', '12345678902', 'دمشق']];
  const allPlacement = { collegeId: 'college-1', programId: 'program-1', studyPlanId: 'plan-1', academicYearId: 'year-1', semesterId: 'semester-1' };

  it('uses the application number as the university number when the file has no such column', async () => {
    const { prisma, create } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(noUniversityId, noIdRows);
    const options = { mapping: service.inspect(upload).suggestedMapping, defaults: allPlacement, universityIdSource: { mode: 'applicationNumber' as const } };
    expect(await service.preview(upload, options)).toMatchObject({ validCount: 2, errorCount: 0 });
    await service.confirm(upload, 'registrar-1', options);
    expect(create.mock.calls.map((call) => call[0].data.universityId)).toEqual(['7001', '7002']);
  });

  it('generates sequential university numbers with a prefix, continuing after the highest existing one', async () => {
    const { prisma, create } = database();
    (prisma.student as unknown as { findMany: ReturnType<typeof vi.fn> }).findMany = vi.fn().mockImplementation(({ where }: { where: { universityId?: { startsWith?: string } } }) =>
      Promise.resolve(where.universityId?.startsWith ? [{ universityId: '20260007' }] : []));
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(noUniversityId, noIdRows);
    const options = { mapping: service.inspect(upload).suggestedMapping, defaults: allPlacement, universityIdSource: { mode: 'generate' as const, prefix: '2026' } };
    await service.confirm(upload, 'registrar-1', options);
    expect(create.mock.calls.map((call) => call[0].data.universityId)).toEqual(['20260008', '20260009']);
  });

  it('asks for a prefix when generating university numbers', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(noUniversityId, noIdRows);
    const result = await service.preview(upload, { mapping: service.inspect(upload).suggestedMapping, defaults: allPlacement, universityIdSource: { mode: 'generate' } });
    expect(result.errors.some((item) => item.rowNumber === 0 && item.column === 'الرقم الجامعي' && item.message.includes('بادئة'))).toBe(true);
  });

  it('matches the level and semester by their order, so «الأولى» or «1» match «السنة الأولى»', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    for (const [year, semester] of [['الأولى', 'الأول'], ['1', '١'], ['السنة الأولى', 'الفصل الأول']]) {
      const cells = row('2026800', 'هند', 'خالد');
      cells[15] = year; cells[16] = semester;
      expect(await service.preview(file([cells]))).toMatchObject({ validCount: 1, errorCount: 0 });
    }
  });

  it('still reports a value that matches nothing, with the file value in the message', async () => {
    const { prisma } = database();
    const cells = row('2026801', 'هند', 'خالد');
    cells[15] = 'السنة الخامسة عشرة';
    const result = await new StudentImportsService(prisma).preview(file([cells]));
    expect(result.errors.find((item) => item.column === 'المستوى الأكاديمي')?.message).toContain('السنة الخامسة عشرة');
  });

  it('suggests the right mapping for the headers of the ministry file', () => {
    const { prisma } = database();
    const headers = ['#', 'الرقم الجامعي', 'الرقم الجامعي المولد على نظام الوزارة', 'اسم الطالب', 'الأب', 'الأم', 'الرقم الوطني', 'مكان الولادة', 'تاريخ الولادة',
      'الجنسية', 'الجنس', 'رقم الاكتتاب', 'مصدر الشهادة (سورية - غير سورية)', 'مصدر الشهادة (المحافظة)', 'نوع الشهادة(علمي - أدبي- شرعي- مهني)', 'عام الحصول على الثانوية',
      'معدل التفاضل', 'نوع القبول (ثانوية - إجازة معهد)', 'عام القبول', 'الكلية المسجل فيها', 'الاختصاص', 'ملاحظات وضع الطالب( مستمر- مؤجل...', 'السنة الدراسية', 'ملاحظات  أخرى'];
    const info = new StudentImportsService(prisma).inspect(ministryFile(headers, [Array(headers.length).fill('x')], 'ورقة1'));
    const letter = (key: string) => { const index = info.suggestedMapping[key]; return index === null ? null : info.columns.find((column) => column.index === index)?.letter; };
    expect(['universityId', 'firstName', 'middleName', 'motherName', 'nationalId', 'birthPlace', 'dateOfBirth', 'nationality', 'gender', 'applicationNumber', 'college', 'department', 'year'].map(letter))
      .toEqual(['B', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'T', 'U', 'W']);
    // the file has no family-name column, and the generated ministry number is a second, separate column
    expect(info.suggestedMapping.familyName).toBeNull();
    expect(info.suggestedMapping.universityId).not.toBe(2);
  });

  it('ignores the level and semester columns when no plan is chosen, with a note instead of an error', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['رقم الاكتتاب', 'اسم الطالب', 'الأب', 'الأم', 'الرقم الوطني', 'مكان الولادة', 'الرقم الجامعي', 'السنة الدراسية'],
      [['7001', 'هند', 'عمر', 'منى', '12345678901', 'حلب', '2026013', 'الأولى'], ['7002', 'سارة', 'علي', 'ليلى', '12345678902', 'دمشق', '2026014', 'الثانية']]);
    const result = await service.preview(upload, { mapping: service.inspect(upload).suggestedMapping });
    expect(result).toMatchObject({ validCount: 2, errorCount: 0 });
    expect(result.notes.join(' ')).toContain('تم تجاهل «المستوى الأكاديمي» في 2 صف');
  });

  it('recognizes the headers of the ministry report: «رقم الجامعي» and «رقم الاتصال»', () => {
    const { prisma } = database();
    const headers = ['رقم الجامعي', 'تم التسجيل؟', 'رقم الاتصال', 'البريد الالكتروني', 'رقم الاكتتاب', 'الاسم', 'اسم الأب', 'الكنية', 'الجنس', 'تاريخ الميلاد', 'اسم الأم'];
    const info = new StudentImportsService(prisma).inspect(ministryFile(headers, [Array(headers.length).fill('x')], 'تقرير'));
    expect(info.suggestedMapping).toMatchObject({ universityId: 0, phone: 2, universityEmail: 3, applicationNumber: 4, firstName: 5, middleName: 6, familyName: 7, gender: 8, dateOfBirth: 9, motherName: 10 });
  });

  it('reports a mapped column that is empty in every row once, not once per row', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['رقم الجامعي', 'رقم الاكتتاب', 'اسم الطالب', 'الأب', 'الأم', 'الرقم الوطني', 'مكان الولادة'],
      [['', '7001', 'هند', 'عمر', 'منى', '12345678901', 'حلب'], ['', '7002', 'سارة', 'علي', 'ليلى', '12345678902', 'دمشق']]);
    const result = await service.preview(upload, { mapping: service.inspect(upload).suggestedMapping });
    const universityNumber = result.errors.filter((item) => item.column === 'رقم الجامعي');
    expect(universityNumber).toHaveLength(1);
    expect(universityNumber[0]).toMatchObject({ rowNumber: 0 });
    expect(universityNumber[0].message).toContain('تعطيه الجامعة');
  });

  it('imports the ministry file without national ID or birth place (completed later)', async () => {
    const { prisma, create } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['رقم الجامعي', 'رقم الاكتتاب', 'الاسم', 'الأب', 'الكنية', 'الأم', 'تاريخ الميلاد'],
      [['2026901', '8101', 'هند', 'عمر', 'خالد', 'منى', '2004-03-25'], ['2026902', '8102', 'سارة', 'علي', 'أحمد', 'ليلى', '2005-01-10']]);
    const options = { mapping: service.inspect(upload).suggestedMapping };
    expect(await service.preview(upload, options)).toMatchObject({ validCount: 2, errorCount: 0 });
    await service.confirm(upload, 'registrar-1', options);
    expect(create.mock.calls[0][0].data).toMatchObject({ nationalId: null, birthPlace: null, applicationNumber: '8101' });
  });

  it('generates university numbers with the chosen number of digits', async () => {
    const { prisma, create } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['رقم الاكتتاب', 'الاسم', 'الأب', 'الأم'], [['8101', 'هند', 'عمر', 'منى'], ['8102', 'سارة', 'علي', 'ليلى']]);
    await service.confirm(upload, 'registrar-1', { mapping: service.inspect(upload).suggestedMapping, universityIdSource: { mode: 'generate', prefix: 'S26-', digits: 5 } });
    expect(create.mock.calls.map((call) => call[0].data.universityId)).toEqual(['S26-00001', 'S26-00002']);
  });

  const byCollegeRows = [['8101', 'هند', 'عمر', 'منى'], ['8102', 'سارة', 'علي', 'ليلى']];
  const byCollegeHeaders = ['رقم الاكتتاب', 'الاسم', 'الأب', 'الأم'];

  it('generates year + college code + 3-digit sequence (27 + 01 + 001 = 2701001), continuing the sequence', async () => {
    const { prisma, create } = database();
    (prisma.student as unknown as { findMany: ReturnType<typeof vi.fn> }).findMany = vi.fn().mockImplementation(({ where }: { where: { universityId?: { startsWith?: string } } }) =>
      Promise.resolve(where.universityId?.startsWith === '2701' ? [{ universityId: '2701007' }, { universityId: '27010099' }] : []));
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(byCollegeHeaders, byCollegeRows);
    const options = { mapping: service.inspect(upload).suggestedMapping, defaults: { collegeId: 'college-1' }, universityIdSource: { mode: 'byCollege' as const, year: 2027 } };
    expect(await service.preview(upload, options)).toMatchObject({ validCount: 2, errorCount: 0 });
    await service.confirm(upload, 'registrar-1', options);
    expect(create.mock.calls.map((call) => call[0].data.universityId)).toEqual(['2701008', '2701009']);
    expect(create.mock.calls[0][0].data.collegeId).toBe('college-1');
  });

  it('asks for the year, the college and a college code before generating by college', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(byCollegeHeaders, byCollegeRows);
    const mapping = service.inspect(upload).suggestedMapping;
    const messages = async (options: Parameters<StudentImportsService['preview']>[1]) =>
      (await service.preview(upload, options)).errors.filter((item) => item.rowNumber === 0).map((item) => item.message).join(' | ');
    expect(await messages({ mapping, defaults: { collegeId: 'college-1' }, universityIdSource: { mode: 'byCollege' } })).toContain('سنة القبول');
    expect(await messages({ mapping, universityIdSource: { mode: 'byCollege', year: 2027 } })).toContain('اختر الكلية');
    expect(await messages({ mapping, defaults: { collegeId: 'college-2' }, universityIdSource: { mode: 'byCollege', year: 2027 } })).toContain('ليس لها رمز');
  });

  it('recognizes an already imported student by the application number, so importing the same file twice does not create duplicates', async () => {
    const { prisma, create, update } = database();
    // the first import generated 2701001; the file has no national ID, only the application number
    (prisma.student as unknown as { findMany: ReturnType<typeof vi.fn> }).findMany = vi.fn().mockImplementation(({ where }: { where: { OR?: unknown[]; universityId?: { startsWith?: string } } }) =>
      Promise.resolve(where.OR ? [{ id: 's1', universityId: '2701001', firstName: 'هند', middleName: 'عمر', familyName: 'خالد', fullName: 'هند عمر خالد', motherName: 'منى', nationalId: null, applicationNumber: '8101',
        birthPlace: null, englishName: null, gender: null, dateOfBirth: null, nationality: null, idOrPassport: null, universityEmail: null, phone: null,
        collegeId: 'college-1', departmentId: null, programId: null, studyPlanId: null, academicYearId: null, semesterId: null, status: 'ACTIVE', advisorId: null, admissionDate: null, meritNumber: null }]
        : where.universityId?.startsWith ? [{ universityId: '2701001' }] : []));
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['رقم الاكتتاب', 'الاسم', 'الأب', 'الأم'], [['8101', 'هند', 'عمر', 'منى'], ['8102', 'سارة', 'علي', 'ليلى']]);
    const options = { mapping: service.inspect(upload).suggestedMapping, defaults: { collegeId: 'college-1' }, universityIdSource: { mode: 'byCollege' as const, year: 2027 } };
    expect(await service.preview(upload, options)).toMatchObject({ validCount: 2, updateCount: 1, errorCount: 0 });
    await service.confirm(upload, 'registrar-1', options);
    expect(update).toHaveBeenCalledTimes(1);
    expect(update.mock.calls[0][0].where).toEqual({ universityId: '2701001' });
    // only the new student gets a number, and the sequence continues after the existing one
    expect(create.mock.calls.map((call) => call[0].data.universityId)).toEqual(['2701002']);
  });

  it('rejects the same application number twice inside the file', async () => {
    const { prisma } = database();
    const service = new StudentImportsService(prisma);
    const upload = ministryFile(['رقم الاكتتاب', 'الاسم', 'الأب', 'الأم'], [['8101', 'هند', 'عمر', 'منى'], ['8101', 'سارة', 'علي', 'ليلى']]);
    const result = await service.preview(upload, { mapping: service.inspect(upload).suggestedMapping, defaults: { collegeId: 'college-1' }, universityIdSource: { mode: 'byCollege', year: 2027 } });
    expect(result.errors.some((item) => item.column === 'رقم الاكتتاب' && item.message.includes('مكرر داخل الملف'))).toBe(true);
    expect(result.duplicateCount).toBe(1);
  });
});

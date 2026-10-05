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
  return [universityId, firstName, 'عمر', familyName, '', '', birth, '', '', '', '', '', '', '', '', '', '', '', '', '', 'منى', `123${numericId}`, `456${numericId}`, 'حلب'];
}

function database(ids: string[] = []) {
  const findMany = vi.fn().mockResolvedValue([]);
  const create = vi.fn().mockResolvedValue({});
  const update = vi.fn().mockResolvedValue({});
  const audit = vi.fn().mockResolvedValue({});
  const transaction = vi.fn(async (callback: (tx: unknown) => Promise<unknown>) => callback({ student: { create, update }, auditLog: { create: audit } }));
  const prisma = {
    college: { findMany }, department: { findMany }, program: { findMany },
    studyPlan: { findMany }, academicYear: { findMany }, semester: { findMany },
    user: { findMany }, student: { findMany: vi.fn().mockResolvedValue(ids.map((universityId) => ({
      universityId, firstName: 'سارة', middleName: 'عمر', familyName: 'علي', fullName: 'سارة عمر علي',
      motherName: 'منى', nationalId: 'N-OLD', applicationNumber: 'A-OLD', birthPlace: 'حلب', englishName: null,
      gender: null, dateOfBirth: null, nationality: null, idOrPassport: null,
      universityEmail: null, phone: null, collegeId: null, departmentId: null, programId: null,
      studyPlanId: null, academicYearId: null, semesterId: null, status: 'ACTIVE', advisorId: null,
      admissionDate: null,
    }))) },
    $transaction: transaction,
  } as unknown as PrismaService;
  return { prisma, transaction, create, update, audit };
}

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
      motherName: 'منى', nationalId: '1232026003', applicationNumber: '4562026003', birthPlace: 'حلب',
    }) });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENTS_IMPORTED', userId: 'registrar-1' }) });
  });

  it('updates an existing student using only non-empty columns', async () => {
    const { prisma, update } = database(['2026001']);
    const result = await new StudentImportsService(prisma).confirm(file([row('2026001', 'مريم', 'علي')]), 'registrar-1');
    expect(result).toMatchObject({ imported: 0, updated: 1 });
    expect(update).toHaveBeenCalledWith({
      where: { universityId: '2026001' },
      data: {
        firstName: 'مريم', fullName: 'مريم عمر علي', familyName: 'علي', middleName: 'عمر',
        motherName: 'منى', nationalId: '1232026001', applicationNumber: '4562026001', birthPlace: 'حلب',
      },
    });
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
    const result = await new StudentImportsService(prisma).preview(file([incomplete]));
    expect(result).toMatchObject({ validCount: 0, errorCount: 1 });
    expect(result.errors[0].message).toContain('اسم الأم');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('flags invalid names, non-numeric identifiers, and unsupported gender values during preview', async () => {
    const { prisma, transaction } = database();
    const invalid = row('2026008', 'سارة1', 'مثال');
    invalid[5] = 'غير محدد';
    invalid[21] = '12A34';
    const result = await new StudentImportsService(prisma).preview(file([invalid]));
    expect(result.errorCount).toBe(1);
    expect(result.errors[0].message).toContain('الاسم الأول');
    expect(result.errors[0].message).toContain('الرقم الوطني: أرقام فقط');
    expect(result.errors[0].message).toContain('الجنس: استخدم ذكر أو أنثى');
    expect(transaction).not.toHaveBeenCalled();
  });

  it('accepts and normalizes Arabic-Indic digits in identity numbers', async () => {
    const { prisma } = database();
    const arabicDigits = row('2026009', 'هند', 'خالد');
    arabicDigits[21] = '١٢٣٤٥';
    arabicDigits[22] = '٦٧٨٩';
    const result = await new StudentImportsService(prisma).confirm(file([arabicDigits]), 'registrar-1');
    expect(result.imported).toBe(1);
  });
});

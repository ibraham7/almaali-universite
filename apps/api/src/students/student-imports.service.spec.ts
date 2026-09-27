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
      universityId, firstName: 'سارة', middleName: null, familyName: 'علي', englishName: null,
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
      ['2026001', 'سارة', '', 'علي'],
      ['2026002', 'هند', '', 'خالد', '', '', '2026-02-30'],
      ['2026002', 'منى', '', 'مثال'],
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
    const result = await new StudentImportsService(prisma).confirm(file([['2026003', 'هند', '', 'خالد']]), 'registrar-1');
    expect(result).toMatchObject({ imported: 1, errors: 0 });
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ universityId: '2026003', firstName: 'هند' }) });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENTS_IMPORTED', userId: 'registrar-1' }) });
  });

  it('updates an existing student using only non-empty columns', async () => {
    const { prisma, update } = database(['2026001']);
    const result = await new StudentImportsService(prisma).confirm(file([['2026001', 'مريم', '', 'علي']]), 'registrar-1');
    expect(result).toMatchObject({ imported: 0, updated: 1 });
    expect(update).toHaveBeenCalledWith({
      where: { universityId: '2026001' },
      data: { firstName: 'مريم', familyName: 'علي' },
    });
  });

  it('does not import a file containing an invalid row', async () => {
    const { prisma, transaction } = database();
    const service = new StudentImportsService(prisma);
    await expect(service.confirm(file([['', 'هند', '', 'خالد']]), 'registrar-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(transaction).not.toHaveBeenCalled();
  });
});

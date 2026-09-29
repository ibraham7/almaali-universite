import { BadRequestException, ConflictException, Injectable } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { PrismaService } from '../prisma/prisma.service.js';

export const STUDENT_IMPORT_HEADERS = [
  'الرقم الجامعي', 'الاسم الأول', 'اسم الأب', 'اسم العائلة', 'الاسم بالإنجليزية',
  'الجنس', 'تاريخ الميلاد', 'الجنسية', 'رقم الهوية أو جواز السفر',
  'البريد الجامعي', 'رقم الهاتف', 'الكلية', 'القسم', 'البرنامج',
  'الخطة الدراسية', 'المستوى الأكاديمي', 'الفصل الدراسي', 'حالة الطالب',
  'بريد المرشد', 'تاريخ القبول', 'اسم الأم', 'الرقم الوطني', 'رقم الاكتتاب', 'مكان الولادة',
] as const;

interface ImportFile { buffer: Buffer; originalname: string }
export interface ImportError { rowNumber: number; universityId: string; message: string }
interface ParsedRow { rowNumber: number; cells: string[] }

@Injectable()
export class StudentImportsService {
  constructor(private readonly prisma: PrismaService) {}

  private parse(file?: ImportFile): ParsedRow[] {
    if (!file?.buffer?.length || !/\.xlsx$/i.test(file.originalname) || file.buffer.subarray(0, 2).toString() !== 'PK') {
      throw new BadRequestException('A valid .xlsx file is required');
    }
    let workbook: XLSX.WorkBook;
    try { workbook = XLSX.read(file.buffer, { type: 'buffer' }); }
    catch { throw new BadRequestException('Could not read the Excel file'); }
    const sheet = workbook.Sheets['الطلاب'];
    if (!sheet?.['!ref']) throw new BadRequestException('The الطلاب sheet is required');
    const bounds = XLSX.utils.decode_range(sheet['!ref']);
    if (bounds.s.r !== 0 || bounds.s.c !== 0 || bounds.e.r > 1000 || bounds.e.c >= STUDENT_IMPORT_HEADERS.length) {
      throw new BadRequestException(`The file must start at A1 and have at most 1000 student rows and ${STUDENT_IMPORT_HEADERS.length} columns`);
    }

    for (const cell of Object.values(sheet)) {
      if (cell && typeof cell === 'object' && 'f' in cell) {
        throw new BadRequestException('Formulas are not allowed in the student sheet');
      }
    }
    const rows = XLSX.utils.sheet_to_json<string[]>(sheet, {
      header: 1, raw: false, defval: '', blankrows: true,
    });
    const headings = rows[0]?.map((value) => String(value ?? '').trim()) ?? [];
    if (JSON.stringify(headings) !== JSON.stringify(STUDENT_IMPORT_HEADERS)) {
      throw new BadRequestException('Column names or order do not match the temporary student template');
    }
    const records = rows.slice(1).map((values, index) => ({
      rowNumber: index + 2,
      cells: STUDENT_IMPORT_HEADERS.map((_, column) => String(values[column] ?? '').trim()),
    })).filter((row) => row.cells.some(Boolean));
    if (!records.length) throw new BadRequestException('The student sheet has no rows');
    return records;
  }

  private parseDate(value: string, label: string, errors: string[]): Date | null {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      errors.push(`${label}: استخدم YYYY-MM-DD`);
      return null;
    }
    const date = new Date(`${value}T00:00:00.000Z`);
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== value) {
      errors.push(`${label}: تاريخ غير صالح`);
      return null;
    }
    return date;
  }

  private async validate(file?: ImportFile) {
    const parsed = this.parse(file);
    const [colleges, departments, programs, plans, years, semesters, advisors, existing] = await Promise.all([
      this.prisma.college.findMany(), this.prisma.department.findMany(),
      this.prisma.program.findMany(), this.prisma.studyPlan.findMany(),
      this.prisma.academicYear.findMany(), this.prisma.semester.findMany(),
      this.prisma.user.findMany({ where: { role: { code: 'ADVISOR' }, status: 'ACTIVE' }, select: { id: true, email: true } }),
      this.prisma.student.findMany({ where: { universityId: { in: parsed.map((row) => row.cells[0]).filter(Boolean) } } }),
    ]);
    const seen = new Set<string>();
    const existingById = new Map(existing.map((item) => [item.universityId, item]));
    const errors: ImportError[] = [];
    let duplicateCount = 0;
    const valid: Array<{ rowNumber: number; isUpdate: boolean; providedColumns: boolean[]; data: {
      universityId: string; firstName: string; middleName: string | null; familyName: string;
      fullName: string; motherName: string; nationalId: string; applicationNumber: string; birthPlace: string;
      englishName: string | null; gender: string | null; dateOfBirth: Date | null;
      nationality: string | null; idOrPassport: string | null; universityEmail: string | null;
      phone: string | null; collegeId: string | null; departmentId: string | null;
      programId: string | null; studyPlanId: string | null; academicYearId: string | null;
      semesterId: string | null; status: string; advisorId: string | null; admissionDate: Date | null;
    }; college: string; program: string }> = [];

    for (const row of parsed) {
      const [universityId, firstName, middleName, familyName, englishName, gender, birth, nationality,
        idOrPassport, universityEmail, phone, collegeName, departmentName, programName, planName,
        yearName, semesterName, status, advisorEmail, admitted, motherName, nationalId,
        applicationNumber, birthPlace] = row.cells;
      const problems: string[] = [];
      const previous = existingById.get(universityId);
      const values = {
        middleName: middleName || previous?.middleName || '',
        motherName: motherName || previous?.motherName || '',
        nationalId: nationalId || previous?.nationalId || '',
        applicationNumber: applicationNumber || previous?.applicationNumber || '',
        birthPlace: birthPlace || previous?.birthPlace || '',
      };
      if (!universityId || !firstName || !values.middleName || !familyName || !values.motherName ||
          !values.nationalId || !values.applicationNumber || !values.birthPlace) {
        problems.push('لإنشاء حساب الطالب، يلزم إدخال الرقم الجامعي والاسم الأول واسم الأب واسم العائلة واسم الأم والرقم الوطني ورقم الاكتتاب ومكان الولادة');
      }
      if (universityId.length > 50 || firstName.length > 100 || familyName.length > 100 ||
          values.middleName.length > 100 || values.motherName.length > 100 || values.nationalId.length > 100 ||
          values.applicationNumber.length > 100 || values.birthPlace.length > 100 ||
          universityEmail.length > 200 || phone.length > 50) problems.push('يوجد حقل يتجاوز الطول المسموح');
      const repeatedInFile = Boolean(universityId && seen.has(universityId));
      if (repeatedInFile) problems.push('الرقم الجامعي مكرر داخل الملف');
      if (repeatedInFile) duplicateCount++;
      seen.add(universityId);
      const existingStudent = existingById.get(universityId);
      if (universityEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(universityEmail)) problems.push('البريد الجامعي غير صالح');
      const dateOfBirth = birth ? this.parseDate(birth, 'تاريخ الميلاد', problems) : existingStudent?.dateOfBirth ?? null;
      const admissionDate = admitted ? this.parseDate(admitted, 'تاريخ القبول', problems) : existingStudent?.admissionDate ?? null;

      const resolve = <T extends { id: string; nameAr: string }>(name: string, entries: T[], parentId: string | null, parentKey: keyof T | undefined, label: string, fallbackId?: string | null) => {
        if (!name) {
          if (!fallbackId) return null;
          const previous = entries.find((entry) => entry.id === fallbackId);
          if (!previous || (parentKey && previous[parentKey] !== parentId)) {
            problems.push(`${label}: أدخل القيمة لتتوافق مع المستوى الأكاديمي الجديد`);
            return null;
          }
          return fallbackId;
        }
        if (parentKey && !parentId) { problems.push(`${label}: اختر المستوى الأكاديمي السابق`); return null; }
        const matches = entries.filter((entry) => entry.nameAr === name && (!parentKey || entry[parentKey] === parentId));
        if (matches.length !== 1) problems.push(`${label}: الاسم غير موجود أو غير محدد بشكل فريد`);
        return matches.length === 1 ? matches[0].id : null;
      };
      const collegeId = resolve(collegeName, colleges, null, undefined, 'الكلية', existingStudent?.collegeId);
      const departmentId = resolve(departmentName, departments, collegeId, 'collegeId', 'القسم', existingStudent?.departmentId);
      const programId = resolve(programName, programs, departmentId, 'departmentId', 'البرنامج', existingStudent?.programId);
      const studyPlanId = resolve(planName, plans, programId, 'programId', 'الخطة', existingStudent?.studyPlanId);
      const academicYearId = resolve(yearName, years, studyPlanId, 'studyPlanId', 'المستوى', existingStudent?.academicYearId);
      const semesterId = resolve(semesterName, semesters, academicYearId, 'academicYearId', 'الفصل', existingStudent?.semesterId);
      const matchingAdvisors = advisorEmail ? advisors.filter((person) => person.email.toLowerCase() === advisorEmail.toLowerCase()) : [];
      if (advisorEmail && matchingAdvisors.length !== 1) problems.push('بريد المرشد غير موجود أو الحساب غير نشط');

      if (problems.length) {
        errors.push({ rowNumber: row.rowNumber, universityId, message: problems.join('؛ ') });
      } else {
        valid.push({ rowNumber: row.rowNumber, isUpdate: Boolean(existingStudent), providedColumns: row.cells.map(Boolean), college: collegeName, program: programName,
          data: { universityId, firstName, middleName: values.middleName, familyName,
            fullName: [firstName, values.middleName, familyName].filter(Boolean).join(' '),
            motherName: values.motherName, nationalId: values.nationalId,
            applicationNumber: values.applicationNumber, birthPlace: values.birthPlace,
            englishName: englishName || existingStudent?.englishName || null, gender: gender || existingStudent?.gender || null, dateOfBirth,
            nationality: nationality || existingStudent?.nationality || null, idOrPassport: idOrPassport || existingStudent?.idOrPassport || null,
            universityEmail: universityEmail || existingStudent?.universityEmail || null, phone: phone || existingStudent?.phone || null,
            collegeId, departmentId, programId, studyPlanId, academicYearId,
            semesterId, status: status || existingStudent?.status || 'ACTIVE', advisorId: matchingAdvisors[0]?.id ?? existingStudent?.advisorId ?? null,
            admissionDate },
        });
      }
    }

    return {
      total: parsed.length, validCount: valid.length, updateCount: valid.filter((item) => item.isUpdate).length, errorCount: errors.length, duplicateCount, errors,
      rows: valid.map((item) => ({ rowNumber: item.rowNumber, universityId: item.data.universityId,
        name: [item.data.firstName, item.data.middleName, item.data.familyName].filter(Boolean).join(' '),
        college: item.college, program: item.program, action: item.isUpdate ? 'تحديث' : 'إضافة' })),
      valid,
    };
  }

  async preview(file?: ImportFile) {
    const { valid, ...publicResult } = await this.validate(file);
    return publicResult;
  }

  async confirm(file: ImportFile | undefined, actingUserId: string) {
    const result = await this.validate(file);
    if (result.errors.length) throw new BadRequestException('Correct the errors and preview the file again');
    let imported = 0;
    let updated = 0;
    const fieldColumns: Record<string, number> = {
      firstName: 1, middleName: 2, familyName: 3, englishName: 4, gender: 5,
      dateOfBirth: 6, nationality: 7, idOrPassport: 8, universityEmail: 9,
      phone: 10, collegeId: 11, departmentId: 12, programId: 13,
      studyPlanId: 14, academicYearId: 15, semesterId: 16, status: 17,
      advisorId: 18, admissionDate: 19, motherName: 20, nationalId: 21,
      applicationNumber: 22, birthPlace: 23,
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

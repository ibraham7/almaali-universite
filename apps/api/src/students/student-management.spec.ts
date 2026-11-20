import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('Student management', () => {
  const data = {
    universityId: '2026001', firstName: 'سارة', middleName: 'عمر', familyName: 'علي',
    motherName: 'منى', nationalId: '12345678901', applicationNumber: '456789', birthPlace: 'حلب',
    collegeId: 'college-1', programId: 'program-1', studyPlanId: 'plan-1',
    academicYearId: 'year-1', semesterId: 'semester-1',
  };
  const catalog = () => ({
    college: { findUnique: vi.fn().mockResolvedValue({ id: 'college-1' }) },
    program: { findUnique: vi.fn().mockResolvedValue({ id: 'program-1', collegeId: 'college-1', departmentId: null }) },
    studyPlan: { findUnique: vi.fn().mockResolvedValue({ id: 'plan-1', programId: 'program-1' }) },
    academicYear: { findUnique: vi.fn().mockResolvedValue({ id: 'year-1', studyPlanId: 'plan-1' }) },
    semester: { findUnique: vi.fn().mockResolvedValue({ id: 'semester-1', academicYearId: 'year-1' }) },
  });

  it('creates the student and audit record in one transaction', async () => {
    const student = { id: 'student-1', ...data };
    const create = vi.fn().mockResolvedValue(student);
    const audit = vi.fn().mockResolvedValue({});
    const prisma = {
      ...catalog(),
      student: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { create }, auditLog: { create: audit } }),
    } as unknown as PrismaService;
    const service = new StudentsService(prisma);

    await expect(service.create(data, 'registrar-1')).resolves.toEqual(student);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ universityId: data.universityId }) });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENT_CREATED', entityId: student.id, userId: 'registrar-1' }) });
  });

  it('rejects a duplicate university number', async () => {
    const prisma = {
      ...catalog(),
      student: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: () => Promise.reject({ code: 'P2002' }),
    } as unknown as PrismaService;
    await expect(new StudentsService(prisma).create(data, 'registrar-1')).rejects.toBeInstanceOf(ConflictException);
  });

  it('rejects a department outside the chosen college before writing', async () => {
    const prisma = {
      college: { findUnique: vi.fn().mockResolvedValue({ id: 'college-1' }) },
      department: { findUnique: vi.fn().mockResolvedValue({ id: 'department-1', collegeId: 'college-2' }) },
      $transaction: vi.fn(),
    } as unknown as PrismaService;
    await expect(new StudentsService(prisma).create({ ...data, collegeId: 'college-1', departmentId: 'department-1' }, 'registrar-1'))
      .rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('rejects numeric identifiers containing letters before writing', async () => {
    const prisma = { $transaction: vi.fn() } as unknown as PrismaService;
    await expect(new StudentsService(prisma).create({ ...data, nationalId: '123ABC' }, 'registrar-1'))
      .rejects.toThrow('الرقم الوطني: أدخل الأرقام فقط.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('accepts Arabic digits and stores normalized numeric values', async () => {
    const create = vi.fn().mockImplementation(({ data: value }) => Promise.resolve({ id: 'student-1', ...value }));
    const prisma = {
      ...catalog(),
      student: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { create }, auditLog: { create: vi.fn() } }),
    } as unknown as PrismaService;
    await new StudentsService(prisma).create({ ...data, nationalId: '١٢٣٤٥٦٧٨٩٠١', applicationNumber: '۱۲۳' }, 'registrar-1');
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ nationalId: '12345678901', applicationNumber: '123' }) });
  });

  it('requires an 11-digit national ID and 10-digit Syrian mobile when provided', async () => {
    const prisma = { $transaction: vi.fn() } as unknown as PrismaService;
    await expect(new StudentsService(prisma).create({ ...data, nationalId: '12345' }, 'registrar-1'))
      .rejects.toThrow('الرقم الوطني: أدخل 11 رقمًا.');
    await expect(new StudentsService(prisma).create({ ...data, phone: '+963 944 123 456' }, 'registrar-1'))
      .rejects.toThrow('رقم الهاتف: أدخل رقمًا سوريًا محليًا من 10 أرقام يبدأ بـ 09.');
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('accepts and normalizes a Syrian local mobile number', async () => {
    const create = vi.fn().mockImplementation(({ data: value }) => Promise.resolve({ id: 'student-1', ...value }));
    const prisma = {
      ...catalog(),
      student: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { create }, auditLog: { create: vi.fn() } }),
    } as unknown as PrismaService;
    await new StudentsService(prisma).create({ ...data, phone: '٠٩٤٤١٢٣٤٥٦' }, 'registrar-1');
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ phone: '0944123456' }) });
  });

  it('has no way to delete a student', () => {
    expect((StudentsService.prototype as unknown as Record<string, unknown>).remove).toBeUndefined();
  });

  it('creates a student without a study plan or a family name (linked later when the registration is approved)', async () => {
    const create = vi.fn().mockImplementation(({ data: row }) => Promise.resolve({ id: 'student-9', ...row }));
    const prisma = {
      student: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { create }, auditLog: { create: vi.fn() } }),
    } as unknown as PrismaService;
    const { familyName, collegeId, programId, studyPlanId, academicYearId, semesterId, ...ministry } = data;
    void [familyName, collegeId, programId, studyPlanId, academicYearId, semesterId];
    await new StudentsService(prisma).create({ ...ministry, meritNumber: '555123' }, 'registrar-1');
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({
      familyName: '', fullName: 'سارة عمر', meritNumber: '555123', studyPlanId: null, programId: null,
    }) });
  });

  it('approves the registration of students without a plan and skips the ones that already have one', async () => {
    const updateMany = vi.fn().mockResolvedValue({ count: 1 });
    const audit = vi.fn().mockResolvedValue({});
    const prisma = {
      ...catalog(),
      department: { findUnique: vi.fn().mockResolvedValue({ id: 'dep-1', collegeId: 'college-1' }) },
      program: { findUnique: vi.fn().mockResolvedValue({ id: 'program-1', collegeId: 'college-1', departmentId: 'dep-1' }) },
      student: { findMany: vi.fn().mockResolvedValue([
        { id: 's1', universityId: '1', studyPlanId: null },
        { id: 's2', universityId: '2', studyPlanId: 'plan-9' },
      ]) },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { updateMany }, auditLog: { create: audit } }),
    } as unknown as PrismaService;
    const result = await new StudentsService(prisma).approveRegistration({
      studentIds: ['s1', 's2', 's3'], collegeId: 'college-1', departmentId: 'dep-1', programId: 'program-1',
      studyPlanId: 'plan-1', academicYearId: 'year-1', semesterId: 'semester-1',
    }, 'registrar-1');
    expect(result.approved).toBe(1);
    expect(result.skipped.map((item) => item.reason)).toEqual(['مرتبط بخطة دراسية مسبقاً', 'الطالب غير موجود']);
    expect(updateMany).toHaveBeenCalledWith({ where: { id: { in: ['s1'] }, studyPlanId: null }, data: expect.objectContaining({ studyPlanId: 'plan-1', semesterId: 'semester-1' }) });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENTS_REGISTRATION_APPROVED', userId: 'registrar-1' }) });
  });
});

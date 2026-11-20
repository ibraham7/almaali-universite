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

  describe('college transfer', () => {
    const transferSetup = (overrides: Record<string, unknown> = {}) => {
      const historyCreate = vi.fn().mockResolvedValue({});
      const studentUpdate = vi.fn().mockResolvedValue({});
      const userUpdate = vi.fn().mockResolvedValue({});
      const audit = vi.fn().mockResolvedValue({});
      const prisma = {
        student: {
          findUnique: vi.fn().mockResolvedValue({ id: 's1', universityId: '2701004', collegeId: 'c-old', advisorId: 'adv-1', userId: 'u1', createdAt: new Date('2026-09-01') }),
          findMany: vi.fn().mockResolvedValue([{ universityId: '2702001' }, { universityId: '2702002' }]),
        },
        college: { findUnique: vi.fn().mockResolvedValue({ id: 'c-new', nameAr: 'كلية التربية', code: '02' }) },
        studentEnrollment: { count: vi.fn().mockResolvedValue(0) },
        studentNumberHistory: { findMany: vi.fn().mockResolvedValue([{ universityId: '2702003' }]), findFirst: vi.fn().mockResolvedValue(null) },
        $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({
          studentNumberHistory: { create: historyCreate }, student: { update: studentUpdate },
          user: { findUnique: vi.fn().mockResolvedValue({ email: '2701004@students.local' }), update: userUpdate }, auditLog: { create: audit },
        }),
        ...overrides,
      } as unknown as PrismaService;
      return { prisma, historyCreate, studentUpdate, userUpdate, audit };
    };

    it('gives a new number with the new college code and the original year, keeps the old number, moves the login', async () => {
      const { prisma, historyCreate, studentUpdate, userUpdate, audit } = transferSetup();
      const result = await new StudentsService(prisma).transferCollege('s1', { collegeId: 'c-new', reason: 'طلب نقل' }, 'registrar-1');
      // 27 + 02 + next free sequence (001, 002 are used by students, 003 by a previous number)
      expect(result).toMatchObject({ universityId: '2702004', previousUniversityId: '2701004' });
      expect(historyCreate).toHaveBeenCalledWith({ data: expect.objectContaining({ studentId: 's1', universityId: '2701004', replacedByUniversityId: '2702004', collegeId: 'c-old', changedById: 'registrar-1' }) });
      expect(studentUpdate).toHaveBeenCalledWith({ where: { id: 's1' }, data: expect.objectContaining({ universityId: '2702004', collegeId: 'c-new', studyPlanId: null, semesterId: null, advisorId: null }) });
      expect(userUpdate).toHaveBeenCalledWith({ where: { id: 'u1' }, data: { email: '2702004@students.local' } });
      expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENT_COLLEGE_TRANSFER', entityId: 's1' }) });
    });

    it('refuses the same college, a college without a code, and a student with an open registration', async () => {
      const service = (overrides: Record<string, unknown>) => new StudentsService(transferSetup(overrides).prisma);
      await expect(service({}).transferCollege('s1', { collegeId: 'c-old' }, 'r')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service({ college: { findUnique: vi.fn().mockResolvedValue({ id: 'c-new', nameAr: 'كلية', code: null }) } }).transferCollege('s1', { collegeId: 'c-new' }, 'r')).rejects.toBeInstanceOf(BadRequestException);
      await expect(service({ studentEnrollment: { count: vi.fn().mockResolvedValue(1) } }).transferCollege('s1', { collegeId: 'c-new' }, 'r')).rejects.toBeInstanceOf(ConflictException);
    });

    it('asks for the admission year when the current number does not follow the numbering format', async () => {
      const odd = { student: { findUnique: vi.fn().mockResolvedValue({ id: 's1', universityId: 'TEST-1002', collegeId: 'c-old', advisorId: null, userId: null, createdAt: new Date() }), findMany: vi.fn().mockResolvedValue([]) } };
      await expect(new StudentsService(transferSetup(odd).prisma).transferCollege('s1', { collegeId: 'c-new' }, 'r')).rejects.toBeInstanceOf(BadRequestException);
      const { prisma, studentUpdate } = transferSetup(odd);
      await new StudentsService(prisma).transferCollege('s1', { collegeId: 'c-new', admissionYear: 2027 }, 'r');
      expect(studentUpdate).toHaveBeenCalledWith({ where: { id: 's1' }, data: expect.objectContaining({ universityId: '2702004' }) });
    });
  });
});

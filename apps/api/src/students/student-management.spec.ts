import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { StudentsService } from './students.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('Student management', () => {
  const data = {
    universityId: '2026001', firstName: 'سارة', middleName: 'عمر', familyName: 'علي',
    motherName: 'منى', nationalId: '12345678901', applicationNumber: '456789', birthPlace: 'حلب',
  };

  it('creates the student and audit record in one transaction', async () => {
    const student = { id: 'student-1', ...data };
    const create = vi.fn().mockResolvedValue(student);
    const audit = vi.fn().mockResolvedValue({});
    const prisma = {
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
      student: { findFirst: vi.fn().mockResolvedValue(null) },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { create }, auditLog: { create: vi.fn() } }),
    } as unknown as PrismaService;
    await new StudentsService(prisma).create({ ...data, phone: '٠٩٤٤١٢٣٤٥٦' }, 'registrar-1');
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ phone: '0944123456' }) });
  });

  it('deletes a student without an account or academic history and records the action', async () => {
    const remove = vi.fn().mockResolvedValue({});
    const audit = vi.fn().mockResolvedValue({});
    const prisma = {
      student: { findUnique: vi.fn().mockResolvedValue({
        id: 'student-1', universityId: 'TEST-1001', userId: null,
        _count: { enrollments: 0, results: 0 },
      }) },
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { delete: remove }, auditLog: { create: audit } }),
    } as unknown as PrismaService;

    await expect(new StudentsService(prisma).remove('student-1', 'admin-1')).resolves.toEqual({ message: 'تم حذف الطالب.' });
    expect(remove).toHaveBeenCalledWith({ where: { id: 'student-1' } });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'STUDENT_DELETED', entityId: 'student-1', userId: 'admin-1',
    }) });
  });

  it('protects students with accounts or academic records from deletion', async () => {
    const prisma = {
      student: { findUnique: vi.fn().mockResolvedValue({
        id: 'student-1', universityId: '2026001', userId: 'user-1',
        _count: { enrollments: 1, results: 1 },
      }) },
      $transaction: vi.fn(),
    } as unknown as PrismaService;

    await expect(new StudentsService(prisma).remove('student-1', 'admin-1'))
      .rejects.toBeInstanceOf(ConflictException);
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('returns not found when deleting a missing student', async () => {
    const prisma = {
      student: { findUnique: vi.fn().mockResolvedValue(null) },
      $transaction: vi.fn(),
    } as unknown as PrismaService;
    await expect(new StudentsService(prisma).remove('missing', 'admin-1'))
      .rejects.toBeInstanceOf(NotFoundException);
  });
});

import { BadRequestException, ConflictException } from '@nestjs/common';
import { StudentsService } from './students.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

describe('Student management', () => {
  const data = { universityId: '2026001', firstName: 'سارة', familyName: 'علي' };

  it('creates the student and audit record in one transaction', async () => {
    const student = { id: 'student-1', ...data };
    const create = vi.fn().mockResolvedValue(student);
    const audit = vi.fn().mockResolvedValue({});
    const prisma = {
      $transaction: (fn: (tx: unknown) => Promise<unknown>) => fn({ student: { create }, auditLog: { create: audit } }),
    } as unknown as PrismaService;
    const service = new StudentsService(prisma);

    await expect(service.create(data, 'registrar-1')).resolves.toEqual(student);
    expect(create).toHaveBeenCalledWith({ data: expect.objectContaining({ universityId: data.universityId }) });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENT_CREATED', entityId: student.id, userId: 'registrar-1' }) });
  });

  it('rejects a duplicate university number', async () => {
    const prisma = {
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
});

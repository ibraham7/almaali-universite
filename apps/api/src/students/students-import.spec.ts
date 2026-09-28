import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BadRequestException } from '@nestjs/common';
import { StudentsService } from './students.service.js';

describe('student spreadsheet import', () => {
  const existing = { student: { findFirst: vi.fn().mockResolvedValue(null), upsert: vi.fn().mockResolvedValue({}) }, $transaction: vi.fn() };
  const service = new StudentsService(existing as never);
  beforeEach(() => {
    existing.student.findFirst.mockReset().mockResolvedValue(null);
    existing.student.upsert.mockReset().mockResolvedValue({});
    existing.$transaction.mockReset().mockImplementation((callback: (tx: typeof existing) => Promise<unknown>) => callback(existing));
  });

  it('imports distinct demo student identities without creating user accounts', async () => {
    const buffer = readFileSync(join(process.cwd(), 'prisma/demo-students.csv'));
    const result = await service.importStudents({ buffer, originalname: 'demo-students.csv' });
    expect(result.imported).toBe(3);
    expect(existing.student.upsert).toHaveBeenCalledTimes(3);
    expect(existing.student.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ universityId: 'TEST-U-001', motherName: 'منى', nationalId: 'TEST-NID-001' }),
    }));
  });

  it('refuses a file that could overwrite an already registered student', async () => {
    existing.student.findFirst.mockResolvedValue({ id: 'registered' });
    const buffer = readFileSync(join(process.cwd(), 'prisma/demo-students.csv'));
    await expect(service.importStudents({ buffer, originalname: 'demo-students.csv' })).rejects.toBeInstanceOf(BadRequestException);
    expect(existing.$transaction).not.toHaveBeenCalled();
  });
});

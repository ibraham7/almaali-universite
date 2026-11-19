import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { ProgramsService } from './programs.service.js';

function setup(existing: unknown = null) {
  const prisma = {
    department: { findUnique: vi.fn().mockResolvedValue({ collegeId: 'c1' }) },
    program: {
      findFirst: vi.fn().mockResolvedValue(existing),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'p1', ...data })),
    },
  };
  return { prisma, service: new ProgramsService(prisma as never) };
}

describe('ProgramsService level', () => {
  it('creates a program under a department with a name derived from its type', async () => {
    const { service, prisma } = setup();
    const result = await service.create({ departmentId: 'd1', level: 'MASTER' });
    expect(result).toMatchObject({ departmentId: 'd1', collegeId: 'c1', level: 'MASTER', nameAr: 'ماجستير' });
    expect(prisma.program.create).toHaveBeenCalledOnce();
  });

  it('requires a department', async () => {
    const { service } = setup();
    await expect(service.create({ level: 'BACHELOR' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown type', async () => {
    const { service } = setup();
    await expect(service.create({ departmentId: 'd1', level: 'PHD' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('does not allow the same type twice under one department', async () => {
    const { service, prisma } = setup({ id: 'old' });
    await expect(service.create({ departmentId: 'd1', level: 'DIPLOMA' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.program.create).not.toHaveBeenCalled();
  });
});

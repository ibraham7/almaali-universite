import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { CollegesService } from './colleges.service.js';

function setup(taken: { nameAr: string } | null = null) {
  const prisma = {
    college: {
      findFirst: vi.fn().mockResolvedValue(taken),
      findUnique: vi.fn().mockResolvedValue({ id: 'c1', universityId: 'u1' }),
      create: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c9', ...data })),
      update: vi.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'c1', ...data })),
    },
  };
  return { prisma, service: new CollegesService(prisma as never) };
}

describe('College code (part of the university number)', () => {
  it('requires a code when a college is added', async () => {
    const { service, prisma } = setup();
    await expect(service.create({ universityId: 'u1', nameAr: 'كلية جديدة' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.college.create).not.toHaveBeenCalled();
  });

  it('stores a two-digit code', async () => {
    const { service } = setup();
    await expect(service.create({ universityId: 'u1', nameAr: 'كلية جديدة', code: '04' })).resolves.toMatchObject({ code: '04' });
  });

  it('rejects a code that is not exactly two digits', async () => {
    const { service } = setup();
    for (const code of ['4', '123', 'ab', '0a']) {
      await expect(service.create({ universityId: 'u1', nameAr: 'كلية', code })).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('rejects a code already used by another college', async () => {
    const { service } = setup({ nameAr: 'كلية التربية' });
    await expect(service.update('c1', { code: '02' })).rejects.toBeInstanceOf(ConflictException);
  });
});

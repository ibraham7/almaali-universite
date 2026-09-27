import { describe, expect, it, vi } from 'vitest';

import { RegistrationValidationService } from './registration-validation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('section capacity during confirmation', () => {
  it('accepts the last seat already reserved in the cart', async () => {
    const findUnique = vi.fn().mockResolvedValue({
      id: 'section',
      semesterId: 'semester',
      status: 'OPEN',
      enrolledCount: 40,
      maxCapacity: 40,
    });
    const service = new RegistrationValidationService({
      courseSection: { findUnique },
    } as unknown as PrismaService);

    expect((await service.validateSection('section', 'semester', true)).valid).toBe(true);
    expect((await service.validateSection('section', 'semester')).valid).toBe(false);
  });

  it('rejects an overbooked section even when a seat was reserved', async () => {
    const service = new RegistrationValidationService({
      courseSection: {
        findUnique: vi.fn().mockResolvedValue({
          id: 'section', semesterId: 'semester', status: 'OPEN',
          enrolledCount: 41, maxCapacity: 40,
        }),
      },
    } as unknown as PrismaService);

    expect((await service.validateSection('section', 'semester', true)).valid).toBe(false);
  });
});

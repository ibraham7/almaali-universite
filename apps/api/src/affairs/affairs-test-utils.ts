import { vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import type { AffairsSettingsService } from './affairs-settings.service.js';
import { defaultsOf } from './affairs-settings.defs.js';

// Settings stub for unit tests: the defaults, with optional overrides; capability checks follow the same rule as the real service.
export function fakeSettings(overrides: Record<string, boolean | number> = {}) {
  const values = { ...defaultsOf(), ...overrides };
  return {
    all: vi.fn(async () => values),
    get: vi.fn(async (key: string) => values[key]),
    assertCapability: vi.fn(async (user: { role: string }, key: string) => {
      if (user.role === 'SYSTEM_ADMIN') return;
      if (['REGISTRAR', 'AFFAIRS_STAFF'].includes(user.role) && values[key]) return;
      throw new ForbiddenException('هذا الإجراء غير مفعّل لدورك.');
    }),
  } as unknown as AffairsSettingsService;
}

import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AffairsService } from './affairs.service.js';
import { isAffairsStaffRole, loadRequestForAction } from './affairs-access.js';
import { UsersService } from '../users/users.service.js';
import { fakeSettings } from './affairs-test-utils.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const request = { id: 'r1', assignedStaff: { userId: 'u-staff' } };
const tx = { studentRequest: { findUnique: vi.fn().mockResolvedValue(request) } };

describe('affairs staff role (AFFAIRS_STAFF)', () => {
  it('registrar and affairs staff work on their own requests the same way; advisors and others do not', async () => {
    for (const role of ['REGISTRAR', 'AFFAIRS_STAFF']) {
      expect(isAffairsStaffRole(role)).toBe(true);
      await expect(loadRequestForAction(tx, 'r1', { id: 'u-staff', role })).resolves.toBe(request);
      await expect(loadRequestForAction(tx, 'r1', { id: 'someone-else', role })).rejects.toBeInstanceOf(ForbiddenException);
    }
    for (const role of ['STUDENT', 'SITE_EDITOR', 'ADVISOR']) {
      expect(isAffairsStaffRole(role)).toBe(false);
      await expect(loadRequestForAction(tx, 'r1', { id: 'u-staff', role })).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('a staff profile can be added to a registrar or an affairs staff account, not to anyone else (advisors have their own workspace)', async () => {
    const make = (code: string) => {
      const prisma: any = {
        user: { findUnique: vi.fn().mockResolvedValue({ id: 'u1', role: { code }, affairsStaff: null }) },
        affairsService: { count: vi.fn().mockResolvedValue(0) },
        affairsStaff: { create: vi.fn().mockResolvedValue({ id: 's1' }) }, auditLog: { create: vi.fn() },
      };
      return { prisma, service: new AffairsService(prisma as PrismaService, fakeSettings()) };
    };
    for (const code of ['REGISTRAR', 'AFFAIRS_STAFF']) {
      const { prisma, service } = make(code);
      await expect(service.createStaff({ userId: 'u1' } as never, { id: 'admin', role: 'SYSTEM_ADMIN' })).resolves.toMatchObject({ id: 's1' });
      expect(prisma.affairsStaff.create).toHaveBeenCalled();
    }
    for (const code of ['STUDENT', 'SITE_EDITOR', 'SYSTEM_ADMIN', 'ADVISOR']) {
      const { service } = make(code);
      await expect(service.createStaff({ userId: 'u1' } as never, { id: 'admin', role: 'SYSTEM_ADMIN' })).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('creating an account with the affairs staff role also creates its staff profile in the same step', async () => {
    const create = vi.fn().mockResolvedValue({ id: 'u9' });
    const prisma: any = {
      student: { findUnique: vi.fn().mockResolvedValue(null) }, role: { findUnique: vi.fn().mockResolvedValue({ id: 'r1', code: 'AFFAIRS_STAFF', isActive: true }) },
      user: { create }, auditLog: { create: vi.fn() },
    };
    await new UsersService(prisma as PrismaService).createStaffUser({ displayName: 'موظف', username: 'Staff.One', password: 'a-long-password-1', roleCode: 'AFFAIRS_STAFF' }, 'admin');
    expect(create.mock.calls[0][0].data).toMatchObject({ username: 'staff.one', affairsStaff: { create: {} } });
    prisma.role.findUnique.mockResolvedValue({ id: 'r2', code: 'ADVISOR', isActive: true });
    await new UsersService(prisma as PrismaService).createStaffUser({ displayName: 'مشرف', username: 'adv.one', password: 'a-long-password-1', roleCode: 'ADVISOR' }, 'admin');
    expect(create.mock.calls[1][0].data.affairsStaff).toBeUndefined();
  });
});

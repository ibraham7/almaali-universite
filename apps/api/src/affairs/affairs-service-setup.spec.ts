import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { AffairsService } from './affairs.service.js';
import { serviceMissing } from './affairs.rules.js';
import { fakeSettings } from './affairs-test-utils.js';
import { PrismaService } from '../prisma/prisma.service.js';

const admin = { id: 'u-admin', role: 'SYSTEM_ADMIN' };
const complete = { specialization: 'شؤون الطلاب', attachmentsNote: 'لا يوجد', feeNote: 'بدون رسوم' };

function setup(found: Record<string, unknown> | null, staffCount = 1) {
  const prisma: any = {
    affairsService: {
      findUnique: vi.fn().mockResolvedValue(found), create: vi.fn(async ({ data }: any) => ({ id: 'n1', ...data })), update: vi.fn(async ({ data }: any) => ({ ...found, ...data })),
      findMany: vi.fn().mockResolvedValue([]),
    },
    affairsStaffService: { count: vi.fn().mockResolvedValue(staffCount) },
    documentType: { findUnique: vi.fn().mockResolvedValue({ id: 'd1' }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  return { prisma, service: new AffairsService(prisma as unknown as PrismaService, fakeSettings()) };
}

describe('service definition: mandatory and optional fields', () => {
  it('needs the responsible body, attachments and fee; staff only when activating; the rest is optional', () => {
    expect(serviceMissing({})).toHaveLength(3);
    expect(serviceMissing({ specialization: '  ', attachmentsNote: 'x', feeNote: 'y' })).toEqual([expect.stringContaining('الجهة المسؤولة')]);
    expect(serviceMissing(complete)).toEqual([]);
    expect(serviceMissing(complete, 0)).toEqual([expect.stringContaining('موظف مسؤول')]);
    expect(serviceMissing(complete, 2)).toEqual([]);
  });

  it('a new service must have the mandatory fields and starts stopped until a staff member is linked', async () => {
    const { service, prisma } = setup(null);
    prisma.affairsService.findUnique.mockResolvedValue(null);
    await expect(service.createService({ code: 'TEST_X', nameAr: 'خدمة', feeNote: 'بدون رسوم' } as never, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.affairsService.create).not.toHaveBeenCalled();
    const created: any = await service.createService({ code: 'TEST_X', nameAr: 'خدمة', ...complete, requiredData: 'الفصل المراد تأجيله' } as never, admin);
    expect(created.isActive).toBe(false);
    expect(created.requiredData).toBe('الفصل المراد تأجيله');
  });

  it('an active service cannot be saved incomplete or without staff, but stopping it needs nothing', async () => {
    const active = { id: 's1', code: 'X', nameAr: 'خدمة', isActive: true, specialization: null, attachmentsNote: null, feeNote: null };
    const a = setup(active, 1);
    await expect(a.service.updateService('s1', { description: 'x' } as never, admin)).rejects.toThrow('الحقول الإلزامية');
    await expect(a.service.updateService('s1', { isActive: false } as never, admin)).resolves.toBeDefined();

    const b = setup({ ...active, ...complete }, 0);
    await expect(b.service.updateService('s1', { description: 'x' } as never, admin)).rejects.toThrow('موظف مسؤول');
    await expect(setup({ ...active, ...complete }, 1).service.updateService('s1', { description: 'x' } as never, admin)).resolves.toBeDefined();
    // a stopped service can be edited incomplete, but not activated
    const stopped = { ...active, isActive: false };
    await expect(setup(stopped, 0).service.updateService('s1', { nameAr: 'اسم جديد' } as never, admin)).resolves.toBeDefined();
    await expect(setup(stopped, 0).service.updateService('s1', { isActive: true } as never, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('the list marks each service with what is still missing', async () => {
    const { service, prisma } = setup(null);
    prisma.affairsService.findMany.mockResolvedValue([
      { id: 'a', ...complete, staff: [{ staffId: 'st1' }] }, { id: 'b', specialization: null, attachmentsNote: 'x', feeNote: 'y', staff: [] },
    ]);
    const list: any[] = await service.listServices();
    expect(list[0].missing).toEqual([]);
    expect(list[1].missing).toHaveLength(2);
    expect(list[1].staff).toBeUndefined();
  });
});

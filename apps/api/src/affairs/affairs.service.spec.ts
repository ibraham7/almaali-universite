import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AffairsService } from './affairs.service.js';
import { fakeSettings } from './affairs-test-utils.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { canTransition, pickLeastLoaded, reasonRequired, requestNumber } from './affairs.rules.js';

const staffUser = { id: 'u-staff', role: 'REGISTRAR' };
const otherStaff = { id: 'u-other', role: 'REGISTRAR' };
const admin = { id: 'u-admin', role: 'SYSTEM_ADMIN' };
const student = { id: 'u-student', role: 'STUDENT' };

describe('affairs rules', () => {
  it('allows only the agreed transitions and none out of final states', () => {
    expect(canTransition('NEW', 'CANCELLED')).toBe(true);
    expect(canTransition('NEW', 'COMPLETED')).toBe(false);
    expect(canTransition('ASSIGNED', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('IN_PROGRESS', 'COMPLETED')).toBe(true);
    expect(canTransition('WAITING_COMPLETION', 'IN_PROGRESS')).toBe(true);
    expect(canTransition('REFERRED', 'COMPLETED')).toBe(true);
    for (const final of ['COMPLETED', 'REJECTED', 'CANCELLED'] as const) {
      for (const to of ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'REJECTED'] as const) expect(canTransition(final, to)).toBe(false);
    }
  });

  it('requires a reason for reject, cancel, refer and waiting only', () => {
    for (const s of ['REJECTED', 'CANCELLED', 'REFERRED', 'WAITING_COMPLETION'] as const) expect(reasonRequired(s)).toBe(true);
    for (const s of ['IN_PROGRESS', 'COMPLETED'] as const) expect(reasonRequired(s)).toBe(false);
  });

  it('formats request numbers per year and picks the least loaded staff', () => {
    expect(requestNumber(2027, 1)).toBe('SR-27-0001');
    expect(requestNumber(2027, 123)).toBe('SR-27-0123');
    expect(pickLeastLoaded([{ id: 'b', open: 2 }, { id: 'a', open: 1 }, { id: 'c', open: 1 }])).toBe('a');
    expect(pickLeastLoaded([])).toBeNull();
  });
});

function setup(overrides: { request?: Record<string, unknown>; candidates?: { id: string }[]; loads?: { assignedStaffId: string; _count: { _all: number } }[]; service?: Record<string, unknown> | null } = {}) {
  const request = { id: 'r1', number: 'SR-27-0001', status: 'ASSIGNED', serviceId: 's1', assignedStaffId: 'st1', assignedStaff: { userId: 'u-staff' }, decisionReason: null, ...overrides.request };
  const prisma: any = {
    studentRequest: {
      findUnique: vi.fn().mockResolvedValue(request),
      create: vi.fn(async ({ data }: any) => ({ id: 'new', ...data })),
      update: vi.fn(async ({ data }: any) => ({ ...request, ...data })),
      groupBy: vi.fn().mockResolvedValue(overrides.loads ?? []),
    },
    studentRequestEvent: { create: vi.fn().mockResolvedValue({}) },
    affairsService: { findUnique: vi.fn().mockResolvedValue(overrides.service === undefined ? { id: 's1', isActive: true, expectedDays: 3 } : overrides.service) },
    affairsStaff: { findMany: vi.fn().mockResolvedValue(overrides.candidates ?? []), findUnique: vi.fn() },
    affairsRequestCounter: { upsert: vi.fn().mockResolvedValue({ last: 1 }) },
    student: { findUnique: vi.fn().mockResolvedValue({ id: 'stu1' }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return { prisma, service: new AffairsService(prisma as unknown as PrismaService, fakeSettings()) };
}

describe('AffairsService.changeStatus', () => {
  it('rejects without a reason and accepts with one, recording event and audit', async () => {
    const { prisma, service } = setup({ request: { status: 'IN_PROGRESS' } });
    await expect(service.changeStatus('r1', { status: 'REJECTED', note: '   ' }, staffUser)).rejects.toBeInstanceOf(BadRequestException);
    await service.changeStatus('r1', { status: 'REJECTED', note: 'مستندات ناقصة' }, staffUser);
    expect(prisma.studentRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ status: 'REJECTED', decisionReason: 'مستندات ناقصة', closedAt: expect.any(Date) }) }));
    expect(prisma.studentRequestEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'STATUS_CHANGED', fromStatus: 'IN_PROGRESS', toStatus: 'REJECTED', visibleToStudent: true }) });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'AFFAIRS_REQUEST_STATUS_CHANGED' }) });
  });

  it('does not need a reason for completing and blocks forbidden or final transitions', async () => {
    const a = setup({ request: { status: 'IN_PROGRESS' } });
    await a.service.changeStatus('r1', { status: 'COMPLETED' }, staffUser);
    const b = setup({ request: { status: 'ASSIGNED' } });
    await expect(b.service.changeStatus('r1', { status: 'COMPLETED' }, staffUser)).rejects.toBeInstanceOf(BadRequestException);
    const c = setup({ request: { status: 'COMPLETED' } });
    await expect(c.service.changeStatus('r1', { status: 'IN_PROGRESS' }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('only the assigned staff member or a system admin may act', async () => {
    const { service } = setup({ request: { status: 'ASSIGNED' } });
    await expect(service.changeStatus('r1', { status: 'IN_PROGRESS' }, otherStaff)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.comment('r1', { note: 'x' }, otherStaff)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.changeStatus('r1', { status: 'IN_PROGRESS' }, admin)).resolves.toBeDefined();
  });

  it('comments are internal (hidden from the student)', async () => {
    const { prisma, service } = setup();
    await service.comment('r1', { note: 'ملاحظة داخلية' }, staffUser);
    expect(prisma.studentRequestEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'COMMENT', visibleToStudent: false }) });
  });
});

describe('AffairsService.createForStudent', () => {
  it('auto-assigns to the least loaded active staff who have the service', async () => {
    const { prisma, service } = setup({ candidates: [{ id: 'a' }, { id: 'b' }], loads: [{ assignedStaffId: 'a', _count: { _all: 3 } }, { assignedStaffId: 'b', _count: { _all: 1 } }] });
    const created: any = await service.createForStudent('stu1', 's1', 'موضوع', undefined, student);
    expect(created.assignedStaffId).toBe('b');
    expect(created.status).toBe('ASSIGNED');
    expect(created.number).toMatch(/^SR-\d{2}-0001$/);
    expect(prisma.studentRequestEvent.create).toHaveBeenCalledTimes(2);
  });

  it('stays NEW and unassigned when nobody covers the service', async () => {
    const { service } = setup({ candidates: [] });
    const created: any = await service.createForStudent('stu1', 's1', 'موضوع', undefined, student);
    expect(created.status).toBe('NEW');
    expect(created.assignedStaffId).toBeNull();
  });

  it('refuses inactive or missing services', async () => {
    await expect(setup({ service: { id: 's1', isActive: false, expectedDays: 3 } }).service.createForStudent('stu1', 's1', 'x', undefined, student)).rejects.toBeInstanceOf(BadRequestException);
    await expect(setup({ service: null }).service.createForStudent('stu1', 's1', 'x', undefined, student)).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('AffairsService.assign', () => {
  it('lets staff take only an unassigned NEW request in their own services', async () => {
    const a = setup({ request: { status: 'NEW', assignedStaffId: null, assignedStaff: null } });
    a.prisma.affairsStaff.findUnique.mockResolvedValue({ id: 'st9', isActive: true, services: [{ serviceId: 's1' }] });
    await a.service.assign('r1', {}, staffUser);
    expect(a.prisma.studentRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: { assignedStaffId: 'st9', status: 'ASSIGNED' } }));
    const b = setup({ request: { status: 'ASSIGNED' } });
    await expect(b.service.assign('r1', {}, staffUser)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('system admin must give a reason to reassign and cannot touch finished requests', async () => {
    const a = setup();
    a.prisma.affairsStaff.findUnique.mockResolvedValue({ id: 'st2', isActive: true, services: [{ serviceId: 's1' }] });
    await expect(a.service.assign('r1', { staffId: 'st2' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await a.service.assign('r1', { staffId: 'st2', reason: 'إجازة الموظف' }, admin);
    expect(a.prisma.studentRequestEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'REASSIGNED', note: 'إجازة الموظف' }) });
    const b = setup({ request: { status: 'COMPLETED' } });
    await expect(b.service.assign('r1', { staffId: 'st2', reason: 'x' }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('AffairsService student side', () => {
  it('a student only sees own requests and only visible events', async () => {
    const { prisma, service } = setup();
    prisma.student.findUnique.mockResolvedValue({ id: 'stu1' });
    prisma.studentRequest.findFirst = vi.fn().mockResolvedValue(null);
    await expect(service.myRequest('r1', student)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.studentRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'r1', studentId: 'stu1' },
      include: expect.objectContaining({ events: expect.objectContaining({ where: { visibleToStudent: true } }) }),
    }));
  });
});

import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AffairsService } from './affairs.service.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { AffairsReportsService } from './affairs-reports.service.js';
import { AffairsNotificationsService } from './affairs-notifications.service.js';
import { managerRecipients, notifyUsers, studentStatusMessage } from './affairs-notifications.js';
import { canManage, isUnitManager } from './affairs-access.js';
import { fakeSettings } from './affairs-test-utils.js';
import { PrismaService } from '../prisma/prisma.service.js';

const plain = { id: 'u-plain', role: 'REGISTRAR' };
const manager = { id: 'u-mgr', role: 'REGISTRAR' };
const admin = { id: 'u-admin', role: 'SYSTEM_ADMIN' };
const student = { id: 'u-student', role: 'STUDENT' };

// staff profile by user id: only u-mgr is an active manager; u-off is a manager whose profile is inactive
const profiles: Record<string, unknown> = {
  'u-plain': { isManager: false, isActive: true }, 'u-mgr': { isManager: true, isActive: true }, 'u-off': { isManager: true, isActive: false },
};
const db = { affairsStaff: { findUnique: vi.fn(async ({ where }: any) => profiles[where.userId] ?? null) } };

describe('unit manager = REGISTRAR + manager flag on the staff profile', () => {
  it('only an active manager profile counts; admin always may manage; students never', async () => {
    expect(await isUnitManager(db, manager)).toBe(true);
    expect(await isUnitManager(db, plain)).toBe(false);
    expect(await isUnitManager(db, { id: 'u-off', role: 'REGISTRAR' })).toBe(false);
    expect(await isUnitManager(db, { id: 'nobody', role: 'REGISTRAR' })).toBe(false);
    expect(await isUnitManager(db, student)).toBe(false);
    expect(await canManage(db, admin)).toBe(true);
    expect(await canManage(db, manager)).toBe(true);
    expect(await canManage(db, plain)).toBe(false);
  });
});

function mockPrisma(over: { request?: Record<string, unknown>; managers?: { userId: string }[]; admins?: { id: string }[] } = {}) {
  const req = { id: 'r1', number: 'SR-26-0001', status: 'ASSIGNED', studentId: 'stu1', serviceId: 's1', assignedStaffId: 'st1', assignedStaff: { userId: 'u-plain' }, decisionReason: null, ...over.request };
  const prisma: any = {
    studentRequest: { findUnique: vi.fn().mockResolvedValue(req), update: vi.fn().mockResolvedValue(req), create: vi.fn(async ({ data }: any) => ({ id: 'n', ...data })), groupBy: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) },
    studentRequestEvent: { create: vi.fn().mockResolvedValue({}), findMany: vi.fn().mockResolvedValue([]) },
    affairsService: { findUnique: vi.fn().mockResolvedValue({ id: 's1', nameAr: 'كشف علامات', isActive: true, expectedDays: 3, channel: 'BOTH' }) },
    affairsStaff: {
      findUnique: vi.fn(async ({ where }: any) => {
        if (where.userId) return profiles[where.userId] ?? null;
        if (where.id === 'st2') return { id: 'st2', userId: 'u-st2', isActive: true, services: [{ serviceId: 's1' }] };
        return { userId: 'u-plain' };
      }),
      findMany: vi.fn(async (args: any) => (args.where?.isManager ? over.managers ?? [] : [{ id: 'st1' }])),
      update: vi.fn().mockResolvedValue({}),
    },
    user: { findMany: vi.fn().mockResolvedValue(over.admins ?? []) },
    affairsRequestCounter: { upsert: vi.fn().mockResolvedValue({ last: 1 }) },
    student: { findUnique: vi.fn().mockResolvedValue({ id: 'stu1', userId: 'u-student' }) },
    affairsNotification: { createMany: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}
const svc = (p: unknown, settings = fakeSettings()) => new AffairsService(p as unknown as PrismaService, settings);
const sent = (p: any) => p.affairsNotification.createMany.mock.calls.flatMap((c: any) => c[0].data);

describe('what the unit manager may do', () => {
  it('assigns and re-assigns any request (a plain staff member only takes unassigned new ones)', async () => {
    const p = mockPrisma();
    await svc(p).assign('r1', { staffId: 'st2', reason: 'توزيع الحمل' }, manager);
    expect(p.studentRequest.update).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ assignedStaffId: 'st2' }) }));
    await expect(svc(mockPrisma()).assign('r1', { staffId: 'st2', reason: 'x' }, plain)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc(mockPrisma()).assign('r1', { staffId: 'st2' }, manager)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('staff management: plain staff refused; manager allowed but cannot name managers; admin may', async () => {
    await expect(svc(mockPrisma()).updateStaff('st2', { specialization: 'x' }, plain)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc(mockPrisma()).updateStaff('st2', { specialization: 'x' }, manager)).resolves.toBeDefined();
    await expect(svc(mockPrisma()).updateStaff('st2', { isManager: true }, manager)).rejects.toBeInstanceOf(ForbiddenException);
    const p = mockPrisma();
    await svc(p).updateStaff('st2', { isManager: true }, admin);
    expect(p.affairsStaff.update).toHaveBeenCalledWith({ where: { id: 'st2' }, data: { isManager: true } });
  });

  it('is not held back by the registrar capability switches; a plain staff member is', async () => {
    const real = (rows: { key: string; value: unknown }[]) => {
      const prisma: any = { affairsSetting: { findMany: vi.fn().mockResolvedValue(rows) }, affairsStaff: { findUnique: db.affairsStaff.findUnique } };
      return new AffairsSettingsService(prisma as unknown as PrismaService);
    };
    const off = real([{ key: 'capIssueDocuments', value: false }]);
    await expect(off.assertCapability(manager, 'capIssueDocuments')).resolves.toBeUndefined();
    await expect(off.assertCapability(plain, 'capIssueDocuments')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sees the whole unit workload in the summary and in reports; a plain staff member does not', async () => {
    const summaryPrisma = (p: any) => { p.studentRequestEvent.findMany = vi.fn().mockResolvedValue([]); p.student.count = vi.fn().mockResolvedValue(0); p.affairsStaff.findMany = vi.fn().mockResolvedValue([]); return p; };
    const a: any = await svc(summaryPrisma(mockPrisma())).summary(manager);
    expect('staffLoad' in a).toBe(true);
    const b: any = await svc(summaryPrisma(mockPrisma())).summary(plain);
    expect('staffLoad' in b).toBe(false);
    const rp: any = { affairsStaff: { findUnique: db.affairsStaff.findUnique }, studentRequest: { groupBy: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findMany: vi.fn().mockResolvedValue([]) }, affairsService: { findMany: vi.fn().mockResolvedValue([]) }, issuedDocument: { groupBy: vi.fn().mockResolvedValue([]) }, documentType: { findMany: vi.fn().mockResolvedValue([]) }, requestReferral: { groupBy: vi.fn().mockResolvedValue([]) } };
    const reports = new AffairsReportsService(rp as unknown as PrismaService);
    expect(((await reports.overview({}, manager)) as any).scope.canSeeAll).toBe(true);
    expect(((await reports.overview({}, plain)) as any).scope.canSeeAll).toBe(false);
    expect((await reports.catalog(manager)).find((s) => s.id === 'requests')!.columns.some((c) => c.id === 'staff')).toBe(true);
    expect((await reports.catalog(plain)).find((s) => s.id === 'requests')!.columns.some((c) => c.id === 'staff')).toBe(false);
  });
});

describe('notifications are written with the action', () => {
  it('message text: status titles, reason shown only where the student needs it', () => {
    expect(studentStatusMessage('SR-26-0001', 'COMPLETED').title).toBe('اكتمل طلبك');
    expect(studentStatusMessage('SR-26-0001', 'WAITING_COMPLETION', 'ينقص صورة الهوية').body).toContain('ينقص صورة الهوية');
    expect(studentStatusMessage('SR-26-0001', 'IN_PROGRESS', 'ملاحظة داخلية').body).not.toContain('ملاحظة داخلية');
    expect(studentStatusMessage('SR-26-0001', 'IN_PROGRESS', null, true).title).toBe('عاد طلبك إلى الموظف المختص');
  });

  it('notifyUsers drops empty ids, removes duplicates and writes nothing when nobody is left', async () => {
    const tx: any = { affairsNotification: { createMany: vi.fn() } };
    await notifyUsers(tx, [undefined, null, 'a', 'a', 'b'], { kind: 'X', title: 't' });
    expect(tx.affairsNotification.createMany.mock.calls[0][0].data.map((d: any) => d.userId)).toEqual(['a', 'b']);
    await notifyUsers(tx, [undefined, null], { kind: 'X', title: 't' });
    expect(tx.affairsNotification.createMany).toHaveBeenCalledTimes(1);
  });

  it('managers are told about unassigned work; with no manager named, the system admins are', async () => {
    const withMgr: any = { affairsStaff: { findMany: vi.fn().mockResolvedValue([{ userId: 'u-mgr' }]) }, user: { findMany: vi.fn() } };
    expect(await managerRecipients(withMgr)).toEqual(['u-mgr']);
    expect(withMgr.user.findMany).not.toHaveBeenCalled();
    const none: any = { affairsStaff: { findMany: vi.fn().mockResolvedValue([]) }, user: { findMany: vi.fn().mockResolvedValue([{ id: 'u-admin' }]) } };
    expect(await managerRecipients(none)).toEqual(['u-admin']);
  });

  it('a new request: receipt for the student and "assigned to you" for the staff member', async () => {
    const p = mockPrisma();
    await svc(p).createForStudent('stu1', 's1', 'x', undefined, student);
    const rows = sent(p);
    expect(rows.find((r: any) => r.userId === 'u-student')).toMatchObject({ kind: 'REQUEST_CREATED', title: 'تم استلام طلبك' });
    expect(rows.find((r: any) => r.userId === 'u-plain')).toMatchObject({ kind: 'REQUEST_ASSIGNED' });
  });

  it('nobody to assign: the manager is told; the person who created it is not notified about their own action', async () => {
    const p = mockPrisma({ managers: [{ userId: 'u-mgr' }] });
    p.affairsStaff.findMany = vi.fn(async (args: any) => (args.where?.isManager ? [{ userId: 'u-mgr' }] : []));
    await svc(p).createForStudent('stu1', 's1', 'x', undefined, student);
    expect(sent(p).find((r: any) => r.userId === 'u-mgr')).toMatchObject({ kind: 'REQUEST_UNASSIGNED' });
    const q = mockPrisma({ managers: [{ userId: 'u-mgr' }] });
    q.affairsStaff.findMany = vi.fn(async (args: any) => (args.where?.isManager ? [{ userId: 'u-mgr' }] : []));
    await svc(q).createForStudent('stu1', 's1', 'x', undefined, manager);
    expect(sent(q).some((r: any) => r.kind === 'REQUEST_UNASSIGNED')).toBe(false);
  });

  it('a status change tells the student, with the reason when waiting for completion', async () => {
    const p = mockPrisma({ request: { status: 'IN_PROGRESS', assignedStaff: { userId: 'u-plain' } } });
    await svc(p).changeStatus('r1', { status: 'WAITING_COMPLETION', note: 'ينقص مستند' }, plain);
    expect(sent(p)).toEqual([expect.objectContaining({ userId: 'u-student', kind: 'REQUEST_STATUS', title: 'طلبك بحاجة إلى استكمال', body: expect.stringContaining('ينقص مستند'), requestId: 'r1' })]);
  });

  it('an assignment tells the assignee (not the person who assigned)', async () => {
    const p = mockPrisma();
    await svc(p).assign('r1', { staffId: 'st2', reason: 'إجازة' }, admin);
    expect(sent(p)).toEqual([expect.objectContaining({ userId: 'u-st2', title: 'أُعيد إسناد طلب إليك' })]);
  });
});

describe('AffairsNotificationsService', () => {
  function service() {
    const prisma: any = {
      affairsNotification: {
        findMany: vi.fn().mockResolvedValue([{ id: 'n1' }]), count: vi.fn().mockResolvedValue(2),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    return { prisma, service: new AffairsNotificationsService(prisma as unknown as PrismaService) };
  }

  it('lists only the caller\'s own notifications', async () => {
    const { prisma, service: s } = service();
    await s.list(student, true);
    expect(prisma.affairsNotification.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { userId: 'u-student', isRead: false } }));
    expect((await s.list(student, false)).unread).toBe(2);
    expect(prisma.affairsNotification.findMany).toHaveBeenLastCalledWith(expect.objectContaining({ where: { userId: 'u-student' } }));
  });

  it('marks read only the caller\'s rows, never deletes, and says 404 for someone else\'s id', async () => {
    const { prisma, service: s } = service();
    await s.markRead('n1', student);
    expect(prisma.affairsNotification.updateMany).toHaveBeenCalledWith({ where: { id: 'n1', userId: 'u-student', isRead: false }, data: { isRead: true, readAt: expect.any(Date) } });
    prisma.affairsNotification.updateMany.mockResolvedValue({ count: 0 });
    prisma.affairsNotification.count.mockResolvedValue(0);
    await expect(s.markRead('someone-elses', student)).rejects.toBeInstanceOf(NotFoundException);
    expect((await s.markAllRead(student)).unread).toBe(0);
    expect(prisma.affairsNotification.updateMany).toHaveBeenLastCalledWith({ where: { userId: 'u-student', isRead: false }, data: { isRead: true, readAt: expect.any(Date) } });
  });
});

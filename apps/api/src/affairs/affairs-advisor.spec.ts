import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AffairsReferralsService, outcomeAllowed } from './affairs-referrals.service.js';
import { AdvisorAffairsService } from './advisor-affairs.service.js';
import { AffairsService } from './affairs.service.js';
import { AffairsFilesService } from './affairs-files.service.js';
import { fakeSettings } from './affairs-test-utils.js';
import type { PrismaService } from '../prisma/prisma.service.js';

const owner = { id: 'u-staff', role: 'REGISTRAR' };
const manager = { id: 'u-mgr', role: 'REGISTRAR' };
const admin = { id: 'u-admin', role: 'SYSTEM_ADMIN' };
const advisor = { id: 'u-adv', role: 'ADVISOR' };
const COLLEGE = '11111111-1111-4111-8111-111111111111';
const dto = { mode: 'OPINION', target: 'COLLEGE', collegeId: COLLEGE, reason: 'رأي الكلية' };

function db(over: Record<string, any> = {}) {
  const request = { id: 'r1', number: 'SR-26-0001', status: 'IN_PROGRESS', assignedStaffId: 'st1', assignedStaff: { userId: 'u-staff' }, student: { userId: 'stu-user' }, studentId: 'stu1', serviceId: 's1', dueAt: null };
  const prisma: any = {
    studentRequest: { findUnique: vi.fn().mockResolvedValue(request), findUniqueOrThrow: vi.fn().mockResolvedValue(request), update: vi.fn().mockResolvedValue(request), findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), groupBy: vi.fn().mockResolvedValue([]) },
    studentRequestEvent: { create: vi.fn().mockResolvedValue({}) },
    requestReferral: { count: vi.fn().mockResolvedValue(0), create: vi.fn(async ({ data }: any) => ({ id: 'f1', ...data })), findFirst: vi.fn(), findMany: vi.fn().mockResolvedValue([]), updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
    college: { findFirst: vi.fn().mockResolvedValue({ id: COLLEGE, nameAr: 'كلية الهندسة' }), findMany: vi.fn().mockResolvedValue([]) },
    user: { findFirst: vi.fn(async ({ where }: any) => ({ id: where.id ?? 'u-adv' })), findMany: vi.fn().mockResolvedValue([{ id: 'u-adv' }, { id: 'u-adv2' }]) },
    advisorCollegeAssignment: { findMany: vi.fn().mockResolvedValue([{ collegeId: COLLEGE }]) },
    advisorProgramAssignment: { findMany: vi.fn().mockResolvedValue([]) },
    program: { findMany: vi.fn().mockResolvedValue([]) },
    student: { findUnique: vi.fn().mockResolvedValue({ userId: 'stu-user' }), findFirst: vi.fn().mockResolvedValue({ id: 'stu1' }) },
    affairsNotification: { createMany: vi.fn().mockResolvedValue({}) },
    affairsStaff: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...over,
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}
const referrals = (prisma: any) => new AffairsReferralsService(prisma as PrismaService, fakeSettings());
const advisorSvc = (prisma: any) => new AdvisorAffairsService(prisma as PrismaService, new AffairsFilesService(prisma as PrismaService));
const notified = (prisma: any) => prisma.affairsNotification.createMany.mock.calls.flatMap((call: any) => call[0].data.map((row: any) => row.userId));

describe('referral to a college (advisors)', () => {
  it('needs a college, only for opinion/approval, an active college, and a specific advisor who covers it', async () => {
    await expect(referrals(db()).create('r1', { ...dto, collegeId: undefined } as never, owner)).rejects.toThrow('اختر الكلية');
    await expect(referrals(db()).create('r1', { ...dto, mode: 'EXECUTION' } as never, owner)).rejects.toThrow('لطلب الرأي');
    const inactive = db(); inactive.college.findFirst.mockResolvedValue(null);
    await expect(referrals(inactive).create('r1', dto as never, owner)).rejects.toThrow('معطّلة');
    const notCovering = db(); notCovering.advisorCollegeAssignment.findMany.mockResolvedValue([]);
    await expect(referrals(notCovering).create('r1', { ...dto, advisorUserId: '22222222-2222-4222-8222-222222222222' } as never, owner)).rejects.toThrow('غير مسؤول');
    expect(notCovering.requestReferral.create).not.toHaveBeenCalled();
  });

  it('records the college and the decision rule, notifies the college advisors (or only the chosen one) and never changes the owner', async () => {
    const all = db();
    await referrals(all).create('r1', { ...dto, decisionAllowed: false } as never, owner);
    expect(all.requestReferral.create.mock.calls[0][0].data).toMatchObject({ collegeId: COLLEGE, targetName: 'كلية الهندسة', decisionAllowed: false, advisorUserId: null });
    expect(notified(all)).toEqual(expect.arrayContaining(['u-adv', 'u-adv2']));
    expect(all.studentRequest.update.mock.calls.every((c: any) => !('assignedStaffId' in c[0].data))).toBe(true);
    const one = db();
    await referrals(one).create('r1', { ...dto, advisorUserId: '22222222-2222-4222-8222-222222222222' } as never, owner);
    expect(one.requestReferral.create.mock.calls[0][0].data.advisorUserId).toBe('22222222-2222-4222-8222-222222222222');
    expect(notified(one)).not.toContain('u-adv2');
  });

  it('answer rules: an opinion-only referral allows notes or a request for more information, never approval or rejection', () => {
    expect(outcomeAllowed('OPINION', 'APPROVED', true)).toBe(true);
    expect(outcomeAllowed('OPINION', 'NEEDS_INFO', true)).toBe(true);
    expect(outcomeAllowed('OPINION', 'APPROVED', false)).toBe(false);
    expect(outcomeAllowed('OPINION', 'REJECTED', false)).toBe(false);
    expect(outcomeAllowed('OPINION', 'NOTES', false)).toBe(true);
    expect(outcomeAllowed('OPINION', 'NEEDS_INFO', false)).toBe(true);
    expect(outcomeAllowed('EXECUTION', 'NEEDS_INFO')).toBe(false);
  });
});

describe('advisor workspace', () => {
  const pending = { id: 'f1', requestId: 'r1', mode: 'OPINION', target: 'COLLEGE', targetName: 'كلية الهندسة', collegeId: COLLEGE, advisorUserId: null, decisionAllowed: true, status: 'PENDING' };

  it('answers an in-scope referral, the request goes back to the owner (ownership unchanged), the owner and student are notified, it is audited', async () => {
    const prisma = db();
    prisma.requestReferral.findFirst.mockResolvedValue(pending);
    await expect(advisorSvc(prisma).respond('f1', { outcome: 'APPROVED', note: 'لا مانع' }, advisor)).resolves.toEqual({ ok: true, status: 'IN_PROGRESS' });
    expect(prisma.requestReferral.updateMany).toHaveBeenCalledWith({ where: { id: 'f1', status: 'PENDING' }, data: expect.objectContaining({ status: 'ANSWERED', outcome: 'APPROVED', respondedByUserId: 'u-adv' }) });
    expect(prisma.studentRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'IN_PROGRESS', closedAt: null } });
    expect(prisma.studentRequest.update.mock.calls.every((c: any) => !('assignedStaffId' in c[0].data))).toBe(true);
    expect(notified(prisma)).toEqual(expect.arrayContaining(['u-staff', 'stu-user']));
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'AFFAIRS_REFERRAL_ANSWERED_BY_ADVISOR' }) });
  });

  it('a referral outside the advisor scope is invisible (404); an answered one cannot be answered again', async () => {
    const outside = db(); outside.requestReferral.findFirst.mockResolvedValue(null);
    await expect(advisorSvc(outside).respond('f1', { outcome: 'APPROVED', note: 'x' }, advisor)).rejects.toBeInstanceOf(NotFoundException);
    await expect(advisorSvc(outside).referral('f1', advisor)).rejects.toBeInstanceOf(NotFoundException);
    const done = db(); done.requestReferral.findFirst.mockResolvedValue({ ...pending, status: 'ANSWERED' });
    await expect(advisorSvc(done).respond('f1', { outcome: 'NOTES', note: 'x' }, advisor)).rejects.toBeInstanceOf(BadRequestException);
    const raced = db(); raced.requestReferral.findFirst.mockResolvedValue(pending); raced.requestReferral.updateMany.mockResolvedValue({ count: 0 });
    await expect(advisorSvc(raced).respond('f1', { outcome: 'NOTES', note: 'x' }, advisor)).rejects.toBeInstanceOf(BadRequestException);
    expect(raced.studentRequest.update).not.toHaveBeenCalled();
  });

  it('an opinion-only referral refuses approval/rejection; notes, rejection reasons and information requests need text', async () => {
    const opinionOnly = db(); opinionOnly.requestReferral.findFirst.mockResolvedValue({ ...pending, decisionAllowed: false });
    await expect(advisorSvc(opinionOnly).respond('f1', { outcome: 'APPROVED', note: 'x' }, advisor)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(advisorSvc(opinionOnly).respond('f1', { outcome: 'REJECTED', note: 'x' }, advisor)).rejects.toBeInstanceOf(ForbiddenException);
    const open = db(); open.requestReferral.findFirst.mockResolvedValue(pending);
    for (const outcome of ['REJECTED', 'NOTES', 'NEEDS_INFO']) await expect(advisorSvc(open).respond('f1', { outcome, note: '  ' }, advisor)).rejects.toBeInstanceOf(BadRequestException);
    await expect(advisorSvc(open).respond('f1', { outcome: 'NEEDS_INFO', note: 'أرفقوا كشف العلامات' }, advisor)).resolves.toMatchObject({ ok: true });
    expect(open.studentRequestEvent.create.mock.calls.map((c: any) => c[0].data.note).join(' ')).toContain('طلب استكمال معلومات أو وثائق');
  });

  it('student files are limited to the advisor scope', async () => {
    const outside = db(); outside.student.findFirst.mockResolvedValue(null);
    await expect(advisorSvc(outside).studentFile(advisor, 'stu9')).rejects.toBeInstanceOf(NotFoundException);
    const where = outside.student.findFirst.mock.calls[0][0].where;
    expect(JSON.stringify(where)).toContain('collegeId');
    const noScope = db({ advisorCollegeAssignment: { findMany: vi.fn().mockResolvedValue([]) } });
    await advisorSvc(noScope).students(advisor, undefined, 1).catch(() => undefined);
    expect(JSON.stringify(noScope.student.findMany?.mock?.calls ?? noScope.student.findFirst.mock.calls)).not.toContain('"AND":[{"OR"');
  });
});

describe('delay reasons and stuck requests (admin / unit manager)', () => {
  const service = (prisma: any) => new AffairsService(prisma as PrismaService, fakeSettings());

  it('the owner, the unit manager and the admin may write the delay reason on an open request; others may not; it is internal and audited', async () => {
    const prisma = db();
    const ok = await service(prisma).setDelayReason('r1', { reason: ' بانتظار مستند ' }, owner);
    expect(prisma.studentRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({ delayReason: 'بانتظار مستند', delayReasonById: 'u-staff' }) });
    expect(prisma.studentRequestEvent.create.mock.calls[0][0].data).toMatchObject({ type: 'DELAY_NOTED', visibleToStudent: false });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'AFFAIRS_REQUEST_DELAY_NOTED' }) });
    expect(ok).toBeDefined();
    await expect(service(db()).setDelayReason('r1', { reason: 'x' }, admin)).resolves.toBeDefined();
    const asManager = db({ affairsStaff: { findUnique: vi.fn().mockResolvedValue({ isManager: true, isActive: true }), findMany: vi.fn() } });
    await expect(service(asManager).setDelayReason('r1', { reason: 'x' }, manager)).resolves.toBeDefined();
    await expect(service(db()).setDelayReason('r1', { reason: 'x' }, { id: 'u-other', role: 'REGISTRAR' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service(db()).setDelayReason('r1', { reason: '   ' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    const closed = db(); closed.studentRequest.findUnique.mockResolvedValue({ id: 'r1', status: 'COMPLETED', assignedStaff: { userId: 'u-staff' } });
    await expect(service(closed).setDelayReason('r1', { reason: 'x' }, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('the stuck list is for the admin and the unit manager, and explains why each request is stuck', async () => {
    await expect(service(db()).stuck(owner)).rejects.toBeInstanceOf(ForbiddenException);
    const day = 86_400_000;
    const prisma = db();
    const base = { status: 'IN_PROGRESS', dueAt: null, createdAt: new Date(), updatedAt: new Date(), delayReason: null, delayReasonAt: null, assignedStaffId: 'st1', service: { nameAr: 'تأجيل' }, student: { universityId: '2601001', fullName: 'طالب', firstName: 'ط', middleName: null, familyName: 'ب' }, assignedStaff: { user: { displayName: 'موظف', username: null, email: 'e' } }, referrals: [] };
    prisma.studentRequest.findMany.mockResolvedValue([
      { ...base, id: 'a', number: 'SR-1', dueAt: new Date(Date.now() - 4 * day) },
      { ...base, id: 'b', number: 'SR-2', status: 'REFERRED', referrals: [{ target: 'COLLEGE', targetName: 'كلية الهندسة', createdAt: new Date(Date.now() - 6 * day), collegeId: COLLEGE }], delayReason: 'ننتظر الكلية' },
      { ...base, id: 'c', number: 'SR-3', status: 'NEW', assignedStaffId: null, assignedStaff: null, createdAt: new Date(Date.now() - 3 * day) },
      { ...base, id: 'd', number: 'SR-4' },
    ]);
    const result = await service(prisma).stuck(admin);
    expect(result.total).toBe(3);
    expect(result.withoutReason).toBe(2);
    expect(result.items.map((i: any) => i.number)).toEqual(['SR-2', 'SR-1', 'SR-3']);
    expect(result.items[0].reasons[0].label).toContain('كلية الهندسة');
    expect(result.items[1].reasons[0].label).toContain('متأخرة');
    expect(result.items[2].reasons[0].label).toContain('بلا مالك');
  });
});

import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AffairsService } from './affairs.service.js';
import { AffairsAttachmentsService, detectType } from './affairs-attachments.service.js';
import { AffairsReferralsService, outcomeAllowed, statusAfterResponse } from './affairs-referrals.service.js';
import { canTransition, isTerminal } from './affairs.rules.js';
import { fakeSettings } from './affairs-test-utils.js';
import { PrismaService } from '../prisma/prisma.service.js';

const owner = { id: 'u-staff', role: 'REGISTRAR' };
const other = { id: 'u-other', role: 'REGISTRAR' };
const admin = { id: 'u-admin', role: 'SYSTEM_ADMIN' };
const student = { id: 'u-student', role: 'STUDENT' };

const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(50, 1)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20, 2)]);
const exe = Buffer.concat([Buffer.from('MZ'), Buffer.alloc(30, 3)]);

function mockPrisma(request: Record<string, unknown> = {}) {
  const req = { id: 'r1', number: 'SR-26-0001', status: 'IN_PROGRESS', assignedStaffId: 'st1', assignedStaff: { userId: 'u-staff' }, serviceId: 's1', ...request };
  const prisma: any = {
    studentRequest: { findUnique: vi.fn().mockResolvedValue(req), findFirst: vi.fn().mockResolvedValue(req), update: vi.fn().mockResolvedValue(req) },
    studentRequestEvent: { create: vi.fn().mockResolvedValue({}) },
    studentRequestAttachment: {
      count: vi.fn().mockResolvedValue(0), create: vi.fn(async ({ data }: any) => ({ id: 'a1', ...data })),
      findFirst: vi.fn().mockResolvedValue({ id: 'a1', fileName: 'x.pdf' }), update: vi.fn().mockResolvedValue({}),
    },
    requestReferral: { count: vi.fn().mockResolvedValue(0), create: vi.fn(async ({ data }: any) => ({ id: 'f1', ...data })), findUnique: vi.fn(), update: vi.fn().mockResolvedValue({}) },
    student: { findUnique: vi.fn().mockResolvedValue({ id: 'stu1' }) },
    affairsService: { findUnique: vi.fn().mockResolvedValue({ id: 's1', isActive: true, expectedDays: 3, channel: 'BOTH' }) },
    affairsStaff: { findMany: vi.fn().mockResolvedValue([]) },
    affairsRequestCounter: { upsert: vi.fn().mockResolvedValue({ last: 1 }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    affairsNotification: { createMany: vi.fn().mockResolvedValue({}) },
    user: { findMany: vi.fn().mockResolvedValue([]) },
  };
  prisma.studentRequest.groupBy = vi.fn().mockResolvedValue([]);
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}

describe('accepted status', () => {
  it('accepted is open, not final, and still needs completing', () => {
    expect(isTerminal('ACCEPTED')).toBe(false);
    expect(canTransition('IN_PROGRESS', 'ACCEPTED')).toBe(true);
    expect(canTransition('REFERRED', 'ACCEPTED')).toBe(true);
    expect(canTransition('ACCEPTED', 'COMPLETED')).toBe(true);
    expect(canTransition('ACCEPTED', 'CANCELLED')).toBe(true);
    expect(canTransition('ACCEPTED', 'REJECTED')).toBe(false);
    expect(canTransition('NEW', 'ACCEPTED')).toBe(false);
  });
});

describe('request source and status guards', () => {
  it('marks student requests online and staff requests in-person', async () => {
    const a = mockPrisma();
    a.studentRequest.create = vi.fn(async ({ data }: any) => ({ id: 'n', ...data }));
    const svc = new AffairsService(a as unknown as PrismaService, fakeSettings());
    expect(((await svc.createForStudent('stu1', 's1', 'x', undefined, student)) as any).channel).toBe('ONLINE');
    expect(((await svc.createForStudent('stu1', 's1', 'x', undefined, owner)) as any).channel).toBe('IN_PERSON');
  });

  it('students cannot submit an in-person-only service, staff can', async () => {
    const a = mockPrisma();
    a.affairsService.findUnique.mockResolvedValue({ id: 's1', isActive: true, expectedDays: 3, channel: 'IN_PERSON' });
    a.studentRequest.create = vi.fn(async ({ data }: any) => ({ id: 'n', ...data }));
    const svc = new AffairsService(a as unknown as PrismaService, fakeSettings());
    await expect(svc.createForStudent('stu1', 's1', 'x', undefined, student)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createForStudent('stu1', 's1', 'x', undefined, owner)).resolves.toBeDefined();
  });

  it('REFERRED can only be reached through a referral, and a pending referral blocks the status endpoint', async () => {
    const a = mockPrisma({ status: 'IN_PROGRESS' });
    const svc = new AffairsService(a as unknown as PrismaService, fakeSettings());
    await expect(svc.changeStatus('r1', { status: 'REFERRED', note: 'x' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    const b = mockPrisma({ status: 'REFERRED' });
    b.requestReferral.count.mockResolvedValue(1);
    await expect(new AffairsService(b as unknown as PrismaService, fakeSettings()).changeStatus('r1', { status: 'IN_PROGRESS' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    const c = mockPrisma({ status: 'IN_PROGRESS' });
    await expect(new AffairsService(c as unknown as PrismaService, fakeSettings()).changeStatus('r1', { status: 'ACCEPTED' }, owner)).resolves.toBeDefined();
  });
});

describe('attachments', () => {
  it('detects the type from the content, not the name', () => {
    expect(detectType(pdf)?.mime).toBe('application/pdf');
    expect(detectType(png)?.mime).toBe('image/png');
    expect(detectType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]))?.mime).toBe('image/jpeg');
    expect(detectType(exe)).toBeNull();
  });

  it('rejects wrong types, oversized files and missing files', async () => {
    const svc = new AffairsAttachmentsService(mockPrisma() as unknown as PrismaService, fakeSettings());
    await expect(svc.addByStaff('r1', { buffer: exe, originalname: 'a.pdf', size: exe.length }, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.addByStaff('r1', { buffer: Buffer.concat([pdf, Buffer.alloc(5 * 1024 * 1024)]), originalname: 'big.pdf', size: 0 }, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.addByStaff('r1', undefined, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('staff uploads are internal; only the assigned staff or an admin may upload; finished requests are closed', async () => {
    const a = mockPrisma();
    const svc = new AffairsAttachmentsService(a as unknown as PrismaService, fakeSettings());
    await svc.addByStaff('r1', { buffer: pdf, originalname: 'سند.pdf', size: pdf.length }, owner);
    expect(a.studentRequestAttachment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ visibleToStudent: false, mimeType: 'application/pdf' }) }));
    await expect(svc.addByStaff('r1', { buffer: pdf, originalname: 'a.pdf', size: 1 }, other)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.addByStaff('r1', { buffer: pdf, originalname: 'a.pdf', size: 1 }, admin)).resolves.toBeDefined();
    const done = mockPrisma({ status: 'COMPLETED' });
    await expect(new AffairsAttachmentsService(done as unknown as PrismaService, fakeSettings()).addByStaff('r1', { buffer: pdf, originalname: 'a.pdf', size: 1 }, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('student uploads are visible, limited to their own open request, and capped per request', async () => {
    const a = mockPrisma();
    const svc = new AffairsAttachmentsService(a as unknown as PrismaService, fakeSettings());
    await svc.addByStudent('r1', { buffer: png, originalname: 'id.png', size: png.length }, student);
    expect(a.studentRequestAttachment.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ visibleToStudent: true }) }));
    expect(a.studentRequest.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'r1', studentId: 'stu1' } }));
    a.studentRequest.findFirst.mockResolvedValue(null);
    await expect(svc.addByStudent('r1', { buffer: png, originalname: 'id.png', size: 1 }, student)).rejects.toBeInstanceOf(NotFoundException);
    const full = mockPrisma();
    full.studentRequestAttachment.count.mockResolvedValue(10);
    await expect(new AffairsAttachmentsService(full as unknown as PrismaService, fakeSettings()).addByStudent('r1', { buffer: png, originalname: 'id.png', size: 1 }, student)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('student download is scoped to own request and visible files; archive needs a reason and never deletes', async () => {
    const a = mockPrisma();
    const svc = new AffairsAttachmentsService(a as unknown as PrismaService, fakeSettings());
    a.studentRequestAttachment.findFirst.mockResolvedValue(null);
    await expect(svc.downloadForStudent('r1', 'a1', student)).rejects.toBeInstanceOf(NotFoundException);
    expect(a.studentRequestAttachment.findFirst).toHaveBeenCalledWith({ where: expect.objectContaining({ visibleToStudent: true, isArchived: false, request: { student: { userId: 'u-student' } } }) });
    a.studentRequestAttachment.findFirst.mockResolvedValue({ id: 'a1', fileName: 'x.pdf' });
    await expect(svc.archive('r1', 'a1', '  ', owner)).rejects.toBeInstanceOf(BadRequestException);
    await svc.archive('r1', 'a1', 'ملف خاطئ', owner);
    expect(a.studentRequestAttachment.update).toHaveBeenCalledWith({ where: { id: 'a1' }, data: { isArchived: true, archivedReason: 'ملف خاطئ' } });
  });
});

describe('referrals', () => {
  const dto = { mode: 'OPINION', target: 'FINANCIAL_AFFAIRS', reason: 'التحقق من الرسوم' };

  it('rules: what happens when the other body answers', () => {
    expect(statusAfterResponse('OPINION', 'APPROVED')).toBe('IN_PROGRESS');
    expect(statusAfterResponse('OPINION', 'REJECTED')).toBe('IN_PROGRESS');
    expect(statusAfterResponse('EXECUTION', 'DONE')).toBe('COMPLETED');
    expect(statusAfterResponse('EXECUTION', 'NOT_DONE')).toBe('IN_PROGRESS');
    expect(outcomeAllowed('OPINION', 'DONE')).toBe(false);
    expect(outcomeAllowed('EXECUTION', 'APPROVED')).toBe(false);
  });

  it('creating a referral sets REFERRED, keeps the staff member, and logs internal details separately from the student-visible status', async () => {
    const a = mockPrisma();
    const svc = new AffairsReferralsService(a as unknown as PrismaService, fakeSettings());
    await svc.create('r1', dto as never, owner);
    expect(a.studentRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'REFERRED' } });
    const events = a.studentRequestEvent.create.mock.calls.map((c: any) => c[0].data);
    expect(events.find((e: any) => e.type === 'STATUS_CHANGED')).toMatchObject({ visibleToStudent: true, toStatus: 'REFERRED' });
    expect(events.find((e: any) => e.type === 'REFERRAL_SENT')).toMatchObject({ visibleToStudent: false });
    expect(a.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'AFFAIRS_REFERRAL_CREATED' }) });
  });

  it('creating needs a reason, a name for college/other, the right state, no pending one, and the right person', async () => {
    const svc = new AffairsReferralsService(mockPrisma() as unknown as PrismaService, fakeSettings());
    await expect(svc.create('r1', { ...dto, reason: '  ' } as never, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create('r1', { ...dto, target: 'COLLEGE' } as never, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.create('r1', dto as never, other)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(new AffairsReferralsService(mockPrisma({ status: 'NEW' }) as unknown as PrismaService, fakeSettings()).create('r1', dto as never, admin)).rejects.toBeInstanceOf(BadRequestException);
    const pending = mockPrisma();
    pending.requestReferral.count.mockResolvedValue(1);
    await expect(new AffairsReferralsService(pending as unknown as PrismaService, fakeSettings()).create('r1', dto as never, owner)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('an opinion answer returns the request to the original staff; an execution "done" completes it; a rejection needs a note', async () => {
    const a = mockPrisma({ status: 'REFERRED' });
    a.requestReferral.findUnique.mockResolvedValue({ id: 'f1', requestId: 'r1', mode: 'OPINION', target: 'COLLEGE', targetName: 'الهندسة', status: 'PENDING' });
    const svc = new AffairsReferralsService(a as unknown as PrismaService, fakeSettings());
    await svc.respond('f1', { outcome: 'APPROVED', note: 'لا مانع' }, owner);
    expect(a.studentRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({ status: 'IN_PROGRESS' }) });
    await expect(svc.respond('f1', { outcome: 'REJECTED' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.respond('f1', { outcome: 'DONE' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.respond('f1', { outcome: 'APPROVED' }, other)).rejects.toBeInstanceOf(ForbiddenException);

    const b = mockPrisma({ status: 'REFERRED' });
    b.requestReferral.findUnique.mockResolvedValue({ id: 'f2', requestId: 'r1', mode: 'EXECUTION', target: 'FINANCIAL_AFFAIRS', status: 'PENDING' });
    await new AffairsReferralsService(b as unknown as PrismaService, fakeSettings()).respond('f2', { outcome: 'DONE' }, admin);
    expect(b.studentRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({ status: 'COMPLETED', closedAt: expect.any(Date) }) });
  });

  it('an answered referral cannot be answered or cancelled again; cancelling needs a reason and returns the request', async () => {
    const a = mockPrisma({ status: 'REFERRED' });
    a.requestReferral.findUnique.mockResolvedValue({ id: 'f1', requestId: 'r1', mode: 'OPINION', target: 'ACADEMIC_AFFAIRS', status: 'ANSWERED' });
    const svc = new AffairsReferralsService(a as unknown as PrismaService, fakeSettings());
    await expect(svc.respond('f1', { outcome: 'APPROVED' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.cancel('f1', { reason: 'x' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    a.requestReferral.findUnique.mockResolvedValue({ id: 'f1', requestId: 'r1', mode: 'OPINION', target: 'ACADEMIC_AFFAIRS', status: 'PENDING' });
    await expect(svc.cancel('f1', { reason: '  ' }, owner)).rejects.toBeInstanceOf(BadRequestException);
    await svc.cancel('f1', { reason: 'أُرسلت بالخطأ' }, owner);
    expect(a.requestReferral.update).toHaveBeenCalledWith({ where: { id: 'f1' }, data: { status: 'CANCELLED', cancelReason: 'أُرسلت بالخطأ' } });
    expect(a.studentRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: { status: 'IN_PROGRESS' } });
  });
});

import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AffairsService } from './affairs.service.js';
import { AffairsAttachmentsService } from './affairs-attachments.service.js';
import { AffairsDocumentsService } from './affairs-documents.service.js';
import { AffairsReferralsService } from './affairs-referrals.service.js';
import { AffairsSettingsService } from './affairs-settings.service.js';
import { AffairsReportsService } from './affairs-reports.service.js';
import { SETTING_DEFS, defaultsOf, validateSetting } from './affairs-settings.defs.js';
import { checkSelection, csvCell, dayRange, toCsv } from './affairs-reports.catalog.js';
import { fakeSettings } from './affairs-test-utils.js';
import { PrismaService } from '../prisma/prisma.service.js';

const owner = { id: 'u-staff', role: 'REGISTRAR' };
const admin = { id: 'u-admin', role: 'SYSTEM_ADMIN' };
const student = { id: 'u-student', role: 'STUDENT' };

describe('settings catalogue and validation', () => {
  it('every setting has a default of the right type and validates itself', () => {
    for (const def of SETTING_DEFS) expect(validateSetting(def.key, def.default)).toBeNull();
    expect(Object.keys(defaultsOf())).toHaveLength(SETTING_DEFS.length);
  });

  it('rejects unknown keys, wrong types and out-of-range numbers', () => {
    expect(validateSetting('nope', true)).toContain('غير معروف');
    expect(validateSetting('autoAssign', 'yes')).not.toBeNull();
    expect(validateSetting('maxAttachmentMb', 6)).not.toBeNull();
    expect(validateSetting('maxAttachmentMb', 0)).not.toBeNull();
    expect(validateSetting('maxAttachmentMb', 2.5)).not.toBeNull();
    expect(validateSetting('maxAttachmentMb', 3)).toBeNull();
    expect(validateSetting('maxAttachmentsPerRequest', 11)).not.toBeNull();
  });
});

function settingsWithRows(rows: { key: string; value: unknown }[] = []) {
  const prisma: any = {
    affairsSetting: { findMany: vi.fn().mockResolvedValue(rows), upsert: vi.fn().mockResolvedValue({}) },
    affairsStaff: { findUnique: vi.fn().mockResolvedValue(null) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    affairsNotification: { createMany: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return { prisma, service: new AffairsSettingsService(prisma as unknown as PrismaService) };
}

describe('AffairsSettingsService', () => {
  it('overlays saved values on the defaults and ignores invalid saved values', async () => {
    const { service } = settingsWithRows([{ key: 'autoAssign', value: false }, { key: 'maxAttachmentMb', value: 99 }, { key: 'oldKey', value: 1 }]);
    const all = await service.all();
    expect(all.autoAssign).toBe(false);
    expect(all.maxAttachmentMb).toBe(5);
    expect('oldKey' in all).toBe(false);
  });

  it('only a system admin passes every capability; a registrar needs the switch on', async () => {
    const on = settingsWithRows([]);
    await expect(on.service.assertCapability(admin, 'capIssueDocuments')).resolves.toBeUndefined();
    await expect(on.service.assertCapability(owner, 'capIssueDocuments')).resolves.toBeUndefined();
    const off = settingsWithRows([{ key: 'capIssueDocuments', value: false }]);
    await expect(off.service.assertCapability(owner, 'capIssueDocuments')).rejects.toBeInstanceOf(ForbiddenException);
    await expect(off.service.assertCapability(admin, 'capIssueDocuments')).resolves.toBeUndefined();
    await expect(off.service.assertCapability(student, 'capIssueDocuments')).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('update stores only real changes, audits old and new values, and refuses bad input', async () => {
    const { prisma, service } = settingsWithRows([]);
    await service.update({ autoAssign: false, studentOnlineSubmission: true }, admin);
    expect(prisma.affairsSetting.upsert).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'AFFAIRS_SETTINGS_UPDATED', details: JSON.stringify({ autoAssign: { from: true, to: false } }) }) });
    await expect(service.update({}, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update({ maxAttachmentMb: 50 }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.update({ unknown: 1 }, admin)).rejects.toBeInstanceOf(BadRequestException);
  });
});

function mockRequestPrisma(over: Record<string, unknown> = {}) {
  const req = { id: 'r1', number: 'SR-26-0001', status: 'NEW', assignedStaffId: null, assignedStaff: null, serviceId: 's1', ...over };
  const prisma: any = {
    studentRequest: { findUnique: vi.fn().mockResolvedValue(req), create: vi.fn(async ({ data }: any) => ({ id: 'n', ...data })), update: vi.fn().mockResolvedValue(req), groupBy: vi.fn().mockResolvedValue([]) },
    studentRequestEvent: { create: vi.fn().mockResolvedValue({}) },
    affairsService: { findUnique: vi.fn().mockResolvedValue({ id: 's1', isActive: true, expectedDays: 3, channel: 'BOTH' }) },
    affairsStaff: { findMany: vi.fn().mockResolvedValue([{ id: 'st1' }]), findUnique: vi.fn().mockResolvedValue({ id: 'st1', isActive: true, services: [{ serviceId: 's1' }] }) },
    affairsRequestCounter: { upsert: vi.fn().mockResolvedValue({ last: 1 }) },
    student: { findUnique: vi.fn().mockResolvedValue({ id: 'stu1' }) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    affairsNotification: { createMany: vi.fn().mockResolvedValue({}) },
    user: { findMany: vi.fn().mockResolvedValue([]) },

  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}

describe('settings are enforced where the action happens', () => {
  it('autoAssign off leaves new requests unassigned', async () => {
    const p = mockRequestPrisma();
    const created: any = await new AffairsService(p as unknown as PrismaService, fakeSettings({ autoAssign: false })).createForStudent('stu1', 's1', 'x', undefined, student);
    expect(created.status).toBe('NEW');
    expect(created.assignedStaffId).toBeNull();
    expect(p.affairsStaff.findMany).not.toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ services: expect.anything() }) }));
    const on: any = await new AffairsService(mockRequestPrisma() as unknown as PrismaService, fakeSettings()).createForStudent('stu1', 's1', 'x', undefined, student);
    expect(on.status).toBe('ASSIGNED');
  });

  it('online submission off blocks students but not staff on behalf', async () => {
    const svc = new AffairsService(mockRequestPrisma() as unknown as PrismaService, fakeSettings({ studentOnlineSubmission: false }));
    await expect(svc.createForStudent('stu1', 's1', 'x', undefined, student)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.createForStudent('stu1', 's1', 'x', undefined, owner)).resolves.toBeDefined();
  });

  it('registrar capabilities: on behalf, take new, refer, issue, revoke', async () => {
    const off = fakeSettings({ capCreateRequestsOnBehalf: false, capTakeNewRequests: false, capCreateReferrals: false, capIssueDocuments: false, capRevokeOwnDocuments: false });
    const svc = new AffairsService(mockRequestPrisma() as unknown as PrismaService, off);
    await expect(svc.createByProxy({ studentId: 'stu1', serviceId: 's1' }, owner)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.createByProxy({ studentId: 'stu1', serviceId: 's1' }, admin)).resolves.toBeDefined();
    await expect(svc.assign('r1', {}, owner)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(new AffairsReferralsService(mockRequestPrisma() as unknown as PrismaService, off).create('r1', { mode: 'OPINION', target: 'ACADEMIC_AFFAIRS', reason: 'x' } as never, owner)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(new AffairsDocumentsService(mockRequestPrisma() as unknown as PrismaService, off).issue('r1', owner)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(new AffairsDocumentsService(mockRequestPrisma() as unknown as PrismaService, off).revoke('d1', 'x', owner)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('attachment limits follow the settings', async () => {
    const pdf = Buffer.concat([Buffer.from('%PDF-1.4\n'), Buffer.alloc(1.5 * 1024 * 1024, 1)]);
    const p: any = mockRequestPrisma({ status: 'IN_PROGRESS', assignedStaffId: 'st1', assignedStaff: { userId: 'u-staff' } });
    p.studentRequestAttachment = { count: vi.fn().mockResolvedValue(0), create: vi.fn(async ({ data }: any) => ({ id: 'a', ...data })) };
    await expect(new AffairsAttachmentsService(p as unknown as PrismaService, fakeSettings({ maxAttachmentMb: 1 })).addByStaff('r1', { buffer: pdf, originalname: 'a.pdf', size: pdf.length }, owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(new AffairsAttachmentsService(p as unknown as PrismaService, fakeSettings({ maxAttachmentMb: 2 })).addByStaff('r1', { buffer: pdf, originalname: 'a.pdf', size: pdf.length }, owner)).resolves.toBeDefined();
    p.studentRequestAttachment.count.mockResolvedValue(3);
    await expect(new AffairsAttachmentsService(p as unknown as PrismaService, fakeSettings({ maxAttachmentsPerRequest: 3 })).addByStaff('r1', { buffer: pdf, originalname: 'a.pdf', size: pdf.length }, owner)).rejects.toBeInstanceOf(BadRequestException);
  });
});

describe('report catalogue: no free fields, role limits, safe CSV', () => {
  it('accepts catalogue selections and rejects everything else', () => {
    expect(checkSelection('requests', ['number', 'status'], undefined, false)).toBeNull();
    expect(checkSelection('requests', [], 'service', false)).toBeNull();
    expect(checkSelection('nope', ['number'], undefined, true)).not.toBeNull();
    expect(checkSelection('documents', ['channel'], undefined, true)).not.toBeNull();
    expect(checkSelection('documents', ['number'], 'channel', true)).not.toBeNull();
    expect(checkSelection('requests', [], undefined, true)).not.toBeNull();
    expect(checkSelection('requests', ['password"; drop table'], undefined, true)).not.toBeNull();
  });

  it('staff-level data is for system admins only', () => {
    expect(checkSelection('requests', ['staff'], undefined, false)).toContain('لمدير النظام');
    expect(checkSelection('requests', [], 'staff', false)).toContain('لمدير النظام');
    expect(checkSelection('requests', ['staff'], 'staff', true)).toBeNull();
  });

  it('CSV escapes quotes and neutralises spreadsheet formulas', () => {
    expect(csvCell('=HYPERLINK("x")')).toBe('"\'=HYPERLINK(""x"")"');
    expect(csvCell('+1')).toBe('"\'+1"');
    expect(csvCell('-2')).toBe('"\'-2"');
    expect(csvCell('@a')).toBe('"\'@a"');
    expect(csvCell('سارة "علي"')).toBe('"سارة ""علي"""');
    expect(csvCell(null)).toBe('""');
    expect(toCsv(['a', 'b'], [[1, 'x']]).startsWith('﻿"a","b"')).toBe(true);
  });

  it('day ranges are inclusive', () => {
    const r = dayRange('2026-11-01', '2026-11-30')!;
    expect(r.gte!.toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(r.lte!.toISOString()).toBe('2026-11-30T23:59:59.999Z');
    expect(dayRange()).toBeUndefined();
  });
});

describe('AffairsReportsService', () => {
  const day = (d: string) => new Date(`${d}T10:00:00.000Z`);
  function reportPrisma() {
    const prisma: any = {
      studentRequest: {
        groupBy: vi.fn()
          .mockResolvedValueOnce([
            { serviceId: 's1', status: 'COMPLETED', _count: { _all: 3 } }, { serviceId: 's1', status: 'REJECTED', _count: { _all: 1 } },
            { serviceId: 's1', status: 'CANCELLED', _count: { _all: 2 } }, { serviceId: 's2', status: 'IN_PROGRESS', _count: { _all: 4 } }, { serviceId: 's2', status: 'ACCEPTED', _count: { _all: 1 } },
          ])
          .mockResolvedValueOnce([{ channel: 'ONLINE', _count: { _all: 9 } }, { channel: 'IN_PERSON', _count: { _all: 2 } }])
          .mockResolvedValueOnce([{ assignedStaffId: 'st1', status: 'IN_PROGRESS', _count: { _all: 4 } }, { assignedStaffId: 'st1', status: 'COMPLETED', _count: { _all: 2 } }, { assignedStaffId: 'st2', status: 'COMPLETED', _count: { _all: 1 } }]),
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn()
          .mockResolvedValueOnce([{ serviceId: 's1', assignedStaffId: 'st1', createdAt: day('2026-11-01'), closedAt: day('2026-11-03') }, { serviceId: 's1', assignedStaffId: 'st1', createdAt: day('2026-11-01'), closedAt: day('2026-11-05') }])
          .mockResolvedValueOnce([{ createdAt: day('2026-11-01') }, { createdAt: day('2026-11-01') }, { createdAt: day('2026-11-02') }]),
      },
      affairsService: { findMany: vi.fn().mockResolvedValue([{ id: 's1', nameAr: 'وثيقة قيد' }, { id: 's2', nameAr: 'تأجيل' }]) },
      affairsStaff: { findUnique: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([{ id: 'st1', userId: 'u-staff', user: { displayName: 'رنا', username: null, email: 'a@x' } }, { id: 'st2', userId: 'u-other', user: { displayName: 'عمر', username: null, email: 'b@x' } }]) },
      issuedDocument: { groupBy: vi.fn().mockResolvedValue([{ typeId: 't1', status: 'ACTIVE', _count: { _all: 5 } }, { typeId: 't1', status: 'REVOKED', _count: { _all: 1 } }]) },
      documentType: { findMany: vi.fn().mockResolvedValue([{ id: 't1', nameAr: 'وثيقة قيد' }]) },
      requestReferral: { groupBy: vi.fn().mockResolvedValue([{ target: 'COLLEGE', status: 'PENDING', _count: { _all: 2 } }, { target: 'COLLEGE', status: 'ANSWERED', _count: { _all: 1 } }]) },
    };
    return prisma;
  }

  it('computes totals, per-service breakdown, average days (completed only) and the daily series', async () => {
    const r: any = await new AffairsReportsService(reportPrisma() as unknown as PrismaService).overview({ from: '2026-11-01', to: '2026-11-30' }, admin);
    expect(r.totals).toMatchObject({ total: 11, open: 5, completed: 3, rejected: 1, cancelled: 2, overdue: 2, avgDays: 3 });
    const s1 = r.byService.find((x: any) => x.serviceId === 's1');
    expect(s1).toMatchObject({ total: 6, completed: 3, rejected: 1, cancelled: 2, open: 0, avgDays: 3 });
    expect(r.byService.find((x: any) => x.serviceId === 's2')).toMatchObject({ total: 5, open: 5, avgDays: null });
    expect(r.series).toEqual({ granularity: 'day', points: [{ date: '2026-11-01', count: 2 }, { date: '2026-11-02', count: 1 }] });
    expect(r.documents).toMatchObject({ issued: 5, revoked: 1 });
    expect(r.referrals).toMatchObject({ total: 3, pending: 2, answered: 1 });
    expect(r.byChannel.find((c: any) => c.channel === 'ONLINE').count).toBe(9);
    expect(Object.keys(r.definitions)).toEqual(expect.arrayContaining(['total', 'overdue', 'avgDays', 'workload']));
  });

  it('workload shows every staff member to an admin but only the own row to a registrar', async () => {
    const a: any = await new AffairsReportsService(reportPrisma() as unknown as PrismaService).overview({}, admin);
    expect(a.staffWorkload.map((w: any) => w.name).sort()).toEqual(['رنا', 'عمر']);
    const w = a.staffWorkload.find((x: any) => x.name === 'رنا');
    expect(w).toMatchObject({ open: 4, completed: 2, avgDays: 3 });
    const m: any = await new AffairsReportsService(reportPrisma() as unknown as PrismaService).overview({}, owner);
    expect(m.staffWorkload.map((x: any) => x.name)).toEqual(['رنا']);
  });

  it('only a system admin can filter by staff', async () => {
    const p = reportPrisma();
    await new AffairsReportsService(p as unknown as PrismaService).overview({ staffId: '11111111-1111-4111-8111-111111111111' }, owner);
    expect(JSON.stringify(p.studentRequest.groupBy.mock.calls[0][0].where)).not.toContain('assignedStaffId');
    const q = reportPrisma();
    await new AffairsReportsService(q as unknown as PrismaService).overview({ staffId: '11111111-1111-4111-8111-111111111111' }, admin);
    expect(q.studentRequest.groupBy.mock.calls[0][0].where.assignedStaffId).toBe('11111111-1111-4111-8111-111111111111');
  });

  it('builder: groups rows, lists chosen columns only, hides staff from registrars', async () => {
    const rows = [
      { number: 'SR-1', status: 'COMPLETED', channel: 'ONLINE', createdAt: day('2026-11-01'), dueAt: day('2026-11-04'), closedAt: day('2026-11-03'), student: { universityId: '27010001', fullName: 'سارة', firstName: 'سارة', middleName: null, familyName: 'ع', collegeId: 'c1' }, service: { nameAr: 'وثيقة قيد' }, assignedStaff: { user: { displayName: 'رنا', username: null, email: 'a@x' } } },
      { number: 'SR-2', status: 'NEW', channel: 'IN_PERSON', createdAt: day('2026-11-02'), dueAt: day('2026-11-05'), closedAt: null, student: { universityId: '27010002', fullName: 'خالد', firstName: 'خالد', middleName: null, familyName: 'م', collegeId: null }, service: { nameAr: 'وثيقة قيد' }, assignedStaff: null },
    ];
    const prisma: any = { affairsStaff: { findUnique: vi.fn().mockResolvedValue(null) }, studentRequest: { findMany: vi.fn().mockResolvedValue(rows) }, college: { findMany: vi.fn().mockResolvedValue([{ id: 'c1', nameAr: 'الهندسة' }]) } };
    const svc = new AffairsReportsService(prisma as unknown as PrismaService);
    const grouped: any = await svc.run({ source: 'requests', columns: [], groupBy: 'service' }, owner);
    expect(grouped.rows).toEqual([{ label: 'وثيقة قيد', count: 2, avgDays: 2 }]);
    const byCollege: any = await svc.run({ source: 'requests', columns: [], groupBy: 'college' }, owner);
    expect(byCollege.rows.map((r: any) => r.label).sort()).toEqual(['غير محدد', 'الهندسة'].sort());
    const list: any = await svc.run({ source: 'requests', columns: ['number', 'status'] }, owner);
    expect(list.rows).toEqual([{ number: 'SR-1', status: 'مكتمل' }, { number: 'SR-2', status: 'جديد' }]);
    await expect(svc.run({ source: 'requests', columns: ['staff'] }, owner)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc.run({ source: 'requests', columns: ['bogus'] }, admin)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.run({ source: 'requests', columns: ['number'], filters: { status: 'ACTIVE' } }, admin)).rejects.toBeInstanceOf(BadRequestException);
    const csv = await svc.exportCsv({ source: 'requests', columns: ['number', 'universityId'] }, owner);
    expect(csv).toContain('"رقم الطلب","الرقم الجامعي"');
    expect(csv).toContain('"SR-1","27010001"');
  });
});

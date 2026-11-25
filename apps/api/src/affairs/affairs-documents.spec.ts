import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { AffairsDocumentsService } from './affairs-documents.service.js';
import { CODE_PATTERN, documentNumber, generateVerificationCode, maskName, renderTemplate } from './affairs-documents.rules.js';
import { PrismaService } from '../prisma/prisma.service.js';

const owner = { id: 'u-staff', role: 'REGISTRAR' };
const other = { id: 'u-other', role: 'REGISTRAR' };
const admin = { id: 'u-admin', role: 'SYSTEM_ADMIN' };
const student = { id: 'u-student', role: 'STUDENT' };

describe('document rules', () => {
  it('fills placeholders and drops lines whose values are all empty', () => {
    const text = renderTemplate('الطالب {{studentName}} ({{universityId}})\nالقسم: {{department}}\nالبرنامج: {{program}}', { studentName: 'سارة علي', universityId: '27010001', department: null, program: 'هندسة' });
    expect(text).toBe('الطالب سارة علي (27010001)\nالبرنامج: هندسة');
  });

  it('numbers per year with padding', () => {
    expect(documentNumber(2027, 7)).toBe('DOC-27-0007');
  });

  it('verification codes are 16 unambiguous letters/digits and differ', () => {
    const codes = new Set(Array.from({ length: 200 }, () => generateVerificationCode()));
    expect(codes.size).toBe(200);
    for (const c of codes) expect(c).toMatch(CODE_PATTERN);
    expect(CODE_PATTERN.test('abc')).toBe(false);
    expect(CODE_PATTERN.test('../../etc/passwd')).toBe(false);
  });

  it('masks the name to first name plus initials', () => {
    expect(maskName('سارة محمد العلي')).toBe('سارة م. ا.');
    expect(maskName('  خالد ')).toBe('خالد');
  });
});

function mockPrisma(over: { request?: Record<string, unknown>; type?: Record<string, unknown> | null; activeDocs?: number; docs?: Record<string, unknown> } = {}) {
  const type = over.type === undefined ? { id: 't1', code: 'ENROLLMENT', nameAr: 'وثيقة قيد', titleAr: 'وثيقة قيد', issuingBody: 'دائرة شؤون الطلاب', bodyTemplate: 'الطالب {{studentName}}', footerNote: null, includesResults: false, isActive: true } : over.type;
  const req = {
    id: 'r1', number: 'SR-26-0001', status: 'ACCEPTED', assignedStaffId: 'st1', assignedStaff: { userId: 'u-staff' },
    student: { id: 'stu1', userId: 'u-student', universityId: '27010001', firstName: 'سارة', middleName: null, familyName: 'علي', fullName: 'سارة علي', status: 'ACTIVE', collegeId: null, departmentId: null, programId: null },
    service: { outcome: 'DOCUMENT', documentType: type }, ...over.request,
  };
  const prisma: any = {
    studentRequest: { findUnique: vi.fn().mockResolvedValue(req), update: vi.fn().mockResolvedValue({}) },
    studentRequestEvent: { create: vi.fn().mockResolvedValue({}) },
    issuedDocument: {
      count: vi.fn().mockResolvedValue(over.activeDocs ?? 0),
      create: vi.fn(async ({ data }: any) => ({ id: 'd1', ...data })),
      findUnique: vi.fn().mockResolvedValue(over.docs ?? null), update: vi.fn().mockResolvedValue({}),
    },
    documentCounter: { upsert: vi.fn().mockResolvedValue({ last: 3 }) },
    courseResult: { findMany: vi.fn().mockResolvedValue([]) },
    college: { findUnique: vi.fn() }, department: { findUnique: vi.fn() }, program: { findUnique: vi.fn() },
    user: { findUnique: vi.fn().mockResolvedValue({ displayName: 'موظفة' }) },
    student: { findUnique: vi.fn() },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}

describe('issuing a document', () => {
  it('issues a snapshot with number + code, logs event and audit, and completes a document-only request', async () => {
    const p = mockPrisma();
    const doc: any = await new AffairsDocumentsService(p as unknown as PrismaService).issue('r1', owner);
    expect(doc.number).toMatch(/^DOC-\d{2}-0003$/);
    expect(doc.verificationCode).toMatch(CODE_PATTERN);
    const data = p.issuedDocument.create.mock.calls[0][0].data;
    expect(data.payload.body).toBe('الطالب سارة علي');
    expect(data.payload.student.universityId).toBe('27010001');
    expect(p.studentRequestEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ type: 'DOCUMENT_ISSUED', visibleToStudent: true }) });
    expect(p.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'AFFAIRS_DOCUMENT_ISSUED' }) });
    expect(p.studentRequest.update).toHaveBeenCalledWith({ where: { id: 'r1' }, data: expect.objectContaining({ status: 'COMPLETED' }) });
  });

  it('does not auto-complete when the service also needs an action', async () => {
    const p = mockPrisma({ request: { service: { outcome: 'BOTH', documentType: { id: 't1', code: 'X', nameAr: 'x', titleAr: 'x', issuingBody: 'x', bodyTemplate: 'x', includesResults: false, isActive: true } } } });
    await new AffairsDocumentsService(p as unknown as PrismaService).issue('r1', owner);
    expect(p.studentRequest.update).not.toHaveBeenCalled();
  });

  it('only the assigned staff or an admin; only for accepted/completed requests; needs an active type; no second active document', async () => {
    const svc = (p: unknown) => new AffairsDocumentsService(p as unknown as PrismaService);
    await expect(svc(mockPrisma()).issue('r1', other)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(svc(mockPrisma()).issue('r1', admin)).resolves.toBeDefined();
    await expect(svc(mockPrisma({ request: { status: 'IN_PROGRESS' } })).issue('r1', owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc(mockPrisma({ type: null })).issue('r1', owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc(mockPrisma({ type: { id: 't', isActive: false } })).issue('r1', owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc(mockPrisma({ activeDocs: 1 })).issue('r1', owner)).rejects.toBeInstanceOf(ConflictException);
  });
});

describe('revoking, reading and public check', () => {
  const doc = { id: 'd1', number: 'DOC-26-0001', status: 'ACTIVE', requestId: 'r1', issuedByUserId: 'u-staff', verificationCode: 'ABCDEFGHIJKLMNOP', issuedAt: new Date(), revokedReason: 'سر', student: { id: 'stu1', userId: 'u-student', universityId: '27010001' }, type: { nameAr: 'وثيقة قيد' }, payload: {} };

  it('revoking needs a reason, the issuer or an admin, keeps the row, and hides the reason from the student event', async () => {
    const p = mockPrisma({ docs: doc });
    const svc = new AffairsDocumentsService(p as unknown as PrismaService);
    await expect(svc.revoke('d1', '  ', owner)).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.revoke('d1', 'خطأ', other)).rejects.toBeInstanceOf(ForbiddenException);
    await svc.revoke('d1', 'بيانات خاطئة', owner);
    expect(p.issuedDocument.update).toHaveBeenCalledWith({ where: { id: 'd1' }, data: expect.objectContaining({ status: 'REVOKED', revokedReason: 'بيانات خاطئة' }) });
    const events = p.studentRequestEvent.create.mock.calls.map((c: any) => c[0].data);
    expect(events.find((e: any) => e.visibleToStudent)).toMatchObject({ note: expect.not.stringContaining('بيانات خاطئة') });
    expect(events.find((e: any) => !e.visibleToStudent).note).toContain('بيانات خاطئة');
    const again = mockPrisma({ docs: { ...doc, status: 'REVOKED' } });
    await expect(new AffairsDocumentsService(again as unknown as PrismaService).revoke('d1', 'x', admin)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('a student can read only their own document and never sees the revoke reason', async () => {
    const p = mockPrisma({ docs: { ...doc, status: 'REVOKED' } });
    const svc = new AffairsDocumentsService(p as unknown as PrismaService);
    expect((await svc.get('d1', student)).revokedReason).toBeNull();
    expect((await svc.get('d1', admin)).revokedReason).toBe('سر');
    await expect(svc.get('d1', { id: 'u-someone', role: 'STUDENT' })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('public check returns minimal data, and never touches the database for malformed codes', async () => {
    const p = mockPrisma({ docs: { ...doc, type: { nameAr: 'وثيقة قيد', issuingBody: 'دائرة شؤون الطلاب' }, student: { fullName: 'سارة محمد العلي', firstName: 'سارة', middleName: null, familyName: 'العلي' } } });
    const svc = new AffairsDocumentsService(p as unknown as PrismaService);
    expect(await svc.verify('../etc')).toEqual({ status: 'NOT_FOUND' });
    expect(p.issuedDocument.findUnique).not.toHaveBeenCalled();
    const ok: any = await svc.verify('ABCDEFGHIJKLMNOP');
    expect(ok.status).toBe('VALID');
    expect(ok.studentName).toBe('سارة م. ا.');
    expect(JSON.stringify(ok)).not.toContain('27010001');
    p.issuedDocument.findUnique.mockResolvedValue(null);
    expect(await svc.verify('ZZZZZZZZZZZZZZZZ')).toEqual({ status: 'NOT_FOUND' });
  });
});

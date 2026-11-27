import { describe, expect, it, vi } from 'vitest';
import { StudentsService } from './students.service.js';
import { admissionYearOf } from './student-admission.js';
import { pickPlanForAdmission } from '../study-plans/plan-selection.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('admission year and plan selection', () => {
  it('reads the admission year from the admission date, else from the university number', () => {
    expect(admissionYearOf({ universityId: '2701001' })).toBe(2027);
    expect(admissionYearOf({ universityId: '2601002', admissionDate: new Date('2025-09-01') })).toBe(2025);
    expect(admissionYearOf({ universityId: 'TEST-1' })).toBeNull();
  });

  it('prefers the latest approved version for the cohort, then the general plan; never a draft or an old version', () => {
    const plans = [
      { id: 'a', status: 'APPROVED', cohortYear: 2027, versionNumber: 1 }, { id: 'b', status: 'APPROVED', cohortYear: 2027, versionNumber: 2 },
      { id: 'g', status: 'APPROVED', cohortYear: null, versionNumber: 1 }, { id: 'd', status: 'DRAFT', cohortYear: 2028, versionNumber: 1 }, { id: 'o', status: 'SUPERSEDED', cohortYear: 2029, versionNumber: 1 },
    ];
    expect(pickPlanForAdmission(plans, 2027)?.id).toBe('b');
    expect(pickPlanForAdmission(plans, 2028)?.id).toBe('g');
    expect(pickPlanForAdmission(plans, 2029)?.id).toBe('g');
    expect(pickPlanForAdmission(plans.filter((plan) => plan.id !== 'g'), 2026)).toBeNull();
    expect(pickPlanForAdmission(plans, null)?.id).toBe('g');
  });
});

function setup() {
  const student = (id: string, universityId: string, over: Record<string, unknown> = {}) => ({
    id, universityId, firstName: `ط${id}`, middleName: null, familyName: '', admissionDate: null, collegeId: 'col1', departmentId: 'dep1', programId: 'P1', studyPlanId: null, status: 'PENDING_REGISTRATION', ...over,
  });
  const level = { id: 'L1', nameAr: 'المستوى الأول', semesters: [{ id: 'S1', nameAr: 'الفصل الأول' }] };
  const plan = (id: string, programId: string, cohortYear: number | null, versionNumber = 1, academicYears: unknown[] = [level]) => ({ id, programId, nameAr: `خطة ${id}`, status: 'APPROVED', versionNumber, cohortYear, academicYears });
  const updateMany = vi.fn().mockResolvedValue({ count: 1 });
  const change = vi.fn().mockResolvedValue({});
  const audit = vi.fn().mockResolvedValue({});
  const prisma: any = {
    student: { findMany: vi.fn().mockResolvedValue([
      student('s1', '2701001'), student('s2', '2601002'), student('s3', '2701003', { studyPlanId: 'x' }), student('s4', '2701004', { programId: null }),
      student('s5', '2701005', { programId: 'P2' }), student('s6', '2701006', { programId: 'P3' }), student('s7', '2701007', { programId: 'P4' }),
    ]) },
    program: {
      findMany: vi.fn().mockResolvedValue(['P1', 'P2', 'P3', 'P4'].map((id) => ({ id, nameAr: id, departmentId: 'dep1', collegeId: null, department: { collegeId: 'col1' } }))),
      findUnique: vi.fn(async ({ where }: any) => ({ nameAr: where.id, isActive: where.id !== 'P3', college: null, department: { nameAr: 'قسم', isActive: true, college: { nameAr: 'كلية', isActive: true } } })),
    },
    studyPlan: { findMany: vi.fn().mockResolvedValue([plan('p27', 'P1', 2027, 2), plan('p26old', 'P1', 2027, 1), plan('pgen', 'P1', null), plan('p4', 'P4', null, 1, [])]) },
    $transaction: vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work({ student: { updateMany }, studentDataChange: { create: change }, auditLog: { create: audit } })),
  };
  return { service: new StudentsService(prisma as PrismaService), prisma, updateMany, change, audit };
}

describe('automatic registration approval by cohort', () => {
  it('previews who gets which plan version and why the others are skipped, writing nothing', async () => {
    const { service, updateMany } = setup();
    const result = await service.approveRegistrationAuto({ studentIds: ['s1', 's2', 's3', 's4', 's5', 's6', 's7', 'missing'], dryRun: true }, 'u1');
    expect(result).toMatchObject({ dryRun: true, approved: 0, matched: 2 });
    const byId = Object.fromEntries(result.rows.map((row) => [row.studentId, row]));
    expect(byId.s1.plan).toMatchObject({ id: 'p27', versionNumber: 2, cohortYear: 2027 });
    expect(byId.s1).toMatchObject({ level: 'المستوى الأول', semester: 'الفصل الأول', admissionYear: 2027 });
    expect(byId.s2.plan?.id).toBe('pgen');
    expect(byId.s3.reason).toContain('مرتبط بخطة');
    expect(byId.s4.reason).toContain('البرنامج غير محدد');
    expect(byId.s5.reason).toContain('لا توجد خطة معتمدة');
    expect(byId.s6.reason).toContain('معطّل');
    expect(byId.s7.reason).toContain('بلا مستويات');
    expect(byId.missing.reason).toContain('غير موجود');
    expect(updateMany).not.toHaveBeenCalled();
  });

  it('links each matched student to the plan, first level and first semester, turns pending into continuing, and logs it', async () => {
    const { service, updateMany, change, audit } = setup();
    const result = await service.approveRegistrationAuto({ studentIds: ['s1', 's2', 's3'] }, 'u1');
    expect(result).toMatchObject({ dryRun: false, approved: 2, matched: 2 });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 's1', studyPlanId: null }, data: expect.objectContaining({ studyPlanId: 'p27', academicYearId: 'L1', semesterId: 'S1', programId: 'P1', status: 'CONTINUING' }) });
    expect(updateMany).toHaveBeenCalledWith({ where: { id: 's2', studyPlanId: null }, data: expect.objectContaining({ studyPlanId: 'pgen' }) });
    expect(change).toHaveBeenCalledTimes(2);
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDENTS_REGISTRATION_APPROVED_AUTO', userId: 'u1' }) });
  });
});

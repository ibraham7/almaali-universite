import { describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { StudyPlansService } from './study-plans.service.js';
import { assertPlanEditable } from './plan-status.js';
import { PrismaService } from '../prisma/prisma.service.js';

const admin = { id: 'u1', role: 'SYSTEM_ADMIN' };

function plan(over: Record<string, unknown> = {}) {
  return { id: 'p1', programId: 'prog1', nameAr: 'خطة 2026', nameEn: null, graduationCredits: 132, status: 'DRAFT', planKey: 'k1', versionNumber: 1, cohortYear: 2026, effectiveFrom: null, previousVersionId: null, ...over };
}

function db(found: Record<string, unknown> | null, extra: Record<string, any> = {}) {
  const prisma: any = {
    studyPlan: {
      findUnique: vi.fn().mockResolvedValue(found), findUniqueOrThrow: vi.fn().mockResolvedValue(found), findFirst: vi.fn().mockResolvedValue(null), findMany: vi.fn().mockResolvedValue([]),
      create: vi.fn(async ({ data }: any) => ({ id: 'new-plan', ...data })), update: vi.fn(), updateMany: vi.fn().mockResolvedValue({ count: 1 }),
    },
    academicYear: { create: vi.fn(async ({ data }: any) => ({ id: `new-${data.levelNumber}`, ...data })) },
    semester: { create: vi.fn(async ({ data }: any) => ({ id: `new-s${data.semesterNumber}`, ...data })) },
    studyPlanCourse: { create: vi.fn(async ({ data }: any) => ({ id: data.courseId === 'c1' ? 'new-pc1' : 'new-pc', ...data })) },
    studyPlanCoursePrerequisite: { create: vi.fn().mockResolvedValue({}) },
    studyPlanCurriculumCourse: { create: vi.fn().mockResolvedValue({}) },
    studyPlanCurriculumQuota: { create: vi.fn().mockResolvedValue({}) },
    auditLog: { create: vi.fn().mockResolvedValue({}) },
    ...extra,
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}

describe('study plan versions', () => {
  it('only a draft can be edited; an approved or old plan is locked with a clear message', async () => {
    await expect(assertPlanEditable(db(plan()), 'p1')).resolves.toBeDefined();
    await expect(assertPlanEditable(db(plan({ status: 'APPROVED' })), 'p1')).rejects.toThrow('أنشئ إصدارًا جديدًا');
    await expect(assertPlanEditable(db(plan({ status: 'SUPERSEDED', versionNumber: 1 })), 'p1')).rejects.toBeInstanceOf(BadRequestException);
    const prisma = db(plan({ status: 'APPROVED' }));
    await expect(new StudyPlansService(prisma as PrismaService).update('p1', { nameAr: 'x' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.studyPlan.update).not.toHaveBeenCalled();
  });

  it('a new plan starts as a draft with its cohort and start date', async () => {
    const prisma = db(null, { program: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'بكالوريوس', isActive: true, college: null, department: null }) } });
    const created: any = await new StudyPlansService(prisma as PrismaService).create({ programId: 'prog1', nameAr: ' خطة 2026 ', cohortYear: 2026, effectiveFrom: '2026-09-01' }, admin);
    expect(created).toMatchObject({ status: 'DRAFT', nameAr: 'خطة 2026', cohortYear: 2026 });
    expect(created.effectiveFrom).toEqual(new Date('2026-09-01'));
    await expect(new StudyPlansService(prisma as PrismaService).create({ programId: 'prog1', nameAr: 'x', cohortYear: 1999 }, admin)).rejects.toThrow('الدفعة');
  });

  it('approving needs levels with semesters and courses, and supersedes the older version without touching it otherwise', async () => {
    const empty = db(plan({ academicYears: [], _count: { planCourses: 0 } }));
    await expect(new StudyPlansService(empty as PrismaService).approve('p1', admin)).rejects.toThrow('مستوى واحدًا');
    const noSemester = db(plan({ academicYears: [{ id: 'l1', nameAr: 'المستوى الأول', _count: { semesters: 0 } }], _count: { planCourses: 3 } }));
    await expect(new StudyPlansService(noSemester as PrismaService).approve('p1', admin)).rejects.toThrow('بلا فصول');

    const ok = db(plan({ versionNumber: 2, academicYears: [{ id: 'l1', nameAr: 'المستوى الأول', _count: { semesters: 2 } }], _count: { planCourses: 5 } }));
    await new StudyPlansService(ok as PrismaService).approve('p1', admin);
    expect(ok.studyPlan.updateMany).toHaveBeenCalledWith({ where: { id: 'p1', status: 'DRAFT' }, data: expect.objectContaining({ status: 'APPROVED', approvedById: 'u1' }) });
    expect(ok.studyPlan.updateMany).toHaveBeenCalledWith({ where: { planKey: 'k1', status: 'APPROVED', id: { not: 'p1' } }, data: { status: 'SUPERSEDED' } });
    expect(ok.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'STUDY_PLAN_APPROVED' }) });
  });

  it('two different approved plans cannot target the same program and cohort', async () => {
    const prisma = db(plan({ academicYears: [{ id: 'l1', nameAr: 'م1', _count: { semesters: 1 } }], _count: { planCourses: 1 } }));
    prisma.studyPlan.findFirst.mockResolvedValue({ nameAr: 'خطة أخرى', versionNumber: 3 });
    await expect(new StudyPlansService(prisma as PrismaService).approve('p1', admin)).rejects.toBeInstanceOf(ConflictException);
    expect(prisma.studyPlan.updateMany).not.toHaveBeenCalled();
  });

  it('a new version copies levels, semesters, active courses and the curriculum as a draft, leaving the original alone', async () => {
    const source = plan({
      status: 'APPROVED', id: 'p1',
      academicYears: [{ id: 'l1', nameAr: 'المستوى الأول', nameEn: null, levelNumber: 1, semesters: [{ id: 's1', nameAr: 'الفصل الأول', nameEn: null, semesterNumber: 1, requireMandatoryCourses: true, isActive: true }] }],
      planCourses: [
        { id: 'pc1', academicYearId: 'l1', semesterId: 's1', courseId: 'c1', priority: 1, requirement: 'MANDATORY', category: 'UNIVERSITY', creditsInPlan: 2, ownPrerequisites: false, prerequisites: [] },
        { id: 'pc2', academicYearId: 'l1', semesterId: 's1', courseId: 'c2', priority: 2, requirement: 'ELECTIVE', category: 'PROGRAM', creditsInPlan: null, ownPrerequisites: true, prerequisites: [{ isActive: true, prerequisiteCourseId: 'c1' }, { isActive: false, prerequisiteCourseId: 'cX' }] },
      ],
      curriculumEntries: [{ courseId: 'c1', category: 'UNIVERSITY', requirement: 'MANDATORY', sourceFile: 'f.xlsx', sourceRow: 4 }],
      curriculumQuotas: [{ category: 'UNIVERSITY', requirement: 'MANDATORY', requiredCredits: 12, offeredPoolCredits: 12 }],
    });
    const prisma = db(source);
    prisma.studyPlan.findFirst.mockImplementation(async ({ where }: any) => (where.status === 'DRAFT' ? null : { versionNumber: 1 }));
    const created: any = await new StudyPlansService(prisma as PrismaService).createVersion('p1', admin);
    expect(created).toMatchObject({ status: 'DRAFT', versionNumber: 2, planKey: 'k1', previousVersionId: 'p1', cohortYear: 2026, effectiveFrom: null });
    expect(prisma.studyPlanCourse.create).toHaveBeenCalledWith({ data: expect.objectContaining({ studyPlanId: 'new-plan', academicYearId: 'new-1', semesterId: 'new-s1', courseId: 'c1', priority: 1, category: 'UNIVERSITY', creditsInPlan: 2, ownPrerequisites: false }) });
    // خصائص المقرر ومتطلباته السابقة الخاصة بالخطة تُنسخ (النشطة فقط) إلى مقرر الخطة الجديد
    expect(prisma.studyPlanCoursePrerequisite.create).toHaveBeenCalledTimes(1);
    expect(prisma.studyPlanCoursePrerequisite.create).toHaveBeenCalledWith({ data: { planCourseId: 'new-pc', prerequisiteCourseId: 'c1' } });
    expect(prisma.studyPlanCurriculumCourse.create).toHaveBeenCalledTimes(1);
    expect(prisma.studyPlanCurriculumQuota.create).toHaveBeenCalledTimes(1);
    expect(prisma.studyPlan.update).not.toHaveBeenCalled();
    expect(prisma.studyPlan.updateMany).not.toHaveBeenCalled();
  });

  it('a new version needs the current approved one, and only one draft at a time', async () => {
    await expect(new StudyPlansService(db(plan()) as PrismaService).createVersion('p1', admin)).rejects.toThrow('مسودة');
    await expect(new StudyPlansService(db(plan({ status: 'SUPERSEDED' })) as PrismaService).createVersion('p1', admin)).rejects.toThrow('المعتمد الحالي');
    const open = db(plan({ status: 'APPROVED', academicYears: [], planCourses: [], curriculumEntries: [], curriculumQuotas: [] }));
    open.studyPlan.findFirst.mockResolvedValue({ versionNumber: 2 });
    await expect(new StudyPlansService(open as PrismaService).createVersion('p1', admin)).rejects.toBeInstanceOf(ConflictException);
  });

  it('picks the plan for a new student by cohort, then the general plan, never a draft', async () => {
    const prisma = db(null);
    const plans = [plan({ id: 'a', cohortYear: 2025, versionNumber: 2 }), plan({ id: 'b', cohortYear: 2026, versionNumber: 3 }), plan({ id: 'g', cohortYear: null })];
    prisma.studyPlan.findMany.mockResolvedValue(plans);
    const service = new StudyPlansService(prisma as PrismaService);
    expect((await service.suggestForAdmission('prog1', 2026))?.id).toBe('b');
    expect((await service.suggestForAdmission('prog1', 2030))?.id).toBe('g');
    expect(prisma.studyPlan.findMany).toHaveBeenCalledWith({ where: { programId: 'prog1', status: 'APPROVED' }, orderBy: expect.anything() });
    prisma.studyPlan.findMany.mockResolvedValue([plan({ id: 'a', cohortYear: 2025 })]);
    expect(await service.suggestForAdmission('prog1', 2026)).toBeNull();
  });
});

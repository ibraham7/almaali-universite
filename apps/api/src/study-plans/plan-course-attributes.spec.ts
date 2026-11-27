import { describe, expect, it, vi } from 'vitest';
import { BadRequestException } from '@nestjs/common';
import { effectiveCredits, effectivePrerequisites } from './plan-course-rules.js';
import { StudyPlanCoursesService } from '../study-plan-courses/study-plan-courses.service.js';
import { RegistrationValidationService } from '../registration-validation/registration-validation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const admin = { id: 'u1', role: 'SYSTEM_ADMIN' };
const c = (id: string) => ({ id, code: id.toUpperCase(), nameAr: `مقرر ${id}` });

describe('course attributes inside a plan', () => {
  it('credits: the plan value when set, else the course value', () => {
    expect(effectiveCredits({ creditsInPlan: 2, course: { credits: 3 } })).toBe(2);
    expect(effectiveCredits({ creditsInPlan: 0, course: { credits: 3 } })).toBe(0);
    expect(effectiveCredits({ creditsInPlan: null, course: { credits: 3 } })).toBe(3);
  });

  it('prerequisites: the plan own list when defined (even empty), else the general course list', () => {
    const global = { prerequisites: [{ prerequisite: c('g1') }] };
    expect(effectivePrerequisites({ ownPrerequisites: false, prerequisites: [], course: global }).map((p) => p.id)).toEqual(['g1']);
    expect(effectivePrerequisites({ ownPrerequisites: true, prerequisites: [{ isActive: true, prerequisite: c('p1') }, { isActive: false, prerequisite: c('p2') }], course: global }).map((p) => p.id)).toEqual(['p1']);
    expect(effectivePrerequisites({ ownPrerequisites: true, prerequisites: [], course: global })).toEqual([]);
    expect(effectivePrerequisites({ course: {} })).toEqual([]);
  });
});

function planDb(status = 'DRAFT') {
  const target = { id: 'pc2', studyPlanId: 'p1', courseId: 'c2', status: 'ACTIVE', academicYear: { levelNumber: 1 }, semester: { semesterNumber: 2 } };
  const prisma: any = {
    studyPlan: { findUnique: vi.fn().mockResolvedValue({ nameAr: 'خطة', status, versionNumber: 1, programId: 'prog' }) },
    studyPlanCourse: {
      findUnique: vi.fn().mockResolvedValue(target),
      findMany: vi.fn().mockResolvedValue([{ courseId: 'c1', course: c('c1'), academicYear: { levelNumber: 1 }, semester: { semesterNumber: 1 } }]),
      update: vi.fn().mockResolvedValue({}),
    },
    studyPlanCoursePrerequisite: { updateMany: vi.fn().mockResolvedValue({}), upsert: vi.fn().mockResolvedValue({}) },
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}

describe('editing a plan course', () => {
  it('sets requirement, category and credits on a draft only', async () => {
    const draft = planDb();
    await new StudyPlanCoursesService(draft as PrismaService).update('pc2', { category: 'COLLEGE', creditsInPlan: 2, requirement: 'ELECTIVE' }, admin);
    expect(draft.studyPlanCourse.update).toHaveBeenCalledWith({ where: { id: 'pc2' }, data: { requirement: 'ELECTIVE', category: 'COLLEGE', creditsInPlan: 2 } });
    const locked = planDb('APPROVED');
    await expect(new StudyPlanCoursesService(locked as PrismaService).update('pc2', { category: 'COLLEGE' }, admin)).rejects.toBeInstanceOf(BadRequestException);
    expect(locked.studyPlanCourse.update).not.toHaveBeenCalled();
  });

  it('plan prerequisites must be plan courses in an earlier semester; the list replaces the old one by switching rows off', async () => {
    const db = planDb();
    await new StudyPlanCoursesService(db as PrismaService).update('pc2', { prerequisiteCourseIds: ['c1'] }, admin);
    expect(db.studyPlanCourse.update).toHaveBeenCalledWith({ where: { id: 'pc2' }, data: { ownPrerequisites: true } });
    expect(db.studyPlanCoursePrerequisite.updateMany).toHaveBeenCalledWith({ where: { planCourseId: 'pc2', prerequisiteCourseId: { notIn: ['c1'] } }, data: { isActive: false } });
    expect(db.studyPlanCoursePrerequisite.upsert).toHaveBeenCalledWith(expect.objectContaining({ update: { isActive: true }, create: { planCourseId: 'pc2', prerequisiteCourseId: 'c1' } }));

    await expect(new StudyPlanCoursesService(planDb() as PrismaService).update('pc2', { prerequisiteCourseIds: ['c2'] }, admin)).rejects.toThrow('لنفسه');
    const notInPlan = planDb();
    notInPlan.studyPlanCourse.findMany.mockResolvedValue([]);
    await expect(new StudyPlanCoursesService(notInPlan as PrismaService).update('pc2', { prerequisiteCourseIds: ['zz'] }, admin)).rejects.toThrow('مضافًا إلى هذه الخطة');
    const same = planDb();
    same.studyPlanCourse.findMany.mockResolvedValue([{ courseId: 'c1', course: c('c1'), academicYear: { levelNumber: 1 }, semester: { semesterNumber: 2 } }]);
    await expect(new StudyPlanCoursesService(same as PrismaService).update('pc2', { prerequisiteCourseIds: ['c1'] }, admin)).rejects.toThrow('أبكر');
    // clearing the list: the plan then has no prerequisites for this course
    const empty = planDb();
    await new StudyPlanCoursesService(empty as PrismaService).update('pc2', { prerequisiteCourseIds: [] }, admin);
    expect(empty.studyPlanCoursePrerequisite.updateMany).toHaveBeenCalledWith({ where: { planCourseId: 'pc2', prerequisiteCourseId: { notIn: [] } }, data: { isActive: false } });
  });
});

function regDb(opts: { own: boolean; planRows?: any[]; globalRows?: any[]; passed?: string[] }) {
  return {
    studentEnrollment: { findUnique: vi.fn().mockResolvedValue({ id: 'e1', studentId: 's1', student: { studyPlanId: 'p1' } }) },
    studyPlanCourse: { findFirst: vi.fn().mockResolvedValue({ ownPrerequisites: opts.own, prerequisites: opts.planRows ?? [] }) },
    coursePrerequisite: { findMany: vi.fn().mockResolvedValue(opts.globalRows ?? []) },
    enrollmentItem: { findMany: vi.fn().mockResolvedValue((opts.passed ?? []).map((courseId) => ({ courseId }))) },
  } as unknown as PrismaService;
}

describe('registration uses the prerequisites of the student plan', () => {
  it('a plan with its own list is checked against that list, not the general one', async () => {
    const planRow = { prerequisiteCourseId: 'c1', prerequisite: c('c1') };
    const globalRow = { courseId: 'c2', prerequisiteId: 'g1', prerequisite: c('g1') };
    const own = regDb({ own: true, planRows: [planRow], globalRows: [globalRow], passed: [] });
    expect(await new RegistrationValidationService(own).validatePrerequisites('e1', 'c2')).toMatchObject({ valid: false, errors: [expect.stringContaining('C1')] });
    expect(own.coursePrerequisite.findMany).not.toHaveBeenCalled();
    expect(await new RegistrationValidationService(regDb({ own: true, planRows: [planRow], passed: ['c1'] })).validatePrerequisites('e1', 'c2')).toMatchObject({ valid: true });
    expect(await new RegistrationValidationService(regDb({ own: true, planRows: [], globalRows: [globalRow] })).validatePrerequisites('e1', 'c2')).toMatchObject({ valid: true });
  });

  it('without its own list the general course prerequisites still apply (existing plans are unchanged)', async () => {
    const globalRow = { courseId: 'c2', prerequisiteId: 'g1', prerequisite: c('g1') };
    const db = regDb({ own: false, globalRows: [globalRow], passed: [] });
    expect(await new RegistrationValidationService(db).validatePrerequisites('e1', 'c2')).toMatchObject({ valid: false, errors: [expect.stringContaining('G1')] });
    expect(db.coursePrerequisite.findMany).toHaveBeenCalled();
  });
});

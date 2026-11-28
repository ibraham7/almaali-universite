import { afterEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { StudyPlansService } from './study-plans.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

const admin = { id: 'u1', role: 'SYSTEM_ADMIN' };

function db(counts = { sections: 0, enrollments: 0, results: 0, periods: 0 }) {
  const prisma: any = {
    studyPlan: { findUnique: vi.fn().mockResolvedValue({ id: 'p1', nameAr: 'خطة', versionNumber: 1, status: 'DRAFT', academicYears: [{ id: 'y1', semesters: [{ id: 's1' }] }] }), updateMany: vi.fn(), delete: vi.fn() },
    courseSection: { count: vi.fn().mockResolvedValue(counts.sections) }, studentEnrollment: { count: vi.fn().mockResolvedValue(counts.enrollments) },
    courseResult: { count: vi.fn().mockResolvedValue(counts.results) }, registrationPeriod: { count: vi.fn().mockResolvedValue(counts.periods) },
    student: { updateMany: vi.fn().mockResolvedValue({ count: 2 }) }, studyPlanCoursePrerequisite: { deleteMany: vi.fn() }, studyPlanCourse: { deleteMany: vi.fn() },
    studyPlanCurriculumCourse: { deleteMany: vi.fn() }, studyPlanCurriculumQuota: { deleteMany: vi.fn() }, semester: { deleteMany: vi.fn() }, academicYear: { deleteMany: vi.fn() },
    auditLog: { create: vi.fn() }, $executeRaw: vi.fn(),
  };
  prisma.$transaction = vi.fn(async (work: (tx: unknown) => Promise<unknown>) => work(prisma));
  return prisma;
}
const make = (prisma: any) => new StudyPlansService(prisma as PrismaService);

describe('test-phase study plan deletion', () => {
  afterEach(() => { delete process.env.ALLOW_TEST_DELETE; });

  it('is closed unless the server flag is on, and only for the system admin', async () => {
    const prisma = db();
    await expect(make(prisma).deleteForTest('p1', 'حذف', admin)).rejects.toBeInstanceOf(ForbiddenException);
    process.env.ALLOW_TEST_DELETE = 'true';
    await expect(make(prisma).deleteForTest('p1', 'حذف', { id: 'u2', role: 'REGISTRAR' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.studyPlan.delete).not.toHaveBeenCalled();
  });

  it('needs the confirmation word and an existing plan', async () => {
    process.env.ALLOW_TEST_DELETE = 'true';
    const prisma = db();
    await expect(make(prisma).deleteForTest('p1', 'نعم', admin)).rejects.toBeInstanceOf(BadRequestException);
    prisma.studyPlan.findUnique.mockResolvedValue(null);
    await expect(make(prisma).deleteForTest('p1', 'حذف', admin)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('refuses when the semesters have sections, enrollments, results or registration periods', async () => {
    process.env.ALLOW_TEST_DELETE = 'true';
    const prisma = db({ sections: 1, enrollments: 2, results: 0, periods: 0 });
    await expect(make(prisma).deleteForTest('p1', 'حذف', admin)).rejects.toThrow('1 شعبة، 2 تسجيل');
    expect(prisma.studyPlan.delete).not.toHaveBeenCalled();
  });

  it('deletes the plan with its content, unlinks students, and writes an audit record', async () => {
    process.env.ALLOW_TEST_DELETE = 'true';
    const prisma = db();
    const result = await make(prisma).deleteForTest('p1', ' حذف ', admin);
    expect(result).toEqual({ deleted: true, unlinkedStudents: 2 });
    expect(prisma.student.updateMany).toHaveBeenCalledWith({ where: { studyPlanId: 'p1' }, data: { studyPlanId: null, academicYearId: null, semesterId: null } });
    expect(prisma.studyPlan.delete).toHaveBeenCalledWith({ where: { id: 'p1' } });
    expect(prisma.auditLog.create).toHaveBeenCalledWith({ data: expect.objectContaining({ action: 'TEST_PHASE_DELETE_STUDY_PLAN' }) });
  });
});

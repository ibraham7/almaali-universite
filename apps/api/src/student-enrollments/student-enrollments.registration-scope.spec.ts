import { ForbiddenException } from '@nestjs/common';
import { StudentEnrollmentsService } from './student-enrollments.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import type { RegistrationValidationService } from '../registration-validation/registration-validation.service.js';
import type { AuditLogsService } from '../audit-logs/audit-logs.service.js';

const student = {
  id: 'student-1', universityId: 'TEST-U-1', firstName: 'سارة', middleName: null, familyName: 'علي',
  collegeId: 'college-1', departmentId: null, programId: 'program-1',
  studyPlanId: null, academicYearId: null, semesterId: null, advisorId: 'someone-else',
};

function service(assignments: { programs?: string[]; colleges?: string[]; collegePrograms?: string[] } = {}) {
  const prisma = {
    student: { findUnique: vi.fn().mockResolvedValue(student) },
    advisorProgramAssignment: { findMany: vi.fn().mockResolvedValue((assignments.programs ?? []).map((programId) => ({ programId }))) },
    advisorCollegeAssignment: { findMany: vi.fn().mockResolvedValue((assignments.colleges ?? []).map((collegeId) => ({ collegeId }))) },
    program: { findMany: vi.fn().mockResolvedValue((assignments.collegePrograms ?? []).map((id) => ({ id }))) },
  } as unknown as PrismaService;
  return new StudentEnrollmentsService(prisma, {} as RegistrationValidationService, {} as AuditLogsService);
}

describe('Direct registration access', () => {
  const incomplete = 'بيانات الخطة أو المستوى الدراسي للطالب غير مكتملة.';

  it('rejects an advisor whose scope does not include the student', async () => {
    await expect(service().getAdvisorRegistrationCatalog('TEST-U-1', 'advisor-1', 'ADVISOR'))
      .rejects.toThrow('هذا الطالب خارج الاختصاصات المسندة إلى حسابك.');
  });

  it('allows an advisor assigned to the whole college of the student program', async () => {
    await expect(service({ colleges: ['college-1'], collegePrograms: ['program-1'] })
      .getAdvisorRegistrationCatalog('TEST-U-1', 'advisor-1', 'ADVISOR')).rejects.toThrow(incomplete);
  });

  it.each(['REGISTRAR', 'SYSTEM_ADMIN'])('lets %s open any student without an advisor scope', async (role) => {
    const promise = service().getAdvisorRegistrationCatalog('TEST-U-1', 'staff-1', role);
    await expect(promise).rejects.toBeInstanceOf(ForbiddenException);
    await expect(promise).rejects.toThrow(incomplete);
  });
});

import { describe, expect, it, vi } from 'vitest';
import { RegistrationValidationService } from './registration-validation.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

function service(studentStatus: string, enrollmentStatus = 'DRAFT') {
  const prisma = { studentEnrollment: { findUnique: vi.fn().mockResolvedValue({ id: 'e1', status: enrollmentStatus, student: { status: studentStatus } }) } };
  return new RegistrationValidationService(prisma as unknown as PrismaService);
}

describe('registration by student status', () => {
  it('a continuing student can edit a draft enrollment', async () => {
    expect(await service('CONTINUING').validateEnrollmentEditable('e1')).toMatchObject({ valid: true });
  });

  it('every other status is refused with the reason, whatever the enrollment state', async () => {
    for (const status of ['PENDING_REGISTRATION', 'DEFERRED', 'WITHDRAWN', 'DISMISSED', 'GRADUATED', 'DEREGISTERED']) {
      const result = await service(status).validateEnrollmentEditable('e1');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('لا يمكن تسجيل المقررات');
    }
  });
});

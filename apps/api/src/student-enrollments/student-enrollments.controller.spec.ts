import { describe, expect, it, vi } from 'vitest';

import { StudentEnrollmentsController } from './student-enrollments.controller.js';
import { StudentEnrollmentsService } from './student-enrollments.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('StudentEnrollmentsController', () => {
  it('reads the current registration without reopening or deleting approvals', async () => {
    const getMyRegistration = vi.fn().mockResolvedValue({ enrollment: { status: 'PENDING' } });
    const studentEnrollmentsService = { getMyRegistration } as unknown as StudentEnrollmentsService;
    const prisma = { student: { findFirst: vi.fn() }, $transaction: vi.fn() } as unknown as PrismaService;
    const controller = new StudentEnrollmentsController(studentEnrollmentsService, prisma);
    const request = { user: { id: 'student-user' } } as Parameters<typeof controller.getMyRegistration>[0];

    await expect(controller.getMyRegistration(request)).resolves.toEqual({
      enrollment: { status: 'PENDING' },
    });
    expect(getMyRegistration).toHaveBeenCalledWith('student-user');
    expect(prisma.student.findFirst).not.toHaveBeenCalled();
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it('keeps a submitted registration unchanged after the add/drop deadline', async () => {
    const prisma = {
      student: { findFirst: vi.fn().mockResolvedValue({ id: 'student', semesterId: 'semester' }) },
      studentEnrollment: { findUnique: vi.fn().mockResolvedValue({ id: 'enrollment', status: 'PENDING' }) },
      registrationPeriod: { findFirst: vi.fn().mockResolvedValue({ addDropDeadline: new Date('2020-01-01') }) },
      $transaction: vi.fn(),
    } as unknown as PrismaService;
    const controller = new StudentEnrollmentsController({} as StudentEnrollmentsService, prisma);
    const request = { user: { id: 'student-user' } } as Parameters<typeof controller.reopenMyEnrollment>[0];

    await expect(controller.reopenMyEnrollment(request)).resolves.toMatchObject({ success: false });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });
});

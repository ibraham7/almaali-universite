import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CourseSectionsService } from './course-sections.service.js';
import type { PrismaService } from '../prisma/prisma.service.js';

function setup(options: { semester?: unknown; placements?: Array<{ courseId: string }>; created?: number } = {}) {
  const createMany = vi.fn().mockResolvedValue({ count: options.created ?? 2 });
  const audit = vi.fn().mockResolvedValue({});
  const prisma = {
    semester: { findUnique: vi.fn().mockResolvedValue('semester' in options ? options.semester : { id: 'semester-1' }) },
    studyPlanCourse: { findMany: vi.fn().mockResolvedValue(options.placements ?? [{ courseId: 'c1' }, { courseId: 'c2' }, { courseId: 'c2' }]) },
    courseSection: { createMany },
    auditLog: { create: audit },
  } as unknown as PrismaService;
  return { service: new CourseSectionsService(prisma), createMany, audit, prisma };
}

describe('Bulk section creation for a semester', () => {
  it('creates one open section 1 per distinct placed course and reports skipped ones', async () => {
    const { service, createMany, audit } = setup({ created: 1 });
    const result = await service.createForSemester('semester-1', 40, 'admin-1');
    expect(result).toEqual({ success: true, total: 2, created: 1, skipped: 1 });
    expect(createMany).toHaveBeenCalledWith({
      data: [
        { courseId: 'c1', semesterId: 'semester-1', sectionNumber: '1', maxCapacity: 40, status: 'OPEN' },
        { courseId: 'c2', semesterId: 'semester-1', sectionNumber: '1', maxCapacity: 40, status: 'OPEN' },
      ],
      skipDuplicates: true,
    });
    expect(audit).toHaveBeenCalledWith({ data: expect.objectContaining({
      action: 'SECTIONS_BULK_CREATED', entityId: 'semester-1', userId: 'admin-1',
    }) });
  });

  it('rejects an invalid capacity before touching the database', async () => {
    const { service, prisma } = setup();
    await expect(service.createForSemester('semester-1', 0)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.semester.findUnique).not.toHaveBeenCalled();
  });

  it('rejects an unknown semester', async () => {
    const { service, createMany } = setup({ semester: null });
    await expect(service.createForSemester('missing', 30)).rejects.toBeInstanceOf(NotFoundException);
    expect(createMany).not.toHaveBeenCalled();
  });

  it('rejects a semester with no courses placed in the plan', async () => {
    const { service, createMany } = setup({ placements: [] });
    await expect(service.createForSemester('semester-1', 30)).rejects.toBeInstanceOf(BadRequestException);
    expect(createMany).not.toHaveBeenCalled();
  });
});

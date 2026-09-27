import { Test, TestingModule } from '@nestjs/testing';
import { CoursesService } from './courses.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('CoursesService', () => {
  let service: CoursesService;
  const tx = { coursePrerequisite: { createMany: vi.fn(), findMany: vi.fn() } };
  const prisma = {
    course: { findUnique: vi.fn(), findMany: vi.fn() },
    coursePrerequisite: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoursesService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<CoursesService>(CoursesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('adds multiple prerequisite courses together in one transaction', async () => {
    prisma.course.findUnique.mockResolvedValue({ id: 'course-1' });
    prisma.course.findMany.mockResolvedValue([{ id: 'pre-1' }, { id: 'pre-2' }]);
    prisma.coursePrerequisite.findMany.mockResolvedValue([]);
    tx.coursePrerequisite.createMany.mockResolvedValue({ count: 2 });
    tx.coursePrerequisite.findMany.mockResolvedValue([{ prerequisiteId: 'pre-1' }, { prerequisiteId: 'pre-2' }]);
    prisma.$transaction.mockImplementation((callback: (transaction: typeof tx) => unknown) => callback(tx));

    const result = await service.addPrerequisitesBulk('course-1', ['pre-1', 'pre-2']);

    expect(result).toMatchObject({ success: true, added: [{ prerequisiteId: 'pre-1' }, { prerequisiteId: 'pre-2' }] });
    expect(tx.coursePrerequisite.createMany).toHaveBeenCalledWith({
      data: [
        { courseId: 'course-1', prerequisiteId: 'pre-1' },
        { courseId: 'course-1', prerequisiteId: 'pre-2' },
      ],
    });
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorApprovalsService } from './advisor-approvals.service.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { StudentEnrollmentsService } from '../student-enrollments/student-enrollments.service.js';

describe('AdvisorApprovalsService', () => {
  let service: AdvisorApprovalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdvisorApprovalsService,
        { provide: PrismaService, useValue: {} },
        { provide: StudentEnrollmentsService, useValue: {} },
      ],
    }).compile();

    service = module.get<AdvisorApprovalsService>(AdvisorApprovalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

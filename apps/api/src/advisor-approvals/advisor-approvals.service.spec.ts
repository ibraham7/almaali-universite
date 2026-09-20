import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorApprovalsService } from './advisor-approvals.service.js';

describe('AdvisorApprovalsService', () => {
  let service: AdvisorApprovalsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvisorApprovalsService],
    }).compile();

    service = module.get<AdvisorApprovalsService>(AdvisorApprovalsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

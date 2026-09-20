import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorApprovalsController } from './advisor-approvals.controller.js';

describe('AdvisorApprovalsController', () => {
  let controller: AdvisorApprovalsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdvisorApprovalsController],
    }).compile();

    controller = module.get<AdvisorApprovalsController>(AdvisorApprovalsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

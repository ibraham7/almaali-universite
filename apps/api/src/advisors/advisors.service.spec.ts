import { Test, TestingModule } from '@nestjs/testing';
import { AdvisorsService } from './advisors.service.js';

describe('AdvisorsService', () => {
  let service: AdvisorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AdvisorsService],
    }).compile();

    service = module.get<AdvisorsService>(AdvisorsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationPeriodsService } from './registration-periods.service.js';

describe('RegistrationPeriodsService', () => {
  let service: RegistrationPeriodsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RegistrationPeriodsService],
    }).compile();

    service = module.get<RegistrationPeriodsService>(RegistrationPeriodsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

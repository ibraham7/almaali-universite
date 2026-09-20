import { Test, TestingModule } from '@nestjs/testing';
import { SectionSchedulesService } from './section-schedules.service.js';

describe('SectionSchedulesService', () => {
  let service: SectionSchedulesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SectionSchedulesService],
    }).compile();

    service = module.get<SectionSchedulesService>(SectionSchedulesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

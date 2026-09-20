import { Test, TestingModule } from '@nestjs/testing';
import { AcademicYearsService } from './academic-years.service.js';

describe('AcademicYearsService', () => {
  let service: AcademicYearsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AcademicYearsService],
    }).compile();

    service = module.get<AcademicYearsService>(AcademicYearsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

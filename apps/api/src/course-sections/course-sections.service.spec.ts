import { Test, TestingModule } from '@nestjs/testing';
import { CourseSectionsService } from './course-sections.service.js';

describe('CourseSectionsService', () => {
  let service: CourseSectionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CourseSectionsService],
    }).compile();

    service = module.get<CourseSectionsService>(CourseSectionsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});

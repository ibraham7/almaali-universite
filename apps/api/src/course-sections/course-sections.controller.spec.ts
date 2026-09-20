import { Test, TestingModule } from '@nestjs/testing';
import { CourseSectionsController } from './course-sections.controller.js';

describe('CourseSectionsController', () => {
  let controller: CourseSectionsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CourseSectionsController],
    }).compile();

    controller = module.get<CourseSectionsController>(CourseSectionsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

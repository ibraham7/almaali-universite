import { Test, TestingModule } from '@nestjs/testing';
import { SectionSchedulesController } from './section-schedules.controller.js';

describe('SectionSchedulesController', () => {
  let controller: SectionSchedulesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SectionSchedulesController],
    }).compile();

    controller = module.get<SectionSchedulesController>(SectionSchedulesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

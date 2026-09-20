import { Test, TestingModule } from '@nestjs/testing';
import { RegistrationPeriodsController } from './registration-periods.controller.js';

describe('RegistrationPeriodsController', () => {
  let controller: RegistrationPeriodsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RegistrationPeriodsController],
    }).compile();

    controller = module.get<RegistrationPeriodsController>(RegistrationPeriodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

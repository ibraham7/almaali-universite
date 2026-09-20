import { Module } from '@nestjs/common';
import { AdvisorsService } from './advisors.service.js';
import { AdvisorsController } from './advisors.controller.js';

@Module({
  providers: [AdvisorsService],
  controllers: [AdvisorsController]
})
export class AdvisorsModule {}

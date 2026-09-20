import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { CollegesService } from './colleges.service.js';
import { CollegesController } from './colleges.controller.js';

@Module({
  imports: [PrismaModule],
  providers: [CollegesService],
  controllers: [CollegesController],
  exports: [CollegesService],
})
export class CollegesModule {}
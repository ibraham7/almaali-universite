import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module.js';
import { AffairsController } from './affairs.controller.js';
import { AffairsService } from './affairs.service.js';

@Module({ imports: [PrismaModule], controllers: [AffairsController], providers: [AffairsService] })
export class AffairsModule {}

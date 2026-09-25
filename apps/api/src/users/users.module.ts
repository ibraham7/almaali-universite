import { Module } from '@nestjs/common';

import { PassportModule } from '@nestjs/passport';

import { UsersService } from './users.service.js';
import { UsersController } from './users.controller.js';

import { PrismaModule } from '../prisma/prisma.module.js';

@Module({
  imports: [
    PrismaModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),
  ],

  controllers: [
    UsersController,
  ],

  providers: [
    UsersService,
  ],

  exports: [
    UsersService,
  ],
})
export class UsersModule { }
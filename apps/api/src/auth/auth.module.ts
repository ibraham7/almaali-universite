import 'dotenv/config';

import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { UsersModule } from '../users/users.module.js';

import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

import { JwtStrategy } from './strategies/jwt/jwt.js';
import { JwtGuard } from './guards/jwt/jwt.guard.js';

import { TestController } from './test/test.controller.js';

@Module({
  imports: [
    UsersModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],

  providers: [
    AuthService,
    JwtStrategy,
    JwtGuard,
  ],

  controllers: [
    AuthController,
    TestController,
  ],

  exports: [
    JwtGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
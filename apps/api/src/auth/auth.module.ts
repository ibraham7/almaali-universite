import 'dotenv/config';

import {
  Global,
  Module,
} from '@nestjs/common';

import {
  JwtModule,
} from '@nestjs/jwt';

import {
  PassportModule,
} from '@nestjs/passport';

import {
  UsersModule,
} from '../users/users.module.js';

import {
  AuthService,
} from './auth.service.js';

import {
  AuthController,
} from './auth.controller.js';

import {
  JwtStrategy,
} from './strategies/jwt/jwt.js';

import {
  JwtGuard,
} from './guards/jwt/jwt.guard.js';

import {
  RolesGuard,
} from './guards/roles/roles.guard.js';

import {
  TestController,
} from './test/test.controller.js';

@Global()
@Module({
  imports: [
    UsersModule,

    PassportModule.register({
      defaultStrategy: 'jwt',
    }),

    JwtModule.register({
      secret:
        process.env.JWT_SECRET,

      signOptions: {
        expiresIn: '1h',
      },
    }),
  ],

  providers: [
    AuthService,
    JwtStrategy,
    JwtGuard,
    RolesGuard,
  ],

  controllers: [
    AuthController,
    TestController,
  ],

  exports: [
    JwtGuard,
    RolesGuard,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
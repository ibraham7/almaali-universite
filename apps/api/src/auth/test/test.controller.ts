import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../guards/jwt/jwt.guard.js';

@Controller('auth/test')
export class TestController {
  @UseGuards(JwtGuard)
  @Get()
  test() {
    return {
      message: 'JWT authentication works',
    };
  }
}
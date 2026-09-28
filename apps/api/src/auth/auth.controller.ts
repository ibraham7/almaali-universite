import { Body, Controller, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CompleteStudentSignupDto, StudentSignupDto } from './dto/student-signup.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.authService.login(body.username, body.password);
  }

  @Post('student-signup')
  @HttpCode(200)
  signupStudent(@Body() body: StudentSignupDto, @Req() request: Request) {
    return this.authService.signupStudent(body, request.ip ?? 'unknown');
  }

  @Post('student-signup/complete')
  @HttpCode(200)
  completeStudentSignup(@Body() body: CompleteStudentSignupDto, @Req() request: Request) {
    return this.authService.completeStudentSignup(body, request.ip ?? 'unknown');
  }
}

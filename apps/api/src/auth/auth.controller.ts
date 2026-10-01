import { Body, Controller, Headers, HttpCode, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { CompleteStudentSignupDto, StudentSignupDto } from './dto/student-signup.dto.js';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto.js';

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

  @Post('bootstrap-admin')
  @HttpCode(201)
  bootstrapAdmin(
    @Body() body: BootstrapAdminDto,
    @Headers('x-admin-bootstrap-token') token?: string,
  ) {
    return this.authService.bootstrapAdmin(body.password, token);
  }
}

import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';
import { EnrollmentMessagesService } from './enrollment-messages.service.js';

interface AuthenticatedRequest {
  user: {
    id: string;
    email: string;
    role: string;
  };
}

@Controller('enrollment-messages')
@UseGuards(JwtGuard, RolesGuard)
export class EnrollmentMessagesController {
  constructor(
    private readonly enrollmentMessagesService: EnrollmentMessagesService,
  ) {}

  @Get('me')
  @Roles('STUDENT')
  getMine(@Req() request: AuthenticatedRequest) {
    return this.enrollmentMessagesService.getForStudent(
      request.user.id,
    );
  }

  @Post('me')
  @Roles('STUDENT')
  sendMine(
    @Body() body: { message: string },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.enrollmentMessagesService.sendForStudent(
      request.user.id,
      body.message,
    );
  }

  @Get('advisor/:approvalId')
  @Roles('ADVISOR')
  getForAdvisor(
    @Param('approvalId') approvalId: string,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.enrollmentMessagesService.getForAdvisor(
      approvalId,
      request.user.id,
    );
  }

  @Post('advisor/:approvalId')
  @Roles('ADVISOR')
  sendForAdvisor(
    @Param('approvalId') approvalId: string,
    @Body() body: { message: string },
    @Req() request: AuthenticatedRequest,
  ) {
    return this.enrollmentMessagesService.sendForAdvisor(
      approvalId,
      request.user.id,
      body.message,
    );
  }
}

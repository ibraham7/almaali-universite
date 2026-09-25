import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

import { AdvisorApprovalsService } from './advisor-approvals.service.js';

import { UpdateAdvisorApprovalDto } from './dto/update-advisor-approval.dto.js';

interface AuthUser {
  id: string;
  email: string;
  role: string;
}

interface AuthenticatedRequest {
  user: AuthUser;
}

@Controller('advisor-approvals')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
export class AdvisorApprovalsController {
  constructor(
    private readonly advisorApprovalsService: AdvisorApprovalsService,
  ) { }

  @Get('me')
  @Roles('ADVISOR')
  findMine(
    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.advisorApprovalsService.findForAdvisor(
      request.user.id,
    );
  }

  @Get()
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  findAll() {
    return this.advisorApprovalsService.findAll();
  }

  @Get('me/:approvalId')
  @Roles('ADVISOR')
  findMineById(
    @Param('approvalId')
    approvalId: string,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.advisorApprovalsService.findOneForAdvisor(
      approvalId,
      request.user.id,
    );
  }

  @Get(':approvalId')
  @Roles(
    'REGISTRAR',
    'SYSTEM_ADMIN',
  )
  findById(
    @Param('approvalId')
    approvalId: string,
  ) {
    return this.advisorApprovalsService.findOne(
      approvalId,
    );
  }

  @Patch(':approvalId')
  @Roles('ADVISOR')
  updateDecision(
    @Param('approvalId')
    approvalId: string,

    @Body()
    dto: UpdateAdvisorApprovalDto,

    @Req()
    request: AuthenticatedRequest,
  ) {
    return this.advisorApprovalsService.updateDecision(
      approvalId,
      request.user.id,
      dto,
    );
  }
}
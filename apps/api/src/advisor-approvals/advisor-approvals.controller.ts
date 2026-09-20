import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { AdvisorApprovalsService } from './advisor-approvals.service.js';
import { UpdateAdvisorApprovalDto } from './dto/update-advisor-approval.dto.js';

@Controller('advisor-approvals')
export class AdvisorApprovalsController {
  constructor(
    private readonly advisorApprovalsService: AdvisorApprovalsService,
  ) {}

  @Post()
  create(
    @Body()
    body: {
      enrollmentId: string;
      advisorId: string;
    },
  ) {
    return this.advisorApprovalsService.create(
      body.enrollmentId,
      body.advisorId,
    );
  }

  @Get()
  findAll() {
    return this.advisorApprovalsService.findAll();
  }

  @Get(':approvalId')
  findById(@Param('approvalId') approvalId: string) {
    return this.advisorApprovalsService.findById(approvalId);
  }

  @Patch(':approvalId')
  update(
    @Param('approvalId') approvalId: string,
    @Body() dto: UpdateAdvisorApprovalDto,
  ) {
    return this.advisorApprovalsService.update(
      approvalId,
      dto,
    );
  }
}
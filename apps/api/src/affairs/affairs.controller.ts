import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AffairsService, AffairsUser } from './affairs.service.js';
import {
  AssignRequestDto, ChangeStatusDto, CommentDto, CreateServiceDto, CreateStaffDto, ListRequestsQueryDto,
  ProxyCreateRequestDto, StudentCreateRequestDto, StudentSearchQueryDto, UpdateServiceDto, UpdateStaffDto,
} from './dto/affairs.dto.js';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

interface AuthenticatedRequest extends Request {
  user: AffairsUser & { email: string };
}

@Controller('affairs')
@UseGuards(JwtGuard, RolesGuard)
export class AffairsController {
  constructor(private readonly affairs: AffairsService) {}

  // ----- staff side (REGISTRAR, SYSTEM_ADMIN) -----
  @Get('summary') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  summary(@Req() req: AuthenticatedRequest) { return this.affairs.summary(req.user); }

  @Get('operations') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  operations(@Query('page') page?: string) {
    const n = Number(page ?? 1);
    return this.affairs.operations(Number.isInteger(n) && n >= 1 ? Math.min(n, 100000) : 1);
  }

  @Get('services') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  listServices() { return this.affairs.listServices(); }

  @Post('services') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  createService(@Body() body: CreateServiceDto, @Req() req: AuthenticatedRequest) { return this.affairs.createService(body, req.user); }

  @Patch('services/:id') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  updateService(@Param('id') id: string, @Body() body: UpdateServiceDto, @Req() req: AuthenticatedRequest) { return this.affairs.updateService(id, body, req.user); }

  @Get('staff') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  listStaff() { return this.affairs.listStaff(); }

  // Must come before `staff/:id` routes (different verb/shape, but keep the literal path first).
  @Get('staff/candidates') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  staffCandidates() { return this.affairs.staffCandidates(); }

  @Post('staff') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  createStaff(@Body() body: CreateStaffDto, @Req() req: AuthenticatedRequest) { return this.affairs.createStaff(body, req.user); }

  @Patch('staff/:id') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  updateStaff(@Param('id') id: string, @Body() body: UpdateStaffDto, @Req() req: AuthenticatedRequest) { return this.affairs.updateStaff(id, body, req.user); }

  @Get('students/search') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  searchStudents(@Query() query: StudentSearchQueryDto) { return this.affairs.searchStudents(query.q); }

  @Get('requests') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  listRequests(@Query() query: ListRequestsQueryDto, @Req() req: AuthenticatedRequest) { return this.affairs.listRequests(query, req.user); }

  @Post('requests') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  createRequest(@Body() body: ProxyCreateRequestDto, @Req() req: AuthenticatedRequest) { return this.affairs.createByProxy(body, req.user); }

  @Get('requests/:id') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  getRequest(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.affairs.getRequest(id, req.user); }

  @Post('requests/:id/assign') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  assign(@Param('id') id: string, @Body() body: AssignRequestDto, @Req() req: AuthenticatedRequest) { return this.affairs.assign(id, body, req.user); }

  @Post('requests/:id/status') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  changeStatus(@Param('id') id: string, @Body() body: ChangeStatusDto, @Req() req: AuthenticatedRequest) { return this.affairs.changeStatus(id, body, req.user); }

  @Post('requests/:id/comment') @Roles('REGISTRAR', 'SYSTEM_ADMIN')
  comment(@Param('id') id: string, @Body() body: CommentDto, @Req() req: AuthenticatedRequest) { return this.affairs.comment(id, body, req.user); }

  // ----- student side -----
  @Get('my/services') @Roles('STUDENT')
  myServices() { return this.affairs.myServices(); }

  @Get('my/requests') @Roles('STUDENT')
  myRequests(@Req() req: AuthenticatedRequest) { return this.affairs.myRequests(req.user); }

  @Post('my/requests') @Roles('STUDENT')
  createMine(@Body() body: StudentCreateRequestDto, @Req() req: AuthenticatedRequest) { return this.affairs.createMine(body, req.user); }

  @Get('my/requests/:id') @Roles('STUDENT')
  myRequest(@Param('id') id: string, @Req() req: AuthenticatedRequest) { return this.affairs.myRequest(id, req.user); }
}

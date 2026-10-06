import { Body, Controller, Get, Param, Put, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AdvisorsService } from './advisors.service.js';
import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';
import { RolesGuard } from '../auth/guards/roles/roles.guard.js';
import { Roles } from '../auth/decorators/roles.decorator.js';

interface AuthenticatedRequest extends Request { user: { id: string } }

@Controller('advisors')
@UseGuards(JwtGuard, RolesGuard)
@Roles('SYSTEM_ADMIN')
export class AdvisorsController {
  constructor(private readonly advisorsService: AdvisorsService) {}

  @Get('me/assigned-programs')
  @Roles('ADVISOR', 'SYSTEM_ADMIN')
  getMyAssignedPrograms(@Req() request: AuthenticatedRequest) {
    return this.advisorsService.getAssignedPrograms(request.user.id);
  }

  @Get(':id/programs')
  getAssignedPrograms(@Param('id') id: string) {
    return this.advisorsService.getAssignedPrograms(id);
  }

  @Put(':id/programs')
  setAssignedPrograms(@Param('id') id: string, @Body() body: { programIds: string[] }, @Req() request: AuthenticatedRequest) {
    return this.advisorsService.setAssignedPrograms(id, body.programIds, request.user.id);
  }
}

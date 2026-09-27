import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AuditLogsService } from './audit-logs.service.js';

import { JwtGuard } from '../auth/guards/jwt/jwt.guard.js';

import { RolesGuard } from '../auth/guards/roles/roles.guard.js';

import { Roles } from '../auth/decorators/roles.decorator.js';

@Controller('audit-logs')
@UseGuards(
  JwtGuard,
  RolesGuard,
)
@Roles(
  'REGISTRAR',
  'SYSTEM_ADMIN',
)
export class AuditLogsController {
  constructor(
    private readonly auditLogsService: AuditLogsService,
  ) { }

  @Get()
  findAll(@Query('page') page?: string) {
    const parsedPage = Number(page);
    const pageNumber =
      Number.isSafeInteger(parsedPage) && parsedPage > 0
        ? parsedPage
        : 1;

    return this.auditLogsService.findAll(pageNumber);
  }

  @Get(':entity/:entityId')
  findByEntity(
    @Param('entity')
    entity: string,

    @Param('entityId')
    entityId: string,
  ) {
    return this.auditLogsService.findByEntity(
      entity,
      entityId,
    );
  }
}

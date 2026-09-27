import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class AuditLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    action: string;
    entity: string;
    entityId?: string;
    userId?: string;
    details?: string;
  }) {
    return this.prisma.auditLog.create({
      data: {
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        userId: data.userId,
        details: data.details,
      },
    });
  }

  async findAll(page = 1) {
    const pageSize = 25;
    const logs = await this.prisma.auditLog.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    });

    return {
      items: logs.slice(0, pageSize),
      hasMore: logs.length > pageSize,
      page,
    };
  }

  async findByEntity(entity: string, entityId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        entity,
        entityId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}

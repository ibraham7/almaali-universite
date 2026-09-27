import { describe, expect, it, vi } from 'vitest';

import { AuditLogsService } from './audit-logs.service.js';
import { PrismaService } from '../prisma/prisma.service.js';

describe('AuditLogsService pagination', () => {
  it('returns 25 records and detects whether another page exists', async () => {
    const records = Array.from({ length: 26 }, (_, index) => ({ id: String(index) }));
    const findMany = vi.fn().mockResolvedValue(records);
    const prisma = { auditLog: { findMany } } as unknown as PrismaService;
    const service = new AuditLogsService(prisma);

    const result = await service.findAll(2);

    expect(findMany).toHaveBeenCalledWith({
      orderBy: { createdAt: 'desc' },
      skip: 25,
      take: 26,
    });
    expect(result).toEqual({
      items: records.slice(0, 25),
      hasMore: true,
      page: 2,
    });
  });

  it('reports the last page without a next page', async () => {
    const findMany = vi.fn().mockResolvedValue([{ id: 'last' }]);
    const prisma = { auditLog: { findMany } } as unknown as PrismaService;
    const service = new AuditLogsService(prisma);

    expect(await service.findAll(1)).toMatchObject({
      items: [{ id: 'last' }],
      hasMore: false,
    });
  });
});

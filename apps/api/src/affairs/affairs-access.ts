import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AffairsUser } from './affairs.service.js';

// A request may be worked on by a system admin or by the staff member it is assigned to.
// `tx` is the Prisma client or a transaction client.
export async function loadRequestForAction(
  tx: { studentRequest: { findUnique: (args: unknown) => Promise<any> } },
  id: string,
  user: AffairsUser,
) {
  const request = await tx.studentRequest.findUnique({ where: { id }, include: { assignedStaff: { select: { userId: true } } } });
  if (!request) throw new NotFoundException('الطلب غير موجود.');
  const isOwner = request.assignedStaff?.userId === user.id;
  if (user.role !== 'SYSTEM_ADMIN' && !(user.role === 'REGISTRAR' && isOwner)) throw new ForbiddenException('هذا الطلب غير مسند لك.');
  return request;
}

export function audit(tx: any, action: string, entityId: string, userId: string, details: Record<string, unknown>) {
  return tx.auditLog.create({ data: { action, entity: 'StudentRequest', entityId, userId, details: JSON.stringify(details) } });
}

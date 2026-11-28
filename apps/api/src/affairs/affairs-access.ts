import { ForbiddenException, NotFoundException } from '@nestjs/common';
import type { AffairsUser } from './affairs.service.js';

// أدوار موظفي وحدة شؤون الطلاب: المسجّل وموظف الشؤون (الدور الخاص). المشرف الأكاديمي له مساحة مستقلة ومحصورة بكليته (AdvisorAffairsController).
export const AFFAIRS_STAFF_ROLES = ['REGISTRAR', 'AFFAIRS_STAFF'] as const;
export function isAffairsStaffRole(role: string) {
  return (AFFAIRS_STAFF_ROLES as readonly string[]).includes(role);
}

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
  if (user.role !== 'SYSTEM_ADMIN' && !(isAffairsStaffRole(user.role) && isOwner)) throw new ForbiddenException('هذا الطلب غير مسند لك.');
  return request;
}

export function audit(tx: any, action: string, entityId: string, userId: string, details: Record<string, unknown>) {
  return tx.auditLog.create({ data: { action, entity: 'StudentRequest', entityId, userId, details: JSON.stringify(details) } });
}

// The unit manager is a REGISTRAR whose staff profile carries the manager flag (no separate role).
export async function isUnitManager(db: any, user: AffairsUser): Promise<boolean> {
  if (!isAffairsStaffRole(user.role)) return false;
  const staff = await db.affairsStaff.findUnique({ where: { userId: user.id }, select: { isManager: true, isActive: true } });
  return !!staff && staff.isManager === true && staff.isActive === true;
}

// Who may assign / re-assign requests and see the whole unit's workload: system admin or the unit manager.
export async function canManage(db: any, user: AffairsUser): Promise<boolean> {
  return user.role === 'SYSTEM_ADMIN' || isUnitManager(db, user);
}

// In-system notifications. The helpers write rows inside the same transaction as the action, so a notification
// exists exactly when the action happened. Recipients read them through AffairsNotificationsService.

export interface NotificationInput { kind: string; title: string; body?: string | null; requestId?: string | null }

// `tx` is the Prisma client or a transaction client.
export async function notifyUsers(tx: any, userIds: (string | null | undefined)[], input: NotificationInput) {
  const unique = [...new Set(userIds.filter((x): x is string => !!x))];
  if (unique.length === 0) return;
  await tx.affairsNotification.createMany({
    data: unique.map((userId) => ({ userId, kind: input.kind, title: input.title, body: input.body ?? null, requestId: input.requestId ?? null })),
  });
}

// Active unit managers; when none has been named yet, the system admins, so a request never waits unseen.
export async function managerRecipients(tx: any): Promise<string[]> {
  const managers = await tx.affairsStaff.findMany({ where: { isManager: true, isActive: true, user: { status: 'ACTIVE' } }, select: { userId: true } });
  if (managers.length > 0) return managers.map((m: { userId: string }) => m.userId);
  const admins = await tx.user.findMany({ where: { role: { code: 'SYSTEM_ADMIN' }, status: 'ACTIVE' }, select: { id: true } });
  return admins.map((a: { id: string }) => a.id);
}

const STATUS_TITLE: Record<string, string> = {
  IN_PROGRESS: 'بدأت مراجعة طلبك',
  WAITING_COMPLETION: 'طلبك بحاجة إلى استكمال',
  REFERRED: 'أُحيل طلبك إلى جهة أخرى لدراسته',
  ACCEPTED: 'تمت الموافقة على طلبك',
  COMPLETED: 'اكتمل طلبك',
  REJECTED: 'رُفض طلبك',
  CANCELLED: 'أُلغي طلبك',
};

// Message to the student when the status of their request changes. `note` is the reason the staff member wrote.
export function studentStatusMessage(number: string, to: string, note?: string | null, fromReferral = false): NotificationInput {
  const title = fromReferral && to === 'IN_PROGRESS' ? 'عاد طلبك إلى الموظف المختص' : STATUS_TITLE[to] ?? 'تغيّرت حالة طلبك';
  const showNote = ['WAITING_COMPLETION', 'REJECTED', 'CANCELLED'].includes(to) && note?.trim();
  return { kind: 'REQUEST_STATUS', title, body: `الطلب ${number}${showNote ? ` — ${note!.trim()}` : ''}` };
}

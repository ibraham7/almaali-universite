import { BadRequestException } from '@nestjs/common';

// الخطة المعتمدة (والإصدار القديم المستبدل) مقفلة: لا تُعدَّل مستوياتها ولا فصولها ولا مقرراتها.
// التغيير يكون بإنشاء إصدار جديد (مسودة) فلا يتأثر الطلاب المرتبطون بالإصدار الحالي ولا سجلاتهم.
interface Db {
  studyPlan: { findUnique: (args: any) => Promise<any> };
}

export async function assertPlanEditable(db: Db, studyPlanId: string) {
  const plan = await db.studyPlan.findUnique({ where: { id: studyPlanId }, select: { nameAr: true, status: true, versionNumber: true } });
  if (plan && plan.status && plan.status !== 'DRAFT') {
    throw new BadRequestException(`الخطة «${plan.nameAr}» (إصدار ${plan.versionNumber}) ${plan.status === 'APPROVED' ? 'معتمدة' : 'إصدار قديم'} ومقفلة. أنشئ إصدارًا جديدًا (مسودة) لتعديلها، فلا يتأثر طلابها الحاليون.`);
  }
  return plan;
}

// وصف مدى الدفعات: عامة، دفعة واحدة، مدى مغلق، أو سارية حتى الآن (النهاية فارغة).
export function cohortRangeLabel(from?: number | null, to?: number | null) {
  if (!from) return 'كل الدفعات';
  if (!to) return `من دفعة ${from} (سارية)`;
  return from === to ? `دفعة ${from}` : `من دفعة ${from} إلى ${to}`;
}

export function planLabel(plan: { nameAr: string; versionNumber: number; cohortYear?: number | null; cohortToYear?: number | null }) {
  return `${plan.nameAr} — إصدار ${plan.versionNumber}${plan.cohortYear ? ` (${cohortRangeLabel(plan.cohortYear, plan.cohortToYear)})` : ''}`;
}

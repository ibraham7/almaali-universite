// الخطة المناسبة لطالب: الخطة المعتمدة التي يقع سنة قبوله ضمن مدى دفعاتها (النهاية الفارغة = سارية)،
// والأحدث بداية ثم الأحدث إصدارًا إن تعددت؛ وإلا الخطة العامة (بلا دفعة). المسودة والإصدار القديم لا يُختاران.
type Pickable = { status?: string; cohortYear: number | null; cohortToYear?: number | null; versionNumber: number };

export function pickPlanForAdmission<T extends Pickable>(plans: T[], admissionYear?: number | null): T | null {
  const approved = plans.filter((plan) => plan.status === undefined || plan.status === 'APPROVED');
  const covering = admissionYear
    ? approved.filter((plan) => plan.cohortYear !== null && plan.cohortYear <= admissionYear && (plan.cohortToYear == null || admissionYear <= plan.cohortToYear))
    : [];
  covering.sort((a, b) => (b.cohortYear ?? 0) - (a.cohortYear ?? 0) || b.versionNumber - a.versionNumber);
  const general = approved.filter((plan) => plan.cohortYear === null).sort((a, b) => b.versionNumber - a.versionNumber);
  return covering[0] ?? general[0] ?? null;
}

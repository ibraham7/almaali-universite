// الخطة المناسبة لطالب: آخر إصدار معتمد لدفعته (سنة القبول)، وإلا الخطة العامة (بلا دفعة) للبرنامج. المسودة والإصدار القديم لا يُختاران.
export function pickPlanForAdmission<T extends { status?: string; cohortYear: number | null; versionNumber: number }>(plans: T[], admissionYear?: number | null): T | null {
  const approved = plans
    .filter((plan) => plan.status === undefined || plan.status === 'APPROVED')
    .sort((a, b) => b.versionNumber - a.versionNumber);
  const exact = admissionYear ? approved.find((plan) => plan.cohortYear === admissionYear) : undefined;
  return exact ?? approved.find((plan) => plan.cohortYear === null) ?? null;
}

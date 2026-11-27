// خصائص المقرر داخل الخطة (نوع المتطلب، الساعات، المتطلبات السابقة). قواعد نقية بلا قاعدة بيانات.
// الساعات: creditsInPlan إن وُجدت وإلا ساعات المقرر العامة.
export function effectiveCredits(planCourse: { creditsInPlan?: number | null; course: { credits: number } }) {
  return planCourse.creditsInPlan ?? planCourse.course.credits;
}

export interface PrerequisiteCourse { id: string; code?: string; nameAr: string }

// المتطلبات السابقة للمقرر في الخطة: إن كان للخطة متطلباتها الخاصة (ownPrerequisites) فهي فقط (قد تكون فارغة)،
// وإلا متطلبات المقرر العامة. هكذا تبقى الخطط الحالية كما هي بلا تغيير.
export function effectivePrerequisites(planCourse: {
  ownPrerequisites?: boolean;
  prerequisites?: Array<{ isActive: boolean; prerequisite: PrerequisiteCourse }>;
  course: { prerequisites?: Array<{ prerequisite: PrerequisiteCourse }> };
}): PrerequisiteCourse[] {
  if (planCourse.ownPrerequisites) return (planCourse.prerequisites ?? []).filter((item) => item.isActive).map((item) => item.prerequisite);
  return (planCourse.course.prerequisites ?? []).map((item) => item.prerequisite);
}

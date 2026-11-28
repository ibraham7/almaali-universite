import { apiClient } from './client';

export type CourseRequirement =
  | 'MANDATORY'
  | 'ELECTIVE';

export interface StudyPlan {
  id: string;
  programId: string;
  nameAr: string;
  nameEn?: string | null;
  // إصدارات الخطة: المعتمدة والإصدار القديم مقفلان للتعديل.
  status?: 'DRAFT' | 'APPROVED' | 'SUPERSEDED';
  versionNumber?: number;
  cohortYear?: number | null;
  cohortToYear?: number | null;
  program?: {
    nameAr: string;
    college?: { nameAr: string } | null;
    department?: { nameAr: string; college?: { nameAr: string } | null } | null;
  } | null;
}

// مدى دفعات الخطة: عامة، دفعة واحدة، مدى مغلق، أو «سارية» (بلا نهاية).
export function cohortRangeLabel(from?: number | null, to?: number | null) {
  if (!from) return 'كل الدفعات';
  if (!to) return `من دفعة ${from} (سارية)`;
  return from === to ? `دفعة ${from}` : `من دفعة ${from} إلى ${to}`;
}

// "الكلية ← القسم ← البرنامج" for a plan's program (used to pick a program in a drop-down).
export function studyPlanProgramLabel(plan: StudyPlan) {
  const college = plan.program?.college?.nameAr ?? plan.program?.department?.college?.nameAr;
  return [college, plan.program?.department?.nameAr, plan.program?.nameAr].filter(Boolean).join(' ← ');
}

// Imported plans share the same name, so the program and college are needed to tell them apart.
export function studyPlanLabel(plan: StudyPlan) {
  const where = studyPlanProgramLabel(plan);
  return where ? `${where} — ${plan.nameAr}` : plan.nameAr;
}

export interface AcademicLevel {
  id: string;
  studyPlanId: string;
  nameAr: string;
  nameEn?: string | null;
  levelNumber: number;
}

export interface Semester {
  id: string;
  academicYearId: string;
  nameAr: string;
  nameEn?: string | null;
  semesterNumber: number;
}

export interface PrerequisiteCourse {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
}

export interface CoursePrerequisite {
  prerequisiteId: string;
  prerequisite: PrerequisiteCourse;
}

export interface Course {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  credits: number;
  ects?: number | null;
  type: string;
  requirement: CourseRequirement;
  status: string;
  description?: string | null;
  prerequisites?: CoursePrerequisite[];
}

export interface PlanCourse {
  id: string;
  studyPlanId: string;
  academicYearId: string;
  semesterId: string;
  courseId: string;
  priority: number;
  requirement: CourseRequirement;
  course: Course;
  academicYear: AcademicLevel;
  semester: Semester;
}

interface StudyPlansResponse {
  success?: boolean;
  studyPlans?: StudyPlan[];
  plans?: StudyPlan[];
}

interface AcademicLevelsResponse {
  success?: boolean;
  academicYears?: AcademicLevel[];
  years?: AcademicLevel[];
}

interface SemestersResponse {
  success?: boolean;
  semesters?: Semester[];
}

interface CoursesResponse {
  success: boolean;
  count: number;
  courses: Course[];
}

interface PlanCoursesResponse {
  success: boolean;
  count: number;
  courses: PlanCourse[];
  errors?: string[];
}

interface MutationResponse {
  success: boolean;
  errors?: string[];
  message?: string;
  planCourse?: PlanCourse;
}

export interface PrerequisiteMutationResponse {
  success: boolean;
  errors?: string[];
  message?: string;
  prerequisite?: CoursePrerequisite;
  removedPrerequisite?: PrerequisiteCourse;
}

export async function getStudyPlans() {
  const { data } =
    await apiClient.get<
      StudyPlan[] | StudyPlansResponse
    >('/study-plans');

  if (Array.isArray(data)) {
    return data;
  }

  return data.studyPlans ?? data.plans ?? [];
}

export async function getAcademicLevels(
  studyPlanId: string,
) {
  const { data } =
    await apiClient.get<
      AcademicLevel[] | AcademicLevelsResponse
    >(
      `/academic-years/study-plan/${studyPlanId}`,
    );

  if (Array.isArray(data)) {
    return data;
  }

  return (
    data.academicYears ??
    data.years ??
    []
  );
}

export async function getSemesters(
  academicYearId: string,
) {
  const { data } =
    await apiClient.get<
      Semester[] | SemestersResponse
    >(
      `/semesters/academic-year/${academicYearId}`,
    );

  if (Array.isArray(data)) {
    return data;
  }

  return data.semesters ?? [];
}

export async function getCourses() {
  const { data } =
    await apiClient.get<CoursesResponse>(
      '/courses',
    );

  return data.courses;
}

export async function getPlanCourses(
  studyPlanId: string,
  academicYearId: string,
  semesterId: string,
) {
  const { data } =
    await apiClient.get<PlanCoursesResponse>(
      '/study-plan-courses',
      {
        params: {
          studyPlanId,
          academicYearId,
          semesterId,
        },
      },
    );

  return data;
}

export type PlanCategory = 'UNIVERSITY' | 'COLLEGE' | 'PROGRAM';

// نوع المتطلب داخل الخطة (جامعة / كلية / قسم-برنامج).
export const PLAN_CATEGORY_LABEL: Record<PlanCategory, string> = {
  UNIVERSITY: 'متطلب جامعة',
  COLLEGE: 'متطلب كلية',
  PROGRAM: 'متطلب قسم',
};

export async function addCourseToPlan(input: {
  studyPlanId: string;
  academicYearId: string;
  semesterId: string;
  courseId: string;
  priority: number;
  requirement: CourseRequirement;
  category?: PlanCategory;
  creditsInPlan?: number;
  prerequisiteCourseIds?: string[];
}) {
  const { data } =
    await apiClient.post<MutationResponse>(
      '/study-plan-courses',
      input,
    );

  return data;
}

// إزالة مقرر من الخطة (حالة REMOVED بسبب إلزامي، بدون حذف نهائي)
export async function removePlanCourse(id: string, reason: string) {
  const { data } = await apiClient.post<{ success: boolean; message: string }>(
    `/study-plan-courses/${id}/remove`,
    { reason },
  );

  return data;
}

export async function reorderPlanCourses(input: {
  studyPlanId: string;
  academicYearId: string;
  items: {
    id: string;
    priority: number;
  }[];
}) {
  const { data } =
    await apiClient.post<PlanCoursesResponse>(
      '/study-plan-courses/reorder',
      input,
    );

  return data;
}

export async function addCoursePrerequisite(input: {
  courseId: string;
  prerequisiteId: string;
}) {
  const { data } =
    await apiClient.post<PrerequisiteMutationResponse>(
      '/courses/prerequisites',
      input,
    );

  return data;
}

export async function addCoursePrerequisites(input: {
  courseId: string;
  prerequisiteIds: string[];
}) {
  const { data } = await apiClient.post<PrerequisiteMutationResponse>(
    `/courses/${input.courseId}/prerequisites/bulk`,
    { prerequisiteIds: input.prerequisiteIds },
  );
  return data;
}

// تعديل خصائص مقرر داخل مسودة الخطة. null يمسح القيمة.
export async function updatePlanCourse(id: string, input: {
  requirement?: CourseRequirement;
  category?: PlanCategory | null;
  creditsInPlan?: number | null;
  prerequisiteCourseIds?: string[];
}) {
  const { data } = await apiClient.patch(`/study-plan-courses/${id}`, input);
  return data;
}

export interface PlanStructureCourse {
  id: string;
  courseId: string;
  code: string;
  nameAr: string;
  priority: number;
  requirement: CourseRequirement;
  category: PlanCategory | null;
  credits: number;
  courseCredits: number;
  creditsInPlan: number | null;
  prerequisites: Array<{ courseId: string; code?: string; nameAr: string }>;
}

export interface PlanStructure {
  id: string;
  programId: string;
  nameAr: string;
  nameEn?: string | null;
  status: 'DRAFT' | 'APPROVED' | 'SUPERSEDED';
  versionNumber: number;
  cohortYear: number | null;
  cohortToYear: number | null;
  effectiveFrom: string | null;
  graduationCredits: number | null;
  levels: Array<{
    id: string;
    nameAr: string;
    levelNumber: number;
    semesters: Array<{ id: string; nameAr: string; semesterNumber: number; credits: number; courses: PlanStructureCourse[] }>;
  }>;
  totals: { courses: number; credits: number; byCategory: Record<PlanCategory | 'UNSPECIFIED', number> };
}

// هيكل الخطة كاملًا (مستويات ← فصول ← مقررات بخصائصها ومجاميع الساعات).
export async function getPlanStructure(id: string) {
  const { data } = await apiClient.get<PlanStructure>(`/study-plans/${id}/structure`);
  return data;
}

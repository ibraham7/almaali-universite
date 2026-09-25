import { apiClient } from './client';

export type CourseRequirement =
  | 'MANDATORY'
  | 'ELECTIVE';

export interface StudyPlan {
  id: string;
  programId: string;
  nameAr: string;
  nameEn?: string | null;
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

export async function addCourseToPlan(input: {
  studyPlanId: string;
  academicYearId: string;
  semesterId: string;
  courseId: string;
  priority: number;
  requirement: CourseRequirement;
}) {
  const { data } =
    await apiClient.post<MutationResponse>(
      '/study-plan-courses',
      input,
    );

  return data;
}

export async function removeCourseFromPlan(
  id: string,
) {
  const { data } =
    await apiClient.delete<MutationResponse>(
      `/study-plan-courses/${id}`,
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

export async function removeCoursePrerequisite(
  courseId: string,
  prerequisiteId: string,
) {
  const { data } =
    await apiClient.delete<PrerequisiteMutationResponse>(
      `/courses/${courseId}/prerequisites/${prerequisiteId}`,
    );

  return data;
}

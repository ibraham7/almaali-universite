import { apiClient } from './client';

export type CourseRequirement =
  | 'MANDATORY'
  | 'ELECTIVE';

export type EnrollmentStatus =
  | 'DRAFT'
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'CONFIRMED'
  | 'DROPPED'
  | 'CANCELLED';

export interface Student {
  id: string;
  universityId: string;
  firstName: string;
  middleName?: string | null;
  familyName: string;
  englishName?: string | null;
  status: string;
  studyPlanId?: string | null;
  academicYearId?: string | null;
  semesterId?: string | null;
}

export interface StudyPlan {
  id: string;
  nameAr: string;
  nameEn?: string | null;

  program?: {
    id: string;
    nameAr: string;
    nameEn?: string | null;

    department?: {
      id: string;
      nameAr: string;
      nameEn?: string | null;

      college?: {
        id: string;
        nameAr: string;
        nameEn?: string | null;
      };
    };
  };
}

export interface AcademicLevel {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  levelNumber: number;
}

export interface Semester {
  id: string;
  nameAr: string;
  nameEn?: string | null;
  semesterNumber: number;
  requireMandatoryCourses: boolean;
}

export interface RegistrationPeriod {
  id: string;
  semesterId: string;
  startDateTime: string;
  endDateTime: string;
  minCredits?: number | null;
  maxCredits?: number | null;
  advisorApprovalRequired: boolean;
  dropAllowed: boolean;
  addDropDeadline?: string | null;
}

export interface RegistrationSettings {
  minGpaForFutureYears: number;
  allowedFutureYears: number;
  requiredElectiveCredits: number;
  currentLevelNumber: number;
  maxAllowedLevelNumber: number;
}

export interface SectionSchedule {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface Teacher {
  id: string;
  name: string;
}

export interface Classroom {
  id: string;
  name: string;
  capacity?: number | null;
}

export interface CourseSection {
  id: string;
  sectionNumber: string;
  courseId: string;
  semesterId: string;
  maxCapacity: number;
  enrolledCount: number;
  status: 'OPEN' | 'CLOSED';

  teacher?: Teacher | null;
  classroom?: Classroom | null;

  schedules: SectionSchedule[];
}

export interface PrerequisiteCourse {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
}

export interface CoursePrerequisite {
  id: string;
  prerequisiteId: string;
  prerequisite: PrerequisiteCourse;
}

export interface Course {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  credits: number;
  ects?: string | number | null;
  type: 'THEORY' | 'PRACTICAL';
  requirement: CourseRequirement;
  description?: string | null;
  status: 'ACTIVE' | 'INACTIVE';

  prerequisites: CoursePrerequisite[];
  sections: CourseSection[];
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

export interface EnrollmentItem {
  id: string;
  enrollmentId: string;
  courseId: string;
  sectionId: string;

  course: Course;

  section: CourseSection;
}

export interface AdvisorApproval {
  id: string;
  enrollmentId: string;
  advisorId: string;
  status: string;
  note?: string | null;
}

export interface StudentEnrollment {
  id: string;
  studentId: string;
  semesterId: string;
  status: EnrollmentStatus;
  items: EnrollmentItem[];
  approvals: AdvisorApproval[];
}

export interface RegistrationContext {
  success: boolean;
  errors?: string[];

  student?: Student;
  studyPlan?: StudyPlan | null;
  academicYear?: AcademicLevel | null;
  semester?: Semester | null;

  registrationPeriod?: RegistrationPeriod | null;
  registrationOpen?: boolean;

  registrationSettings?: RegistrationSettings;

  planCourses?: PlanCourse[];

  enrollment?: StudentEnrollment | null;

  totalRegisteredCredits?: number;
}

export interface ApiErrorResponse {
  success: false;
  errors: string[];
}

export async function getMyRegistration() {
  const response =
    await apiClient.get<RegistrationContext>(
      '/student-enrollments/me/registration',
    );

  return response.data;
}

export async function createMyEnrollment() {
  const response =
    await apiClient.post<
      StudentEnrollment | ApiErrorResponse
    >('/student-enrollments/me');

  return response.data;
}

export async function addMyEnrollmentItem(
  courseId: string,
  sectionId: string,
) {
  const response =
    await apiClient.post<
      EnrollmentItem | ApiErrorResponse
    >('/student-enrollments/me/items', {
      courseId,
      sectionId,
    });

  return response.data;
}

export async function dropMyEnrollmentItem(
  enrollmentItemId: string,
) {
  const response =
    await apiClient.post<
      | {
          success: true;
          message: string;
        }
      | ApiErrorResponse
    >('/student-enrollments/me/items/drop', {
      enrollmentItemId,
    });

  return response.data;
}

export async function confirmMyEnrollment() {
  const response =
    await apiClient.post<
      StudentEnrollment | ApiErrorResponse
    >('/student-enrollments/me/confirm');

  return response.data;
}

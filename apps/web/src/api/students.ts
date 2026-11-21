import { apiClient } from './client';

export interface StudentUser {
  id: string;
  email: string;
  status: string;
  lastLoginAt?: string | null;

  role?: {
    code: string;
  } | null;
}

export interface StudentEnrollmentSummary {
  id: string;
  semesterId: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface StudentNumberHistoryItem {
  id: string;
  universityId: string;
  replacedByUniversityId: string;
  reason?: string | null;
  validFrom: string;
  validTo: string;
}

export interface StudentListItem {
  id: string;
  universityId: string;

  firstName: string;
  middleName?: string | null;
  familyName: string;
  meritNumber?: string | null;
  motherName?: string | null;
  nationalId?: string | null;
  applicationNumber?: string | null;
  birthPlace?: string | null;

  englishName?: string | null;
  dateOfBirth?: string | null;
  idOrPassport?: string | null;

  gender?: string | null;
  nationality?: string | null;

  universityEmail?: string | null;
  phone?: string | null;

  collegeId?: string | null;
  departmentId?: string | null;
  programId?: string | null;

  studyPlanId?: string | null;
  academicYearId?: string | null;
  semesterId?: string | null;

  status: string;

  advisorId?: string | null;

  admissionDate?: string | null;

  userId?: string | null;

  user?: StudentUser | null;

  enrollments: StudentEnrollmentSummary[];
  numberHistory?: StudentNumberHistoryItem[];
}

export interface StudentCourse {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  credits: number;
}

export interface StudentSchedule {
  id: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface StudentEnrollmentItem {
  id: string;

  course: StudentCourse;

  section: {
    id: string;
    sectionNumber: string;

    teacher?: {
      id: string;
      name: string;
    } | null;

    classroom?: {
      id: string;
      name: string;
    } | null;

    schedules: StudentSchedule[];
  };
}

export interface StudentEnrollmentDetails {
  id: string;
  semesterId: string;
  status: string;

  createdAt: string;
  updatedAt: string;

  items: StudentEnrollmentItem[];

  approvals: Array<{
    id: string;
    advisorId: string;
    status: string;
    note?: string | null;
  }>;
}

export interface StudentDetails
  extends Omit<
    StudentListItem,
    'enrollments'
  > {
  enrollments: StudentEnrollmentDetails[];
}

export interface StudentAcademicStatus {
  student: { universityId: string; currentLevel: string };
  studyPlan: string;
  courses: Array<{
    id: string;
    courseId: string;
    code: string;
    nameAr: string;
    nameEn?: string | null;
    credits: number;
    academicYear: string;
    levelNumber: number;
    semester: string;
    status: 'PASSED' | 'FAILED' | 'REGISTERED' | 'FUTURE' | 'NOT_TAKEN';
    gradeLabel?: string | null;
    score?: number | null;
    resultSemester?: string | null;
  }>;
}

export async function getMyAcademicStatus() {
  const response = await apiClient.get<StudentAcademicStatus>('/students/me/academic-status');
  return response.data;
}

export async function getStudents(params?: {
  search?: string;
  status?: string;
  accountStatus?: string;
}) {
  const response =
    await apiClient.get<
      StudentListItem[]
    >('/students', {
      params,
    });

  return response.data;
}

export async function getStudent(
  id: string,
) {
  const response =
    await apiClient.get<StudentDetails>(
      `/students/${id}`,
    );

  return response.data;
}

export interface StudentInput {
  universityId: string;
  firstName: string;
  familyName?: string;
  meritNumber?: string | null;
  middleName?: string | null;
  motherName?: string | null;
  nationalId?: string | null;
  applicationNumber?: string | null;
  birthPlace?: string | null;
  englishName?: string | null;
  gender?: string | null;
  dateOfBirth?: string | null;
  nationality?: string | null;
  idOrPassport?: string | null;
  universityEmail?: string | null;
  phone?: string | null;
  status?: string;
  collegeId?: string | null;
  departmentId?: string | null;
  programId?: string | null;
  studyPlanId?: string | null;
  academicYearId?: string | null;
  semesterId?: string | null;
  advisorId?: string | null;
  admissionDate?: string | null;
}

export async function createStudent(data: StudentInput) {
  const response = await apiClient.post<StudentListItem>('/students', data);
  return response.data;
}

export async function updateStudent(id: string, data: StudentInput) {
  const response = await apiClient.patch<StudentListItem>(`/students/${id}`, data);
  return response.data;
}

export async function getStudentAdvisors() {
  const response = await apiClient.get<Array<{ id: string; email: string }>>('/students/advisors');
  return response.data;
}

export interface ApproveRegistrationInput {
  studentIds: string[];
  collegeId: string;
  departmentId: string;
  programId: string;
  studyPlanId: string;
  academicYearId: string;
  semesterId: string;
}

export async function approveStudentRegistration(data: ApproveRegistrationInput) {
  const response = await apiClient.post<{ approved: number; skipped: Array<{ studentId: string; universityId: string; reason: string }> }>('/students/approve-registration', data);
  return response.data;
}

export async function transferStudentCollege(id: string, data: { collegeId: string; reason?: string; admissionYear?: number }) {
  const response = await apiClient.post<{ universityId: string; previousUniversityId: string; college: string }>(`/students/${id}/transfer-college`, data);
  return response.data;
}

// وضع التجريب: الحذف الجماعي مغلق افتراضياً ويُفعَّل من إعدادات السيرفر (ALLOW_TEST_DELETE).
export async function getStudentCapabilities() {
  const response = await apiClient.get<{ bulkDelete: boolean }>('/students/capabilities');
  return response.data;
}

export async function bulkDeleteStudents(studentIds: string[], confirm: string) {
  const response = await apiClient.post<{ deleted: number }>('/students/bulk-delete', { studentIds, confirm });
  return response.data;
}

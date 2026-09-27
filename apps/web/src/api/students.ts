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

export interface StudentListItem {
  id: string;
  universityId: string;

  firstName: string;
  middleName?: string | null;
  familyName: string;

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
  familyName: string;
  middleName?: string | null;
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

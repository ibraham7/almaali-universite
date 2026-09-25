import { apiClient } from './client';

export interface StudentUser {
  id: string;
  email: string;
  status: string;

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
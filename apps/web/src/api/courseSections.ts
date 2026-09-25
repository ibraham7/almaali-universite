import { apiClient } from './client';

export type SectionStatus = 'OPEN' | 'CLOSED';

export interface Teacher {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface Classroom {
  id: string;
  name: string;
  capacity?: number | null;
}

export interface Course {
  id: string;
  code: string;
  nameAr: string;
  nameEn?: string | null;
  credits: number;
  status: 'ACTIVE' | 'INACTIVE';
}

export interface SectionSchedule {
  id?: string;
  sectionId?: string;
  day: string;
  startTime: string;
  endTime: string;
}

export interface CourseSection {
  id: string;
  sectionNumber: string;
  courseId: string;
  semesterId: string;
  teacherId?: string | null;
  classroomId?: string | null;
  maxCapacity: number;
  enrolledCount: number;
  status: SectionStatus;
  minEnrollment?: number | null;
  course: Course;
  teacher?: Teacher | null;
  classroom?: Classroom | null;
  schedules: SectionSchedule[];
}

export interface CourseSectionsResponse {
  success: boolean;
  count: number;
  sections: CourseSection[];
}

export interface TeachersResponse {
  success: boolean;
  count: number;
  teachers: Teacher[];
}

export interface ClassroomsResponse {
  success: boolean;
  count: number;
  classrooms: Classroom[];
}

export interface SectionMutationInput {
  sectionNumber: string;
  courseId: string;
  semesterId: string;
  teacherId?: string | null;
  classroomId?: string | null;
  maxCapacity: number;
  minEnrollment?: number | null;
  status?: SectionStatus;
  schedules?: Array<{
    day: string;
    startTime: string;
    endTime: string;
  }>;
}

export async function getCourseSections(filters?: {
  semesterId?: string;
  courseId?: string;
}) {
  const { data } =
    await apiClient.get<CourseSectionsResponse>(
      '/course-sections',
      {
        params: filters,
      },
    );

  return data;
}

export async function createCourseSection(
  input: SectionMutationInput,
) {
  const { data } = await apiClient.post<{
    success: boolean;
    section: CourseSection;
  }>('/course-sections', input);

  return data;
}

export async function updateCourseSection(
  id: string,
  input: Partial<SectionMutationInput>,
) {
  const { data } = await apiClient.patch<{
    success: boolean;
    section: CourseSection;
  }>(`/course-sections/${id}`, input);

  return data;
}

export async function removeCourseSection(id: string) {
  const { data } = await apiClient.delete<{
    success: boolean;
  }>(`/course-sections/${id}`);

  return data;
}

export async function getTeachers() {
  const { data } =
    await apiClient.get<TeachersResponse>(
      '/teachers',
    );

  return data.teachers;
}

export async function getClassrooms() {
  const { data } =
    await apiClient.get<ClassroomsResponse>(
      '/classrooms',
    );

  return data.classrooms;
}

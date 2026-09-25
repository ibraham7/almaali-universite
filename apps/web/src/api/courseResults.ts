import {
  apiClient,
} from './client';

export interface ResultSemester {
  id: string;
  academicYearId: string;
  nameAr: string;
  nameEn?: string | null;
  semesterNumber: number;
  requireMandatoryCourses: boolean;
}

export interface CourseResultImportResponse {
  success: boolean;
  imported: number;
  errors: string[];
}

export interface CourseResult {
  id: string;
  enrollmentItemId: string;
  studentId: string;
  courseId: string;
  semesterId: string;
  score: string | number;
  gradeLabel: string;
  gradePoint: string | number;
  passed: boolean;

  student: {
    id: string;
    universityId: string;
    firstName: string;
    middleName?: string | null;
    familyName: string;
  };

  course: {
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string | null;
    credits: number;
  };
}

export async function getResultSemesters() {
  const response =
    await apiClient.get<
      ResultSemester[]
    >('/semesters');

  return response.data;
}

export async function downloadResultsTemplate(
  semesterId: string,
) {
  const response =
    await apiClient.get<Blob>(
      `/course-results/template/${semesterId}`,
      {
        responseType: 'blob',
      },
    );

  return response;
}

export async function importCourseResults(
  semesterId: string,
  file: File,
) {
  const formData =
    new FormData();

  formData.append(
    'file',
    file,
  );

  const response =
    await apiClient.post<CourseResultImportResponse>(
      `/course-results/import/${semesterId}`,
      formData,
    );

  return response.data;
}

export async function getCourseResultsBySemester(
  semesterId: string,
) {
  const response =
    await apiClient.get<
      CourseResult[]
    >(
      `/course-results/semester/${semesterId}`,
    );

  return response.data;
}

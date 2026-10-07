import { apiClient } from './client';

export type CourseType =
    | 'THEORY'
    | 'PRACTICAL';

export type CourseRequirement =
    | 'MANDATORY'
    | 'ELECTIVE';

export type CourseStatus =
    | 'ACTIVE'
    | 'INACTIVE';

export interface Course {
    id: string;
    code: string;
    nameAr: string;
    nameEn?: string | null;
    credits: number;
    ects?: number | null;
    type: CourseType;
    requirement: CourseRequirement;
    description?: string | null;
    status: CourseStatus;

    prerequisites: Array<{
        id: string;
        courseId: string;
        prerequisiteId: string;
        prerequisite: {
            id: string;
            code: string;
            nameAr: string;
            nameEn?: string | null;
        };
    }>;

    planCourses?: Array<{
        id: string;
        studyPlanId: string;
        academicYearId: string;
        semesterId: string;
        priority: number;
        requirement: CourseRequirement;
        academicYear: {
            id: string;
            nameAr: string;
            nameEn?: string | null;
            levelNumber: number;
        };
        semester: {
            id: string;
            nameAr: string;
            nameEn?: string | null;
            semesterNumber: number;
        };
        studyPlan: {
            id: string;
            nameAr: string;
            nameEn?: string | null;
            program: {
                id: string;
                nameAr: string;
                nameEn?: string | null;
                college?: { id: string; nameAr: string; nameEn?: string | null } | null;
                department?: {
                    id: string;
                    nameAr: string;
                    nameEn?: string | null;
                    college: {
                        id: string;
                        nameAr: string;
                        nameEn?: string | null;
                    };
                } | null;
            };
        };
    }>;
}

export interface CoursePayload {
    code: string;
    nameAr: string;
    nameEn?: string;
    credits: number;
    ects?: number;
    type: CourseType;
    requirement: CourseRequirement;
    description?: string;
    status?: CourseStatus;
    studyPlanId?: string;
    academicYearId?: string;
    semesterId?: string;
}

interface CoursesResponse {
    success: boolean;
    count: number;
    courses: Course[];
}

export interface PrerequisiteMutationResponse {
    success: boolean;
    errors?: string[];
}

export async function getCourses() {
    const response =
        await apiClient.get<CoursesResponse>(
            '/courses',
        );

    return response.data;
}

export async function createCourse(
    payload: CoursePayload,
) {
    const response =
        await apiClient.post<Course>(
            '/courses',
            payload,
        );

    return response.data;
}

export async function updateCourse(
    id: string,
    payload: Partial<CoursePayload>,
) {
    const response =
        await apiClient.patch<Course>(
            `/courses/${id}`,
            payload,
        );

    return response.data;
}

export async function deleteCourse(id: string) {
    const response = await apiClient.delete<{ success: boolean; message: string }>(`/courses/${id}`);
    return response.data;
}

export async function addCoursePrerequisites(
    courseId: string,
    prerequisiteIds: string[],
) {
    const response =
        await apiClient.post<PrerequisiteMutationResponse>(
            `/courses/${courseId}/prerequisites/bulk`,
            { prerequisiteIds },
        );

    return response.data;
}

export async function addCoursePrerequisite(
    courseId: string,
    prerequisiteId: string,
) {
    return addCoursePrerequisites(
        courseId,
        [prerequisiteId],
    );
}

export async function removeCoursePrerequisite(
    courseId: string,
    prerequisiteId: string,
) {
    const response =
        await apiClient.delete<PrerequisiteMutationResponse>(
            `/courses/${courseId}/prerequisites/${prerequisiteId}`,
        );

    return response.data;
}

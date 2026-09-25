import {
    apiClient,
} from './client';

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

    requirement:
    CourseRequirement;

    description?:
    | string
    | null;

    status: CourseStatus;

    prerequisites: Array<{
        id: string;

        courseId: string;

        prerequisiteId: string;

        prerequisite: {
            id: string;

            code: string;

            nameAr: string;

            nameEn?:
            | string
            | null;
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

    requirement:
    CourseRequirement;

    description?: string;

    status?: CourseStatus;
}

interface CoursesResponse {
    success: boolean;

    count: number;

    courses: Course[];
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

export async function addCoursePrerequisite(
    courseId: string,
    prerequisiteId: string,
) {
    const response =
        await apiClient.post(
            '/courses/prerequisites',
            {
                courseId,
                prerequisiteId,
            },
        );

    return response.data;
}

export async function removeCoursePrerequisite(
    courseId: string,
    prerequisiteId: string,
) {
    const response =
        await apiClient.delete(
            `/courses/${courseId}/prerequisites/${prerequisiteId}`,
        );

    return response.data;
}
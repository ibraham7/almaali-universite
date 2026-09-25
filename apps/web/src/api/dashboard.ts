import { apiClient } from './client';

export interface DashboardStudent {
    id: string;
    advisorId?: string | null;
}

export interface DashboardCourse {
    id: string;
}

export interface DashboardSection {
    id: string;
    status?: string;
}

export interface DashboardEnrollment {
    id: string;
    status: string;
}

export interface DashboardApproval {
    id: string;
    status: string;
}

export interface StudentRegistrationContext {
    registrationOpen?: boolean;

    enrollment?: {
        id: string;
        status: string;

        items?: Array<{
            id: string;

            course?: {
                id?: string;
                credits?: number;
            };

            section?: {
                id?: string;
            };
        }>;
    } | null;

    filteredCourses?: unknown[];
}

function extractArray<T>(
    value: unknown,
    possibleKeys: string[] = [],
): T[] {
    if (Array.isArray(value)) {
        return value as T[];
    }

    if (
        value &&
        typeof value === 'object'
    ) {
        const record =
            value as Record<
                string,
                unknown
            >;

        for (const key of possibleKeys) {
            if (
                Array.isArray(record[key])
            ) {
                return record[key] as T[];
            }
        }
    }

    return [];
}

export async function getDashboardStudents() {
    const response =
        await apiClient.get('/students');

    return extractArray<DashboardStudent>(
        response.data,
        ['students', 'data'],
    );
}

export async function getDashboardCourses() {
    const response =
        await apiClient.get('/courses');

    return extractArray<DashboardCourse>(
        response.data,
        ['courses', 'data'],
    );
}

export async function getDashboardSections() {
    const response =
        await apiClient.get(
            '/course-sections',
        );

    return extractArray<DashboardSection>(
        response.data,
        ['sections', 'data'],
    );
}

export async function getDashboardEnrollments() {
    const response =
        await apiClient.get(
            '/student-enrollments',
        );

    return extractArray<DashboardEnrollment>(
        response.data,
        [
            'enrollments',
            'items',
            'data',
        ],
    );
}

export async function getMyAdvisorApprovals() {
    const response =
        await apiClient.get(
            '/advisor-approvals/me',
        );

    return extractArray<DashboardApproval>(
        response.data,
        [
            'approvals',
            'items',
            'data',
        ],
    );
}

export async function getStudentDashboardRegistration() {
    const response =
        await apiClient.get<StudentRegistrationContext>(
            '/student-enrollments/me/registration',
        );

    return response.data;
}
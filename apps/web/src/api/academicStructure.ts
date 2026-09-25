import {
    apiClient,
} from './client';

export interface College {
    id: string;
    universityId: string;

    nameAr: string;
    nameEn?: string | null;

    createdAt?: string;
    updatedAt?: string;
}

export interface Department {
    id: string;
    collegeId: string;

    nameAr: string;
    nameEn?: string | null;

    createdAt?: string;
    updatedAt?: string;
}

export interface Program {
    id: string;
    departmentId: string;

    nameAr: string;
    nameEn?: string | null;

    createdAt?: string;
    updatedAt?: string;
}

export interface StudyPlan {
    id: string;
    programId: string;

    nameAr: string;
    nameEn?: string | null;

    createdAt?: string;
    updatedAt?: string;
}

export interface AcademicLevel {
    id: string;

    studyPlanId: string;

    nameAr: string;
    nameEn?: string | null;

    levelNumber: number;

    createdAt?: string;
    updatedAt?: string;
}

export interface Semester {
    id: string;

    academicYearId: string;

    nameAr: string;
    nameEn?: string | null;

    semesterNumber: number;

    requireMandatoryCourses: boolean;

    createdAt?: string;
    updatedAt?: string;
}

export async function getColleges() {
    const response =
        await apiClient.get<College[]>(
            '/colleges',
        );

    return response.data;
}

export async function createCollege(
    data: {
        universityId: string;

        nameAr: string;

        nameEn?: string;
    },
) {
    const response =
        await apiClient.post<College>(
            '/colleges',
            data,
        );

    return response.data;
}

export async function updateCollege(
    id: string,
    data: {
        nameAr?: string;
        nameEn?: string;
    },
) {
    const response =
        await apiClient.patch<College>(
            `/colleges/${id}`,
            data,
        );

    return response.data;
}

export async function getDepartments() {
    const response =
        await apiClient.get<
            Department[]
        >('/departments');

    return response.data;
}

export async function createDepartment(
    data: {
        collegeId: string;
        nameAr: string;
        nameEn?: string;
    },
) {
    const response =
        await apiClient.post<Department>(
            '/departments',
            data,
        );

    return response.data;
}

export async function updateDepartment(
    id: string,
    data: {
        nameAr?: string;
        nameEn?: string;
    },
) {
    const response =
        await apiClient.patch<Department>(
            `/departments/${id}`,
            data,
        );

    return response.data;
}

export async function getPrograms() {
    const response =
        await apiClient.get<Program[]>(
            '/programs',
        );

    return response.data;
}

export async function createProgram(
    data: {
        departmentId: string;

        nameAr: string;

        nameEn?: string;
    },
) {
    const response =
        await apiClient.post<Program>(
            '/programs',
            data,
        );

    return response.data;
}

export async function updateProgram(
    id: string,
    data: {
        nameAr?: string;
        nameEn?: string;
    },
) {
    const response =
        await apiClient.patch<Program>(
            `/programs/${id}`,
            data,
        );

    return response.data;
}

export async function getStudyPlans() {
    const response =
        await apiClient.get<StudyPlan[]>(
            '/study-plans',
        );

    return response.data;
}

export async function createStudyPlan(
    data: {
        programId: string;

        nameAr: string;

        nameEn?: string;
    },
) {
    const response =
        await apiClient.post<StudyPlan>(
            '/study-plans',
            data,
        );

    return response.data;
}

export async function updateStudyPlan(
    id: string,
    data: {
        nameAr?: string;
        nameEn?: string;
    },
) {
    const response =
        await apiClient.patch<StudyPlan>(
            `/study-plans/${id}`,
            data,
        );

    return response.data;
}

export async function getAcademicLevels() {
    const response =
        await apiClient.get<
            AcademicLevel[]
        >('/academic-years');

    return response.data;
}

export async function createAcademicLevel(
    data: {
        studyPlanId: string;

        nameAr: string;

        nameEn?: string;

        levelNumber: number;
    },
) {
    const response =
        await apiClient.post<AcademicLevel>(
            '/academic-years',
            data,
        );

    return response.data;
}

export async function updateAcademicLevel(
    id: string,
    data: {
        nameAr?: string;

        nameEn?: string;

        levelNumber?: number;
    },
) {
    const response =
        await apiClient.patch<AcademicLevel>(
            `/academic-years/${id}`,
            data,
        );

    return response.data;
}

export async function getSemesters() {
    const response =
        await apiClient.get<Semester[]>(
            '/semesters',
        );

    return response.data;
}

export async function createSemester(
    data: {
        academicYearId: string;

        nameAr: string;

        nameEn?: string;

        semesterNumber: number;

        requireMandatoryCourses?: boolean;
    },
) {
    const response =
        await apiClient.post<Semester>(
            '/semesters',
            data,
        );

    return response.data;
}

export async function updateSemester(
    id: string,
    data: {
        nameAr?: string;

        nameEn?: string;

        semesterNumber?: number;

        requireMandatoryCourses?: boolean;
    },
) {
    const response =
        await apiClient.patch<Semester>(
            `/semesters/${id}`,
            data,
        );

    return response.data;
}
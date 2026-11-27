import {
    apiClient,
} from './client';

export interface College {
    id: string;
    universityId: string;

    nameAr: string;
    nameEn?: string | null;
    code?: string | null;
    isActive?: boolean;

    createdAt?: string;
    updatedAt?: string;
}

export interface Department {
    id: string;
    collegeId: string;

    nameAr: string;
    nameEn?: string | null;
    isActive?: boolean;
    college?: College;

    createdAt?: string;
    updatedAt?: string;
}

export type ProgramLevel = 'BACHELOR' | 'DIPLOMA' | 'MASTER' | 'DOCTORATE';

export const PROGRAM_LEVEL_OPTIONS: Array<{ value: ProgramLevel; label: string }> = [
    { value: 'BACHELOR', label: 'بكالوريوس' },
    { value: 'DIPLOMA', label: 'دبلوم' },
    { value: 'MASTER', label: 'ماجستير' },
    { value: 'DOCTORATE', label: 'دكتوراه' },
];

export interface Program {
    id: string;
    level?: ProgramLevel;
    departmentId?: string | null;
    collegeId?: string | null;

    nameAr: string;
    nameEn?: string | null;
    isActive?: boolean;
    department?: Department;
    college?: College;
    departmentName?: string;
    collegeName?: string;

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
    isActive: boolean;

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

        code?: string;
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
        code?: string;
        isActive?: boolean;
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
        isActive?: boolean;
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
        level: ProgramLevel;
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
        level?: ProgramLevel;
        isActive?: boolean;
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

        isActive?: boolean;
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

        isActive?: boolean;
    },
) {
    const response =
        await apiClient.patch<Semester>(
            `/semesters/${id}`,
            data,
        );

    return response.data;
}

// ما يصلح للاختيار عند إضافة طالب أو نقله أو استيراده: غير معطّل هو ولا ما فوقه.
// (الكلية المعطّلة تعطّل أقسامها وبرامجها عند الاختيار. القيمة المختارة حاليًا تبقى ظاهرة عبر keepIds.)
export function selectableStructure(
    colleges: College[],
    departments: Department[],
    programs: Program[],
    keepIds: Array<string | null | undefined> = [],
) {
    const keep = new Set(keepIds.filter(Boolean) as string[]);
    const collegeOn = new Map(colleges.map((item) => [item.id, item.isActive !== false]));
    const departmentOn = new Map(departments.map((item) => [item.id, item.isActive !== false && collegeOn.get(item.collegeId) !== false]));
    return {
        colleges: colleges.filter((item) => item.isActive !== false || keep.has(item.id)),
        departments: departments.filter((item) => departmentOn.get(item.id) !== false || keep.has(item.id)),
        programs: programs.filter((item) => {
            const on = item.isActive !== false
                && (!item.departmentId || departmentOn.get(item.departmentId) !== false)
                && (!item.collegeId || collegeOn.get(item.collegeId) !== false);
            return on || keep.has(item.id);
        }),
    };
}

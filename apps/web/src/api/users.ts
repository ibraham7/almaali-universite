import {
    apiClient,
} from './client';

export type UserStatus =
    | 'PENDING_VERIFICATION'
    | 'ACTIVE'
    | 'SUSPENDED'
    | 'LOCKED'
    | 'DISABLED';

export type RoleCode =
    | 'STUDENT'
    | 'ADVISOR'
    | 'REGISTRAR'
    | 'SYSTEM_ADMIN';

export interface Role {
    id: string;

    code: RoleCode;

    name: string;

    description?: string | null;

    isActive: boolean;
}

export interface UserStudent {
    id: string;

    universityId: string;

    firstName: string;

    middleName?: string | null;

    familyName: string;

    universityEmail?: string | null;
}

export interface SystemUser {
    id: string;

    email: string;

    status: UserStatus;

    roleId: string;

    role: Role;

    student?: UserStudent | null;

    createdAt: string;

    updatedAt: string;

    lastLoginAt?: string | null;
}

export async function getUsers(
    params?: {
        search?: string;

        status?: string;

        role?: string;
    },
) {
    const response =
        await apiClient.get<
            SystemUser[]
        >('/users', {
            params,
        });

    return response.data;
}

export async function getRoles() {
    const response =
        await apiClient.get<
            Role[]
        >('/users/roles');

    return response.data;
}

export async function getSignupAttempts() {
    const response = await apiClient.get<{ failedCount: number; attempts: Array<{ id: string; succeeded: boolean; createdAt: string }> }>('/users/signup-attempts');
    return response.data;
}

export async function resetStudentSignup(id: string) {
    const response = await apiClient.post<{ reset: boolean }>(`/users/${id}/reset-signup`);
    return response.data;
}

export async function getUser(
    id: string,
) {
    const response =
        await apiClient.get<SystemUser>(
            `/users/${id}`,
        );

    return response.data;
}

export async function updateUserStatus(
    id: string,
    status: UserStatus,
) {
    const response =
        await apiClient.patch<SystemUser>(
            `/users/${id}/status`,
            {
                status,
            },
        );

    return response.data;
}

export async function updateUserRole(
    id: string,
    roleCode: RoleCode,
) {
    const response =
        await apiClient.patch<SystemUser>(
            `/users/${id}/role`,
            {
                roleCode,
            },
        );

    return response.data;
}

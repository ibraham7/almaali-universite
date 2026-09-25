import {
    apiClient,
} from './client';

export type UserStatus =
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
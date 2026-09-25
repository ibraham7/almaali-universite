import { apiClient } from './client';

export type AdvisorApprovalStatus =
    | 'PENDING'
    | 'APPROVED'
    | 'REJECTED';

export interface AdvisorApproval {
    id: string;
    enrollmentId: string;
    advisorId: string;
    status: AdvisorApprovalStatus;
    note?: string | null;
    createdAt: string;
    updatedAt: string;

    enrollment: {
        id: string;
        semesterId: string;
        status: string;

        student: {
            id: string;
            universityId: string;
            firstName: string;
            middleName?: string | null;
            familyName: string;
            englishName?: string | null;
            universityEmail?: string | null;
        };

        items: Array<{
            id: string;

            course: {
                id: string;
                code: string;
                nameAr: string;
                nameEn?: string | null;
                credits: number;
            };

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

                schedules: Array<{
                    id: string;
                    day: string;
                    startTime: string;
                    endTime: string;
                }>;
            };
        }>;
    };
}

export async function getMyAdvisorApprovals() {
    const { data } = await apiClient.get<
        AdvisorApproval[]
    >('/advisor-approvals/me');

    return data;
}

export async function updateAdvisorApproval(
    approvalId: string,
    payload: {
        status: 'APPROVED' | 'REJECTED';
        note?: string;
    },
) {
    const { data } =
        await apiClient.patch<AdvisorApproval>(
            `/advisor-approvals/${approvalId}`,
            payload,
        );

    return data;
}
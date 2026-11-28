import { apiClient } from './client';
import type { ReferralOutcome, RequestStatus, StudentFile, StudentFileRow } from './affairs';

// مساحة المشرف الأكاديمي في شؤون الطلاب: كلها محصورة بنطاقه وبما أُحيل إليه.
export interface AdvisorInboxItem {
  id: string; requestId: string; requestNumber: string; serviceName: string; studentName: string; studentUniversityId: string;
  mode: 'OPINION' | 'EXECUTION'; decisionAllowed: boolean; reason: string; requested: string | null; dueAt: string | null;
  status: 'PENDING' | 'ANSWERED' | 'CANCELLED'; outcome: ReferralOutcome | null; createdAt: string; respondedAt: string | null; overdue: boolean; targetLabel: string;
}
export interface AdvisorReferralDetail {
  id: string; mode: 'OPINION' | 'EXECUTION'; decisionAllowed: boolean; reason: string; requested: string | null; dueAt: string | null;
  status: 'PENDING' | 'ANSWERED' | 'CANCELLED'; outcome: ReferralOutcome | null; responseNote: string | null; respondedAt: string | null; createdAt: string;
  allowedOutcomes: Array<'APPROVED' | 'REJECTED' | 'NOTES' | 'NEEDS_INFO'>;
  request: {
    id: string; number: string; status: RequestStatus; subject: string | null; details: string | null; dueAt: string | null; createdAt: string; serviceName: string; workflowNote: string | null; owner: string | null;
    student: { id: string; universityId: string; name: string; status: string; college: string | null; program: string | null };
    attachments: Array<{ id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string }>;
    timeline: Array<{ id: string; type: string; note: string | null; toStatus: RequestStatus | null; createdAt: string }>;
    otherReferrals: Array<{ id: string; targetLabel: string; status: string; outcome: ReferralOutcome | null; responseNote: string | null; createdAt: string }>;
  };
}
export interface AdvisorRequestRow {
  id: string; number: string; serviceName: string; studentName: string; studentUniversityId: string; status: RequestStatus; dueAt: string | null; createdAt: string; overdue: boolean; owner: string | null; pendingReferralId: string | null;
}
export interface AdvisorOverview { colleges: string[]; byStatus: Record<string, number>; total: number; open: number; overdue: number; pendingReferrals: number; answeredLast30Days: number }
interface Page<T> { total: number; page: number; pageSize: number; items: T[] }

const get = async <T>(url: string, params?: object) => (await apiClient.get<T>(`/advisor-affairs${url}`, { params })).data;
export const getAdvisorOverview = () => get<AdvisorOverview>('/overview');
export const getAdvisorInbox = (filter: string, page: number) => get<Page<AdvisorInboxItem>>('/inbox', { filter, page });
export const getAdvisorReferral = (id: string) => get<AdvisorReferralDetail>(`/referrals/${id}`);
export const respondAdvisorReferral = async (id: string, body: { outcome: string; note?: string }) => (await apiClient.post<{ ok: boolean; status: string }>(`/advisor-affairs/referrals/${id}/respond`, body)).data;
export const downloadAdvisorAttachment = async (referralId: string, attachmentId: string) =>
  (await apiClient.get<Blob>(`/advisor-affairs/referrals/${referralId}/attachments/${attachmentId}/download`, { responseType: 'blob' })).data;
export const getAdvisorRequests = (filter: string, page: number) => get<Page<AdvisorRequestRow>>('/requests', { filter, page });
export const getAdvisorStudents = (search: string | undefined, page: number) => get<Page<StudentFileRow>>('/students', { search, page });
export const getAdvisorStudentFile = (id: string) => get<StudentFile>(`/students/${id}/file`);

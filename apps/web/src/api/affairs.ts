import { apiClient } from './client';

export type RequestStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_COMPLETION' | 'REFERRED' | 'ACCEPTED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type RequestChannel = 'ONLINE' | 'IN_PERSON';
export type ServiceChannel = 'ONLINE' | 'IN_PERSON' | 'BOTH';
export type ServiceOutcome = 'NONE' | 'DOCUMENT' | 'ACTION' | 'BOTH';
export type ReferralTarget = 'ACADEMIC_AFFAIRS' | 'FINANCIAL_AFFAIRS' | 'COLLEGE' | 'OTHER';
export type ReferralMode = 'OPINION' | 'EXECUTION';
export type ReferralStatus = 'PENDING' | 'ANSWERED' | 'CANCELLED';
export type DocumentStatus = 'ACTIVE' | 'REVOKED';
export type ReferralOutcome = 'APPROVED' | 'REJECTED' | 'NOTES' | 'DONE' | 'NOT_DONE';

export interface AffairsServiceItem {
  id: string; code: string; nameAr: string; description: string | null; isActive: boolean; expectedDays: number; specialization: string | null;
  channel: ServiceChannel; outcome: ServiceOutcome; attachmentsNote: string | null; feeNote: string | null; workflowNote: string | null;
  documentTypeId: string | null;
}
export interface AffairsStaffItem {
  id: string; userId: string; name: string; email: string; specialization: string | null; isActive: boolean; serviceIds: string[]; open: number; done: number;
}
export interface StaffCandidate { id: string; email: string; displayName: string | null; username: string | null }
export interface RequestRow {
  id: string; number: string; status: RequestStatus; channel: RequestChannel; subject: string | null; createdAt: string; dueAt: string | null; closedAt: string | null; updatedAt: string;
  student: { id: string; universityId: string; name: string };
  service: { id: string; code: string; nameAr: string };
  assignedStaff: { id: string; name: string } | null;
}
export interface RequestEvent {
  id: string; type: string; fromStatus: RequestStatus | null; toStatus: RequestStatus | null; note: string | null; createdAt: string;
  visibleToStudent?: boolean; actor?: string | null;
}
export interface AttachmentItem {
  id: string; fileName: string; mimeType: string; sizeBytes: number; createdAt: string; visibleToStudent?: boolean; uploadedBy?: 'student' | 'staff';
}
export interface ReferralItem {
  id: string; requestId: string; mode: ReferralMode; target: ReferralTarget; targetName: string | null; reason: string; requested: string | null; dueAt: string | null;
  status: ReferralStatus; outcome: ReferralOutcome | null; responseNote: string | null; respondedAt: string | null; cancelReason: string | null; createdAt: string;
}
export interface RequestDetails extends Omit<RequestRow, 'student' | 'service'> {
  details: string | null; decisionReason: string | null;
  student: { id: string; universityId: string; name: string; phone: string | null; status: string; universityEmail: string | null };
  service: { id: string; code: string; nameAr: string; attachmentsNote: string | null; feeNote: string | null; workflowNote: string | null };
  canAct: boolean; canTake: boolean; allowedStatuses: RequestStatus[]; events: RequestEvent[];
  attachments: AttachmentItem[]; referrals: ReferralItem[]; pendingReferral: ReferralItem | null;
  documents: RequestDocument[]; documentTypeName: string | null; canIssueDocument: boolean;
}
export interface AffairsSummary {
  counts: { new: number; mine: number; waiting: number; referred: number; doneToday: number; overdue: number };
  recentEvents: { id: string; type: string; toStatus: RequestStatus | null; note: string | null; createdAt: string; requestId: string; requestNumber: string; serviceName: string }[];
  staffLoad?: { id: string; name: string; open: number; done: number }[];
}
export interface OperationItem extends RequestEvent { actor: string | null; requestId: string; requestNumber: string; serviceName: string }
export interface StudentMyRequest { id: string; number: string; status: RequestStatus; subject: string | null; createdAt: string; closedAt: string | null; service: { nameAr: string } }
export interface StudentMyRequestDetails extends StudentMyRequest { details: string | null; decisionReason: string | null; dueAt: string | null; events: RequestEvent[]; attachments: AttachmentItem[]; channel: RequestChannel; documents: RequestDocument[] }
export interface ReferralRow {
  id: string; mode: ReferralMode; target: ReferralTarget; targetLabel: string; reason: string; requested: string | null; dueAt: string | null; status: ReferralStatus;
  outcome: ReferralOutcome | null; responseNote: string | null; respondedAt: string | null; createdAt: string; requestId: string; requestNumber: string;
  requestStatus: RequestStatus; serviceName: string; studentName: string; studentUniversityId: string; originalStaff: string | null;
}
export interface StudentFileRow { id: string; universityId: string; name: string; status: string; college: string | null }
export interface StudentFile {
  id: string; name: string;
  personal: Record<string, string | null>;
  contact: { phone: string | null; universityEmail: string | null };
  university: { universityId: string; status: string; admissionDate: string | null; college: string | null; department: string | null; program: string | null; advisor: string | null };
  numberHistory: { universityId: string; college: string | null; replacedBy: string; reason: string | null; validFrom: string; validTo: string; changedBy: string | null }[];
  requests: { id: string; number: string; status: RequestStatus; channel: RequestChannel; subject: string | null; createdAt: string; closedAt: string | null; service: string; referrals: { id: string; status: ReferralStatus }[] }[];
  attachments: (AttachmentItem & { requestId: string; requestNumber: string })[];
  documents: { id: string; number: string; status: DocumentStatus; issuedAt: string; revokedAt: string | null; revokedReason: string | null; typeName: string }[];
  dataChanges: { id: string; field: string; oldValue: string | null; newValue: string | null; createdAt: string; changedBy: string | null }[];
}

const get = async <T,>(url: string, params?: object) => (await apiClient.get<T>(url, { params })).data;
const post = async <T,>(url: string, body: object) => (await apiClient.post<T>(url, body)).data;
const patch = async <T,>(url: string, body: object) => (await apiClient.patch<T>(url, body)).data;

export const getAffairsSummary = () => get<AffairsSummary>('/affairs/summary');
export const getAffairsOperations = (page: number) => get<{ items: OperationItem[]; hasMore: boolean; page: number }>('/affairs/operations', { page });
export const getAffairsServices = () => get<AffairsServiceItem[]>('/affairs/services');
export const createAffairsService = (body: object) => post<AffairsServiceItem>('/affairs/services', body);
export const updateAffairsService = (id: string, body: object) => patch<AffairsServiceItem>(`/affairs/services/${id}`, body);
export const getAffairsStaff = () => get<AffairsStaffItem[]>('/affairs/staff');
export const getStaffCandidates = () => get<StaffCandidate[]>('/affairs/staff/candidates');
export const createAffairsStaff = (body: object) => post<unknown>('/affairs/staff', body);
export const updateAffairsStaff = (id: string, body: object) => patch<unknown>(`/affairs/staff/${id}`, body);
export const searchAffairsStudents = (q: string) => get<{ id: string; universityId: string; name: string }[]>('/affairs/students/search', { q });
export const getAffairsRequests = (params: object) => get<{ items: RequestRow[]; total: number; page: number; pageSize: number }>('/affairs/requests', params);
export const getAffairsRequest = (id: string) => get<RequestDetails>(`/affairs/requests/${id}`);
export const createAffairsRequest = (body: object) => post<{ id: string; number: string }>('/affairs/requests', body);
export const assignAffairsRequest = (id: string, body: object) => post<unknown>(`/affairs/requests/${id}/assign`, body);
export const changeAffairsStatus = (id: string, body: object) => post<unknown>(`/affairs/requests/${id}/status`, body);
export const commentAffairsRequest = (id: string, body: object) => post<unknown>(`/affairs/requests/${id}/comment`, body);

// attachments (multipart needs the header set explicitly)
const upload = async (url: string, file: File) => {
  const form = new FormData();
  form.append('file', file);
  return (await apiClient.post<AttachmentItem>(url, form, { headers: { 'Content-Type': 'multipart/form-data' } })).data;
};
export const uploadStaffAttachment = (requestId: string, file: File) => upload(`/affairs/requests/${requestId}/attachments`, file);
export const uploadMyAttachment = (requestId: string, file: File) => upload(`/affairs/my/requests/${requestId}/attachments`, file);
export const archiveAttachment = (requestId: string, attachmentId: string, reason: string) => post<unknown>(`/affairs/requests/${requestId}/attachments/${attachmentId}/archive`, { reason });
export const downloadStaffAttachment = async (requestId: string, attachmentId: string) =>
  (await apiClient.get<Blob>(`/affairs/requests/${requestId}/attachments/${attachmentId}/download`, { responseType: 'blob' })).data;
export const downloadMyAttachment = async (requestId: string, attachmentId: string) =>
  (await apiClient.get<Blob>(`/affairs/my/requests/${requestId}/attachments/${attachmentId}/download`, { responseType: 'blob' })).data;

// referrals
export const createReferral = (requestId: string, body: object) => post<ReferralItem>(`/affairs/requests/${requestId}/referrals`, body);
export const respondReferral = (id: string, body: object) => post<unknown>(`/affairs/referrals/${id}/respond`, body);
export const cancelReferral = (id: string, body: object) => post<unknown>(`/affairs/referrals/${id}/cancel`, body);
export const getReferrals = (params: object) => get<{ items: ReferralRow[]; total: number; page: number; pageSize: number }>('/affairs/referrals', params);

// student files
export const getStudentFiles = (params: object) => get<{ items: StudentFileRow[]; total: number; page: number; pageSize: number }>('/affairs/students', params);
export const getStudentFile = (id: string) => get<StudentFile>(`/affairs/students/${id}/file`);

export const getMyAffairsServices = () => get<Pick<AffairsServiceItem, 'id' | 'code' | 'nameAr' | 'description' | 'expectedDays' | 'attachmentsNote' | 'feeNote'>[]>('/affairs/my/services');
export const getMyAffairsRequests = () => get<StudentMyRequest[]>('/affairs/my/requests');
export const getMyAffairsRequest = (id: string) => get<StudentMyRequestDetails>(`/affairs/my/requests/${id}`);
export const createMyAffairsRequest = (body: object) => post<{ id: string; number: string }>('/affairs/my/requests', body);

// documents
export interface RequestDocument { id: string; number: string; status: DocumentStatus; issuedAt: string; typeName: string }
export interface DocumentTypeItem {
  id: string; code: string; nameAr: string; titleAr: string; issuingBody: string; bodyTemplate: string; footerNote: string | null; includesResults: boolean; isActive: boolean;
}
export interface IssuedDocumentRow {
  id: string; number: string; typeName: string; status: DocumentStatus; issuedAt: string; revokedAt: string | null; revokedReason: string | null;
  studentName: string; universityId: string; requestNumber: string | null; requestId: string | null;
}
export interface DocumentPayload {
  type: { nameAr: string; titleAr: string; issuingBody: string; footerNote: string | null };
  student: { studentName: string; universityId: string; college: string | null; department: string | null; program: string | null; status: string; date: string };
  body: string;
  results: { semester: string; code: string; name: string; credits: number; score: string; grade: string; passed: boolean }[] | null;
  issuedDate: string; issuedBy: string | null; requestNumber: string;
}
export interface DocumentView {
  id: string; number: string; verificationCode: string; status: DocumentStatus; issuedAt: string; typeName: string; payload: DocumentPayload;
  revokedAt: string | null; revokedReason: string | null; requestId: string | null; studentId: string;
}
export interface DocumentVerifyResult {
  status: 'VALID' | 'REVOKED' | 'NOT_FOUND'; number?: string; typeName?: string; issuingBody?: string; issuedAt?: string; studentName?: string; revokedAt?: string | null;
}
export const getDocumentTypes = () => get<DocumentTypeItem[]>('/affairs/documents/types');
export const createDocumentType = (body: object) => post<DocumentTypeItem>('/affairs/documents/types', body);
export const updateDocumentType = (id: string, body: object) => patch<DocumentTypeItem>(`/affairs/documents/types/${id}`, body);
export const getIssuedDocuments = (params: object) => get<{ items: IssuedDocumentRow[]; total: number; page: number; pageSize: number }>('/affairs/documents', params);
export const getDocument = (id: string) => get<DocumentView>(`/affairs/documents/${id}`);
export const issueDocument = (requestId: string) => post<{ id: string; number: string }>(`/affairs/requests/${requestId}/documents`, {});
export const revokeDocument = (id: string, reason: string) => post<unknown>(`/affairs/documents/${id}/revoke`, { reason });
export const verifyDocument = (code: string) => get<DocumentVerifyResult>(`/documents/verify/${encodeURIComponent(code)}`);

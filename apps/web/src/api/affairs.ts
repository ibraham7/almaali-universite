import { apiClient } from './client';

export type RequestStatus = 'NEW' | 'ASSIGNED' | 'IN_PROGRESS' | 'WAITING_COMPLETION' | 'REFERRED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';

export interface AffairsServiceItem {
  id: string; code: string; nameAr: string; description: string | null; isActive: boolean; expectedDays: number; specialization: string | null;
}
export interface AffairsStaffItem {
  id: string; userId: string; name: string; email: string; specialization: string | null; isActive: boolean; serviceIds: string[]; open: number; done: number;
}
export interface StaffCandidate { id: string; email: string; displayName: string | null; username: string | null }
export interface RequestRow {
  id: string; number: string; status: RequestStatus; subject: string | null; createdAt: string; dueAt: string | null; closedAt: string | null;
  student: { id: string; universityId: string; name: string };
  service: { id: string; code: string; nameAr: string };
  assignedStaff: { id: string; name: string } | null;
}
export interface RequestEvent {
  id: string; type: string; fromStatus: RequestStatus | null; toStatus: RequestStatus | null; note: string | null; createdAt: string;
  visibleToStudent?: boolean; actor?: string | null;
}
export interface RequestDetails extends Omit<RequestRow, 'student'> {
  details: string | null; decisionReason: string | null;
  student: { id: string; universityId: string; name: string; phone: string | null; status: string; universityEmail: string | null };
  canAct: boolean; canTake: boolean; allowedStatuses: RequestStatus[]; events: RequestEvent[];
}
export interface AffairsSummary {
  counts: { new: number; mine: number; waiting: number; referred: number; doneToday: number; overdue: number };
  recentEvents: { id: string; type: string; toStatus: RequestStatus | null; note: string | null; createdAt: string; requestId: string; requestNumber: string; serviceName: string }[];
  staffLoad?: { id: string; name: string; open: number; done: number }[];
}
export interface OperationItem extends RequestEvent { actor: string | null; requestId: string; requestNumber: string; serviceName: string }
export interface StudentMyRequest { id: string; number: string; status: RequestStatus; subject: string | null; createdAt: string; closedAt: string | null; service: { nameAr: string } }
export interface StudentMyRequestDetails extends StudentMyRequest { details: string | null; decisionReason: string | null; dueAt: string | null; events: RequestEvent[] }

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

export const getMyAffairsServices = () => get<Pick<AffairsServiceItem, 'id' | 'code' | 'nameAr' | 'description' | 'expectedDays'>[]>('/affairs/my/services');
export const getMyAffairsRequests = () => get<StudentMyRequest[]>('/affairs/my/requests');
export const getMyAffairsRequest = (id: string) => get<StudentMyRequestDetails>(`/affairs/my/requests/${id}`);
export const createMyAffairsRequest = (body: object) => post<{ id: string; number: string }>('/affairs/my/requests', body);

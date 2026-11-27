// Pure business rules for student-affairs requests (no database access, easy to unit test).

export type RequestStatus =
  | 'NEW'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING_COMPLETION'
  | 'REFERRED'
  | 'ACCEPTED'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED';

export const TERMINAL_STATUSES: RequestStatus[] = ['COMPLETED', 'REJECTED', 'CANCELLED'];
export const OPEN_STATUSES: RequestStatus[] = ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_COMPLETION', 'REFERRED', 'ACCEPTED'];

export const TRANSITIONS: Record<RequestStatus, RequestStatus[]> = {
  NEW: ['ASSIGNED', 'CANCELLED', 'REJECTED'],
  ASSIGNED: ['IN_PROGRESS', 'REJECTED', 'REFERRED', 'WAITING_COMPLETION', 'CANCELLED'],
  IN_PROGRESS: ['ACCEPTED', 'COMPLETED', 'REJECTED', 'REFERRED', 'WAITING_COMPLETION'],
  WAITING_COMPLETION: ['IN_PROGRESS', 'CANCELLED', 'REJECTED'],
  REFERRED: ['IN_PROGRESS', 'ACCEPTED', 'COMPLETED', 'REJECTED'],
  // Accepted is not the same as completed: an executive step or a document may still follow.
  ACCEPTED: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  REJECTED: [],
  CANCELLED: [],
};

// A written reason is mandatory when moving to these statuses (and when reassigning).
export const REASON_REQUIRED: RequestStatus[] = ['REJECTED', 'CANCELLED', 'REFERRED', 'WAITING_COMPLETION'];

export function isTerminal(status: RequestStatus) {
  return TERMINAL_STATUSES.includes(status);
}

export function canTransition(from: RequestStatus, to: RequestStatus) {
  return TRANSITIONS[from].includes(to);
}

export function reasonRequired(to: RequestStatus) {
  return REASON_REQUIRED.includes(to);
}

export function requestNumber(year: number, sequence: number) {
  return `SR-${String(year % 100).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`;
}

// Least-loaded staff member (ties are broken by id so the choice is stable).
export function pickLeastLoaded(candidates: { id: string; open: number }[]): string | null {
  if (candidates.length === 0) return null;
  return [...candidates].sort((a, b) => a.open - b.open || a.id.localeCompare(b.id))[0].id;
}

// تعريف الخدمة: ما هو إلزامي لتكون الخدمة صالحة للتفعيل. (القناة لها قيمة دائمًا، والبيانات المطلوبة ومسار المعالجة اختياريان.)
const SERVICE_REQUIRED_FIELDS: Array<[keyof ServiceDraft, string]> = [
  ['specialization', 'الجهة المسؤولة (الاختصاص)'],
  ['attachmentsNote', 'المرفقات المطلوبة (اكتب «لا يوجد» إن لم يكن هناك)'],
  ['feeNote', 'الرسوم (اكتب «بدون رسوم» إن لم يكن هناك)'],
];

export interface ServiceDraft {
  specialization?: string | null;
  attachmentsNote?: string | null;
  feeNote?: string | null;
}

// يرجع أسماء الحقول الناقصة. activeStaff: عدد الموظفين الفعّالين المرتبطين بالخدمة (يُتحقق منه عند التفعيل فقط: pass undefined لتخطيه).
export function serviceMissing(service: ServiceDraft, activeStaff?: number): string[] {
  const missing = SERVICE_REQUIRED_FIELDS.filter(([key]) => !service[key]?.trim()).map(([, label]) => label);
  if (activeStaff !== undefined && activeStaff < 1) missing.push('موظف مسؤول واحد على الأقل (اربطه من تبويب الموظفين)');
  return missing;
}

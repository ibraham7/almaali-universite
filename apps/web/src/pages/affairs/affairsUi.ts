import axios from 'axios';
import type { ReferralOutcome, ReferralTarget, RequestChannel, RequestStatus, ServiceChannel, ServiceOutcome } from '../../api/affairs';

// "Assigned" is a new request that already has an owner but has not been reviewed yet.
export const STATUS_LABEL: Record<RequestStatus, string> = {
  NEW: 'جديد', ASSIGNED: 'جديد (مسند)', IN_PROGRESS: 'قيد المراجعة', WAITING_COMPLETION: 'بانتظار الاستكمال',
  REFERRED: 'بانتظار جهة أخرى', ACCEPTED: 'مقبول', COMPLETED: 'مكتمل', REJECTED: 'مرفوض', CANCELLED: 'ملغى',
};

export const STATUS_COLOR: Record<RequestStatus, 'default' | 'info' | 'primary' | 'warning' | 'secondary' | 'success' | 'error'> = {
  NEW: 'info', ASSIGNED: 'primary', IN_PROGRESS: 'primary', WAITING_COMPLETION: 'warning', REFERRED: 'secondary',
  ACCEPTED: 'success', COMPLETED: 'success', REJECTED: 'error', CANCELLED: 'default',
};

// Statuses that need a written reason before the change is accepted.
export const REASON_REQUIRED: RequestStatus[] = ['REJECTED', 'CANCELLED', 'REFERRED', 'WAITING_COMPLETION'];

export const EVENT_LABEL: Record<string, string> = {
  CREATED: 'تم تقديم الطلب', ASSIGNED: 'أُسند الطلب إلى موظف', REASSIGNED: 'أُعيد إسناد الطلب',
  STATUS_CHANGED: 'تغيّرت حالة الطلب', COMMENT: 'ملاحظة داخلية',
  REFERRAL_SENT: 'إحالة إلى جهة', REFERRAL_ANSWERED: 'رد الجهة', REFERRAL_CANCELLED: 'إلغاء الإحالة',
  ATTACHMENT_ADDED: 'أُضيف مرفق', ATTACHMENT_ARCHIVED: 'أُرشف مرفق',
  DOCUMENT_ISSUED: 'صدرت وثيقة', DOCUMENT_REVOKED: 'أُلغيت وثيقة',
};

export const CHANNEL_LABEL: Record<RequestChannel, string> = { ONLINE: 'إلكتروني', IN_PERSON: 'حضوري' };
export const SERVICE_CHANNEL_LABEL: Record<ServiceChannel, string> = { ONLINE: 'إلكترونية', IN_PERSON: 'حضورية', BOTH: 'إلكترونية وحضورية' };
export const OUTCOME_SERVICE_LABEL: Record<ServiceOutcome, string> = { NONE: 'غير محددة', DOCUMENT: 'إصدار وثيقة', ACTION: 'تنفيذ إجراء', BOTH: 'وثيقة وإجراء' };
export const TARGET_LABEL: Record<ReferralTarget, string> = { ACADEMIC_AFFAIRS: 'الشؤون العلمية', FINANCIAL_AFFAIRS: 'الشؤون المالية', COLLEGE: 'الكلية', OTHER: 'جهة أخرى' };
export const MODE_LABEL = { OPINION: 'طلب رأي/موافقة', EXECUTION: 'إحالة للتنفيذ' } as const;
export const REFERRAL_STATUS_LABEL = { PENDING: 'بانتظار الرد', ANSWERED: 'تم الرد', CANCELLED: 'ملغاة' } as const;
export const REFERRAL_OUTCOME_LABEL: Record<ReferralOutcome, string> = { APPROVED: 'موافقة', REJECTED: 'رفض', NOTES: 'ملاحظات', DONE: 'تم التنفيذ', NOT_DONE: 'لم يتم التنفيذ' };

export const DOCUMENT_STATUS_LABEL = { ACTIVE: 'نشطة', REVOKED: 'ملغاة' } as const;

export const ALLOWED_UPLOAD_TYPES = ['application/pdf', 'image/jpeg', 'image/png'];
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

export function errorText(error: unknown, fallback = 'تعذر تنفيذ العملية.') {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string' && error.response?.status !== 413) return message;
    if (error.response?.status === 413) return 'حجم الملف أكبر من 5 ميغابايت.';
    if (!error.response) return 'تعذر الاتصال بالخادم.';
  }
  return fallback;
}

export function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-SY-u-nu-latn', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value));
}

export function formatSize(bytes: number) {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

// Client-side pre-check (the server checks the real content again).
export function checkUpload(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return 'حجم الملف أكبر من 5 ميغابايت.';
  if (file.type && !ALLOWED_UPLOAD_TYPES.includes(file.type)) return 'النوع غير مسموح: PDF أو JPG أو PNG فقط.';
  return null;
}

export function saveBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

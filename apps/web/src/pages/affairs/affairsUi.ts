import axios from 'axios';
import type { RequestStatus } from '../../api/affairs';

export const STATUS_LABEL: Record<RequestStatus, string> = {
  NEW: 'جديد', ASSIGNED: 'مسند', IN_PROGRESS: 'قيد المعالجة', WAITING_COMPLETION: 'بانتظار الاستكمال',
  REFERRED: 'محال لجهة أخرى', COMPLETED: 'منجز', REJECTED: 'مرفوض', CANCELLED: 'ملغى',
};

export const STATUS_COLOR: Record<RequestStatus, 'default' | 'info' | 'primary' | 'warning' | 'secondary' | 'success' | 'error'> = {
  NEW: 'info', ASSIGNED: 'primary', IN_PROGRESS: 'primary', WAITING_COMPLETION: 'warning', REFERRED: 'secondary',
  COMPLETED: 'success', REJECTED: 'error', CANCELLED: 'default',
};

// Statuses that need a written reason before the change is accepted.
export const REASON_REQUIRED: RequestStatus[] = ['REJECTED', 'CANCELLED', 'REFERRED', 'WAITING_COMPLETION'];

export const EVENT_LABEL: Record<string, string> = {
  CREATED: 'تم تقديم الطلب', ASSIGNED: 'أُسند الطلب إلى موظف', REASSIGNED: 'أُعيد إسناد الطلب',
  STATUS_CHANGED: 'تغيّرت حالة الطلب', COMMENT: 'ملاحظة داخلية',
};

export function errorText(error: unknown, fallback = 'تعذر تنفيذ العملية.') {
  if (axios.isAxiosError(error)) {
    const message: unknown = error.response?.data?.message;
    if (Array.isArray(message)) return message.join('، ');
    if (typeof message === 'string') return message;
    if (!error.response) return 'تعذر الاتصال بالخادم.';
  }
  return fallback;
}

export function formatDate(value?: string | null, withTime = false) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('ar-SY-u-nu-latn', withTime ? { dateStyle: 'medium', timeStyle: 'short' } : { dateStyle: 'medium' }).format(new Date(value));
}

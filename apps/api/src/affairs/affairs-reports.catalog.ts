// Catalogue for the report builder. The builder never accepts free SQL or free field names:
// it can only pick sources, columns and groupings listed here, and the server maps them to fixed queries.

export type ReportSource = 'requests' | 'documents' | 'referrals';

export interface CatalogColumn { id: string; label: string; adminOnly?: boolean }
export interface CatalogSource {
  id: ReportSource;
  label: string;
  dateLabel: string;
  columns: CatalogColumn[];
  dimensions: CatalogColumn[];
  statuses: string[];
}

export const STATUS_AR: Record<string, string> = {
  NEW: 'جديد', ASSIGNED: 'جديد (مسند)', IN_PROGRESS: 'قيد المراجعة', WAITING_COMPLETION: 'بانتظار الاستكمال', REFERRED: 'بانتظار جهة أخرى',
  ACCEPTED: 'مقبول', COMPLETED: 'مكتمل', REJECTED: 'مرفوض', CANCELLED: 'ملغى',
  ACTIVE: 'نشطة', REVOKED: 'ملغاة', PENDING: 'بانتظار الرد', ANSWERED: 'تم الرد',
};
export const CHANNEL_AR: Record<string, string> = { ONLINE: 'إلكتروني', IN_PERSON: 'حضوري' };
export const TARGET_AR: Record<string, string> = { ACADEMIC_AFFAIRS: 'الشؤون العلمية', FINANCIAL_AFFAIRS: 'الشؤون المالية', COLLEGE: 'الكلية', OTHER: 'جهة أخرى' };
export const MODE_AR: Record<string, string> = { OPINION: 'طلب رأي/موافقة', EXECUTION: 'إحالة للتنفيذ' };
export const OUTCOME_AR: Record<string, string> = { APPROVED: 'موافقة', REJECTED: 'رفض', NOTES: 'ملاحظات', DONE: 'تم التنفيذ', NOT_DONE: 'لم يتم التنفيذ' };

export const CATALOG: CatalogSource[] = [
  {
    id: 'requests', label: 'طلبات الطلاب', dateLabel: 'تاريخ التقديم',
    columns: [
      { id: 'number', label: 'رقم الطلب' }, { id: 'student', label: 'الطالب' }, { id: 'universityId', label: 'الرقم الجامعي' }, { id: 'service', label: 'الخدمة' },
      { id: 'status', label: 'الحالة' }, { id: 'channel', label: 'المصدر' }, { id: 'staff', label: 'الموظف', adminOnly: true }, { id: 'createdAt', label: 'تاريخ التقديم' },
      { id: 'dueAt', label: 'الموعد المتوقع' }, { id: 'closedAt', label: 'تاريخ الإغلاق' }, { id: 'days', label: 'مدة المعالجة (أيام)' },
    ],
    dimensions: [
      { id: 'service', label: 'الخدمة' }, { id: 'status', label: 'الحالة' }, { id: 'channel', label: 'المصدر' }, { id: 'staff', label: 'الموظف', adminOnly: true },
      { id: 'month', label: 'الشهر' }, { id: 'college', label: 'الكلية' },
    ],
    statuses: ['NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_COMPLETION', 'REFERRED', 'ACCEPTED', 'COMPLETED', 'REJECTED', 'CANCELLED'],
  },
  {
    id: 'documents', label: 'الوثائق الصادرة', dateLabel: 'تاريخ الإصدار',
    columns: [
      { id: 'number', label: 'رقم الوثيقة' }, { id: 'type', label: 'النوع' }, { id: 'student', label: 'الطالب' }, { id: 'universityId', label: 'الرقم الجامعي' },
      { id: 'status', label: 'الحالة' }, { id: 'issuedAt', label: 'تاريخ الإصدار' }, { id: 'revokedAt', label: 'تاريخ الإلغاء' },
    ],
    dimensions: [{ id: 'type', label: 'النوع' }, { id: 'status', label: 'الحالة' }, { id: 'month', label: 'الشهر' }],
    statuses: ['ACTIVE', 'REVOKED'],
  },
  {
    id: 'referrals', label: 'الإحالات', dateLabel: 'تاريخ الإحالة',
    columns: [
      { id: 'request', label: 'رقم الطلب' }, { id: 'target', label: 'الجهة' }, { id: 'mode', label: 'النوع' }, { id: 'status', label: 'الحالة' },
      { id: 'outcome', label: 'نتيجة الرد' }, { id: 'createdAt', label: 'تاريخ الإحالة' }, { id: 'respondedAt', label: 'تاريخ الرد' },
    ],
    dimensions: [{ id: 'target', label: 'الجهة' }, { id: 'mode', label: 'النوع' }, { id: 'status', label: 'الحالة' }, { id: 'month', label: 'الشهر' }],
    statuses: ['PENDING', 'ANSWERED', 'CANCELLED'],
  },
];

export const ALL_COLUMN_IDS = [...new Set(CATALOG.flatMap((s) => s.columns.map((c) => c.id)))];
export const ALL_DIMENSION_IDS = [...new Set(CATALOG.flatMap((s) => s.dimensions.map((d) => d.id)))];
export const ALL_STATUS_IDS = [...new Set(CATALOG.flatMap((s) => s.statuses))];

export function sourceOf(id: string) {
  return CATALOG.find((s) => s.id === id);
}

// Returns an Arabic error message when the request asks for something outside the catalogue (or not allowed for the role).
export function checkSelection(sourceId: string, columns: string[], groupBy: string | undefined, isAdmin: boolean): string | null {
  const source = sourceOf(sourceId);
  if (!source) return 'مصدر البيانات غير معروف.';
  for (const id of columns) {
    const col = source.columns.find((c) => c.id === id);
    if (!col) return `العمود «${id}» غير متاح لهذا المصدر.`;
    if (col.adminOnly && !isAdmin) return `العمود «${col.label}» لمدير النظام فقط.`;
  }
  if (groupBy) {
    const dim = source.dimensions.find((d) => d.id === groupBy);
    if (!dim) return `التجميع «${groupBy}» غير متاح لهذا المصدر.`;
    if (dim.adminOnly && !isAdmin) return `التجميع «${dim.label}» لمدير النظام فقط.`;
  }
  if (!groupBy && columns.length === 0) return 'اختر عموداً واحداً على الأقل أو اختر تجميعاً.';
  return null;
}

// Spreadsheet programs run cells that start with = + - @ as formulas; prefix them so exported text stays text.
export function csvCell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: unknown[][]): string {
  return '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n') + '\r\n';
}

// Inclusive day range from two YYYY-MM-DD strings (UTC days).
export function dayRange(from?: string, to?: string): { gte?: Date; lte?: Date } | undefined {
  const range: { gte?: Date; lte?: Date } = {};
  if (from) range.gte = new Date(`${from.slice(0, 10)}T00:00:00.000Z`);
  if (to) range.lte = new Date(`${to.slice(0, 10)}T23:59:59.999Z`);
  return range.gte || range.lte ? range : undefined;
}

export function monthOf(date: Date) {
  return date.toISOString().slice(0, 7);
}

export function dayOf(date: Date) {
  return date.toISOString().slice(0, 10);
}

export function daysBetween(a: Date, b: Date) {
  return Math.round(((b.getTime() - a.getTime()) / 86400000) * 10) / 10;
}

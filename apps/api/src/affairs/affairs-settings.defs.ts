// Catalogue of the dashboard settings. The defaults live here; the database only stores the values an admin changed.
// "cap*" entries are capability switches for the fixed REGISTRAR role (a system admin is never restricted).

export type SettingValue = boolean | number;

export interface SettingDef {
  key: string;
  group: 'general' | 'capabilities';
  type: 'boolean' | 'int';
  default: SettingValue;
  min?: number;
  max?: number;
  label: string;
  description: string;
}

export const SETTING_DEFS: SettingDef[] = [
  { key: 'autoAssign', group: 'general', type: 'boolean', default: true, label: 'الإسناد التلقائي', description: 'عند تقديم طلب يُسند تلقائياً لأقل موظف حملاً من أصحاب الخدمة. عند الإيقاف تبقى الطلبات «جديدة» حتى تُسند يدوياً.' },
  { key: 'studentOnlineSubmission', group: 'general', type: 'boolean', default: true, label: 'استقبال الطلبات الإلكترونية', description: 'عند الإيقاف لا يستطيع الطلاب تقديم طلبات من حساباتهم، ويبقى تسجيل الطلبات الحضورية متاحاً للموظفين.' },
  { key: 'maxAttachmentMb', group: 'general', type: 'int', default: 5, min: 1, max: 5, label: 'أقصى حجم للمرفق (ميغابايت)', description: 'الحد الأعلى للنظام 5 ميغابايت.' },
  { key: 'maxAttachmentsPerRequest', group: 'general', type: 'int', default: 10, min: 1, max: 10, label: 'أقصى عدد مرفقات للطلب', description: 'الحد الأعلى للنظام 10 مرفقات.' },
  { key: 'capTakeNewRequests', group: 'capabilities', type: 'boolean', default: true, label: 'استلام الطلبات الجديدة', description: 'الموظف يستلم بنفسه طلباً جديداً غير مسند.' },
  { key: 'capCreateRequestsOnBehalf', group: 'capabilities', type: 'boolean', default: true, label: 'تسجيل طلب بالنيابة عن طالب', description: 'الموظف ينشئ طلباً حضورياً نيابة عن الطالب.' },
  { key: 'capCreateReferrals', group: 'capabilities', type: 'boolean', default: true, label: 'إحالة الطلبات إلى جهات أخرى', description: 'الموظف المسند يحيل الطلب ويسجّل رد الجهة.' },
  { key: 'capIssueDocuments', group: 'capabilities', type: 'boolean', default: true, label: 'إصدار الوثائق', description: 'الموظف المسند يصدر الوثيقة من الطلب بعد قبوله.' },
  { key: 'capRevokeOwnDocuments', group: 'capabilities', type: 'boolean', default: true, label: 'إلغاء وثيقة أصدرها بنفسه', description: 'الموظف يلغي (بسبب) الوثائق التي أصدرها هو فقط.' },
];

export const SETTING_KEYS = SETTING_DEFS.map((d) => d.key);

export function defaultsOf(): Record<string, SettingValue> {
  return Object.fromEntries(SETTING_DEFS.map((d) => [d.key, d.default]));
}

// Returns an error message (Arabic) when the value is not valid for the key, otherwise null.
export function validateSetting(key: string, value: unknown): string | null {
  const def = SETTING_DEFS.find((d) => d.key === key);
  if (!def) return `إعداد غير معروف: ${key}`;
  if (def.type === 'boolean') return typeof value === 'boolean' ? null : `${def.label}: القيمة يجب أن تكون تشغيل أو إيقاف.`;
  if (typeof value !== 'number' || !Number.isInteger(value) || value < (def.min ?? 0) || value > (def.max ?? 1000)) return `${def.label}: أدخل رقماً صحيحاً بين ${def.min} و${def.max}.`;
  return null;
}

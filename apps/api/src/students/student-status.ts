// حالات الطالب الأكاديمية والإدارية. منفصلة عن حالة حساب الدخول (نشط/موقوف/...) التي تبقى لباقي المستخدمين.
export const STUDENT_STATUSES = ['PENDING_REGISTRATION', 'CONTINUING', 'DEFERRED', 'WITHDRAWN', 'DISMISSED', 'GRADUATED', 'DEREGISTERED'] as const;
export type StudentStatus = (typeof STUDENT_STATUSES)[number];

export const STUDENT_STATUS_LABEL: Record<StudentStatus, string> = {
  PENDING_REGISTRATION: 'قيد استكمال التسجيل',
  CONTINUING: 'مستمر',
  DEFERRED: 'مؤجل',
  WITHDRAWN: 'منسحب',
  DISMISSED: 'مفصول',
  GRADUATED: 'متخرج',
  DEREGISTERED: 'ترقين قيد',
};

export function isStudentStatus(value: unknown): value is StudentStatus {
  return typeof value === 'string' && (STUDENT_STATUSES as readonly string[]).includes(value);
}

// الانتقالات اليدوية المسموحة. adminOnly: لا يقوم بها إلا مدير النظام (قرار استثنائي).
// - الانتقال الأولي إلى «مستمر» سيصبح تلقائيًا بعد اكتمال الوثائق وتأكيد القسط الأول (مرحلة لاحقة)،
//   وحتى ذلك الحين يتم يدويًا (أو عند «اعتماد التسجيل»).
// - المنسحب لا يعود بنفس السجل: يعود كطالب جديد بسجل جديد. ترقين القيد والتخرج نهائيان.
const TRANSITIONS: Array<{ from: StudentStatus; to: StudentStatus; adminOnly?: boolean }> = [
  { from: 'PENDING_REGISTRATION', to: 'CONTINUING' },
  { from: 'PENDING_REGISTRATION', to: 'WITHDRAWN' },
  { from: 'PENDING_REGISTRATION', to: 'DEREGISTERED' },
  { from: 'CONTINUING', to: 'DEFERRED' },
  { from: 'CONTINUING', to: 'WITHDRAWN' },
  { from: 'CONTINUING', to: 'DISMISSED' },
  { from: 'CONTINUING', to: 'DEREGISTERED' },
  { from: 'CONTINUING', to: 'GRADUATED', adminOnly: true },
  { from: 'DEFERRED', to: 'DEFERRED' }, // تعديل تاريخ العودة
  { from: 'DEFERRED', to: 'CONTINUING' },
  { from: 'DEFERRED', to: 'WITHDRAWN' },
  { from: 'DISMISSED', to: 'CONTINUING', adminOnly: true },
];

export function allowedTransitions(from: string, role: string): StudentStatus[] {
  return TRANSITIONS.filter((t) => t.from === from && (!t.adminOnly || role === 'SYSTEM_ADMIN')).map((t) => t.to);
}

export function transitionRule(from: string, to: string) {
  return TRANSITIONS.find((t) => t.from === from && t.to === to);
}

// تسجيل المقررات: للمستمر فقط. المؤجل والمنسحب والمفصول والمرقّن قيده والمتخرج وقيد الاستكمال لا يسجّلون.
export function canRegisterCourses(status: string | null | undefined) {
  return status === 'CONTINUING';
}

// تقديم طلبات الخدمات من حساب الطالب: ممنوع للمنسحب والمفصول والمرقّن قيده (اطلاع فقط).
export function canRequestServices(status: string | null | undefined) {
  return !['WITHDRAWN', 'DISMISSED', 'DEREGISTERED'].includes(status ?? '');
}

export const REGISTER_BLOCKED_MESSAGE = (status: string | null | undefined) =>
  `لا يمكن تسجيل المقررات لهذا الطالب لأن حالته «${STUDENT_STATUS_LABEL[status as StudentStatus] ?? status ?? 'غير محددة'}».`;

export const SERVICES_BLOCKED_MESSAGE = (status: string | null | undefined) =>
  `لا يمكن تقديم طلبات خدمات لأن حالتك «${STUDENT_STATUS_LABEL[status as StudentStatus] ?? status ?? 'غير محددة'}». يمكنك الاطلاع على بياناتك فقط. راجع شؤون الطلاب.`;

// قيمة قادمة من ملف أو نموذج: رمز الحالة أو اسمها العربي. null إن لم تكن حالة معروفة.
export function parseStudentStatus(raw: string | null | undefined): StudentStatus | null {
  const value = raw?.trim();
  if (!value) return null;
  if (isStudentStatus(value)) return value;
  const byLabel = (Object.entries(STUDENT_STATUS_LABEL) as Array<[StudentStatus, string]>).find(([, label]) => label === value);
  return byLabel ? byLabel[0] : null;
}

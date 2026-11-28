import type { AuthUser } from '../types/auth';

// موظف شؤون الطلاب: حساب بدور مستقل AFFAIRS_STAFF. تُفتح له لوحة الشؤون وحدها، والخادم يرفض مسارات المسجّل والأكاديمية.
export function isAffairsOnly(user: AuthUser | null | undefined) {
  return user?.role === 'AFFAIRS_STAFF';
}

// هل تظهر لوحة «شؤون الطلاب» (لوحة الموظفين) لهذا المستخدم؟ المدير وموظف الشؤون والمسجّل. المشرف له صفحة مستقلة (/advisor/affairs).
export function canSeeAffairs(user: AuthUser | null | undefined) {
  if (!user) return false;
  return ['SYSTEM_ADMIN', 'AFFAIRS_STAFF', 'REGISTRAR'].includes(user.role);
}

// المسارات المسموحة لموظف الشؤون: لوحة الشؤون، وطباعة الوثائق الصادرة منها، وصفحة الدخول الرئيسية التي توجّهه.
export function isPathAllowedForAffairsOnly(pathname: string) {
  return pathname === '/dashboard' || pathname === '/affairs' || pathname.startsWith('/affairs/') || pathname.startsWith('/documents/');
}

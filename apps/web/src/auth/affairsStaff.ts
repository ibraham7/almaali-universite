import type { AuthUser } from '../types/auth';

// موظف شؤون الطلاب: حساب بدور مستقل AFFAIRS_STAFF. تُفتح له لوحة الشؤون وحدها، والخادم يرفض مسارات المسجّل والأكاديمية.
export function isAffairsOnly(user: AuthUser | null | undefined) {
  return user?.role === 'AFFAIRS_STAFF';
}

// هل تظهر وحدة «شؤون الطلاب» لهذا المستخدم؟ المدير وموظف الشؤون والمسجّل دائمًا، والمشرف إذا مُنح الصلاحية (ملف موظف فعّال).
export function canSeeAffairs(user: AuthUser | null | undefined) {
  if (!user) return false;
  if (user.role === 'ADVISOR') return user.affairsAccess === true;
  return ['SYSTEM_ADMIN', 'AFFAIRS_STAFF', 'REGISTRAR'].includes(user.role);
}

// المسارات المسموحة لموظف الشؤون: لوحة الشؤون، وطباعة الوثائق الصادرة منها، وصفحة الدخول الرئيسية التي توجّهه.
export function isPathAllowedForAffairsOnly(pathname: string) {
  return pathname === '/dashboard' || pathname === '/affairs' || pathname.startsWith('/affairs/') || pathname.startsWith('/documents/');
}

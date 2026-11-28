import type { AuthUser } from '../types/auth';

// موظف شؤون الطلاب: حساب بدور مسجّل (REGISTRAR) وله ملف موظف شؤون فعّال. لا دور جديد بالنظام.
// تنبيه: حصر الواجهة هنا تجربة استخدام فقط، والصلاحيات الفعلية يفرضها الخادم حسب الدور (REGISTRAR) لا حسب هذه العلامة.
export function isAffairsStaff(user: AuthUser | null | undefined) {
  return user?.role === 'REGISTRAR' && user.affairsStaff === true;
}

// المسارات المسموحة لموظف الشؤون: لوحة الشؤون، وطباعة الوثائق الصادرة منها، وصفحة الدخول الرئيسية التي توجّهه.
export function isPathAllowedForAffairsStaff(pathname: string) {
  return pathname === '/dashboard' || pathname === '/affairs' || pathname.startsWith('/affairs/') || pathname.startsWith('/documents/');
}

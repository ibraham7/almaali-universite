import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import { isAffairsStaff, isPathAllowedForAffairsStaff } from '../auth/affairsStaff';

import {
  useAuth,
} from '../auth/AuthContext';

interface ProtectedRouteProps {
  allowedRoles?: string[];
}

export default function ProtectedRoute({
  allowedRoles,
}: ProtectedRouteProps) {
  const {
    isAuthenticated,
    user,
    affairsStaffPending,
  } = useAuth();
  const { pathname } = useLocation();

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        replace
      />
    );
  }

  // مسجّل لم تُحدَّد صفته بعد (جلسة قديمة): ننتظر لحظة ثم نقرر بدل وميض صفحة غير مناسبة.
  if (affairsStaffPending) {
    return <div role="status" aria-live="polite" style={{ minHeight: '50vh', display: 'grid', placeItems: 'center', color: '#60758a' }}>جارٍ التحميل...</div>;
  }

  // موظف شؤون الطلاب يُحصر بلوحة الشؤون: أي مسار آخر يعيده إليها.
  if (isAffairsStaff(user) && !isPathAllowedForAffairsStaff(pathname)) {
    return <Navigate to="/affairs" replace />;
  }

  if (
    allowedRoles &&
    allowedRoles.length > 0 &&
    !allowedRoles.includes(
      user?.role ?? '',
    )
  ) {
    return (
      <Navigate
        to="/dashboard"
        replace
      />
    );
  }

  return <Outlet />;
}
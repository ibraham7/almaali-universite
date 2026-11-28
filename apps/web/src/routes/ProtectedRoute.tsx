import {
  Navigate,
  Outlet,
  useLocation,
} from 'react-router-dom';

import { canSeeAffairs, isAffairsOnly, isPathAllowedForAffairsOnly } from '../auth/affairsStaff';

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

  // موظف شؤون الطلاب (دور مستقل) يُحصر بلوحة الشؤون: أي مسار آخر يعيده إليها.
  if (isAffairsOnly(user) && !isPathAllowedForAffairsOnly(pathname)) {
    return <Navigate to="/affairs" replace />;
  }

  // وحدة الشؤون لمن يملك صلاحيتها فقط (المشرف بلا صلاحية يعود للرئيسية).
  if ((pathname === '/affairs' || pathname.startsWith('/affairs/')) && !canSeeAffairs(user)) {
    return <Navigate to="/dashboard" replace />;
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
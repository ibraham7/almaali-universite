import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { apiClient } from '../api/client';

import { loginRequest } from '../api/auth';

import type {
  AuthUser,
  LoginRequest,
} from '../types/auth';

interface AuthContextValue {
  user: AuthUser | null;
  isAuthenticated: boolean;
  // جلسة مسجّل قديمة بلا علامة موظف الشؤون: نتحقق من الخادم قبل توجيهه
  affairsStaffPending: boolean;
  login: (credentials: LoginRequest) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(
  undefined,
);

function readStoredUser(): AuthUser | null {
  const storedUser = localStorage.getItem('auth_user');
  const token = localStorage.getItem('access_token');

  if (!storedUser || !token) {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('access_token');

    return null;
  }

  try {
    return JSON.parse(storedUser) as AuthUser;
  } catch {
    localStorage.removeItem('auth_user');
    localStorage.removeItem('access_token');

    return null;
  }
}

export function AuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [user, setUser] = useState<AuthUser | null>(
    readStoredUser,
  );

  const login = async (
    credentials: LoginRequest,
  ): Promise<AuthUser> => {
    const response = await loginRequest(credentials);

    localStorage.setItem(
      'access_token',
      response.access_token,
    );

    localStorage.setItem(
      'auth_user',
      JSON.stringify(response.user),
    );

    setUser(response.user);

    return response.user;
  };

  // مزامنة صفة موظف الشؤون مع الخادم (جلسة قديمة بلا علامة، أو تعطيل ملف الموظف أثناء الجلسة).
  const syncRole = user?.role;
  const syncId = user?.id;
  useEffect(() => {
    if (syncRole !== 'REGISTRAR') return undefined;
    let active = true;
    apiClient.get<{ isActiveStaff?: boolean }>('/affairs/me')
      .then((response) => {
        if (!active) return;
        const flag = response.data.isActiveStaff === true;
        setUser((current) => {
          if (!current || current.id !== syncId || current.affairsStaff === flag) return current;
          const next = { ...current, affairsStaff: flag };
          localStorage.setItem('auth_user', JSON.stringify(next));
          return next;
        });
      })
      .catch(() => {
        // تعذّر السؤال: نعتبره غير موظف شؤون (الواجهة العادية) بدل حجز الشاشة
        if (!active) return;
        setUser((current) => (current && current.id === syncId && current.affairsStaff === undefined ? { ...current, affairsStaff: false } : current));
      });
    return () => { active = false; };
  }, [syncRole, syncId]);

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('auth_user');

    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      affairsStaffPending: user?.role === 'REGISTRAR' && user.affairsStaff === undefined,
      login,
      logout,
    }),
    [user],
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside AuthProvider',
    );
  }

  return context;
}
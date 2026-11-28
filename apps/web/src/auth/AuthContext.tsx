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

  // المشرف: صلاحية دخول الشؤون تمنحها الإدارة أثناء الجلسة، فنزامنها مع الخادم (جلسة قديمة أو تغيّرت الصلاحية).
  const syncRole = user?.role;
  const syncId = user?.id;
  useEffect(() => {
    if (syncRole !== 'ADVISOR') return undefined;
    let active = true;
    const apply = (flag: boolean) => setUser((current) => {
      if (!current || current.id !== syncId || current.affairsAccess === flag) return current;
      const next = { ...current, affairsAccess: flag };
      localStorage.setItem('auth_user', JSON.stringify(next));
      return next;
    });
    apiClient.get('/affairs/me').then(() => { if (active) apply(true); }).catch(() => { if (active) apply(false); });
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
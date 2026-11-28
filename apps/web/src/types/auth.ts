export interface AuthUser {
  id: string;
  email: string;
  role: string;
  // هل تظهر له وحدة شؤون الطلاب (للمشرف: إذا أضافه المدير كموظف فعّال). للواجهة فقط؛ الخادم يفرض الصلاحية.
  affairsAccess?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

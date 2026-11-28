export interface AuthUser {
  id: string;
  email: string;
  role: string;
  // للمسجّل فقط: هل له ملف موظف شؤون طلاب فعّال (يحدد الواجهة التي تُفتح له)
  affairsStaff?: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  user: AuthUser;
}

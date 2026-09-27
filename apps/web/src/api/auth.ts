import { apiClient } from './client';

import type {
  LoginRequest,
  LoginResponse,
} from '../types/auth';

export async function loginRequest(
  data: LoginRequest,
): Promise<LoginResponse> {
  const response = await apiClient.post<LoginResponse>(
    '/auth/login',
    data,
  );

  return response.data;
}

export async function studentSignupRequest(data: {
  universityId: string;
  firstName: string;
  middleName?: string;
  familyName: string;
  dateOfBirth?: string;
  idOrPassport?: string;
  email: string;
  password: string;
}) {
  const response = await apiClient.post<{ message: string }>(
    '/auth/student-signup', data,
  );
  return response.data;
}

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
  fullName: string;
  fatherName: string;
  motherName: string;
  nationalId: string;
  applicationNumber: string;
  birthPlace: string;
}) {
  const response = await apiClient.post<{ verificationToken: string }>(
    '/auth/student-signup', data,
  );
  return response.data;
}

export async function completeStudentSignupRequest(data: { verificationToken: string; password: string }) {
  const response = await apiClient.post<{ message: string }>('/auth/student-signup/complete', data);
  return response.data;
}

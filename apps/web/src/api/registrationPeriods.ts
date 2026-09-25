import { apiClient } from './client';

export interface RegistrationPeriod {
  id: string;
  semesterId: string;
  startDateTime: string;
  endDateTime: string;
  minCredits: number;
  maxCredits: number;
  advisorApprovalRequired: boolean;
  dropAllowed: boolean;
  addDropDeadline?: string | null;
}

export interface RegistrationPeriodInput {
  semesterId: string;
  startDateTime: string;
  endDateTime: string;
  minCredits: number;
  maxCredits: number;
  advisorApprovalRequired: boolean;
  dropAllowed: boolean;
  addDropDeadline?: string | null;
}

export async function getRegistrationPeriodsBySemester(
  semesterId: string,
) {
  const { data } = await apiClient.get<RegistrationPeriod[]>(
    `/registration-periods/semester/${semesterId}`,
  );

  return data;
}

export async function createRegistrationPeriod(
  input: RegistrationPeriodInput,
) {
  const { data } = await apiClient.post<RegistrationPeriod>(
    '/registration-periods',
    input,
  );

  return data;
}

export async function updateRegistrationPeriod(
  id: string,
  input: Partial<RegistrationPeriodInput>,
) {
  const { data } = await apiClient.patch<RegistrationPeriod>(
    `/registration-periods/${id}`,
    input,
  );

  return data;
}

export async function removeRegistrationPeriod(id: string) {
  const { data } = await apiClient.delete<{
    success: boolean;
    message: string;
  }>(`/registration-periods/${id}`);

  return data;
}

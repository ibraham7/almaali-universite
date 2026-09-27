import { apiClient } from './client';

export interface EnrollmentMessage {
  id: string;
  enrollmentId: string;
  senderUserId: string;
  senderRole: 'STUDENT' | 'ADVISOR' | string;
  message: string;
  createdAt: string;
}

export async function getStudentEnrollmentMessages() {
  const { data } = await apiClient.get<EnrollmentMessage[]>(
    '/enrollment-messages/me',
  );
  return data;
}

export async function sendStudentEnrollmentMessage(message: string) {
  const { data } = await apiClient.post<EnrollmentMessage>(
    '/enrollment-messages/me',
    { message },
  );
  return data;
}

export async function getAdvisorEnrollmentMessages(
  approvalId: string,
) {
  const { data } = await apiClient.get<EnrollmentMessage[]>(
    `/enrollment-messages/advisor/${approvalId}`,
  );
  return data;
}

export async function sendAdvisorEnrollmentMessage(
  approvalId: string,
  message: string,
) {
  const { data } = await apiClient.post<EnrollmentMessage>(
    `/enrollment-messages/advisor/${approvalId}`,
    { message },
  );
  return data;
}

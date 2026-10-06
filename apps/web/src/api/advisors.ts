import { apiClient } from './client';

export interface AdvisorProgramAssignment {
  id: string;
  nameAr: string;
  departmentId: string | null;
  departmentName: string | null;
  collegeId: string;
  collegeName: string;
}

export async function getAdvisorPrograms(advisorId: string) {
  const response = await apiClient.get<AdvisorProgramAssignment[]>(`/advisors/${advisorId}/programs`);
  return response.data;
}

export async function getMyAdvisorPrograms() {
  const response = await apiClient.get<AdvisorProgramAssignment[]>('/advisors/me/assigned-programs');
  return response.data;
}

export async function setAdvisorPrograms(advisorId: string, programIds: string[]) {
  const response = await apiClient.put<AdvisorProgramAssignment[]>(`/advisors/${advisorId}/programs`, { programIds });
  return response.data;
}

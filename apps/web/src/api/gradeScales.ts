import {
  apiClient,
} from './client';

export interface GradeScale {
  id: string;
  universityId: string;
  label: string;
  minScore: string | number;
  maxScore: string | number;
  gradePoint: string | number;
  passed: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateGradeScaleInput {
  universityId: string;
  label: string;
  minScore: number;
  maxScore: number;
  gradePoint: number;
  passed: boolean;
  isActive?: boolean;
}

export interface UpdateGradeScaleInput {
  label?: string;
  minScore?: number;
  maxScore?: number;
  gradePoint?: number;
  passed?: boolean;
  isActive?: boolean;
}

export async function getGradeScales(
  universityId?: string,
) {
  const response =
    await apiClient.get<
      GradeScale[]
    >('/grade-scales', {
      params: universityId
        ? {
            universityId,
          }
        : undefined,
    });

  return response.data;
}

export async function createGradeScale(
  data: CreateGradeScaleInput,
) {
  const response =
    await apiClient.post<GradeScale>(
      '/grade-scales',
      data,
    );

  return response.data;
}

export async function updateGradeScale(
  id: string,
  data: UpdateGradeScaleInput,
) {
  const response =
    await apiClient.patch<GradeScale>(
      `/grade-scales/${id}`,
      data,
    );

  return response.data;
}

export async function deleteGradeScale(
  id: string,
) {
  const response =
    await apiClient.delete<{
      success: true;
      message: string;
    }>(
      `/grade-scales/${id}`,
    );

  return response.data;
}

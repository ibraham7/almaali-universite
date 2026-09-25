import {
  apiClient,
} from './client';

export interface University {
  id: string;

  nameAr: string;

  nameEn: string;

  minGpaForFutureYears:
    | string
    | number;

  allowedFutureYears: number;

  requiredElectiveCredits: number;

  createdAt: string;

  updatedAt: string;
}

export interface UpdateUniversitySettingsInput {
  nameAr: string;

  nameEn: string;

  minGpaForFutureYears: number;

  allowedFutureYears: number;

  requiredElectiveCredits: number;
}

export async function getUniversities() {
  const response =
    await apiClient.get<
      University[]
    >('/university');

  return response.data;
}

export async function getUniversity(
  id: string,
) {
  const response =
    await apiClient.get<University>(
      `/university/${id}`,
    );

  return response.data;
}

export async function updateUniversitySettings(
  id: string,
  data: UpdateUniversitySettingsInput,
) {
  const response =
    await apiClient.patch<University>(
      `/university/${id}`,
      data,
    );

  return response.data;
}
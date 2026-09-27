import { apiClient } from './client';

export interface StudentImportPreview {
  total: number;
  validCount: number;
  updateCount: number;
  errorCount: number;
  duplicateCount: number;
  errors: Array<{ rowNumber: number; universityId: string; message: string }>;
  rows: Array<{ rowNumber: number; universityId: string; name: string; college: string; program: string; action: string }>;
}

function form(file: File) {
  const data = new FormData();
  data.append('file', file);
  return data;
}

export async function previewStudentImport(file: File) {
  const response = await apiClient.post<StudentImportPreview>('/students/import/preview', form(file));
  return response.data;
}

export async function confirmStudentImport(file: File) {
  const response = await apiClient.post<{ total: number; imported: number; updated: number; errors: number; duplicates: number }>(
    '/students/import/confirm', form(file),
  );
  return response.data;
}

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

// The shared client defaults to application/json, which makes the server see no file.
// multipart/form-data lets axios add the correct boundary for the browser.
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

export async function previewStudentImport(file: File) {
  const response = await apiClient.post<StudentImportPreview>('/students/import/preview', form(file), multipart);
  return response.data;
}

export async function confirmStudentImport(file: File) {
  const response = await apiClient.post<{ total: number; imported: number; updated: number; errors: number; duplicates: number }>(
    '/students/import/confirm', form(file), multipart,
  );
  return response.data;
}

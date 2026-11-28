import { apiClient } from './client';

// استيراد كتالوج المقررات من Excel: معاينة ثم تأكيد.
export type CourseRowAction = 'NEW' | 'UPDATE' | 'UNCHANGED' | 'SKIPPED' | 'ERROR';
export interface CourseImportOptions { sheet?: string; updateExisting?: boolean; skipInvalid?: boolean }
export interface CourseImportPreview {
  sheet: string; sheets: string[]; truncated: boolean;
  totals: { rows: number; new: number; update: number; unchanged: number; skipped: number; errors: number };
  rows: Array<{ rowNumber: number; code: string; nameAr: string; action: CourseRowAction; changes: string[]; prerequisites: string[] }>;
  errors: Array<{ rowNumber: number; code: string; column?: string; message: string }>;
}
export interface CourseImportResult { created: number; updated: number; prerequisitesAdded: number; skippedExisting: number; unchanged: number; invalidRows: number }

const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };
function form(file: File, options: CourseImportOptions) {
  const data = new FormData();
  data.append('file', file);
  data.append('options', JSON.stringify(options));
  return data;
}

export const previewCourseImport = async (file: File, options: CourseImportOptions) => (await apiClient.post<CourseImportPreview>('/courses/import/preview', form(file, options), multipart)).data;
export const confirmCourseImport = async (file: File, options: CourseImportOptions) => (await apiClient.post<CourseImportResult>('/courses/import/confirm', form(file, options), multipart)).data;
export const downloadCourseTemplate = async () => (await apiClient.get<Blob>('/courses/import/template', { responseType: 'blob' })).data;

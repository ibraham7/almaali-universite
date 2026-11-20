import { apiClient } from './client';

export interface ImportError { rowNumber: number; universityId: string; column?: string; message: string }

export interface StudentImportPreview {
  total: number;
  validCount: number;
  updateCount: number;
  errorCount: number;
  problemCount: number;
  notes: string[];
  duplicateCount: number;
  errors: ImportError[];
  rows: Array<{ rowNumber: number; universityId: string; name: string; college: string; program: string; action: string }>;
}

export interface ImportField { key: string; label: string; required: boolean; group: 'identity' | 'contact' | 'academic' }

export interface ImportInspection {
  sheets: Array<{ name: string; rowCount: number }>;
  sheet: string;
  headerRow: number;
  dataRowCount: number;
  columns: Array<{ index: number; letter: string; header: string; samples: string[] }>;
  suggestedMapping: Record<string, number | null>;
  fields: ImportField[];
  rules: string[];
  limits: { maxRows: number; maxColumns: number; maxFileMb: number };
}

export interface ImportDefaults {
  collegeId?: string; departmentId?: string; programId?: string;
  studyPlanId?: string; academicYearId?: string; semesterId?: string;
}

export interface UniversityIdSource { mode: 'column' | 'applicationNumber' | 'generate' | 'byCollege'; prefix?: string; digits?: number; year?: number }

export interface ImportOptions {
  universityIdSource?: UniversityIdSource;
  sheet?: string;
  headerRow?: number;
  mapping?: Record<string, number | null>;
  defaults?: ImportDefaults;
}

// The shared client defaults to application/json, which makes the server see no file.
// multipart/form-data lets axios add the correct boundary for the browser.
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } };

function form(file: File, options?: ImportOptions) {
  const data = new FormData();
  data.append('file', file);
  if (options) data.append('options', JSON.stringify(options));
  return data;
}

export async function inspectStudentImport(file: File, options?: Pick<ImportOptions, 'sheet' | 'headerRow'>) {
  const response = await apiClient.post<ImportInspection>('/students/import/inspect', form(file, options), multipart);
  return response.data;
}

export async function previewStudentImport(file: File, options: ImportOptions) {
  const response = await apiClient.post<StudentImportPreview>('/students/import/preview', form(file, options), multipart);
  return response.data;
}

export async function confirmStudentImport(file: File, options: ImportOptions) {
  const response = await apiClient.post<{ total: number; imported: number; updated: number; errors: number; duplicates: number }>(
    '/students/import/confirm', form(file, options), multipart,
  );
  return response.data;
}

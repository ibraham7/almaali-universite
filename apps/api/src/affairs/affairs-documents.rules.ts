import { randomBytes } from 'node:crypto';

// Pure helpers for official documents (no database access).

export const PLACEHOLDERS = ['studentName', 'universityId', 'college', 'department', 'program', 'status', 'date'] as const;

// Fills {{placeholders}}. A line whose placeholders are all empty is dropped,
// so a student without a department does not get a blank "Department:" line.
export function renderTemplate(template: string, values: Record<string, string | null | undefined>): string {
  const lines = template.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    const names = [...line.matchAll(/\{\{\s*(\w+)\s*\}\}/g)].map((m) => m[1]);
    if (names.length > 0 && names.every((n) => !values[n]?.trim())) continue;
    out.push(line.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, n: string) => values[n]?.trim() ?? ''));
  }
  return out.join('\n').trim();
}

export function documentNumber(year: number, sequence: number) {
  return `DOC-${String(year % 100).padStart(2, '0')}-${String(sequence).padStart(4, '0')}`;
}

// 16 symbols from a 32-letter alphabet = 80 bits: not guessable, so the public check needs no login.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export const CODE_PATTERN = /^[A-Z2-7]{16}$/;
export function generateVerificationCode() {
  const bytes = randomBytes(16);
  let code = '';
  for (let i = 0; i < 16; i += 1) code += ALPHABET[bytes[i] % 32];
  return code;
}

// Public page shows the least needed: first name and the initials of the rest.
export function maskName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return [parts[0], ...parts.slice(1).map((p) => `${p[0]}.`)].join(' ');
}

export const ISSUABLE_REQUEST_STATUSES = ['ACCEPTED', 'COMPLETED'];

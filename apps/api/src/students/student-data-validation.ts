/** Shared normalization and field rules for student records and sign-up. */
export function normalizeDigits(value: string): string {
  return value
    .replace(/[\u0660-\u0669]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[\u06f0-\u06f9]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

export function digitVariants(value: string): string[] {
  const ascii = normalizeDigits(value.trim());
  const arabic = ascii.replace(/[0-9]/g, (digit) => String.fromCharCode(0x0660 + Number(digit)));
  const persian = ascii.replace(/[0-9]/g, (digit) => String.fromCharCode(0x06f0 + Number(digit)));
  return [...new Set([ascii, arabic, persian])];
}

export function normalizeText(value: string): string {
  return value.normalize('NFKC').trim().replace(/\s+/g, ' ');
}

const PERSON_NAME = /^[\p{L}\p{M}]+(?:[ '\u2019-][\p{L}\p{M}]+)*$/u;
const PLACE_NAME = /^[\p{L}\p{M}\d]+(?:[\s,.'\u2019()/-]+[\p{L}\p{M}\d]+)*$/u;

export function isPersonName(value: string): boolean {
  return PERSON_NAME.test(normalizeText(value));
}

export function isPlaceName(value: string): boolean {
  return PLACE_NAME.test(normalizeText(value));
}

const GENDER_ALIASES = new Map<string, string>([
  ['ذكر', 'ذكر'], ['male', 'ذكر'], ['m', 'ذكر'],
  ['أنثى', 'أنثى'], ['انثى', 'أنثى'], ['female', 'أنثى'], ['f', 'أنثى'],
]);

export function normalizeGender(value: string | null | undefined): string | null {
  if (!value?.trim()) return null;
  return GENDER_ALIASES.get(normalizeText(value).toLocaleLowerCase()) ?? null;
}

export function isDigitsOnly(value: string): boolean {
  return /^[0-9]+$/.test(normalizeDigits(value.trim()));
}

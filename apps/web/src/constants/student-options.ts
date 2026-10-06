/** Temporary university lists; keep the free-text option until official lists arrive. */
export const STUDENT_OTHER_OPTION = '__OTHER__';
export const STUDENT_NATIONALITIES = ['سوري', 'تركي', 'فلسطيني', 'أردني', 'لبناني', 'عراقي', 'مصري', 'سعودي', 'يمني', 'إماراتي', 'قطري', 'كويتي', 'عُماني', 'بحريني', 'أخرى'];
export const STUDENT_BIRTH_PLACES = ['دمشق', 'ريف دمشق', 'حلب', 'حمص', 'حماة', 'اللاذقية', 'طرطوس', 'إدلب', 'درعا', 'السويداء', 'القنيطرة', 'دير الزور', 'الرقة', 'الحسكة', 'خارج سوريا / مكان آخر'];

export function normalizeStudentDigits(value: string): string {
  return value.replace(/[٠-٩]/g, (digit) => String(digit.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (digit) => String(digit.charCodeAt(0) - 0x06f0));
}

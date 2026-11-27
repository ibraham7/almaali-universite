// الموقع التعريفي: مفاتيح النصوص المفردة المسموحة (أي مفتاح غيرها يُرفض) وحدودها.
export interface SettingDef { key: string; group: 'home' | 'about' | 'admission' | 'contact'; label: string; max: number; multiline?: boolean; kind?: 'text' | 'url' | 'media' }

export const SETTING_DEFS: SettingDef[] = [
  { key: 'tagline', group: 'home', label: 'الشعار النصي تحت اسم الجامعة', max: 200 },
  { key: 'heroText', group: 'home', label: 'نص الصفحة الرئيسية', max: 600, multiline: true },
  { key: 'aboutIntro', group: 'about', label: 'نبذة عن الجامعة', max: 3000, multiline: true },
  { key: 'vision', group: 'about', label: 'الرؤية', max: 1500, multiline: true },
  { key: 'mission', group: 'about', label: 'الرسالة', max: 1500, multiline: true },
  { key: 'presidentName', group: 'about', label: 'اسم رئيس الجامعة', max: 120 },
  { key: 'presidentWord', group: 'about', label: 'كلمة رئيس الجامعة', max: 6000, multiline: true },
  { key: 'presidentPhotoId', group: 'about', label: 'صورة رئيس الجامعة (معرّف ملف من الوسائط)', max: 60, kind: 'media' },
  { key: 'historyIntro', group: 'about', label: 'مقدمة نشأة الجامعة وتطورها', max: 3000, multiline: true },
  { key: 'admissionIntro', group: 'admission', label: 'مقدمة القبول والتسجيل', max: 1500, multiline: true },
  { key: 'admissionConditions', group: 'admission', label: 'شروط القبول', max: 4000, multiline: true },
  { key: 'admissionDocuments', group: 'admission', label: 'الوثائق المطلوبة', max: 4000, multiline: true },
  { key: 'admissionDates', group: 'admission', label: 'مواعيد التسجيل والمفاضلة', max: 3000, multiline: true },
  { key: 'admissionFees', group: 'admission', label: 'الرسوم الدراسية', max: 3000, multiline: true },
  { key: 'admissionHow', group: 'admission', label: 'آلية التقديم', max: 3000, multiline: true },
  { key: 'contactAddress', group: 'contact', label: 'العنوان', max: 300 },
  { key: 'contactPhone', group: 'contact', label: 'الهاتف', max: 80 },
  { key: 'contactEmail', group: 'contact', label: 'البريد الإلكتروني', max: 120 },
  { key: 'contactHours', group: 'contact', label: 'ساعات الدوام', max: 200 },
  { key: 'contactMapUrl', group: 'contact', label: 'رابط الخريطة (https)', max: 500, kind: 'url' },
];

export const SETTING_KEYS = new Set(SETTING_DEFS.map((def) => def.key));

export const ITEM_KIND_LABEL: Record<string, string> = {
  STAT: 'رقم', VALUE: 'قيمة', GOAL: 'هدف', MILESTONE: 'مرحلة تاريخية', ADMISSION_STEP: 'خطوة تقديم', FAQ: 'سؤال شائع',
};

// الصور والملفات: النوع يُحدَّد من محتوى الملف لا من اسمه. الحد الأقصى للحجم بالبايت.
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

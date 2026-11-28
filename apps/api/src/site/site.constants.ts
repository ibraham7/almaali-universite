// الموقع التعريفي: مفاتيح النصوص المفردة المسموحة (أي مفتاح غيرها يُرفض) وحدودها.
export interface SettingDef { key: string; group: 'home' | 'about' | 'admission' | 'contact' | 'sections'; label: string; max: number; multiline?: boolean; kind?: 'text' | 'url' | 'media' }

export const SETTING_DEFS: SettingDef[] = [
  { key: 'tagline', group: 'home', label: 'الشعار النصي تحت اسم الجامعة', max: 200 },
  { key: 'heroImageId', group: 'home', label: 'صورة خلفية الرئيسية (معرّف ملف من الوسائط)', max: 60, kind: 'media' },
  { key: 'heroText', group: 'home', label: 'نص الصفحة الرئيسية', max: 600, multiline: true },
  { key: 'aboutIntro', group: 'about', label: 'نبذة عن الجامعة', max: 3000, multiline: true },
  { key: 'aboutImageId', group: 'about', label: 'صورة النبذة (معرّف ملف من الوسائط)', max: 60, kind: 'media' },
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
  { key: 'socialFacebook', group: 'contact', label: 'فيسبوك (رابط https)', max: 300, kind: 'url' },
  { key: 'socialInstagram', group: 'contact', label: 'إنستغرام (رابط https)', max: 300, kind: 'url' },
  { key: 'socialYoutube', group: 'contact', label: 'يوتيوب (رابط https)', max: 300, kind: 'url' },
  { key: 'socialTelegram', group: 'contact', label: 'تلغرام (رابط https)', max: 300, kind: 'url' },
  { key: 'socialX', group: 'contact', label: 'إكس/تويتر (رابط https)', max: 300, kind: 'url' },
  { key: 'socialLinkedin', group: 'contact', label: 'لينكدإن (رابط https)', max: 300, kind: 'url' },
  { key: 'campusIntro', group: 'sections', label: 'مقدمة صفحة الحياة الجامعية', max: 1500, multiline: true },
  { key: 'researchIntro', group: 'sections', label: 'مقدمة صفحة البحث العلمي', max: 1500, multiline: true },
  { key: 'graduatesIntro', group: 'sections', label: 'التعريف بالخريجين', max: 2500, multiline: true },
  { key: 'contactMapUrl', group: 'contact', label: 'رابط الخريطة (https، ويفضّل رابط التضمين من OpenStreetMap أو خرائط جوجل)', max: 500, kind: 'url' },
];

export const SETTING_KEYS = new Set(SETTING_DEFS.map((def) => def.key));

export const ITEM_KIND_LABEL: Record<string, string> = {
  STAT: 'رقم', VALUE: 'قيمة', GOAL: 'هدف', MILESTONE: 'مرحلة تاريخية', ADMISSION_STEP: 'خطوة تقديم', FAQ: 'سؤال شائع', NEWS_CATEGORY: 'تصنيف أخبار', ORG_NODE: 'وحدة بالهيكل التنظيمي', QUICK_LINK: 'رابط سريع',
};

// الصور والملفات: النوع يُحدَّد من محتوى الملف لا من اسمه. الحد الأقصى للحجم بالبايت.
export const MAX_MEDIA_BYTES = 4 * 1024 * 1024;

// الأنواع الجديدة (فعاليات، بحث، خريجون، حياة جامعية) وتصنيفاتها المقترحة. التصنيف نص حر يُختار من هذه القوائم.
export const ENTRY_KINDS = ['EVENT', 'RESEARCH', 'GRADUATE_STORY', 'GRADUATE_NEWS', 'CAMPUS'] as const;
export type EntryKind = (typeof ENTRY_KINDS)[number];
export const ENTRY_CATEGORIES: Record<EntryKind, string[]> = {
  EVENT: [],
  RESEARCH: ['أبحاث ودراسات', 'مؤتمرات وندوات علمية', 'مجلات ومنشورات', 'مبادرات ومشاريع بحثية', 'إنجازات الهيئة التدريسية والباحثين'],
  GRADUATE_STORY: [],
  GRADUATE_NEWS: [],
  CAMPUS: ['أنشطة وفعاليات طلابية', 'مؤتمرات وندوات', 'أنشطة ثقافية واجتماعية ورياضية', 'مرافق وخدمات جامعية', 'صور وتغطيات إعلامية'],
};
export const MAX_GALLERY = 24;

// روابط الفيديو: يوتيوب (تُضمَّن بدون تتبع) أو ملف مباشر https بامتداد mp4/webm/ogg. لا نرفع فيديو إلى القاعدة.
export const YOUTUBE_RE = /^https:\/\/(www\.)?(youtube\.com\/(watch\?v=|embed\/)|youtu\.be\/)[\w-]{11}([&?#].*)?$/i;
export const VIDEO_FILE_RE = /^https:\/\/[^\s]+\.(mp4|webm|ogg)([?#].*)?$/i;
export const MAX_VIDEOS = 6;

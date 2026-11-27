// All the words on the public landing page live here, so they can be changed without touching the design.
// A section with no entries (stats, colleges, news, testimonials, president's word) or a contact line left
// empty is simply not shown, so nothing invented ever appears on the public site.

export interface LandingItem { title: string; text: string }
export interface LandingStat { label: string; value: string }
export interface LandingNews { tag: string; title: string; text: string }
export interface LandingTestimonial { text: string; name: string; role: string }

export const landingContent = {
  universityName: 'جامعة المعالي',
  universitySuffix: 'الخاصة',
  tagline: 'علمٌ يبني الإنسان، وجامعةٌ تصنع المستقبل',
  heroText:
    'برامج أكاديمية حديثة وبيئة تعليمية داعمة، مع نظام إلكتروني يتيح للطالب التسجيل ومتابعة وضعه الأكاديمي وتقديم الطلبات دون مراجعة الدوائر.',

  // Official figures, e.g. { label: 'كلية', value: '6' }. Empty = the strip is hidden.
  stats: [] as LandingStat[],

  about: {
    intro: 'رؤيتنا أن يتخرج طالب يجمع بين المعرفة والمهارة والقيم.',
    items: [
      { title: 'الرؤية', text: 'جامعة رائدة في التعليم والبحث وخدمة المجتمع.' },
      { title: 'الرسالة', text: 'إعداد خريجين مؤهلين، وتوفير بيئة أكاديمية تشجع الإبداع والتميّز.' },
      { title: 'القيم', text: 'النزاهة، الشفافية، الاحترام، والتعلّم المستمر.' },
    ] as LandingItem[],
  },

  // The president's word. Both empty = the section is hidden.
  president: { name: '', word: '' },

  // Official colleges and programmes. Empty = the section is hidden.
  colleges: [] as LandingItem[],

  // The real steps of the electronic system.
  admission: {
    intro: 'أربع خطوات من إنشاء الحساب حتى اختيار المقررات.',
    steps: [
      { title: 'إنشاء حساب', text: 'سجّل بياناتك الأساسية من صفحة إنشاء الحساب.' },
      { title: 'استكمال الملف', text: 'تثبيت الرقم الجامعي والبيانات الشخصية.' },
      { title: 'موافقة المشرف', text: 'المشرف الأكاديمي يراجع ويعتمد تسجيلك.' },
      { title: 'اختيار المقررات', text: 'في فترة التسجيل المعلنة لكل فصل.' },
    ] as LandingItem[],
  },

  // Announcements. Empty = the section is hidden.
  news: [] as LandingNews[],

  // Real opinions of students, graduates or staff. Empty = the section is hidden.
  testimonials: [] as LandingTestimonial[],

  // Contact lines. An empty string = the line is hidden.
  contact: {
    address: '',
    phone: '',
    email: '',
  },
};

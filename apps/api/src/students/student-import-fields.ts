// حقول استيراد الطلاب: الاسم بالعربية، الإلزام، والمرادفات المحتملة لأسماء الأعمدة بملفات الجهات الأخرى.
export interface ImportField {
  key: string;
  label: string;
  // مطلوب لإنشاء طالب جديد (الطالب الموجود يقبل ترك الحقل فارغاً لتبقى قيمته الحالية)
  required: boolean;
  group: 'identity' | 'contact' | 'academic';
  aliases: string[];
}

// الترتيب هنا هو الترتيب الداخلي القديم للأعمدة، ويبقى كما هو.
export const IMPORT_FIELDS: ImportField[] = [
  { key: 'universityId', label: 'الرقم الجامعي', required: true, group: 'identity', aliases: ['الرقم الجامعي', 'رقم الجامعي', 'رقم جامعي', 'الرقم الجامعى', 'رقم الطالب', 'university id', 'student id', 'id'] },
  { key: 'firstName', label: 'الاسم الأول', required: true, group: 'identity', aliases: ['الاسم الأول', 'الاسم الاول', 'الاسم', 'اسم الطالب', 'first name', 'name'] },
  { key: 'middleName', label: 'اسم الأب', required: true, group: 'identity', aliases: ['اسم الأب', 'اسم الاب', 'الأب', 'الاب', 'father name', 'father'] },
  { key: 'familyName', label: 'اسم العائلة', required: false, group: 'identity', aliases: ['اسم العائلة', 'العائلة', 'الكنية', 'الشهرة', 'النسبة', 'last name', 'family name', 'surname'] },
  { key: 'englishName', label: 'الاسم بالإنجليزية', required: false, group: 'identity', aliases: ['الاسم بالإنجليزية', 'الاسم بالانكليزية', 'الاسم بالانجليزية', 'english name', 'name en'] },
  { key: 'gender', label: 'الجنس', required: false, group: 'identity', aliases: ['الجنس', 'النوع', 'gender', 'sex'] },
  { key: 'dateOfBirth', label: 'تاريخ الميلاد', required: false, group: 'identity', aliases: ['تاريخ الميلاد', 'تاريخ الولادة', 'الميلاد', 'الولادة', 'date of birth', 'birth date', 'dob'] },
  { key: 'nationality', label: 'الجنسية', required: false, group: 'identity', aliases: ['الجنسية', 'nationality'] },
  { key: 'idOrPassport', label: 'رقم الهوية أو جواز السفر', required: false, group: 'identity', aliases: ['رقم الهوية أو جواز السفر', 'رقم الهوية', 'رقم جواز السفر', 'جواز السفر', 'passport', 'passport number'] },
  { key: 'universityEmail', label: 'البريد الجامعي', required: false, group: 'contact', aliases: ['البريد الجامعي', 'البريد الإلكتروني', 'البريد الالكتروني', 'الايميل', 'email', 'e-mail'] },
  { key: 'phone', label: 'رقم الهاتف', required: false, group: 'contact', aliases: ['رقم الهاتف', 'رقم الاتصال', 'الاتصال', 'الهاتف', 'رقم الموبايل', 'الموبايل', 'الجوال', 'رقم الجوال', 'phone', 'mobile'] },
  { key: 'college', label: 'الكلية', required: false, group: 'academic', aliases: ['الكلية', 'كلية', 'college', 'faculty'] },
  { key: 'department', label: 'القسم', required: false, group: 'academic', aliases: ['القسم', 'الاختصاص', 'التخصص', 'department', 'major'] },
  { key: 'program', label: 'البرنامج', required: false, group: 'academic', aliases: ['البرنامج', 'برنامج', 'نوع البرنامج', 'الدرجة العلمية', 'program', 'degree'] },
  { key: 'plan', label: 'الخطة الدراسية', required: false, group: 'academic', aliases: ['الخطة الدراسية', 'الخطة', 'plan', 'study plan'] },
  { key: 'year', label: 'المستوى الأكاديمي', required: false, group: 'academic', aliases: ['المستوى الأكاديمي', 'المستوى', 'السنة الدراسية', 'السنة', 'level', 'year'] },
  { key: 'semester', label: 'الفصل الدراسي', required: false, group: 'academic', aliases: ['الفصل الدراسي', 'الفصل', 'semester', 'term'] },
  { key: 'status', label: 'حالة الطالب', required: false, group: 'academic', aliases: ['حالة الطالب', 'الحالة', 'status'] },
  { key: 'advisorEmail', label: 'بريد المرشد', required: false, group: 'academic', aliases: ['بريد المرشد', 'المرشد', 'المشرف', 'advisor email', 'advisor'] },
  { key: 'admissionDate', label: 'تاريخ القبول', required: false, group: 'academic', aliases: ['تاريخ القبول', 'تاريخ التسجيل', 'تاريخ الانتساب', 'admission date'] },
  { key: 'motherName', label: 'اسم الأم', required: true, group: 'identity', aliases: ['اسم الأم', 'اسم الام', 'الأم', 'الام', 'mother name', 'mother'] },
  { key: 'nationalId', label: 'الرقم الوطني', required: true, group: 'identity', aliases: ['الرقم الوطني', 'رقم وطني', 'الرقم القومي', 'national id', 'national number', 'nid'] },
  { key: 'applicationNumber', label: 'رقم الاكتتاب', required: true, group: 'identity', aliases: ['رقم الاكتتاب', 'الاكتتاب', 'رقم الطلب', 'رقم التقديم', 'application number', 'application no'] },
  { key: 'birthPlace', label: 'مكان الولادة', required: true, group: 'identity', aliases: ['مكان الولادة', 'محل الولادة', 'محل الميلاد', 'مكان الميلاد', 'الولادة مكان', 'birth place', 'place of birth'] },
  // يأتي بعد الحقول القديمة حتى يبقى ترتيبها الداخلي كما هو
  { key: 'meritNumber', label: 'رقم المفاضلة', required: false, group: 'identity', aliases: ['رقم المفاضلة', 'الرقم الجامعي المولد على نظام الوزارة', 'الرقم الجامعي المولد', 'الرقم الوزاري', 'رقم المفاضله', 'merit number', 'ministry number'] },
];

export const IMPORT_LIMITS = { maxRows: 5000, maxColumns: 100, maxFileMb: 10 };

// قواعد الاستيراد بالعربية، تُعرض للمستخدم قبل رفع الملف.
export const IMPORT_RULES_AR = [
  'صيغة الملف: مصنف Excel (.xlsx)، وحجمه حتى 10 ميغابايت، وحتى 5000 طالب في المرة الواحدة. لا يهم اسم الملف.',
  'يمكن أن تكون البيانات في أي ورقة عمل وتبدأ من أي صف، وتُحدَّد ورقة العمل وصف العناوين من شاشة المطابقة. لا يشترط تعديل أسماء الأعمدة أو ترتيبها.',
  'يجب ربط أعمدة الملف بحقول المنظومة بشاشة المطابقة، ويقترح النظام الربط تلقائياً حسب أسماء الأعمدة.',
  'الحقول المطلوبة لإنشاء طالب جديد: الرقم الجامعي، الاسم الأول، اسم الأب، اسم الأم، الرقم الوطني، رقم الاكتتاب، مكان الولادة. اسم العائلة اختياري.',
  'الرقم الوطني 11 رقماً، ورقم الهاتف السوري المحلي 10 أرقام يبدأ بـ 09، ورقم الاكتتاب أرقام فقط، والجنس: ذكر أو أنثى، والتواريخ بصيغة YYYY-MM-DD أو DD/MM/YYYY.',
  'الأسماء بالحروف فقط (مسافة أو شرطة أو فاصلة عليا مسموحة).',
  'الخطة الدراسية غير مطلوبة عند الاستيراد: يُستورد الطالب «بانتظار اعتماد التسجيل» ويُربط بخطته لاحقاً من صفحة الطلاب (زر اعتماد التسجيل). يمكن اختيارها هنا كقيمة افتراضية إن لزم.',
  'الرقم الجامعي الموجود مسبقاً يحدّث بيانات الطالب، والحقول الفارغة لا تمسح البيانات الحالية.',
  'تظهر كل الأخطاء دفعة واحدة مع رقم الصف واسم العمود وسبب الخطأ، ولا يُنفَّذ الاستيراد إلا بعد معاينة الملف وخلوه من الأخطاء.',
];

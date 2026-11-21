# مهمة: بناء «لوحة شؤون الطلاب» لنظام جامعة المعالي (المرحلة 1، ثم 2 و3 و4)

أنت تكمل شغل مشروع جامعة المعالي الذي بدأناه بهالمحادثة. اقرأ هالبرومبت كاملاً قبل ما تبدأ. اللي فيه ملخص لكل شي مهم من المحادثة. ولو شفت تعارض بينه وبين المحادثة، المحادثة (وآخر كلام إبراهيم) هو الأصل.

## 0) السياق
- **المشروع:** نظام الإدارة الجامعية لجامعة المعالي. المستودع `ibraham7/almaali-universite`. الخلفية `apps/api` (NestJS 12 + Prisma 7 + PostgreSQL 18). الواجهة `apps/web` (React 19 + TypeScript + Vite + MUI 9 + react-router 7 + axios).
- **المستخدم:** إبراهيم، بيحكي لهجة شامية، وهو وسيط بينك وبين الجامعة (بينقل رسائلها وصورها). هو بينشر على السيرفر بنفسه، وأنت بتعطيه الأوامر.
- **الفرع:** اشتغل على `claude/eloquent-gates-wtw8qo`. آخر حالة على `main`: الدمج `112bc91` (PR #27). ابدأ بـ `git fetch origin main && git merge origin/main`.
- **آخر شي منشور على السيرفر:** حتى PR #26 تقريباً، وPR #27 (وضع التجريب للحذف الجماعي) مدموج على `main` وممكن لسا ما اننشر.

## 1) قواعد التعامل (التزم فيها)
1. **لا تدمج ولا تعمل PR إلا إذا إبراهيم قال «ادمج».** وقتها: أنشئ PR ثم ادمجه (merge commit) بأدوات `mcp__github__*` (حمّلها بـ ToolSearch: `select:mcp__github__create_pull_request,mcp__github__merge_pull_request`) وأعطه أوامر النشر. وإذا الأدوات مو متصلة، قل له.
2. **لا تقول «محلولة» أو «تم» قبل ما تجرّب بمتصفح حقيقي (Playwright).** وقل بصراحة شو اللي ما اختبرته. إبراهيم انتقد هالشي أكتر من مرة.
3. **ردودك:** عربي عامي مختصر ومفهوم، تشرح «ليش» مو بس «شو». وإذا كتبت رسالة للجامعة: لهجة بشرية بسيطة، مو مرتبة زيادة ولا فصحى رسمية ولا شكل «ذكاء اصطناعي»، ومختصرة.
4. **أوامر النشر:** (السيرفر `/opt/almaali`، الحاويات `almaali-university-{api,web,db}-1`). الأوامر دايماً تبدأ بـ `cd /opt/almaali`. النشر: `git pull --ff-only && git log -1 --oneline` ثم `docker compose up -d --build api web` ثم `docker compose ps`. **لا تشغّل `deploy/update.sh` ولا `install.sh` أبداً.**
5. **النسخة الاحتياطية:** إذا في migration: نسخة سريعة قبل النشر `docker exec almaali-university-db-1 pg_dump -U almaali -Fc university_system > ~/backups/backup-before-<اسم>.dump` (وتعطيه أمر `ls -lh` للتأكد إنها مو فاضية). إذا الـ migration بتغيّر أو بتنقل بيانات موجودة: نسخة **مع اختبار استعادة** (قاعدة مؤقتة `restore_test` وقارن الأعداد). واجهة فقط أو كود بدون migration: ما في نسخة.
6. **ما عندك وصول للسيرفر ولا لقاعدته الحية.** ما تحاول تتجاوز شي. أي شي على الإنتاج بتعطيه أوامر وهو بينفذ.
7. **الخصوصية:** معلومات الطلاب بالملفات اللي بيرفعها إبراهيم حقيقية. لا تطبعها بالردود ولا ترسلها لأي خدمة خارجية. استخدم بيانات وهمية بالاختبارات.
8. **الـ commits:** رسالة واضحة بالإنجليزية، وتنتهي بسطري الإسناد اللي بتطلبهم تعليمات الجلسة (Co-Authored-By وClaude-Session). ادفع الفرع بـ `git push -u origin claude/eloquent-gates-wtw8qo`.

## 2) قيود ثابتة على المشروع
- **ممنوع تلمس «النظام الديناميكي» (الأدوار والصلاحيات والوحدات الديناميكية).** الأدوار المستخدمة ثابتة: `STUDENT`, `ADVISOR`, `REGISTRAR` (مسجل الجامعة), `SYSTEM_ADMIN`. **لا تضيف قيمة جديدة لـ `RoleCode`.**
- **ممنوع الحذف النهائي من الواجهة والـ API وقاعدة البيانات** (سياسة الجامعة). وفي قاعدة البيانات في دالة `prevent_hard_delete()` وtriggers على الجداول الأكاديمية والإدارية. **كل جدول جديد لازم ينضاف له الحماية بنفس الـ migration:**
  ```sql
  CREATE TRIGGER no_hard_delete BEFORE DELETE ON "Table" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
  CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "Table" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();
  ```
  بدل الحذف: حالات (إلغاء/رفض/إيقاف). الاستثناء الوحيد: وضع التجريب المؤقت للحذف الجماعي للطلاب فقط (`ALLOW_TEST_DELETE=true`، لمدير النظام).
- ما تحاول تتجاوز جدار حماية الجامعة (لا أنفاق ولا تمويه VPN).
- التعديلات صغيرة وبسيطة قدر الإمكان، ما تعمل refactor كبير بدون سبب.

## 3) أنماط الكود الموجودة (اتبعها)
**الخلفية (`apps/api/src`):**
- كل وحدة: `x.module.ts` + `x.controller.ts` + `x.service.ts` + `dto/`. تسجيل الوحدة بـ `app.module.ts`.
- حماية المسارات: `@UseGuards(JwtGuard, RolesGuard)` و`@Roles('REGISTRAR','SYSTEM_ADMIN')` على كل مسار. المستخدم من `request.user` (`id`, `email`, `role`). انظر `students/students.controller.ts` كمثال.
- `ValidationPipe` عام بـ `whitelist` و`forbidNonWhitelisted`: **أي body لازم يكون class DTO فيه decorators من class-validator**، وإلا بيمر بدون تحقق (الأنواع inline ما بتتحقق).
- التدقيق: `AuditLogsService.create({action, entity, entityId, userId, details})` أو `tx.auditLog.create` داخل الـ transaction. (جدول `AuditLog`: `action, entity, entityId, userId, details(نص JSON), createdAt`.)
- الـ migrations **تُكتب بالإيد** في `apps/api/prisma/migrations/<timestamp>_name/migration.sql`، وتتحقق من عدم وجود drift لجدولك بـ: `prisma migrate diff --from-migrations prisma/migrations --to-schema prisma/schema.prisma --config <ملف config مؤقت فيه shadowDatabaseUrl>` (في drift قديم غير متعلق بشغلك: فهارس SupportTicket، وعلاقات Program، تجاهله). بعد تعديل `schema.prisma`: `npx prisma generate --config prisma7.config.ts`.
- الأرقام الجامعية بالمشروع: `السنة(2)+رمز الكلية(2)+تسلسل(3)` مثل `2702001`. **الرقم الجامعي للطالب ممكن يتغير (النقل بين الكليات)، فارتبط دايماً بـ `Student.id` الداخلي مو بالرقم.** الأرقام القديمة بجدول `StudentNumberHistory`.
- حساب الطالب: `User.email = "<universityId>@students.local"`، وبيدخل بالرقم الجامعي. الموظفين بيدخلوا بـ username أو email.

**الواجهة (`apps/web/src`):**
- `api/client.ts`: `apiClient` (axios، `Content-Type: application/json` افتراضياً؛ لرفع ملفات مرّر `multipart/form-data` صراحة).
- القائمة الجانبية: مصفوفة `navigationItems` بـ `layouts/DashboardLayout.tsx` (فيها `label`, `path`, `icon`, `roles`). المسارات والحماية بـ `App.tsx` (`ProtectedRoute allowedRoles`).
- الصفحات `pages/supervisor|student|advisor|shared`. أمثلة جيدة: `StudentsPage.tsx`، `StudentImportDialog.tsx`، `TransferCollegeDialog.tsx`، `ApproveRegistrationDialog.tsx`، `AcademicStructurePage.tsx`، `DashboardPage.tsx` (الرئيسية الحالية بحسب الدور).
- الواجهة عربية RTL، MUI. أخطاء ورسائل بالعربي واضحة. الـ lint فيه أخطاء قديمة (`set-state-in-effect`، `only-export-components`) مو من شغلك، لا تعدلها.
- رسائل الأخطاء: استخرج `response.data.message` (نص أو مصفوفة) وإلا رسالة عامة، متل `errorText` بـ `StudentImportDialog.tsx`.

## 4) المطلوب: لوحة شؤون الطلاب (كلام الجامعة)
الأقسام العشرة:
1. الرئيسية. 2. ملفات الطلاب. 3. طلبات الطلاب. 4. الخدمات الطلابية. 5. الوثائق والإفادات. 6. المعاملات والإحالات. 7. الموظفون وتوزيع المهام. 8. التقارير والإحصائيات. 9. سجل العمليات. 10. الإعدادات والصلاحيات.

إبراهيم قال عن 1 و2: «ساويهم على كيفك». والباقي بالتفصيل (نص الجامعة):

**3. طلبات الطلاب** (مركز العمل الأساسي للدائرة): قائمة الطلبات الواردة، الطلبات الجديدة، الطلبات المسندة للموظف، الطلبات التي تنتظر الاستكمال، الطلبات المحالة لجهات أخرى، الطلبات المنجزة والمرفوضة.

**4. الخدمات الطلابية:** تعريف الخدمات التي تقدمها الدائرة: طلب وثيقة قيد، كشف علامات، تأجيل دراسة، انسحاب، انتقال بين الكليات، تعديل بيانات، براءة ذمة.

**5. الوثائق والإفادات:** إدارة أنواع الوثائق؛ إصدار الوثائق بعد استكمال الموافقات؛ اعتماد القوالب الرسمية الموحدة للجامعة؛ ترقيم الوثائق بشكل فريد؛ إنشاء رمز QR للتحقق من صحة الوثيقة؛ حفظ الوثائق الصادرة في الملف الإلكتروني للطالب؛ إمكانية إلغاء وثيقة مع حفظ سبب الإلغاء وسجلها.

**6. المعاملات والإحالات:** تحويل المعاملة إلى الشؤون العلمية أو المالية أو الكلية أو أي جهة معنية، مع تحديد ما إذا كانت الإحالة لطلب الرأي والموافقة أو لتنفيذ إجراء.

**7. الموظفون وتوزيع المهام:** إضافة موظفي الدائرة وربطهم بحساباتهم؛ تحديد اختصاص كل موظف؛ إسناد الخدمات والطلبات إليهم؛ متابعة حجم العمل والطلبات المسندة والمنجزة؛ إعادة توزيع المهام عند الحاجة.

**9. سجل العمليات:** توثيق من قام بكل إجراء، ومتى نفذه، وما الذي تغير، مع حفظ أسباب الرفض والإحالة والإلغاء والتعديل.

(8 و10 لم يفصّلوها بعد: 8 التقارير والإحصائيات مرتبطة بدراسة الجدوى التي أعددناها للوحة الإحصائيات؛ 10 الإعدادات والصلاحيات.)

## 5) القرارات المعتمدة (الافتراضات اللي أخذها إبراهيم، عدّلها فقط إذا قال)
1. **دور موظف الشؤون:** بنستخدم الدور الموجود «مسجل الجامعة» `REGISTRAR` + **ملف موظف** (اختصاص + خدمات مسندة). **ما في دور جديد.**
2. **لمن بتظهر اللوحة:** `REGISTRAR` و`SYSTEM_ADMIN`.
3. **تقديم الطلب:** الطالب من بوابته، والموظف كمان بالنيابة عنه.
4. **التنفيذ الفعلي** لبعض الخدمات (انتقال بين الكليات، تعديل بيانات، انسحاب): الموظف بينفذها بيده بالأدوات الموجودة (مثلاً زر «نقل إلى كلية أخرى»)، وبنربطها آلياً لاحقاً.
5. **الرفض والإحالة:** الموظف المسند بيعملهم لحاله، **بسبب إلزامي** يتسجل.

## 6) التصميم المقترح للمرحلة 1 (القلب: 1 + 3 + 4 + 7 + 9 + شاشة الطالب)
### جداول Prisma (جديدة، كلها محمية من الحذف)
- `AffairsService`: `id, code (unique), nameAr, description?, isActive (default true), expectedDays (Int default 5), specialization String?, createdAt, updatedAt`. **ابذر الخدمات السبع الافتراضية بالـ migration** (INSERT … ON CONFLICT DO NOTHING): وثيقة قيد، كشف علامات، تأجيل دراسة، انسحاب، انتقال بين الكليات، تعديل بيانات، براءة ذمة.
- `AffairsStaff`: `id, userId (unique, FK User), specialization String?, isActive (default true), createdAt, updatedAt`. + جدول وصل `AffairsStaffService (staffId, serviceId, @@id([staffId, serviceId]))` للخدمات المسندة للموظف.
- `StudentRequest`: `id, number (unique) مثل SR-27-0001 (السنة(2)+تسلسل 4، بعدّاد لكل سنة، لا يُعاد استخدام رقم)، studentId (FK Student)، serviceId، status (enum)، assignedStaffId?، subject?، details?، createdByUserId?، dueAt?، closedAt?، decisionReason?، createdAt، updatedAt` + فهارس على (status, assignedStaffId, studentId, createdAt).
- `StudentRequestStatus` enum: `NEW, ASSIGNED, IN_PROGRESS, WAITING_COMPLETION, REFERRED, COMPLETED, REJECTED, CANCELLED`.
- `StudentRequestEvent`: `id, requestId, type (CREATED|ASSIGNED|REASSIGNED|STATUS_CHANGED|COMMENT), fromStatus?, toStatus?, note?, visibleToStudent Boolean, actorUserId?, staffId?, createdAt` (هاد هو «سجل الطلب» الكامل).
### قواعد العمل
- **الانتقالات المسموحة:** NEW→ASSIGNED/CANCELLED/REJECTED؛ ASSIGNED→IN_PROGRESS/REJECTED/REFERRED/WAITING_COMPLETION/CANCELLED؛ IN_PROGRESS→COMPLETED/REJECTED/REFERRED/WAITING_COMPLETION؛ WAITING_COMPLETION→IN_PROGRESS/CANCELLED/REJECTED؛ REFERRED→IN_PROGRESS/COMPLETED/REJECTED. المنتهية (COMPLETED/REJECTED/CANCELLED) ما بتتغير.
- **السبب إلزامي** (نص غير فاضي) عند: REJECTED، CANCELLED، REFERRED، WAITING_COMPLETION، وإعادة الإسناد.
- **الإسناد التلقائي** عند إنشاء الطلب: لأقل موظف حملاً (عدد الطلبات المفتوحة) ممن عندهم الخدمة مسندة وفعّالين. إذا ما في → NEW بدون إسناد.
- **صلاحيات داخل الوحدة:** الموظف (`REGISTRAR`) بيعمل (حالة/تعليق) فقط على الطلبات المسندة له؛ ممكن «يستلم» طلب NEW غير مسند لنفسه؛ مدير النظام بيشوف ويعمل بكل شي ويعيد الإسناد لأي موظف. الطالب بيشوف طلباته فقط.
- **ظهور الأحداث للطالب:** تغييرات الحالة وملاحظاتها `visibleToStudent=true`؛ التعليقات الداخلية للموظفين `false`.
- كل إجراء بيكتب `StudentRequestEvent` + `AuditLog` (أسماء مثل `AFFAIRS_REQUEST_CREATED/ASSIGNED/STATUS_CHANGED`).
- لا يقدر الطالب يقدم طلب لخدمة غير فعّالة. ولا يوجد حذف أبداً.
### الـ API (وحدة `affairs` جديدة)
- الموظفين (`REGISTRAR`,`SYSTEM_ADMIN`): `GET/POST /affairs/services`, `PATCH /affairs/services/:id` (تعديل/تفعيل/إيقاف)؛ `GET /affairs/staff`, `POST /affairs/staff`, `PATCH /affairs/staff/:id` (الاختصاص، تفعيل، خدماته)، `GET /affairs/staff/candidates` (مستخدمون دورهم REGISTRAR وليسوا موظفين بعد)؛ `GET /affairs/requests?view=all|new|mine|waiting|referred|done&search=&serviceId=&status=` (بترقيم صفحات، حد أقصى 100)، `GET /affairs/requests/:id` (مع الأحداث وملخص الطالب)، `POST /affairs/requests` (بالنيابة عن طالب: studentId, serviceId, subject, details)، `POST /affairs/requests/:id/assign`، `POST /affairs/requests/:id/status`، `POST /affairs/requests/:id/comment`؛ `GET /affairs/summary` (عدّادات الرئيسية + آخر الأحداث + حمل كل موظف).
- الطالب (`STUDENT`): `GET /affairs/my/services`, `GET /affairs/my/requests`, `POST /affairs/my/requests`, `GET /affairs/my/requests/:id`.
### الواجهة
- **صفحة `/affairs`** (بند قائمة «شؤون الطلاب»، للـ `REGISTRAR` و`SYSTEM_ADMIN`) فيها Tabs للأقسام العشرة: **المفعّلة بالمرحلة 1:** الرئيسية، الطلبات، الخدمات، الموظفون وتوزيع المهام، سجل العمليات (يعرض أحداث الطلبات؛ تقدر تعيد استخدام صفحة سجل العمليات الموجودة وتفلتر). **الباقية** (ملفات الطلاب، الوثائق، الإحالات، التقارير، الإعدادات) تتعرض كتبويب بحالة «قيد الإعداد — المرحلة 2/3/4».
- **الرئيسية:** بطاقات: جديدة، مسندة لي، بانتظار الاستكمال، محالة، منجزة اليوم، متأخرة (تجاوزت `dueAt`)، + آخر الأحداث، + حمل كل موظف (لمدير النظام).
- **الطلبات:** رقائق فلترة (الكل، الجديدة، المسندة لي، بانتظار الاستكمال، محالة، منجزة ومرفوضة)، بحث، جدول (الرقم، الطالب، الخدمة، الحالة، الموظف، التاريخ، الموعد)، وعند الضغط تفاصيل الطلب (Dialog أو درج): بيانات الطالب، الأحداث بالترتيب (Timeline)، وأزرار الإجراءات (استلام/إسناد، تغيير حالة بسبب، تعليق). زر «طلب جديد» بالنيابة عن طالب (بحث بالرقم الجامعي).
- **الخدمات:** جدول + إضافة/تعديل/تفعيل/إيقاف (بدون حذف).
- **الموظفون:** جدول (الاسم، الاختصاص، الخدمات، مفتوح/منجز) + إضافة موظف (اختيار مستخدم من المرشحين) + تعديل + تفعيل/إيقاف + إعادة توزيع طلب.
- **الطالب:** بند قائمة «طلباتي» → صفحة `/student/requests`: قائمة طلباته وحالتها + «طلب جديد» (اختيار خدمة + موضوع + تفاصيل) + تفاصيل طلب مع التايم لاين (الأحداث المرئية فقط).
- بند القائمة والمسارات تتبع الأنماط بـ `DashboardLayout.tsx` و`App.tsx`.

## 7) المراحل اللاحقة (لا تبنيها الآن، بس صمّم المرحلة 1 بحيث تتوسع)
- **المرحلة 2:** (2) ملفات الطلاب: ملف شامل للطالب (بياناته، سجله الأكاديمي: تسجيلات ونتائج، أرقامه السابقة، طلباته، وثائقه)، مبني على صفحة الطالب الحالية. (6) الإحالات: جدول `Referral` (الجهة: الشؤون العلمية/المالية/الكلية/أخرى، الغرض: طلب رأي وموافقة أو تنفيذ إجراء، الحالة، الرد). عدّل حالة `REFERRED` لتربطها بسجل إحالة.
- **المرحلة 3:** (5) الوثائق: `DocumentType`، `IssuedDocument` (رقم فريد، رمز تحقق QR، حالة نشطة/ملغاة، سبب الإلغاء، لقطة بيانات `payload`)، قوالب رسمية موحدة، توليد PDF بالعربية (يحتاج مكتبة وخطوط، غير موجودة حالياً)، صفحة تحقق عامة بالـ QR.
- **المرحلة 4:** (8) التقارير والإحصائيات (راجع دراسة الجدوى التي أعددناها: نقاط تجميع بالخادم، رسوم، drill-down، منشئ تقارير بكتالوج مصادر بدل SQL حر)، و(10) الإعدادات والصلاحيات (داخل الأدوار الثابتة فقط).

## 8) الاختبار والتسليم (التزم فيهم)
**البيئة المحلية (الـ container غالباً جديد):**
1. `pnpm install --frozen-lockfile` (إذا ما في node_modules)، و`npx prisma generate --config prisma7.config.ts` من `apps/api`.
2. PostgreSQL محلي: `sudo pg_ctlcluster 16 main start` (ممكن يتوقف، شغّله مرة تانية إذا طلع `Connection refused`). المستخدم `postgres/postgres`. أنشئ قاعدة (مثلاً `qa_demo`)، و`DATABASE_URL=postgresql://postgres:postgres@localhost:5432/qa_demo npx prisma migrate deploy`. لقاعدة فيها بيانات حقيقية الشكل: `CONFIRM_CURRICULA_IMPORT=YES npx tsx prisma/import-curricula.ts` ثم `CONFIRM_PLACEMENT_IMPORT=YES npx tsx prisma/import-study-plan-placements.ts`. أنشئ مستخدمين اختبار (admin بدور `SYSTEM_ADMIN`، موظف بدور `REGISTRAR`، طالب) بـ argon2 (انظر كيف عملنا سكربتات الاختبار: `User` + `Role.code` + `Student`).
3. شغّل الـ API: من `apps/api` بمتغيرات `DATABASE_URL`, `JWT_SECRET=<أي نص طويل>`, `NODE_ENV=development`, `CORS_ORIGINS=http://localhost:5173`, `PORT=3000` ثم `npx nest start`. **قبل إعادة التشغيل اقتل القديم:** `pkill -f dist/main; pkill -f nest` (وإلا `EADDRINUSE`). الواجهة: `npx vite --port 5173` من `apps/web`. **استخدم `localhost` مو `127.0.0.1` (CORS).**
4. **Playwright** مثبّت (Chromium جاهز، `require('playwright')` من أي مكان، شغّل بـ `NODE_PATH=$(npm root -g) node file.cjs`). تسجيل الدخول: افتح `/login`، `input` الأول = اسم المستخدم أو الرقم الجامعي، `input[type=password]`، ثم `button[type=submit]`، وانتظر `!location.pathname.startsWith('/login')`. قوائم MUI (`Select` ببعض الأماكن) استخدم `getByRole('combobox', {name})` ثم `getByRole('option')`.
5. **الاختبارات:** `npx vitest run` من `apps/api`. **في ~34 اختبار قديم بيفشلوا (`should be defined` بسبب DI) وأخطاء TypeScript قديمة بـ `prisma/seed.ts` وبعض الـ specs: ما هم مني، لا تصلحهم.** الاختبارات الجديدة لازم تنجح. اكتب اختبارات وحدة للخدمات (الانتقالات، السبب الإلزامي، الإسناد التلقائي، الصلاحيات). الواجهة: `npx tsc --noEmit -p tsconfig.app.json` و`npx eslint <ملفاتك>` (ما يزيد أخطاء جديدة).
6. **جرّب الدورة كاملة بمتصفح حقيقي** قبل ما تقول جاهز: الطالب يقدم طلب ← يتسند تلقائياً لموظف ← الموظف يستلم/يغيّر الحالة بسبب ← الطالب يشوف التايم لاين ← الرئيسية تعكس الأرقام ← مدير النظام يعيد الإسناد. وتحقق إنو ما في حذف ممكن (الـ trigger على الجداول الجديدة).
7. اعمل commits واضحة وادفع. **لا تدمج حتى يقول إبراهيم «ادمج».** وعند الدمج أعطه الأوامر (migration إضافة فقط ⇐ نسخة سريعة بس).

## 9) فخاخ عرفناها (وفّر على حالك)
- `AuditLog` وغيره محمي من الحذف؛ أي تنظيف بالاختبار لازم داخل `BEGIN; SET LOCAL app.allow_hard_delete='on'; ...; COMMIT;`.
- axios + `FormData`: لازم ترسل `Content-Type: multipart/form-data` صراحة (الافتراضي JSON يخلي السيرفر ما يشوف الملف).
- حالات التسجيل `EnrollmentStatus`: `DRAFT, PENDING, APPROVED, REJECTED, CONFIRMED, DROPPED, CANCELLED`. المقرر المُسقَط بـ `EnrollmentItem.status = DROPPED` (مو حذف).
- لا تعتمد على نص الأسماء بالـ UI بالاختبارات إذا بتتغير؛ استخدم ما يثبت.
- إبراهيم بيحب الأجوبة المختصرة ما تعدّد خيارات كتير؛ قدّم توصية واحدة واضحة.

## 10) ابدأ هيك
1. `git fetch origin main && git merge origin/main`، وتأكد الفرع نظيف.
2. اكتب خطة قصيرة (5 أسطر) لإبراهيم، ثم نفّذ المرحلة 1 بالترتيب: schema + migration (+ بذر الخدمات + triggers) ← الوحدة الخلفية + اختباراتها ← فحص API فعلي ← الواجهة ← اختبار متصفح ← commit/push.
3. بالنهاية قدّم لإبراهيم: شو اشتغل، شو اختبرته، شو ما اختبرته، وسؤال واحد: «بدك أدمج؟».

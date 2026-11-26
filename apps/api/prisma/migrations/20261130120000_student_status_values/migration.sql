-- حالات الطالب الأكاديمية/الإدارية بدل «ACTIVE»: ترحيل البيانات الحالية فقط (لا تغيير في بنية الجداول).
-- من لديه خطة دراسية (تسجيله معتمد) -> CONTINUING «مستمر»، ومن بلا خطة -> PENDING_REGISTRATION «قيد استكمال التسجيل».
UPDATE "Student" SET "status" = 'CONTINUING', "updatedAt" = now() WHERE "status" = 'ACTIVE' AND "studyPlanId" IS NOT NULL;
UPDATE "Student" SET "status" = 'PENDING_REGISTRATION', "updatedAt" = now() WHERE "status" = 'ACTIVE' AND "studyPlanId" IS NULL;

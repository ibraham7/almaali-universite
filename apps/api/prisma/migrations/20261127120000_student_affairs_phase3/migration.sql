-- Student Affairs, phase 3: document types, issued documents (unique number + verification code, revoked never deleted).
CREATE TYPE "DocumentStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "DocumentType" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "titleAr" TEXT NOT NULL,
    "issuingBody" TEXT NOT NULL,
    "bodyTemplate" TEXT NOT NULL,
    "footerNote" TEXT,
    "includesResults" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DocumentType_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IssuedDocument" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "verificationCode" TEXT NOT NULL,
    "typeId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "requestId" TEXT,
    "status" "DocumentStatus" NOT NULL DEFAULT 'ACTIVE',
    "payload" JSONB NOT NULL,
    "issuedByUserId" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),
    "revokedReason" TEXT,
    "revokedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IssuedDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DocumentCounter" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "DocumentCounter_pkey" PRIMARY KEY ("year")
);

ALTER TABLE "AffairsService" ADD COLUMN "documentTypeId" TEXT;

CREATE UNIQUE INDEX "DocumentType_code_key" ON "DocumentType"("code");
CREATE UNIQUE INDEX "IssuedDocument_number_key" ON "IssuedDocument"("number");
CREATE UNIQUE INDEX "IssuedDocument_verificationCode_key" ON "IssuedDocument"("verificationCode");
CREATE INDEX "IssuedDocument_studentId_idx" ON "IssuedDocument"("studentId");
CREATE INDEX "IssuedDocument_requestId_idx" ON "IssuedDocument"("requestId");
CREATE INDEX "IssuedDocument_status_idx" ON "IssuedDocument"("status");

ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "DocumentType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IssuedDocument" ADD CONSTRAINT "IssuedDocument_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StudentRequest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AffairsService" ADD CONSTRAINT "AffairsService_documentTypeId_fkey" FOREIGN KEY ("documentTypeId") REFERENCES "DocumentType"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Two starting document types (wording can be edited from the dashboard).
INSERT INTO "DocumentType" ("id", "code", "nameAr", "titleAr", "issuingBody", "bodyTemplate", "footerNote", "includesResults", "updatedAt") VALUES
  (gen_random_uuid()::text, 'ENROLLMENT', 'وثيقة قيد', 'وثيقة قيد', 'دائرة شؤون الطلاب',
   E'تشهد جامعة المعالي بأن الطالب/ة {{studentName}} صاحب/ة الرقم الجامعي {{universityId}} مقيّد/ة في الجامعة وفق البيانات التالية:\nالكلية: {{college}}\nالقسم: {{department}}\nالبرنامج: {{program}}\nالحالة الدراسية: {{status}}\nأُعطيت هذه الوثيقة بناءً على طلبه/ا دون أي مسؤولية على الجامعة تجاه الغير.',
   'للتحقق من صحة الوثيقة امسح رمز QR أو أدخل رمز التحقق في صفحة التحقق.', false, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'TRANSCRIPT', 'كشف علامات', 'كشف علامات', 'دائرة شؤون الطلاب',
   E'تشهد جامعة المعالي بأن الطالب/ة {{studentName}} صاحب/ة الرقم الجامعي {{universityId}} ({{college}}) حصل/ت على العلامات التالية في المقررات المسجّلة:',
   'الكشف صحيح حتى تاريخ الإصدار. للتحقق امسح رمز QR.', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- Link the two seeded services to their document (only if not linked yet; do not override the admin's choice).
UPDATE "AffairsService" s SET "documentTypeId" = (SELECT d."id" FROM "DocumentType" d WHERE d."code" = 'ENROLLMENT'),
  "outcome" = CASE WHEN s."outcome" = 'NONE' THEN 'DOCUMENT'::"ServiceOutcome" ELSE s."outcome" END
WHERE s."code" = 'ENROLLMENT_CERT' AND s."documentTypeId" IS NULL;
UPDATE "AffairsService" s SET "documentTypeId" = (SELECT d."id" FROM "DocumentType" d WHERE d."code" = 'TRANSCRIPT'),
  "outcome" = CASE WHEN s."outcome" = 'NONE' THEN 'DOCUMENT'::"ServiceOutcome" ELSE s."outcome" END
WHERE s."code" = 'TRANSCRIPT' AND s."documentTypeId" IS NULL;

-- No hard delete, even from outside the application.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['DocumentType','IssuedDocument','DocumentCounter'] LOOP
    EXECUTE format('CREATE TRIGGER no_hard_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete()', t);
    EXECUTE format('CREATE TRIGGER no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete()', t);
  END LOOP;
END $$;

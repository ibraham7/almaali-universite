-- Student Affairs dashboard, phase 1: services, staff profiles, student requests and their event timeline.
CREATE TYPE "StudentRequestStatus" AS ENUM ('NEW', 'ASSIGNED', 'IN_PROGRESS', 'WAITING_COMPLETION', 'REFERRED', 'COMPLETED', 'REJECTED', 'CANCELLED');

CREATE TABLE "AffairsService" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "nameAr" TEXT NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "expectedDays" INTEGER NOT NULL DEFAULT 5,
    "specialization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffairsService_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffairsStaff" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "specialization" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffairsStaff_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AffairsStaffService" (
    "staffId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "AffairsStaffService_pkey" PRIMARY KEY ("staffId","serviceId")
);

CREATE TABLE "AffairsRequestCounter" (
    "year" INTEGER NOT NULL,
    "last" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "AffairsRequestCounter_pkey" PRIMARY KEY ("year")
);

CREATE TABLE "StudentRequest" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "status" "StudentRequestStatus" NOT NULL DEFAULT 'NEW',
    "assignedStaffId" TEXT,
    "subject" TEXT,
    "details" TEXT,
    "createdByUserId" TEXT,
    "dueAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "decisionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudentRequest_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentRequestEvent" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fromStatus" "StudentRequestStatus",
    "toStatus" "StudentRequestStatus",
    "note" TEXT,
    "visibleToStudent" BOOLEAN NOT NULL DEFAULT false,
    "actorUserId" TEXT,
    "staffId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentRequestEvent_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AffairsService_code_key" ON "AffairsService"("code");
CREATE UNIQUE INDEX "AffairsStaff_userId_key" ON "AffairsStaff"("userId");
CREATE UNIQUE INDEX "StudentRequest_number_key" ON "StudentRequest"("number");
CREATE INDEX "StudentRequest_status_idx" ON "StudentRequest"("status");
CREATE INDEX "StudentRequest_assignedStaffId_idx" ON "StudentRequest"("assignedStaffId");
CREATE INDEX "StudentRequest_studentId_idx" ON "StudentRequest"("studentId");
CREATE INDEX "StudentRequest_createdAt_idx" ON "StudentRequest"("createdAt");
CREATE INDEX "StudentRequestEvent_requestId_createdAt_idx" ON "StudentRequestEvent"("requestId", "createdAt");

ALTER TABLE "AffairsStaff" ADD CONSTRAINT "AffairsStaff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AffairsStaffService" ADD CONSTRAINT "AffairsStaffService_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "AffairsStaff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AffairsStaffService" ADD CONSTRAINT "AffairsStaffService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AffairsService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRequest" ADD CONSTRAINT "StudentRequest_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRequest" ADD CONSTRAINT "StudentRequest_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "AffairsService"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentRequest" ADD CONSTRAINT "StudentRequest_assignedStaffId_fkey" FOREIGN KEY ("assignedStaffId") REFERENCES "AffairsStaff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudentRequestEvent" ADD CONSTRAINT "StudentRequestEvent_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StudentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Seed the seven standard services.
INSERT INTO "AffairsService" ("id", "code", "nameAr", "description", "expectedDays", "updatedAt") VALUES
  (gen_random_uuid()::text, 'ENROLLMENT_CERT', 'وثيقة قيد', 'إفادة تثبت أن الطالب مقيّد في الجامعة.', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'TRANSCRIPT', 'كشف علامات', 'كشف بعلامات الطالب في المقررات.', 3, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DEFERMENT', 'تأجيل دراسة', 'طلب تأجيل الدراسة لفصل أو أكثر.', 7, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'WITHDRAWAL', 'انسحاب', 'طلب انسحاب من الجامعة.', 7, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'COLLEGE_TRANSFER', 'انتقال بين الكليات', 'طلب الانتقال من كلية إلى أخرى.', 10, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'DATA_CORRECTION', 'تعديل بيانات', 'تصحيح أو تعديل بيانات الطالب الشخصية.', 5, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'CLEARANCE', 'براءة ذمة', 'براءة ذمة من الجامعة.', 5, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

-- No hard delete, even from outside the application.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['AffairsService','AffairsStaff','AffairsStaffService','AffairsRequestCounter','StudentRequest','StudentRequestEvent'] LOOP
    EXECUTE format('CREATE TRIGGER no_hard_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete()', t);
    EXECUTE format('CREATE TRIGGER no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete()', t);
  END LOOP;
END $$;

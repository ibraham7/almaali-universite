-- Student Affairs, phase 2: accepted status, request channel, attachments, referrals, student data-change log,
-- and a wider service setup. Additive; the only data touched is the backfill of the new request channel.

-- "Accepted" does not mean "completed" (the request may still need an executive step).
ALTER TYPE "StudentRequestStatus" ADD VALUE 'ACCEPTED';

CREATE TYPE "RequestChannel" AS ENUM ('ONLINE', 'IN_PERSON');
CREATE TYPE "ServiceChannel" AS ENUM ('ONLINE', 'IN_PERSON', 'BOTH');
CREATE TYPE "ServiceOutcome" AS ENUM ('NONE', 'DOCUMENT', 'ACTION', 'BOTH');
CREATE TYPE "ReferralTarget" AS ENUM ('ACADEMIC_AFFAIRS', 'FINANCIAL_AFFAIRS', 'COLLEGE', 'OTHER');
CREATE TYPE "ReferralMode" AS ENUM ('OPINION', 'EXECUTION');
CREATE TYPE "ReferralStatus" AS ENUM ('PENDING', 'ANSWERED', 'CANCELLED');
CREATE TYPE "ReferralOutcome" AS ENUM ('APPROVED', 'REJECTED', 'NOTES', 'DONE', 'NOT_DONE');

ALTER TABLE "AffairsService"
  ADD COLUMN "channel" "ServiceChannel" NOT NULL DEFAULT 'BOTH',
  ADD COLUMN "outcome" "ServiceOutcome" NOT NULL DEFAULT 'NONE',
  ADD COLUMN "attachmentsNote" TEXT,
  ADD COLUMN "feeNote" TEXT,
  ADD COLUMN "workflowNote" TEXT;

ALTER TABLE "StudentRequest" ADD COLUMN "channel" "RequestChannel" NOT NULL DEFAULT 'ONLINE';

-- Phase-1 requests created by someone other than the student were in-person requests.
UPDATE "StudentRequest" r SET "channel" = 'IN_PERSON'
WHERE r."createdByUserId" IS DISTINCT FROM (SELECT s."userId" FROM "Student" s WHERE s."id" = r."studentId");

CREATE TABLE "StudentRequestAttachment" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "visibleToStudent" BOOLEAN NOT NULL DEFAULT false,
    "uploadedByUserId" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "archivedReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentRequestAttachment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RequestReferral" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "mode" "ReferralMode" NOT NULL,
    "target" "ReferralTarget" NOT NULL,
    "targetName" TEXT,
    "reason" TEXT NOT NULL,
    "requested" TEXT,
    "dueAt" TIMESTAMP(3),
    "status" "ReferralStatus" NOT NULL DEFAULT 'PENDING',
    "referredByUserId" TEXT,
    "outcome" "ReferralOutcome",
    "responseNote" TEXT,
    "respondedByUserId" TEXT,
    "respondedAt" TIMESTAMP(3),
    "cancelReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RequestReferral_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudentDataChange" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT,
    "newValue" TEXT,
    "changedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StudentDataChange_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StudentRequestAttachment_requestId_idx" ON "StudentRequestAttachment"("requestId");
CREATE INDEX "RequestReferral_requestId_idx" ON "RequestReferral"("requestId");
CREATE INDEX "RequestReferral_status_idx" ON "RequestReferral"("status");
CREATE INDEX "StudentDataChange_studentId_createdAt_idx" ON "StudentDataChange"("studentId", "createdAt");

ALTER TABLE "StudentRequestAttachment" ADD CONSTRAINT "StudentRequestAttachment_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StudentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequestReferral" ADD CONSTRAINT "RequestReferral_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "StudentRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentDataChange" ADD CONSTRAINT "StudentDataChange_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- No hard delete, even from outside the application.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['StudentRequestAttachment','RequestReferral','StudentDataChange'] LOOP
    EXECUTE format('CREATE TRIGGER no_hard_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete()', t);
    EXECUTE format('CREATE TRIGGER no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete()', t);
  END LOOP;
END $$;

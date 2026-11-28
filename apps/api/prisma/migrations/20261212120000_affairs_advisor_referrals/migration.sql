ALTER TYPE "ReferralOutcome" ADD VALUE IF NOT EXISTS 'NEEDS_INFO';

ALTER TABLE "RequestReferral" ADD COLUMN "collegeId" TEXT, ADD COLUMN "advisorUserId" TEXT, ADD COLUMN "decisionAllowed" BOOLEAN NOT NULL DEFAULT true;
CREATE INDEX "RequestReferral_collegeId_idx" ON "RequestReferral"("collegeId");
CREATE INDEX "RequestReferral_advisorUserId_idx" ON "RequestReferral"("advisorUserId");

ALTER TABLE "StudentRequest" ADD COLUMN "delayReason" TEXT, ADD COLUMN "delayReasonAt" TIMESTAMP(3), ADD COLUMN "delayReasonById" TEXT;

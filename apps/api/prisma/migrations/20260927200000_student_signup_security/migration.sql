ALTER TYPE "UserStatus" ADD VALUE IF NOT EXISTS 'PENDING_VERIFICATION';

ALTER TABLE "User" ADD COLUMN "lastLoginAt" TIMESTAMP(3);

CREATE TABLE "SignupAttempt" (
    "id" TEXT NOT NULL,
    "ipHash" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SignupAttempt_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SignupAttempt_ipHash_createdAt_idx" ON "SignupAttempt"("ipHash", "createdAt");
CREATE INDEX "SignupAttempt_createdAt_idx" ON "SignupAttempt"("createdAt");

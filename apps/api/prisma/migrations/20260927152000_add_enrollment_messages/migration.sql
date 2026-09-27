CREATE TABLE "EnrollmentMessage" (
  "id" TEXT NOT NULL,
  "enrollmentId" TEXT NOT NULL,
  "senderUserId" TEXT NOT NULL,
  "senderRole" TEXT NOT NULL,
  "message" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "EnrollmentMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "EnrollmentMessage_enrollmentId_createdAt_idx"
ON "EnrollmentMessage"("enrollmentId", "createdAt");

ALTER TABLE "EnrollmentMessage"
ADD CONSTRAINT "EnrollmentMessage_enrollmentId_fkey"
FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

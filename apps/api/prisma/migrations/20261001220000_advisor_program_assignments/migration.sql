CREATE TABLE "AdvisorProgramAssignment" (
  "id" TEXT NOT NULL,
  "advisorId" TEXT NOT NULL,
  "programId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AdvisorProgramAssignment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AdvisorProgramAssignment_advisorId_programId_key"
  ON "AdvisorProgramAssignment"("advisorId", "programId");
CREATE INDEX "AdvisorProgramAssignment_programId_idx"
  ON "AdvisorProgramAssignment"("programId");

ALTER TABLE "AdvisorProgramAssignment"
  ADD CONSTRAINT "AdvisorProgramAssignment_advisorId_fkey"
  FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AdvisorProgramAssignment"
  ADD CONSTRAINT "AdvisorProgramAssignment_programId_fkey"
  FOREIGN KEY ("programId") REFERENCES "Program"("id") ON DELETE CASCADE ON UPDATE CASCADE;

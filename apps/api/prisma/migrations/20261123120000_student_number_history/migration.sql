-- Previous university numbers of a student (a college transfer gives a new number; the old one is kept).
CREATE TABLE "StudentNumberHistory" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "collegeId" TEXT,
    "replacedByUniversityId" TEXT NOT NULL,
    "reason" TEXT,
    "changedById" TEXT,
    "validFrom" TIMESTAMP(3) NOT NULL,
    "validTo" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StudentNumberHistory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentNumberHistory_universityId_key" ON "StudentNumberHistory"("universityId");
CREATE INDEX "StudentNumberHistory_studentId_idx" ON "StudentNumberHistory"("studentId");

ALTER TABLE "StudentNumberHistory" ADD CONSTRAINT "StudentNumberHistory_studentId_fkey"
  FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Like the other records: no hard delete.
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "StudentNumberHistory" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "StudentNumberHistory" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();

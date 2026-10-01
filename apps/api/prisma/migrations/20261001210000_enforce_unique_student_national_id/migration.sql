-- Treat national IDs as unique after trimming spaces and ignoring letter case.
-- Empty values are excluded for compatibility with older imported records.
CREATE UNIQUE INDEX IF NOT EXISTS "Student_nationalId_unique_nonempty"
ON "Student" (upper(regexp_replace(btrim("nationalId"), '\s', '', 'g')))
WHERE "nationalId" IS NOT NULL AND btrim("nationalId") <> '';

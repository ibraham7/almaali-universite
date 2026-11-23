-- Removing a course from a study plan keeps the row (no hard delete): status REMOVED + who / when / why.
-- Additive only: a new enum and four columns (existing rows become ACTIVE). Unique indexes are unchanged.
CREATE TYPE "StudyPlanCourseStatus" AS ENUM ('ACTIVE', 'REMOVED');

ALTER TABLE "StudyPlanCourse"
  ADD COLUMN "status" "StudyPlanCourseStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "removedAt" TIMESTAMP(3),
  ADD COLUMN "removedById" TEXT,
  ADD COLUMN "removeReason" TEXT;

-- إصدارات الخطة الدراسية: مسودة/معتمدة/مستبدلة + الدفعة وتاريخ التطبيق.
-- الخطط الحالية تصبح «إصدار 1 معتمد» وتبقى شغّالة بلا تغيير.
CREATE TYPE "StudyPlanStatus" AS ENUM ('DRAFT', 'APPROVED', 'SUPERSEDED');

ALTER TABLE "StudyPlan"
  ADD COLUMN "status" "StudyPlanStatus" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "planKey" TEXT,
  ADD COLUMN "versionNumber" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "previousVersionId" TEXT,
  ADD COLUMN "cohortYear" INTEGER,
  ADD COLUMN "effectiveFrom" TIMESTAMP(3),
  ADD COLUMN "approvedAt" TIMESTAMP(3),
  ADD COLUMN "approvedById" TEXT;

UPDATE "StudyPlan" SET "status" = 'APPROVED', "planKey" = "id", "approvedAt" = "createdAt";

ALTER TABLE "StudyPlan" ALTER COLUMN "planKey" SET NOT NULL;

DROP INDEX "StudyPlan_programId_nameAr_key";
CREATE UNIQUE INDEX "StudyPlan_programId_nameAr_versionNumber_key" ON "StudyPlan"("programId", "nameAr", "versionNumber");
CREATE UNIQUE INDEX "StudyPlan_planKey_versionNumber_key" ON "StudyPlan"("planKey", "versionNumber");

-- AlterTable
ALTER TABLE "Semester" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN "qualification" TEXT;
ALTER TABLE "Teacher" ADD COLUMN "specialization" TEXT;

-- AlterTable
ALTER TABLE "RegistrationPeriod" ADD COLUMN "reason" TEXT;

ALTER TYPE "CourseType" ADD VALUE IF NOT EXISTS 'UNSPECIFIED';
CREATE TYPE "CurriculumCategory" AS ENUM ('UNIVERSITY', 'COLLEGE', 'PROGRAM');

ALTER TABLE "StudyPlan" ADD COLUMN "graduationCredits" INTEGER;

CREATE TABLE "StudyPlanCurriculumCourse" (
    "id" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "category" "CurriculumCategory" NOT NULL,
    "requirement" "CourseRequirement" NOT NULL,
    "sourceFile" TEXT NOT NULL,
    "sourceRow" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyPlanCurriculumCourse_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StudyPlanCurriculumQuota" (
    "id" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "category" "CurriculumCategory" NOT NULL,
    "requirement" "CourseRequirement" NOT NULL,
    "requiredCredits" INTEGER NOT NULL,
    "offeredPoolCredits" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StudyPlanCurriculumQuota_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudyPlanCurriculumCourse_studyPlanId_courseId_category_requirement_key"
ON "StudyPlanCurriculumCourse"("studyPlanId", "courseId", "category", "requirement");
CREATE INDEX "StudyPlanCurriculumCourse_studyPlanId_category_idx"
ON "StudyPlanCurriculumCourse"("studyPlanId", "category");
CREATE UNIQUE INDEX "StudyPlanCurriculumQuota_studyPlanId_category_requirement_key"
ON "StudyPlanCurriculumQuota"("studyPlanId", "category", "requirement");

ALTER TABLE "StudyPlanCurriculumCourse"
ADD CONSTRAINT "StudyPlanCurriculumCourse_studyPlanId_fkey"
FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyPlanCurriculumCourse"
ADD CONSTRAINT "StudyPlanCurriculumCourse_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StudyPlanCurriculumQuota"
ADD CONSTRAINT "StudyPlanCurriculumQuota_studyPlanId_fkey"
FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

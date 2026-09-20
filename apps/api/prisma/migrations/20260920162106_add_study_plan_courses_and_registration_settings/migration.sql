-- AlterTable
ALTER TABLE "Semester" ADD COLUMN     "requireMandatoryCourses" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "University" ADD COLUMN     "allowedFutureYears" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "minGpaForFutureYears" DECIMAL(65,30) NOT NULL DEFAULT 2.0,
ADD COLUMN     "requiredElectiveCredits" INTEGER NOT NULL DEFAULT 12;

-- CreateTable
CREATE TABLE "StudyPlanCourse" (
    "id" TEXT NOT NULL,
    "studyPlanId" TEXT NOT NULL,
    "academicYearId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "priority" INTEGER NOT NULL,
    "requirement" "CourseRequirement" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudyPlanCourse_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanCourse_studyPlanId_academicYearId_courseId_key" ON "StudyPlanCourse"("studyPlanId", "academicYearId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanCourse_studyPlanId_academicYearId_priority_key" ON "StudyPlanCourse"("studyPlanId", "academicYearId", "priority");

-- AddForeignKey
ALTER TABLE "StudyPlanCourse" ADD CONSTRAINT "StudyPlanCourse_studyPlanId_fkey" FOREIGN KEY ("studyPlanId") REFERENCES "StudyPlan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanCourse" ADD CONSTRAINT "StudyPlanCourse_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudyPlanCourse" ADD CONSTRAINT "StudyPlanCourse_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

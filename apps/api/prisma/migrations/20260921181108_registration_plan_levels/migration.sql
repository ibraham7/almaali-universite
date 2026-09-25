/*
  Warnings:

  - A unique constraint covering the columns `[studyPlanId,levelNumber]` on the table `AcademicYear` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[academicYearId,semesterNumber]` on the table `Semester` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studyPlanId,academicYearId,semesterId,courseId]` on the table `StudyPlanCourse` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studyPlanId,academicYearId,semesterId,priority]` on the table `StudyPlanCourse` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `levelNumber` to the `AcademicYear` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semesterNumber` to the `Semester` table without a default value. This is not possible if the table is not empty.
  - Added the required column `semesterId` to the `StudyPlanCourse` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "StudyPlanCourse_studyPlanId_academicYearId_courseId_key";

-- DropIndex
DROP INDEX "StudyPlanCourse_studyPlanId_academicYearId_priority_key";

-- AlterTable
ALTER TABLE "AcademicYear" ADD COLUMN     "levelNumber" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Semester" ADD COLUMN     "semesterNumber" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "StudyPlanCourse" ADD COLUMN     "semesterId" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_studyPlanId_levelNumber_key" ON "AcademicYear"("studyPlanId", "levelNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Semester_academicYearId_semesterNumber_key" ON "Semester"("academicYearId", "semesterNumber");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanCourse_studyPlanId_academicYearId_semesterId_cours_key" ON "StudyPlanCourse"("studyPlanId", "academicYearId", "semesterId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "StudyPlanCourse_studyPlanId_academicYearId_semesterId_prior_key" ON "StudyPlanCourse"("studyPlanId", "academicYearId", "semesterId", "priority");

-- AddForeignKey
ALTER TABLE "StudyPlanCourse" ADD CONSTRAINT "StudyPlanCourse_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

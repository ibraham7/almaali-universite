-- CreateTable
CREATE TABLE "GradeScale" (
    "id" TEXT NOT NULL,
    "universityId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "minScore" DECIMAL(65,30) NOT NULL,
    "maxScore" DECIMAL(65,30) NOT NULL,
    "gradePoint" DECIMAL(65,30) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GradeScale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CourseResult" (
    "id" TEXT NOT NULL,
    "enrollmentItemId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "gradeScaleId" TEXT,
    "score" DECIMAL(65,30) NOT NULL,
    "gradeLabel" TEXT NOT NULL,
    "gradePoint" DECIMAL(65,30) NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseResult_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GradeScale_universityId_minScore_maxScore_idx" ON "GradeScale"("universityId", "minScore", "maxScore");

-- CreateIndex
CREATE UNIQUE INDEX "GradeScale_universityId_label_key" ON "GradeScale"("universityId", "label");

-- CreateIndex
CREATE UNIQUE INDEX "CourseResult_enrollmentItemId_key" ON "CourseResult"("enrollmentItemId");

-- CreateIndex
CREATE INDEX "CourseResult_studentId_idx" ON "CourseResult"("studentId");

-- CreateIndex
CREATE INDEX "CourseResult_courseId_idx" ON "CourseResult"("courseId");

-- CreateIndex
CREATE INDEX "CourseResult_semesterId_idx" ON "CourseResult"("semesterId");

-- CreateIndex
CREATE INDEX "CourseResult_studentId_semesterId_idx" ON "CourseResult"("studentId", "semesterId");

-- AddForeignKey
ALTER TABLE "GradeScale" ADD CONSTRAINT "GradeScale_universityId_fkey" FOREIGN KEY ("universityId") REFERENCES "University"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseResult" ADD CONSTRAINT "CourseResult_enrollmentItemId_fkey" FOREIGN KEY ("enrollmentItemId") REFERENCES "EnrollmentItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseResult" ADD CONSTRAINT "CourseResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseResult" ADD CONSTRAINT "CourseResult_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseResult" ADD CONSTRAINT "CourseResult_semesterId_fkey" FOREIGN KEY ("semesterId") REFERENCES "Semester"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseResult" ADD CONSTRAINT "CourseResult_gradeScaleId_fkey" FOREIGN KEY ("gradeScaleId") REFERENCES "GradeScale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

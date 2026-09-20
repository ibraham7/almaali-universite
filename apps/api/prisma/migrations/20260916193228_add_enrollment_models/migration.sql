-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED', 'CONFIRMED', 'DROPPED', 'CANCELLED');

-- CreateTable
CREATE TABLE "StudentEnrollment" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "semesterId" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentEnrollment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EnrollmentItem" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "courseId" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EnrollmentItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AdvisorApproval" (
    "id" TEXT NOT NULL,
    "enrollmentId" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AdvisorApproval_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StudentEnrollment_studentId_semesterId_key" ON "StudentEnrollment"("studentId", "semesterId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentItem_enrollmentId_courseId_key" ON "EnrollmentItem"("enrollmentId", "courseId");

-- CreateIndex
CREATE UNIQUE INDEX "EnrollmentItem_enrollmentId_sectionId_key" ON "EnrollmentItem"("enrollmentId", "sectionId");

-- AddForeignKey
ALTER TABLE "EnrollmentItem" ADD CONSTRAINT "EnrollmentItem_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorApproval" ADD CONSTRAINT "AdvisorApproval_enrollmentId_fkey" FOREIGN KEY ("enrollmentId") REFERENCES "StudentEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

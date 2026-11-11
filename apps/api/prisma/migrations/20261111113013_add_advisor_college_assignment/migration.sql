-- CreateTable
CREATE TABLE "AdvisorCollegeAssignment" (
    "id" TEXT NOT NULL,
    "advisorId" TEXT NOT NULL,
    "collegeId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdvisorCollegeAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AdvisorCollegeAssignment_collegeId_idx" ON "AdvisorCollegeAssignment"("collegeId");

-- CreateIndex
CREATE UNIQUE INDEX "AdvisorCollegeAssignment_advisorId_collegeId_key" ON "AdvisorCollegeAssignment"("advisorId", "collegeId");

-- AddForeignKey
ALTER TABLE "AdvisorCollegeAssignment" ADD CONSTRAINT "AdvisorCollegeAssignment_advisorId_fkey" FOREIGN KEY ("advisorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdvisorCollegeAssignment" ADD CONSTRAINT "AdvisorCollegeAssignment_collegeId_fkey" FOREIGN KEY ("collegeId") REFERENCES "College"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Program"
ADD COLUMN "collegeId" TEXT;

UPDATE "Program" AS program
SET "collegeId" = department."collegeId"
FROM "Department" AS department
WHERE program."departmentId" = department."id";

ALTER TABLE "Program"
ALTER COLUMN "departmentId" DROP NOT NULL;

ALTER TABLE "Program"
ADD CONSTRAINT "Program_collegeId_fkey"
FOREIGN KEY ("collegeId") REFERENCES "College"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Program_collegeId_nameAr_key"
ON "Program"("collegeId", "nameAr");

ALTER TABLE "Program"
ADD CONSTRAINT "Program_department_or_college_check"
CHECK ("departmentId" IS NOT NULL OR "collegeId" IS NOT NULL);

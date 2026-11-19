-- Program is now a degree type (bachelor / diploma / master / doctorate) under a department.
CREATE TYPE "ProgramLevel" AS ENUM ('BACHELOR', 'DIPLOMA', 'MASTER', 'DOCTORATE');

ALTER TABLE "Program" ADD COLUMN "level" "ProgramLevel" NOT NULL DEFAULT 'BACHELOR';

-- A program that hangs directly under a college is really a specialization:
-- it becomes a department (same name) and the existing program row becomes the
-- Bachelor program under it, so plans, students and advisor assignments keep working.
INSERT INTO "Department" ("id", "collegeId", "nameAr", "nameEn", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, p."collegeId", p."nameAr", p."nameEn", now(), now()
FROM "Program" p
WHERE p."departmentId" IS NULL AND p."collegeId" IS NOT NULL
ON CONFLICT ("collegeId", "nameAr") DO NOTHING;

UPDATE "Program" p
SET "departmentId" = d."id", "nameAr" = 'بكالوريوس', "nameEn" = 'Bachelor', "level" = 'BACHELOR'
FROM "Department" d
WHERE p."departmentId" IS NULL AND p."collegeId" IS NOT NULL
  AND d."collegeId" = p."collegeId" AND d."nameAr" = p."nameAr";

UPDATE "Student" s
SET "departmentId" = p."departmentId"
FROM "Program" p
WHERE s."programId" = p."id" AND s."departmentId" IS NULL;

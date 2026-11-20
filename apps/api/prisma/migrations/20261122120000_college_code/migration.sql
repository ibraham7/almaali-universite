-- College code (2 digits): the university number is year + college code + sequence (e.g. 27 + 01 + 001 = 2701001).
ALTER TABLE "College" ADD COLUMN "code" TEXT;

-- Codes decided by the university: الآداب 01, التربية 02, أصول الدين 03.
UPDATE "College" SET "code" = '01' WHERE "nameAr" LIKE '%الآداب%' OR "nameAr" LIKE '%الاداب%';
UPDATE "College" SET "code" = '02' WHERE "nameAr" LIKE '%التربية%';
UPDATE "College" SET "code" = '03' WHERE "nameAr" LIKE '%أصول الدين%' OR "nameAr" LIKE '%اصول الدين%';

-- Any other college gets the next free numbers (04, 05, ...) in creation order; editable afterwards.
UPDATE "College" c
SET "code" = lpad((3 + n.rn)::text, 2, '0')
FROM (
  SELECT id, row_number() OVER (PARTITION BY "universityId" ORDER BY "createdAt", "nameAr") AS rn
  FROM "College"
  WHERE "code" IS NULL
) n
WHERE c.id = n.id;

CREATE UNIQUE INDEX "College_universityId_code_key" ON "College"("universityId", "code");

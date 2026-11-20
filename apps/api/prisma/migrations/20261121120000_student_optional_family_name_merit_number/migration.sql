-- The ministry file has no family-name column, and the ministry-generated number is a separate "merit number".
ALTER TABLE "Student" ALTER COLUMN "familyName" SET DEFAULT '';
ALTER TABLE "Student" ADD COLUMN "meritNumber" TEXT;

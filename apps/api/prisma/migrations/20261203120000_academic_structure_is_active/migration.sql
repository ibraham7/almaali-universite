-- تعطيل الكلية/القسم/البرنامج بدل حذفها. كل الموجود يبقى فعّالًا.
ALTER TABLE "College" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Department" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Program" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

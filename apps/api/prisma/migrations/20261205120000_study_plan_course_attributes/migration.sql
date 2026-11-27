-- خصائص المقرر داخل الخطة: نوع المتطلب، الساعات ضمن الخطة، والمتطلبات السابقة الخاصة بالخطة.
-- القيم الحالية لا تتغير: ownPrerequisites=false يعني متطلبات المقرر العامة، وcreditsInPlan الفارغ يعني ساعات المقرر.
ALTER TABLE "StudyPlanCourse"
  ADD COLUMN "category" "CurriculumCategory",
  ADD COLUMN "creditsInPlan" INTEGER,
  ADD COLUMN "ownPrerequisites" BOOLEAN NOT NULL DEFAULT false;

-- نوع المتطلب للمقررات الحالية من المنهاج المستورد (إن وُجد، وإن تعدد نأخذ الأول بالترتيب الثابت).
UPDATE "StudyPlanCourse" spc SET "category" = src."category"
FROM (
  SELECT DISTINCT ON ("studyPlanId", "courseId") "studyPlanId", "courseId", "category"
  FROM "StudyPlanCurriculumCourse"
  ORDER BY "studyPlanId", "courseId", "category"
) src
WHERE spc."studyPlanId" = src."studyPlanId" AND spc."courseId" = src."courseId";

CREATE TABLE "StudyPlanCoursePrerequisite" (
  "id" TEXT NOT NULL,
  "planCourseId" TEXT NOT NULL,
  "prerequisiteCourseId" TEXT NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudyPlanCoursePrerequisite_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudyPlanCoursePrerequisite_planCourseId_prerequisiteCourseId_key" ON "StudyPlanCoursePrerequisite"("planCourseId", "prerequisiteCourseId");
ALTER TABLE "StudyPlanCoursePrerequisite" ADD CONSTRAINT "StudyPlanCoursePrerequisite_planCourseId_fkey" FOREIGN KEY ("planCourseId") REFERENCES "StudyPlanCourse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudyPlanCoursePrerequisite" ADD CONSTRAINT "StudyPlanCoursePrerequisite_prerequisiteCourseId_fkey" FOREIGN KEY ("prerequisiteCourseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- لا حذف نهائي (نفس سياسة باقي الجداول الأكاديمية): الإزالة بـ isActive.
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "StudyPlanCoursePrerequisite" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "StudyPlanCoursePrerequisite" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();

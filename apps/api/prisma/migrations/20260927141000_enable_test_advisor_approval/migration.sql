-- The current demo registration period was seeded with advisor approval disabled,
-- which bypasses the advisor inbox entirely. Enable it only for the seeded
-- test study plan so production-configured registration periods remain untouched.
UPDATE "RegistrationPeriod" AS rp
SET "advisorApprovalRequired" = true
FROM "Semester" AS semester
JOIN "AcademicYear" AS academic_year
  ON academic_year.id = semester."academicYearId"
JOIN "StudyPlan" AS study_plan
  ON study_plan.id = academic_year."studyPlanId"
WHERE rp."semesterId" = semester.id
  AND study_plan."nameAr" = 'الخطة التجريبية';

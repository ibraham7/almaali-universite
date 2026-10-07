-- Remove only the clearly named demo academic structure used during testing.
-- Official university curricula and all non-demo programs/plans are preserved.
BEGIN;

CREATE TEMP TABLE "_test_colleges" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_colleges" ("id")
SELECT "id"
FROM "College"
WHERE "nameAr" IN ('كلية اختبار', 'كلية تجريبية')
   OR "nameEn" IN ('Test College', 'Demo College')
   OR "id" = 'd6100000-0000-4000-8000-000000000002'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_departments" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_departments" ("id")
SELECT "id"
FROM "Department"
WHERE "collegeId" IN (SELECT "id" FROM "_test_colleges")
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_programs" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_programs" ("id")
SELECT "id"
FROM "Program"
WHERE "departmentId" IN (SELECT "id" FROM "_test_departments")
   OR "collegeId" IN (SELECT "id" FROM "_test_colleges")
   OR "id" = 'd6100000-0000-4000-8000-000000000004'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_plans" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_plans" ("id")
SELECT "id"
FROM "StudyPlan"
WHERE "programId" IN (SELECT "id" FROM "_test_programs")
   OR "id" = 'd6100000-0000-4000-8000-000000000005'
   OR "id" = 'd6100000-0000-4000-8000-000000000005'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_years" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_years" ("id")
SELECT "id" FROM "AcademicYear"
WHERE "studyPlanId" IN (SELECT "id" FROM "_test_plans")
   OR "id" = 'd6100000-0000-4000-8000-000000000006'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_semesters" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_semesters" ("id")
SELECT "id" FROM "Semester"
WHERE "academicYearId" IN (SELECT "id" FROM "_test_years")
   OR "id" = 'd6100000-0000-4000-8000-000000000007'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_courses" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_courses" ("id")
SELECT "id" FROM "Course" WHERE "code" LIKE 'TEST-%'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_sections" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_sections" ("id")
SELECT "id" FROM "CourseSection"
WHERE "semesterId" IN (SELECT "id" FROM "_test_semesters")
   OR "courseId" IN (SELECT "id" FROM "_test_courses")
   OR "sectionNumber" LIKE 'TEST-%'
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_test_enrollments" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_test_enrollments" ("id")
SELECT "id" FROM "StudentEnrollment"
WHERE "semesterId" IN (SELECT "id" FROM "_test_semesters")
ON CONFLICT DO NOTHING;

DELETE FROM "AuditLog"
WHERE "entityId" IN (
  SELECT "id" FROM "_test_colleges"
  UNION SELECT "id" FROM "_test_departments"
  UNION SELECT "id" FROM "_test_programs"
  UNION SELECT "id" FROM "_test_plans"
  UNION SELECT "id" FROM "_test_years"
  UNION SELECT "id" FROM "_test_semesters"
  UNION SELECT "id" FROM "_test_courses"
  UNION SELECT "id" FROM "_test_sections"
)
OR "details" ILIKE '%الخطة التجريبية%'
OR "details" ILIKE '%برنامج اختبار التسجيل%'
OR "details" ILIKE '%قسم اختبار النظام%';

DELETE FROM "CourseResult"
WHERE "semesterId" IN (SELECT "id" FROM "_test_semesters")
   OR "courseId" IN (SELECT "id" FROM "_test_courses")
   OR "enrollmentItemId" IN (
     SELECT "id" FROM "EnrollmentItem"
     WHERE "sectionId" IN (SELECT "id" FROM "_test_sections")
        OR "courseId" IN (SELECT "id" FROM "_test_courses")
   );

DELETE FROM "EnrollmentItem"
WHERE "sectionId" IN (SELECT "id" FROM "_test_sections")
   OR "courseId" IN (SELECT "id" FROM "_test_courses");

DELETE FROM "EnrollmentMessage"
WHERE "enrollmentId" IN (SELECT "id" FROM "_test_enrollments");
DELETE FROM "AdvisorApproval"
WHERE "enrollmentId" IN (SELECT "id" FROM "_test_enrollments");
DELETE FROM "StudentEnrollment"
WHERE "id" IN (SELECT "id" FROM "_test_enrollments");

DELETE FROM "RegistrationPeriod"
WHERE "semesterId" IN (SELECT "id" FROM "_test_semesters");
DELETE FROM "SectionSchedule"
WHERE "sectionId" IN (SELECT "id" FROM "_test_sections");
DELETE FROM "CourseSection"
WHERE "id" IN (SELECT "id" FROM "_test_sections");
DELETE FROM "CoursePrerequisite"
WHERE "courseId" IN (SELECT "id" FROM "_test_courses")
   OR "prerequisiteId" IN (SELECT "id" FROM "_test_courses");
DELETE FROM "StudyPlanCourse"
WHERE "studyPlanId" IN (SELECT "id" FROM "_test_plans")
   OR "academicYearId" IN (SELECT "id" FROM "_test_years")
   OR "semesterId" IN (SELECT "id" FROM "_test_semesters")
   OR "courseId" IN (SELECT "id" FROM "_test_courses");
DELETE FROM "StudyPlanCurriculumCourse"
WHERE "studyPlanId" IN (SELECT "id" FROM "_test_plans")
   OR "courseId" IN (SELECT "id" FROM "_test_courses");
DELETE FROM "StudyPlanCurriculumQuota"
WHERE "studyPlanId" IN (SELECT "id" FROM "_test_plans");

DELETE FROM "Course"
WHERE "id" IN (SELECT "id" FROM "_test_courses")
  AND NOT EXISTS (SELECT 1 FROM "StudyPlanCourse" spc WHERE spc."courseId" = "Course"."id")
  AND NOT EXISTS (SELECT 1 FROM "StudyPlanCurriculumCourse" scc WHERE scc."courseId" = "Course"."id")
  AND NOT EXISTS (SELECT 1 FROM "CourseSection" cs WHERE cs."courseId" = "Course"."id")
  AND NOT EXISTS (SELECT 1 FROM "CourseResult" cr WHERE cr."courseId" = "Course"."id")
  AND NOT EXISTS (SELECT 1 FROM "EnrollmentItem" ei WHERE ei."courseId" = "Course"."id");

DELETE FROM "Semester" WHERE "id" IN (SELECT "id" FROM "_test_semesters");
DELETE FROM "AcademicYear" WHERE "id" IN (SELECT "id" FROM "_test_years");
DELETE FROM "StudyPlan" WHERE "id" IN (SELECT "id" FROM "_test_plans");
DELETE FROM "Program" WHERE "id" IN (SELECT "id" FROM "_test_programs");
DELETE FROM "Department" WHERE "id" IN (SELECT "id" FROM "_test_departments");
DELETE FROM "College" WHERE "id" IN (SELECT "id" FROM "_test_colleges");

COMMIT;

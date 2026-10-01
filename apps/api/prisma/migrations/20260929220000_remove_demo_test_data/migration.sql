-- Remove only explicitly marked demo records while preserving production users
-- and any academic records without test/demo markers.
BEGIN;

CREATE TEMP TABLE "_demo_cleanup_plans" ON COMMIT DROP AS
SELECT "id" FROM "StudyPlan" WHERE "id" = 'd6100000-0000-4000-8000-000000000005';

CREATE TEMP TABLE "_demo_cleanup_years" ON COMMIT DROP AS
SELECT "id" FROM "AcademicYear"
WHERE "id" = 'd6100000-0000-4000-8000-000000000006'
   OR "studyPlanId" IN (SELECT "id" FROM "_demo_cleanup_plans");

CREATE TEMP TABLE "_demo_cleanup_semesters" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_demo_cleanup_semesters" ("id")
SELECT "id" FROM "Semester"
WHERE "id" = 'd6100000-0000-4000-8000-000000000007'
   OR "academicYearId" IN (SELECT "id" FROM "_demo_cleanup_years")
ON CONFLICT DO NOTHING;
INSERT INTO "_demo_cleanup_semesters" ("id") VALUES ('TEST-SEMESTER-2026-FALL')
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_demo_cleanup_students" ON COMMIT DROP AS
SELECT "id", "userId"
FROM "Student"
WHERE "universityId" LIKE 'TEST-U-%'
   OR "universityId" = 'TEST-STUDENT-001';

CREATE TEMP TABLE "_demo_cleanup_users" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_demo_cleanup_users" ("id")
SELECT "id"
FROM "User"
WHERE lower("email") IN (
  'student.test@university.local',
  'advisor.test@university.local',
  'admin.test@university.local'
)
ON CONFLICT DO NOTHING;
INSERT INTO "_demo_cleanup_users" ("id")
SELECT "userId" FROM "_demo_cleanup_students" WHERE "userId" IS NOT NULL
ON CONFLICT DO NOTHING;

CREATE TEMP TABLE "_demo_cleanup_courses" ON COMMIT DROP AS
SELECT "id" FROM "Course" WHERE "code" LIKE 'TEST-%';

CREATE TEMP TABLE "_demo_cleanup_sections" ON COMMIT DROP AS
SELECT "id"
FROM "CourseSection"
WHERE "courseId" IN (SELECT "id" FROM "_demo_cleanup_courses")
   OR "sectionNumber" LIKE 'TEST-%'
   OR "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters");

CREATE TEMP TABLE "_demo_cleanup_audit_ids" ("id" TEXT PRIMARY KEY) ON COMMIT DROP;
INSERT INTO "_demo_cleanup_audit_ids" ("id")
SELECT "id" FROM "_demo_cleanup_students"
UNION SELECT "id" FROM "_demo_cleanup_users"
UNION SELECT "id" FROM "_demo_cleanup_courses"
UNION SELECT "id" FROM "_demo_cleanup_sections"
UNION SELECT "id" FROM "RegistrationPeriod"
  WHERE "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters")
UNION SELECT "id" FROM "StudentEnrollment"
  WHERE "studentId" IN (SELECT "id" FROM "_demo_cleanup_students")
     OR "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters")
UNION SELECT "id" FROM "CourseResult"
  WHERE "studentId" IN (SELECT "id" FROM "_demo_cleanup_students")
     OR "courseId" IN (SELECT "id" FROM "_demo_cleanup_courses")
     OR "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters")
UNION SELECT "id" FROM "University" WHERE "id" = 'd6100000-0000-4000-8000-000000000001'
UNION SELECT "id" FROM "College" WHERE "id" = 'd6100000-0000-4000-8000-000000000002'
UNION SELECT "id" FROM "Department" WHERE "id" = 'd6100000-0000-4000-8000-000000000003'
UNION SELECT "id" FROM "Program" WHERE "id" = 'd6100000-0000-4000-8000-000000000004'
UNION SELECT "id" FROM "_demo_cleanup_plans"
UNION SELECT "id" FROM "_demo_cleanup_years"
UNION SELECT "id" FROM "Semester" WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_semesters");

DELETE FROM "AuditLog"
WHERE "userId" IN (SELECT "id" FROM "_demo_cleanup_users")
   OR "entityId" IN (SELECT "id" FROM "_demo_cleanup_audit_ids")
   OR "details" ILIKE '%TEST-U-%'
   OR "details" ILIKE '%TEST-STUDENT-%'
   OR "details" ILIKE '%TEST-CS%';

DELETE FROM "SupportTicket"
WHERE "authorId" IN (SELECT "id" FROM "_demo_cleanup_users");

DELETE FROM "CourseResult"
WHERE "studentId" IN (SELECT "id" FROM "_demo_cleanup_students")
   OR "courseId" IN (SELECT "id" FROM "_demo_cleanup_courses")
   OR "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters");

DELETE FROM "EnrollmentItem"
WHERE "courseId" IN (SELECT "id" FROM "_demo_cleanup_courses")
   OR "sectionId" IN (SELECT "id" FROM "_demo_cleanup_sections");

DELETE FROM "StudentEnrollment"
WHERE "studentId" IN (SELECT "id" FROM "_demo_cleanup_students")
   OR "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters");

DELETE FROM "CoursePrerequisite"
WHERE "courseId" IN (SELECT "id" FROM "_demo_cleanup_courses")
   OR "prerequisiteId" IN (SELECT "id" FROM "_demo_cleanup_courses");

DELETE FROM "StudyPlanCourse"
WHERE "courseId" IN (SELECT "id" FROM "_demo_cleanup_courses")
   OR "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters")
   OR "studyPlanId" IN (SELECT "id" FROM "_demo_cleanup_plans")
   OR "academicYearId" IN (SELECT "id" FROM "_demo_cleanup_years");

DELETE FROM "RegistrationPeriod"
WHERE "semesterId" IN (SELECT "id" FROM "_demo_cleanup_semesters");

DELETE FROM "CourseSection"
WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_sections");

DELETE FROM "Student"
WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_students");

DELETE FROM "User"
WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_users");

DELETE FROM "Course"
WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_courses");

DELETE FROM "Semester"
WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_semesters");

DELETE FROM "AcademicYear"
WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_years");
DELETE FROM "StudyPlan"
WHERE "id" IN (SELECT "id" FROM "_demo_cleanup_plans");
DELETE FROM "Program" WHERE "id" = 'd6100000-0000-4000-8000-000000000004';
DELETE FROM "Department" WHERE "id" = 'd6100000-0000-4000-8000-000000000003';
DELETE FROM "College" WHERE "id" = 'd6100000-0000-4000-8000-000000000002';
DELETE FROM "University" WHERE "id" = 'd6100000-0000-4000-8000-000000000001';

COMMIT;

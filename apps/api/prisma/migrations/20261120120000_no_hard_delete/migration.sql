-- 1) A dropped course stays in the student's record as DROPPED (who/when/why), it is no longer deleted.
CREATE TYPE "EnrollmentItemStatus" AS ENUM ('ACTIVE', 'DROPPED', 'VOID');

ALTER TABLE "EnrollmentItem"
  ADD COLUMN "status" "EnrollmentItemStatus" NOT NULL DEFAULT 'ACTIVE',
  ADD COLUMN "droppedAt" TIMESTAMP(3),
  ADD COLUMN "droppedById" TEXT,
  ADD COLUMN "dropReason" TEXT;

-- 2) No hard delete on the academic / administrative records, even from outside the application.
-- A deliberately approved deletion can run inside a transaction that does
--   SET LOCAL app.allow_hard_delete = 'on';
CREATE FUNCTION prevent_hard_delete() RETURNS trigger AS $$
BEGIN
  IF current_setting('app.allow_hard_delete', true) = 'on' THEN
    IF TG_OP = 'TRUNCATE' THEN RETURN NULL; END IF;
    RETURN OLD;
  END IF;
  RAISE EXCEPTION 'Hard delete is disabled on table "%". Change the record status instead.', TG_TABLE_NAME
    USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'User', 'Role', 'University', 'College', 'Department', 'Program', 'StudyPlan', 'AcademicYear', 'Semester',
    'Student', 'Teacher', 'Classroom', 'GradeScale', 'RegistrationPeriod',
    'Course', 'CoursePrerequisite', 'CourseSection', 'StudyPlanCourse', 'StudyPlanCurriculumCourse', 'StudyPlanCurriculumQuota',
    'StudentEnrollment', 'EnrollmentItem', 'CourseResult', 'AuditLog'
  ] LOOP
    EXECUTE format('CREATE TRIGGER no_hard_delete BEFORE DELETE ON %I FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete()', t);
    EXECUTE format('CREATE TRIGGER no_truncate BEFORE TRUNCATE ON %I FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete()', t);
  END LOOP;
END $$;

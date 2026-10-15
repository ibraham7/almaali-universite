-- A fresh production database has no roles or university record, and the
-- admin UI cannot create either, so every create action would fail.
-- Both inserts are no-ops on databases that already contain this data.
INSERT INTO "Role" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
VALUES
  (gen_random_uuid()::text, 'STUDENT', 'Student', 'Student self-service access', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'ADVISOR', 'Academic Advisor', 'Advisor registration approvals', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'REGISTRAR', 'Registrar', 'Academic records management', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  (gen_random_uuid()::text, 'SYSTEM_ADMIN', 'System Administrator', 'Full system administration access', true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO NOTHING;

INSERT INTO "University" ("id", "nameAr", "nameEn", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'جامعة المعالي', 'Al-Maali University', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
WHERE NOT EXISTS (SELECT 1 FROM "University");

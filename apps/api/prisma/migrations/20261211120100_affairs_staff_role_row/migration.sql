INSERT INTO "Role" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'AFFAIRS_STAFF', 'Student Affairs Staff', 'Works on student affairs requests only', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "code" = 'AFFAIRS_STAFF');

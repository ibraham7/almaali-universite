INSERT INTO "Role" ("id", "code", "name", "description", "isActive", "createdAt", "updatedAt")
SELECT gen_random_uuid()::text, 'SITE_EDITOR', 'Site Editor', 'Manages the public website content only', true, now(), now()
WHERE NOT EXISTS (SELECT 1 FROM "Role" WHERE "code" = 'SITE_EDITOR');

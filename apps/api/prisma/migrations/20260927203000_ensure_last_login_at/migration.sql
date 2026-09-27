-- Repair databases where the User.lastLoginAt column was not created by the
-- earlier student signup migration.
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

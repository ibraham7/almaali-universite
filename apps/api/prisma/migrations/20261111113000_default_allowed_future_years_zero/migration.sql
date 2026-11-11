-- Students should only ever see and register for their current semester by
-- default. The previous default of 1 silently let a newly created
-- university's students register a level ahead of schedule.
ALTER TABLE "University" ALTER COLUMN "allowedFutureYears" SET DEFAULT 0;

-- Backfill: any existing university row still sitting at the untouched old
-- default (1) is reset to the new default. A university whose admin has
-- deliberately chosen a different value (0, 2, ...) from the settings
-- screen is left exactly as they configured it.
UPDATE "University" SET "allowedFutureYears" = 0 WHERE "allowedFutureYears" = 1;

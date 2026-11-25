-- Student Affairs, phase 5: unit manager flag on the staff profile + in-system notifications.
ALTER TABLE "AffairsStaff" ADD COLUMN "isManager" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "AffairsNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "requestId" TEXT,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AffairsNotification_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AffairsNotification_userId_isRead_createdAt_idx" ON "AffairsNotification"("userId", "isRead", "createdAt");

-- No hard delete, even from outside the application.
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "AffairsNotification" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "AffairsNotification" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();

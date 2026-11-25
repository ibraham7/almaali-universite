-- Student Affairs, phase 4: settings and capability switches (key/value, defaults live in code).
CREATE TABLE "AffairsSetting" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedByUserId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AffairsSetting_pkey" PRIMARY KEY ("key")
);

-- No hard delete, even from outside the application.
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "AffairsSetting" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "AffairsSetting" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();

-- الموقع التعريفي للجامعة: جداول المحتوى العام. كلها جداول جديدة (لا تأثير على الموجود).
CREATE TYPE "SiteContentStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "SiteItemKind" AS ENUM ('STAT', 'VALUE', 'GOAL', 'MILESTONE', 'ADMISSION_STEP', 'FAQ');
CREATE TYPE "SiteNewsType" AS ENUM ('NEWS', 'ANNOUNCEMENT');
CREATE TYPE "SiteProfileKind" AS ENUM ('COLLEGE', 'DEPARTMENT', 'PROGRAM');
CREATE TYPE "SiteMessageStatus" AS ENUM ('NEW', 'READ', 'ARCHIVED');

CREATE TABLE "SiteSetting" (
  "key" TEXT NOT NULL,
  "value" TEXT NOT NULL,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("key")
);

CREATE TABLE "SiteContentItem" (
  "id" TEXT NOT NULL,
  "kind" "SiteItemKind" NOT NULL,
  "title" TEXT NOT NULL,
  "text" TEXT NOT NULL DEFAULT '',
  "extra" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "SiteContentStatus" NOT NULL DEFAULT 'PUBLISHED',
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteContentItem_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteContentItem_kind_status_sortOrder_idx" ON "SiteContentItem"("kind", "status", "sortOrder");

CREATE TABLE "SiteNews" (
  "id" TEXT NOT NULL,
  "type" "SiteNewsType" NOT NULL DEFAULT 'NEWS',
  "title" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "body" TEXT NOT NULL DEFAULT '',
  "coverMediaId" TEXT,
  "publishedAt" TIMESTAMP(3),
  "status" "SiteContentStatus" NOT NULL DEFAULT 'DRAFT',
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteNews_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteNews_status_publishedAt_idx" ON "SiteNews"("status", "publishedAt");

CREATE TABLE "SiteTestimonial" (
  "id" TEXT NOT NULL,
  "text" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "role" TEXT NOT NULL DEFAULT '',
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "status" "SiteContentStatus" NOT NULL DEFAULT 'DRAFT',
  "updatedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteTestimonial_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteMedia" (
  "id" TEXT NOT NULL,
  "fileName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "sizeBytes" INTEGER NOT NULL,
  "data" BYTEA NOT NULL,
  "altText" TEXT,
  "isArchived" BOOLEAN NOT NULL DEFAULT false,
  "uploadedById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteMedia_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SiteAcademicProfile" (
  "id" TEXT NOT NULL,
  "kind" "SiteProfileKind" NOT NULL,
  "refId" TEXT NOT NULL,
  "summary" TEXT NOT NULL DEFAULT '',
  "mediaId" TEXT,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "isVisible" BOOLEAN NOT NULL DEFAULT false,
  "updatedById" TEXT,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SiteAcademicProfile_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "SiteAcademicProfile_kind_refId_key" ON "SiteAcademicProfile"("kind", "refId");

CREATE TABLE "SiteContactMessage" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "contact" TEXT NOT NULL,
  "subject" TEXT NOT NULL DEFAULT '',
  "message" TEXT NOT NULL,
  "status" "SiteMessageStatus" NOT NULL DEFAULT 'NEW',
  "ipHash" TEXT,
  "handledById" TEXT,
  "handledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SiteContactMessage_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteContactMessage_status_createdAt_idx" ON "SiteContactMessage"("status", "createdAt");

-- لا حذف نهائي (نفس سياسة باقي الجداول): الأرشفة بحالة المحتوى.
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "SiteSetting" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "SiteSetting" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "SiteContentItem" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "SiteContentItem" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "SiteNews" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "SiteNews" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "SiteTestimonial" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "SiteTestimonial" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "SiteMedia" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "SiteMedia" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "SiteAcademicProfile" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "SiteAcademicProfile" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_hard_delete BEFORE DELETE ON "SiteContactMessage" FOR EACH ROW EXECUTE FUNCTION prevent_hard_delete();
CREATE TRIGGER no_truncate BEFORE TRUNCATE ON "SiteContactMessage" FOR EACH STATEMENT EXECUTE FUNCTION prevent_hard_delete();

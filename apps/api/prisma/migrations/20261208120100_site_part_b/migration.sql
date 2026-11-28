CREATE TYPE "SiteEntryKind" AS ENUM ('EVENT', 'RESEARCH', 'GRADUATE_STORY', 'GRADUATE_NEWS', 'CAMPUS');

ALTER TABLE "SiteNews" ADD COLUMN "category" TEXT NOT NULL DEFAULT '';

CREATE TABLE "SiteEntry" (
    "id" TEXT NOT NULL,
    "kind" "SiteEntryKind" NOT NULL,
    "category" TEXT NOT NULL DEFAULT '',
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL DEFAULT '',
    "body" TEXT NOT NULL DEFAULT '',
    "location" TEXT NOT NULL DEFAULT '',
    "startsAt" TIMESTAMP(3),
    "endsAt" TIMESTAMP(3),
    "coverMediaId" TEXT,
    "galleryIds" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "status" "SiteContentStatus" NOT NULL DEFAULT 'DRAFT',
    "publishedAt" TIMESTAMP(3),
    "updatedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "SiteEntry_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "SiteEntry_kind_status_startsAt_idx" ON "SiteEntry"("kind", "status", "startsAt");

-- التصنيفات الافتراضية للأخبار (منشورة لتظهر بالمرشّح، ويمكن إضافة غيرها وأرشفتها من اللوحة)
INSERT INTO "SiteContentItem" ("id", "kind", "title", "text", "sortOrder", "status", "updatedAt")
SELECT gen_random_uuid()::text, 'NEWS_CATEGORY'::"SiteItemKind", t.title, '', t.ord, 'PUBLISHED'::"SiteContentStatus", now()
FROM (VALUES ('أخبار الجامعة', 1), ('أخبار الكليات', 2), ('الإعلانات الأكاديمية', 3), ('الإعلانات الإدارية', 4), ('نتائج ومواعيد الامتحانات', 5)) AS t(title, ord)
WHERE NOT EXISTS (SELECT 1 FROM "SiteContentItem" WHERE "kind" = 'NEWS_CATEGORY'::"SiteItemKind");

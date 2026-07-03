-- Featured (admin-curated) + view tracking (Most Viewed)
ALTER TABLE "properties" ADD COLUMN "is_featured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "properties" ADD COLUMN "view_count" INTEGER NOT NULL DEFAULT 0;
CREATE INDEX "properties_is_featured_idx" ON "properties"("is_featured") WHERE "is_featured" = true;

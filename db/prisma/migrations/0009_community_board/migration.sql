-- Community Board (Phase 14)
CREATE TYPE "community_category" AS ENUM ('looking_room','looking_condo','for_rent','looking_tenant','buy_sell');
CREATE TYPE "community_status" AS ENUM ('pending','published','archived','rejected');

CREATE TABLE "community_posts" (
  "id" UUID NOT NULL,
  "category" "community_category" NOT NULL,
  "body" TEXT NOT NULL,
  "display_name" VARCHAR(60) NOT NULL,
  "status" "community_status" NOT NULL DEFAULT 'pending',
  "author_ip" INET,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT now(),
  "published_at" TIMESTAMPTZ(6),
  "deleted_at" TIMESTAMPTZ(6),
  CONSTRAINT "community_posts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "community_posts_status_created_at_idx" ON "community_posts"("status","created_at");
CREATE INDEX "community_posts_category_status_idx" ON "community_posts"("category","status");

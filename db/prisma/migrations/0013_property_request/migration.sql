-- Phase 2 · Property Request (ขอเพิ่มทรัพย์) — additive only
-- NOTE: prisma migrate diff รวม DROP ของ drift (trgm index / appointments.ends_at) มาด้วย → ตัดทิ้ง ใส่เฉพาะที่เพิ่มจริง

-- CreateEnum
CREATE TYPE "property_request_status" AS ENUM ('pending', 'needs_info', 'converted', 'rejected');

-- AlterEnum
ALTER TYPE "entity_type" ADD VALUE 'property_request';

-- AlterTable (เครดิตเซลผู้หาทรัพย์)
ALTER TABLE "properties" ADD COLUMN "sourced_by" UUID;

-- CreateTable
CREATE TABLE "property_requests" (
    "id" UUID NOT NULL,
    "code" VARCHAR(30) NOT NULL,
    "status" "property_request_status" NOT NULL DEFAULT 'pending',
    "title_th" VARCHAR(200) NOT NULL,
    "property_type" "property_type",
    "province" VARCHAR(100),
    "district" VARCHAR(100),
    "project_name" VARCHAR(150),
    "expected_rent" DECIMAL(12,2),
    "bedrooms" SMALLINT,
    "bathrooms" SMALLINT,
    "area_sqm" DECIMAL(8,2),
    "note" TEXT,
    "owner_name" VARCHAR(150),
    "owner_phone" VARCHAR(20),
    "owner_consent" BOOLEAN NOT NULL DEFAULT false,
    "owner_consent_at" TIMESTAMPTZ(6),
    "review_note" TEXT,
    "converted_property_id" UUID,
    "branch_id" UUID,
    "submitted_by" UUID,
    "reviewed_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),
    "deleted_by" UUID,
    CONSTRAINT "property_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "property_requests_code_key" ON "property_requests"("code");
CREATE INDEX "property_requests_status_idx" ON "property_requests"("status");
CREATE INDEX "property_requests_submitted_by_idx" ON "property_requests"("submitted_by");
CREATE INDEX "property_requests_branch_id_idx" ON "property_requests"("branch_id");

-- AddForeignKey
ALTER TABLE "properties" ADD CONSTRAINT "properties_sourced_by_fkey" FOREIGN KEY ("sourced_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_submitted_by_fkey" FOREIGN KEY ("submitted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_reviewed_by_fkey" FOREIGN KEY ("reviewed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "property_requests" ADD CONSTRAINT "property_requests_converted_property_id_fkey" FOREIGN KEY ("converted_property_id") REFERENCES "properties"("id") ON DELETE SET NULL ON UPDATE CASCADE;

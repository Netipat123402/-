-- Phase 3 · Property approval gate — เพิ่มสถานะ pending_review (รอตรวจสอบ) — additive only
-- NOTE: prisma migrate diff รวม DROP ของ drift (trgm index / appointments.ends_at) มาด้วย → ตัดทิ้ง ใส่เฉพาะที่เพิ่มจริง
-- ALTER TYPE ... ADD VALUE = non-destructive · ต่อท้ายลำดับ logical (draft → pending_review → available → rented)

-- AlterEnum
ALTER TYPE "property_status" ADD VALUE IF NOT EXISTS 'pending_review' BEFORE 'available';

-- Phase 5 · 3-role operating + sensitive-edit alerts — additive only
-- NOTE: prisma migrate diff รวม DROP ของ drift (trgm index / appointments.ends_at) มาด้วย → ตัดทิ้ง ใส่เฉพาะที่เพิ่มจริง

-- (1) Role.isActive — ปิด 5 บทบาท dormant กันสับสน (operating จริง = 3) · เปิดคืนได้ภายหลัง
ALTER TABLE "roles" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true;
UPDATE "roles" SET "is_active" = false
  WHERE "name" IN ('company_admin', 'branch_manager', 'team_lead', 'back_office', 'auditor');

-- (2) NotificationCategory += owner — แจ้งเตือนแก้ข้อมูลเจ้าของทรัพย์ (Phase 5) · toggle preference แยกได้
ALTER TYPE "notification_category" ADD VALUE IF NOT EXISTS 'owner' BEFORE 'contract';

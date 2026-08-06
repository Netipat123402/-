-- Phase 6 (เก็บตก B) · property.content_dirty — เนื้อหาถูกแก้ตั้งแต่อนุมัติล่าสุด (แก้ตอน rented)
-- rented→available ที่ dirty จะเด้งไปตรวจใหม่ · เคลียร์ตอน approve — additive only
-- NOTE: prisma migrate diff รวม DROP ของ drift (trgm index / appointments.ends_at) มาด้วย → ตัดทิ้ง ใส่เฉพาะที่เพิ่มจริง

ALTER TABLE "properties" ADD COLUMN IF NOT EXISTS "content_dirty" BOOLEAN NOT NULL DEFAULT false;

-- reveal_pii (Phase 6): เพิ่ม permission rows + grant ให้ super_admin เท่านั้น — ทำผ่าน seedRolesAndPermissions (declarative)
-- (ไม่มี schema change สำหรับ reveal_pii — เป็นแถวใน permissions/role_permissions)

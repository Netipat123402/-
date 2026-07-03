-- Appointment: รองรับ "นัดนอกรอบ" (ไม่อิง Lead/ทรัพย์)
--   - lead_id / property_id เป็น optional
--   - เพิ่ม title สำหรับนัดที่กรอกชื่อเอง (เช่น ประชุมทีม)
-- หมายเหตุ: ไม่แตะ ends_at / exclusion constraint / GIN-trigram indexes
--           (ของพวกนี้จัดการใน migration เฉพาะ ไม่อยู่ใน Prisma schema)
ALTER TABLE "appointments"
  ADD COLUMN "title" TEXT,
  ALTER COLUMN "lead_id" DROP NOT NULL,
  ALTER COLUMN "property_id" DROP NOT NULL;

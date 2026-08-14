-- C-backend 2/2 · notification i18n — เก็บ key+params เพื่อแปล title/body ตอน render (EN/TH)
-- title/body เดิมคงไว้เป็น fallback (row เก่า) + ข้อความจริงส่ง LINE/email
-- additive only (ADD COLUMN IF NOT EXISTS) · reversible (DROP COLUMN) · ไม่แตะ row เดิม
-- NOTE: manual SQL + `migrate resolve --applied` เท่านั้น · ห้าม `migrate dev` (schema-drift landmine: trgm index / appointments.ends_at)

ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "title_key" TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "body_key"  TEXT;
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "params"    JSONB;

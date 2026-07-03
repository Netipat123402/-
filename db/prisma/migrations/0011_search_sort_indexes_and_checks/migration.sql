-- ============================================================================
-- 0011 — Search/Sort indexes + CHECK constraints
-- รวม MR-10 (trigram title/description) · MR-11 (published_at/view_count/created_by)
--      · MR-19 (CHECK rent/dates/money/duration)
-- หมายเหตุ: ใช้ CREATE INDEX (ไม่ใช่ CONCURRENTLY) เพราะ Prisma รัน migration ใน
--          transaction — ตรงกับแนวทาง 0004. ตารางใหญ่บน prod ที่ต้องเลี่ยง lock
--          ให้สร้าง index แบบ CONCURRENTLY ด้วย psql ก่อนแล้วค่อย migrate deploy (IF NOT EXISTS ข้ามให้)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- MR-10 · TRIGRAM (pg_trgm) สำหรับ smart search ILIKE บน title/description
--   property-search.ts ใช้ contains(mode:insensitive) = ILIKE บนคอลัมน์เหล่านี้
--   เดิมมี trigram เฉพาะ project_name/full_name → title/description ยัง seq scan
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_title_th_trgm
  ON properties USING GIN (title_th gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_title_en_trgm
  ON properties USING GIN (title_en gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_desc_th_trgm
  ON properties USING GIN (description_th gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_properties_desc_en_trgm
  ON properties USING GIN (description_en gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- MR-11 · Public sort indexes — public อ่านเฉพาะ status='available'
--   default sort = published_at desc · popular sort = view_count desc
--   + created_by (ใช้กรอง/รายงานตามผู้สร้าง)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_published_at
  ON properties (published_at DESC)
  WHERE deleted_at IS NULL AND status = 'available';

CREATE INDEX IF NOT EXISTS idx_properties_view_count
  ON properties (view_count DESC)
  WHERE deleted_at IS NULL AND status = 'available';

CREATE INDEX IF NOT EXISTS idx_properties_created_by
  ON properties (created_by) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- MR-19 · CHECK constraints (กันข้อมูลผิดที่ชั้น DB)
--   ใช้ NOT VALID แล้ว VALIDATE แยก (แนวทาง handover §14 — เลี่ยง lock สแกนแถวเดิมนาน)
--   ห่อด้วย DO block เพื่อ idempotent (re-run ปลอดภัย — dev DB เคย apply ผ่าน psql)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  -- properties: เงิน/จำนวนห้าม < 0
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_money_nonneg') THEN
    ALTER TABLE properties ADD CONSTRAINT chk_properties_money_nonneg
      CHECK (monthly_rent IS NULL OR monthly_rent >= 0) NOT VALID;
    ALTER TABLE properties VALIDATE CONSTRAINT chk_properties_money_nonneg;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_properties_counts_nonneg') THEN
    ALTER TABLE properties ADD CONSTRAINT chk_properties_counts_nonneg
      CHECK (view_count >= 0
             AND (bedrooms IS NULL OR bedrooms >= 0)
             AND (bathrooms IS NULL OR bathrooms >= 0)) NOT VALID;
    ALTER TABLE properties VALIDATE CONSTRAINT chk_properties_counts_nonneg;
  END IF;

  -- contracts: วันสิ้นสุดต้องหลังวันเริ่ม + เงินห้าม < 0
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contracts_dates') THEN
    ALTER TABLE contracts ADD CONSTRAINT chk_contracts_dates
      CHECK (start_date IS NULL OR end_date IS NULL OR end_date > start_date) NOT VALID;
    ALTER TABLE contracts VALIDATE CONSTRAINT chk_contracts_dates;
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_contracts_money_nonneg') THEN
    ALTER TABLE contracts ADD CONSTRAINT chk_contracts_money_nonneg
      CHECK ((monthly_rent IS NULL OR monthly_rent >= 0)
             AND (commission_amount IS NULL OR commission_amount >= 0)) NOT VALID;
    ALTER TABLE contracts VALIDATE CONSTRAINT chk_contracts_money_nonneg;
  END IF;

  -- appointments: ระยะเวลานัดต้องเป็นบวก (no-overlap GiST อาศัย ends_at = scheduled_at + duration)
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chk_appointments_duration_pos') THEN
    ALTER TABLE appointments ADD CONSTRAINT chk_appointments_duration_pos
      CHECK (duration_min IS NULL OR duration_min > 0) NOT VALID;
    ALTER TABLE appointments VALIDATE CONSTRAINT chk_appointments_duration_pos;
  END IF;
END $$;

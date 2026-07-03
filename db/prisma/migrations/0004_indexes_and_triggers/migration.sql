-- Advanced indexes + audit immutability (ย้ายจาก manual SQL → migration กัน index หายตอน reset)

-- ============================================================================
-- ADVANCED INDEXES (Phase 3 §6) — รันหลัง prisma migrate
-- Index เหล่านี้ Prisma schema แสดงไม่ได้ จึงแยกมารันด้วย raw SQL
-- ใช้ CONCURRENTLY บน production เพื่อไม่ lock ตาราง
--
-- รัน: psql "$DATABASE_URL" -f prisma/migrations/manual/advanced-indexes.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) PARTIAL INDEXES — เฉพาะ record ที่ยังไม่ถูกลบ (soft delete)
--    เล็กลง + เร็วขึ้น เพราะ query หลักบวก WHERE deleted_at IS NULL เสมอ
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_active_status
  ON properties (status) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_properties_active_type_rent
  ON properties (property_type, monthly_rent) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_leads_active_status
  ON leads (status, assigned_to) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_contracts_active_enddate
  ON contracts (end_date) WHERE deleted_at IS NULL;

-- ----------------------------------------------------------------------------
-- 2) PUBLIC SEARCH — เฉพาะทรัพย์ที่ออกอากาศ (Published/Reserved)
--    public อ่านเฉพาะสองสถานะนี้ (Phase 2/7 — ไม่หลุด draft)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_public
  ON properties (property_type, province, monthly_rent, bedrooms)
  WHERE deleted_at IS NULL AND status IN ('published', 'reserved');

-- ----------------------------------------------------------------------------
-- 3) FULL-TEXT SEARCH (GIN) — ค้นหาคำในชื่อ/รายละเอียดทรัพย์ (TH + EN)
--    'simple' config รองรับไทยได้ดีกว่า 'english' (ไม่ตัด stopword ผิด)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_fts
  ON properties
  USING GIN (
    to_tsvector('simple',
      coalesce(title_th, '') || ' ' || coalesce(title_en, '') || ' ' ||
      coalesce(description_th, '') || ' ' || coalesce(description_en, '') || ' ' ||
      coalesce(project_name, '')
    )
  );

-- ----------------------------------------------------------------------------
-- 4) TRIGRAM (pg_trgm) — ค้นหาแบบ "พิมพ์บางส่วน/คล้าย" (autocomplete)
--    extension pg_trgm ถูกสร้างโดย Prisma (datasource extensions)
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_project_trgm
  ON properties USING GIN (project_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_leads_name_trgm
  ON leads USING GIN (full_name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_customers_name_trgm
  ON customers USING GIN (full_name gin_trgm_ops);

-- ----------------------------------------------------------------------------
-- 5) JSONB amenities — filter สิ่งอำนวยความสะดวก
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_amenities
  ON properties USING GIN (amenities);

-- ----------------------------------------------------------------------------
-- 6) GEO — ค้นหาตามพิกัด (แผนที่)  *เริ่มต้นใช้ btree; ยกระดับเป็น PostGIS ได้ภายหลัง
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_properties_geo
  ON properties (latitude, longitude)
  WHERE deleted_at IS NULL AND latitude IS NOT NULL;

-- ============================================================================
-- AUDIT LOG TAMPER-PROOFING (Phase 7 §4) — รันหลัง prisma migrate
-- audit_logs ต้องเป็น append-only: ห้าม UPDATE / DELETE
--
-- รัน: psql "$DATABASE_URL" -f prisma/migrations/manual/audit-immutable.sql
-- ============================================================================

-- ป้องกันการแก้ไข/ลบ audit_logs ในระดับฐานข้อมูล (กันแม้แต่ app เผลอ)
CREATE OR REPLACE FUNCTION prevent_audit_mutation()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'audit_logs is append-only: % is not allowed', TG_OP;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_no_update ON audit_logs;
CREATE TRIGGER trg_audit_no_update
  BEFORE UPDATE OR DELETE ON audit_logs
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_mutation();

-- หมายเหตุ production: สร้าง DB role แยกสำหรับแอป แล้ว REVOKE UPDATE/DELETE
--   REVOKE UPDATE, DELETE ON audit_logs FROM ros_app;
-- (ทำตอนตั้งค่า production DB user ใน Phase 12)

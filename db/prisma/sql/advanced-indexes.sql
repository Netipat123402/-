-- ============================================================================
-- ⚠️ SUPERSEDED (MR-06) — index เหล่านี้ถูกย้ายเข้า migration chain แล้ว:
--   • idx_properties_* / trgm / fts / amenities / geo → migration 0004_indexes_and_triggers
--   • title/description trgm + published_at/view_count/created_by + CHECK → migration 0011
-- ไม่ต้องรันไฟล์นี้ด้วยมืออีกต่อไป (migrate deploy สร้างครบ) — เก็บเป็น reference เท่านั้น
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

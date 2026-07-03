-- รื้อสถานะให้เหลือ 3 ขั้นต่อเอนทิตี (Property/Lead/Appointment/Contract)
-- map ค่าเก่า → ใหม่ + ทรัพย์ archived → soft-delete
--
-- ลำดับสำคัญ: ต้อง drop index/constraint ที่อ้างค่าสถานะตรง ๆ ก่อนสลับ enum
--   - idx_properties_public  (WHERE status IN ('published','reserved'))   [0004]
--   - appointments_no_overlap (WHERE status IN ('requested','confirmed','rescheduled')) [0005]
-- แล้วสร้างใหม่ด้วยค่าสถานะใหม่ตอนท้าย

-- 0) drop dependent objects ----------------------------------------------------
DROP INDEX IF EXISTS idx_properties_public;
ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;

-- 1) PROPERTY: draft/available/rented -----------------------------------------
-- archived เดิม → soft delete ก่อน (ค่า 'archived' จะไม่มีใน enum ใหม่)
UPDATE properties SET deleted_at = COALESCE(deleted_at, now()) WHERE status = 'archived';

ALTER TYPE "property_status" RENAME TO "property_status_old";
CREATE TYPE "property_status" AS ENUM ('draft', 'available', 'rented');

ALTER TABLE properties ALTER COLUMN status DROP DEFAULT;
ALTER TABLE properties ALTER COLUMN status TYPE "property_status" USING (
  CASE status::text
    WHEN 'draft' THEN 'draft'
    WHEN 'pending_review' THEN 'draft'
    WHEN 'published' THEN 'available'
    WHEN 'reserved' THEN 'rented'
    WHEN 'contract_processing' THEN 'rented'
    WHEN 'rented' THEN 'rented'
    WHEN 'renewed' THEN 'rented'
    WHEN 'archived' THEN 'draft'
    ELSE 'draft'
  END::"property_status"
);
ALTER TABLE properties ALTER COLUMN status SET DEFAULT 'draft';

-- property_status_history (from_status nullable / to_status not null)
ALTER TABLE property_status_history ALTER COLUMN from_status TYPE "property_status" USING (
  CASE from_status::text
    WHEN 'draft' THEN 'draft'
    WHEN 'pending_review' THEN 'draft'
    WHEN 'published' THEN 'available'
    WHEN 'reserved' THEN 'rented'
    WHEN 'contract_processing' THEN 'rented'
    WHEN 'rented' THEN 'rented'
    WHEN 'renewed' THEN 'rented'
    WHEN 'archived' THEN 'draft'
    ELSE NULL
  END::"property_status"
);
ALTER TABLE property_status_history ALTER COLUMN to_status TYPE "property_status" USING (
  CASE to_status::text
    WHEN 'draft' THEN 'draft'
    WHEN 'pending_review' THEN 'draft'
    WHEN 'published' THEN 'available'
    WHEN 'reserved' THEN 'rented'
    WHEN 'contract_processing' THEN 'rented'
    WHEN 'rented' THEN 'rented'
    WHEN 'renewed' THEN 'rented'
    WHEN 'archived' THEN 'draft'
    ELSE 'draft'
  END::"property_status"
);
DROP TYPE "property_status_old";

-- 2) LEAD: new/working/closed --------------------------------------------------
ALTER TYPE "lead_status" RENAME TO "lead_status_old";
CREATE TYPE "lead_status" AS ENUM ('new', 'working', 'closed');

ALTER TABLE leads ALTER COLUMN status DROP DEFAULT;
ALTER TABLE leads ALTER COLUMN status TYPE "lead_status" USING (
  CASE status::text
    WHEN 'new' THEN 'new'
    WHEN 'contacted' THEN 'working'
    WHEN 'qualified' THEN 'working'
    WHEN 'appointment_scheduled' THEN 'working'
    WHEN 'viewed' THEN 'working'
    WHEN 'negotiation' THEN 'working'
    WHEN 'won' THEN 'closed'
    WHEN 'lost' THEN 'closed'
    WHEN 'archived' THEN 'closed'
    ELSE 'new'
  END::"lead_status"
);
ALTER TABLE leads ALTER COLUMN status SET DEFAULT 'new';
DROP TYPE "lead_status_old";

-- 3) APPOINTMENT: upcoming/done/cancelled -------------------------------------
ALTER TYPE "appointment_status" RENAME TO "appointment_status_old";
CREATE TYPE "appointment_status" AS ENUM ('upcoming', 'done', 'cancelled');

ALTER TABLE appointments ALTER COLUMN status DROP DEFAULT;
ALTER TABLE appointments ALTER COLUMN status TYPE "appointment_status" USING (
  CASE status::text
    WHEN 'requested' THEN 'upcoming'
    WHEN 'confirmed' THEN 'upcoming'
    WHEN 'rescheduled' THEN 'upcoming'
    WHEN 'completed' THEN 'done'
    WHEN 'no_show' THEN 'cancelled'
    WHEN 'cancelled' THEN 'cancelled'
    ELSE 'upcoming'
  END::"appointment_status"
);
ALTER TABLE appointments ALTER COLUMN status SET DEFAULT 'upcoming';
DROP TYPE "appointment_status_old";

-- 4) CONTRACT: draft/active/ended ---------------------------------------------
ALTER TYPE "contract_status" RENAME TO "contract_status_old";
CREATE TYPE "contract_status" AS ENUM ('draft', 'active', 'ended');

ALTER TABLE contracts ALTER COLUMN status DROP DEFAULT;
ALTER TABLE contracts ALTER COLUMN status TYPE "contract_status" USING (
  CASE status::text
    WHEN 'draft' THEN 'draft'
    WHEN 'pending_documents' THEN 'draft'
    WHEN 'signed' THEN 'active'
    WHEN 'active' THEN 'active'
    WHEN 'expiring_soon' THEN 'active'
    WHEN 'renewed' THEN 'ended'
    WHEN 'terminated' THEN 'ended'
    WHEN 'closed' THEN 'ended'
    ELSE 'draft'
  END::"contract_status"
);
ALTER TABLE contracts ALTER COLUMN status SET DEFAULT 'draft';
DROP TYPE "contract_status_old";

-- 5) recreate dependent objects ด้วยค่าสถานะใหม่ -------------------------------
-- public listing: เห็นเฉพาะทรัพย์ available
CREATE INDEX IF NOT EXISTS idx_properties_public
  ON properties (property_type, province, monthly_rent, bedrooms)
  WHERE deleted_at IS NULL AND status = 'available';

-- กันนัดซ้อน: เฉพาะนัด upcoming
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    agent_id WITH =,
    tstzrange(scheduled_at, ends_at) WITH &&
  )
  WHERE (deleted_at IS NULL AND status = 'upcoming');

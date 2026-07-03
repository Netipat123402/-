-- F6: กันนัดซ้อนเวลาในระดับฐานข้อมูล (race-safe)
-- เดิมเช็คด้วย JS อย่างเดียว → 2 request พร้อมกันจองซ้อนได้
-- ใช้ exclusion constraint: agent คนเดียวกัน + ช่วงเวลาเหลื่อมกัน = ปฏิเสธ
-- เฉพาะนัดที่ยัง active (requested/confirmed/rescheduled) และยังไม่ถูกลบ
--
-- หมายเหตุ: timestamptz + interval ไม่ IMMUTABLE จึงใส่ตรง ๆ ใน GiST ไม่ได้
--   → เก็บ ends_at เป็นคอลัมน์ (ตั้งค่าโดย trigger) แล้วทำ range จาก 2 timestamptz (immutable)
--   ไม่ต้องแก้ Prisma schema (คอลัมน์นี้ DB จัดการเองล้วน)

CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE appointments ADD COLUMN IF NOT EXISTS ends_at timestamptz;

CREATE OR REPLACE FUNCTION appointments_set_ends_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.ends_at := NEW.scheduled_at + make_interval(mins => NEW.duration_min);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_appointments_ends_at ON appointments;
CREATE TRIGGER trg_appointments_ends_at
  BEFORE INSERT OR UPDATE OF scheduled_at, duration_min ON appointments
  FOR EACH ROW EXECUTE FUNCTION appointments_set_ends_at();

-- backfill record เดิม
UPDATE appointments SET ends_at = scheduled_at + make_interval(mins => duration_min) WHERE ends_at IS NULL;

ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap;
ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap
  EXCLUDE USING gist (
    agent_id WITH =,
    tstzrange(scheduled_at, ends_at) WITH &&
  )
  WHERE (deleted_at IS NULL AND status IN ('requested', 'confirmed', 'rescheduled'));

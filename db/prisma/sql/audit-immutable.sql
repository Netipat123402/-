-- ============================================================================
-- AUDIT LOG TAMPER-PROOFING (Phase 7 §4) — audit_logs ต้อง append-only
--
-- ⚠️ SUPERSEDED: ย้ายเข้าสาย migration แล้วที่
--    prisma/migrations/0006_audit_immutable/migration.sql
--    (prisma migrate deploy จะบังคับใช้อัตโนมัติ — ไม่ต้องรันไฟล์นี้มืออีก)
-- เก็บไฟล์นี้ไว้เป็นเอกสารอ้างอิงเท่านั้น
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

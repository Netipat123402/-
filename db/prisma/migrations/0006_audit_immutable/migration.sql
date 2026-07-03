-- ============================================================================
-- 0006_audit_immutable (Phase 7 §4)
-- ย้าย audit-log tamper-proofing เข้ามาในสาย migration (เดิมเป็นสคริปต์ manual)
-- เพื่อให้ `prisma migrate deploy` บังคับใช้อัตโนมัติบน production — กันลืมรัน
--
-- audit_logs ต้องเป็น append-only: ห้าม UPDATE / DELETE (กันแม้แต่ app เผลอ)
-- ============================================================================

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

-- หมายเหตุ production (ทำตอนตั้งค่า DB user — นอกเหนือ migration นี้):
--   สร้าง DB role แยกสำหรับแอป แล้ว REVOKE UPDATE/DELETE เป็นชั้นป้องกันที่สอง
--   REVOKE UPDATE, DELETE ON audit_logs FROM ros_app;

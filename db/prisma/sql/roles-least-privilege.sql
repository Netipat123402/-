-- ============================================================================
-- ROS — DB least-privilege application role (MR-18)
--
-- แนวคิด: แอปไม่ควรต่อ DB ด้วย owner/superuser. สร้าง role `ros_app` ที่:
--   - CRUD ได้บนตารางแอป (ผ่าน default privileges ครอบ migration ในอนาคต)
--   - INSERT/SELECT audit_logs ได้ แต่ UPDATE/DELETE ไม่ได้ (immutable ระดับสิทธิ์ +
--     ซ้อนกับ trigger trg_audit_no_update เป็น defense-in-depth)
--   - ไม่เป็น superuser, ไม่เป็นเจ้าของ schema
--
-- การใช้งาน (รันด้วย owner/superuser หลัง prisma migrate deploy):
--   psql "$ADMIN_DATABASE_URL" -v app_password="'STRONG_PW'" -f roles-least-privilege.sql
--   แล้วตั้ง DATABASE_URL ของแอปให้ใช้ ros_app:
--     postgresql://ros_app:STRONG_PW@host:5432/ros?schema=public
--
-- หมายเหตุ: ใช้ psql variable :app_password (มี quote มาแล้ว). ถ้าไม่ส่งมา จะใช้ค่า default
--           (เปลี่ยนทันทีบน production).
-- ============================================================================

\set ON_ERROR_STOP on
-- ค่า default ถ้าไม่ได้ส่ง -v app_password เข้ามา
\if :{?app_password}
\else
  \set app_password '''change_me_app_password'''
\endif

-- สร้าง role (idempotent) + ตั้งรหัส
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'ros_app') THEN
    CREATE ROLE ros_app LOGIN;
  END IF;
END $$;
ALTER ROLE ros_app WITH LOGIN PASSWORD :app_password;

-- เชื่อมต่อฐานปัจจุบัน + ใช้ schema public
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO ros_app', current_database());
END $$;
GRANT USAGE ON SCHEMA public TO ros_app;

-- CRUD บนตารางที่มีอยู่ + sequence (สำหรับ default/serial ถ้ามี)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ros_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO ros_app;

-- ตารางที่ migration สร้างในอนาคต (owner เป็นคนสร้างตอน migrate) → ให้สิทธิ์อัตโนมัติ
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO ros_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO ros_app;

-- MR-18: audit_logs เขียนได้ (INSERT) + อ่านได้ (SELECT) แต่แก้/ลบไม่ได้
REVOKE UPDATE, DELETE ON audit_logs FROM ros_app;

-- (ทางเลือก) activity_logs เป็น timeline ไม่ควรถูกแก้/ลบเช่นกัน
REVOKE UPDATE, DELETE ON activity_logs FROM ros_app;

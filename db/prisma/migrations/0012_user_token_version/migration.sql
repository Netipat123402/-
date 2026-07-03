-- 0012 — MR-22: token_version สำหรับเพิกถอน access token ทันที (logout-all / รีเซ็ตรหัส / suspend)
-- access token ฝัง tv; guard เทียบกับค่าปัจจุบัน → เพิ่มค่า = token เก่าทุกใบใช้ไม่ได้
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 0;

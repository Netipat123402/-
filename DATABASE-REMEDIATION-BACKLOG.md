# ROS — Database Remediation Backlog

> เรียงลำดับ **Critical → High → Medium → Low** · อ้างอิงจาก [`DATABASE-AUDIT.md`](DATABASE-AUDIT.md)
> ทุกข้อมี: finding · effort · risk · acceptance (เกณฑ์ผ่าน) · ลำดับการทำ
> Effort: S (<½ วัน) · M (½–2 วัน) · L (>2 วัน) · Risk = ความเสี่ยงตอนทำ migration

| สถานะ | นับ |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High | 3 |
| 🟡 Medium | 8 |
| 🟢 Low | 6 |

---

## 🔴 CRITICAL
**ไม่มี** — ไม่พบความเสี่ยง data-corruption/data-loss ระดับ Critical ในระดับ schema/query (data integrity ป้องกันด้วย $transaction + EXCLUDE + immutable trigger)

---

## 🟠 HIGH (ทำก่อน production / ก่อนข้อมูลโต)

### BL-01 · DB-002 — ย้าย `advanced-indexes.sql` เข้า migration chain
- **ทำไมก่อน:** ถ้า prod รันโดยไม่มี index เหล่านี้ = ทุก finding performance อื่นแย่ลงทบเท่า
- **Action:** สร้าง `0011_advanced_indexes/migration.sql` รวมทุก statement จาก `db/prisma/sql/advanced-indexes.sql` (ใช้ `CREATE INDEX CONCURRENTLY`, แยก migration ไม่ wrap transaction)
- **Effort:** S · **Risk:** Low (idempotent `IF NOT EXISTS`)
- **Acceptance:** `prisma migrate deploy` บน DB เปล่า → `SELECT indexname FROM pg_indexes WHERE tablename='properties'` เห็น `idx_properties_fts`, `_public`, `_*_trgm`, `_geo`, `_amenities` ครบ โดยไม่ต้องรัน psql มือ

### BL-02 · DB-001 — เพิ่ม trigram index ให้ตรงกับ ILIKE search (title/description)
- **ทำไมก่อน:** ค้นหาทรัพย์คือ query ที่ถูกเรียกบ่อยสุด (admin + public) ปัจจุบัน seq scan
- **Action:** `CREATE INDEX ... USING gin (title_th gin_trgm_ops)` + `description_th` (+ EN ถ้าต้องการ) ในมิเกรชันเดียวกับ BL-01
- **Effort:** S · **Risk:** Low
- **Acceptance:** `EXPLAIN ANALYZE SELECT id FROM properties WHERE title_th ILIKE '%อโศก%'` → Bitmap Index Scan (ไม่ใช่ Seq Scan); p95 latency ของ `/public/properties?q=` ลดลงบนชุดข้อมูลทดสอบ ≥10k rows

### BL-03 · DB-003 — แก้ FK agent-Restrict ที่บล็อก user-delete
- **ทำไมก่อน:** ปัจจุบัน "ลบ agent ที่มีสัญญา/นัด" → 400 FK error เสมอ (ข้อความไม่สื่อ) = ใช้งานจริงไม่ได้
- **Action (แนะนำ B):** เพิ่ม pre-check ใน `UserService.remove` (deletion-guard ตรวจ contract/appointment ที่ agent ถือ) + เปลี่ยนเป็น soft-delete user; **หรือ (A)** เปลี่ยน agent FK → `SET NULL` (พิจารณาผลธุรกิจ: งานไร้ผู้รับผิดชอบ)
- **Effort:** M · **Risk:** Medium (เปลี่ยน FK = lock ตาราง; soft-delete = แก้ logic + scope query)
- **Acceptance:** ลบ user ที่เป็น agent ของสัญญา → ไม่เกิด 400 FK; ได้ข้อความชัด หรือ agent_id เป็น NULL; แก้ comment ที่ `user.service.ts:172` ให้ตรงจริง

---

## 🟡 MEDIUM

### BL-04 · DB-005 — Index สำหรับ public sort (`published_at`, `view_count`)
- **Action:** partial index `WHERE deleted_at IS NULL AND status='available'` บน `published_at DESC` และ `view_count DESC`
- **Effort:** S · **Risk:** Low · **Acceptance:** `EXPLAIN` public listing default + popular → Index Scan, ไม่มี `Sort` node บนชุดใหญ่

### BL-05 · DB-004 — เพิ่ม CHECK constraints (backstop ข้อมูล)
- **Action:** CHECK บน properties.monthly_rent≥0, contracts(end>start, money≥0), appointments.duration_min 5..480, bedrooms/bathrooms≥0
- **Effort:** S · **Risk:** Medium (ต้องเช็คข้อมูลเดิมผ่านก่อน `ADD CONSTRAINT` — ใช้ `NOT VALID` แล้ว `VALIDATE` ทีหลังถ้าตารางใหญ่)
- **Acceptance:** `INSERT` ค่าผิด → violates check; ข้อมูลเดิมไม่ถูก reject (validate ผ่าน)

### BL-06 · DB-007 — Expression index สำหรับ lockout JSONB query
- **Action:** `CREATE INDEX idx_audit_login_email ON audit_logs ((new_value->>'email'), created_at) WHERE action='login_failed'`
- **Effort:** S · **Risk:** Low · **Acceptance:** `EXPLAIN` ของ `countRecentLoginFailures` → ใช้ index; login latency คงที่แม้ audit_logs โต

### BL-07 · DB-010 — DB role least-privilege + REVOKE audit_logs
- **Action:** สร้าง `ros_app` (CRUD ปกติ) + `REVOKE UPDATE,DELETE ON audit_logs` + ชี้ DATABASE_URL ไป role นี้
- **Effort:** M · **Risk:** Medium (ต้องตรวจว่าแอปไม่ต้องการ DDL/สิทธิ์พิเศษ runtime)
- **Acceptance:** `SET ROLE ros_app; DELETE FROM audit_logs` → permission denied; แอปทำงานปกติทุก endpoint ด้วย role นี้

### BL-08 · DB-008 — Retention job + พิจารณา partition (audit/activity/notification)
- **Action:** Scheduler job รายวันลบ `activity_logs`/`notifications` เก่าตาม `retention.policy`; audit_logs ใช้ **partition DROP** (เพราะ trigger กัน DELETE)
- **Effort:** L · **Risk:** Medium (เปลี่ยนตารางใหญ่เป็น partitioned ต้อง migrate ข้อมูล)
- **Acceptance:** ตาราง log ไม่โตเกิน policy; query log latency คงที่; audit immutable ยังทำงาน

### BL-09 · DB-006 — Index `created_by` (own-scope owner/document)
- **Action:** partial index บน `owners.created_by`, `documents.created_by` `WHERE deleted_at IS NULL`
- **Effort:** S · **Risk:** Low · **Acceptance:** `EXPLAIN` own-scope query → Index Scan

### BL-10 · DB-009 — เปลี่ยน list ใหญ่เป็น keyset pagination
- **Action:** เปลี่ยน `skip/take` เป็น cursor (`WHERE id < lastId ORDER BY id DESC LIMIT n`) สำหรับ list ที่โตได้ (properties/leads/audit feed)
- **Effort:** M · **Risk:** Low (เปลี่ยน query + FE ส่ง cursor) · **Acceptance:** latency หน้าลึกคงที่ (ไม่ขึ้นกับ page number)

### BL-11 · DB-011 — FK SetNull บน `created_by/updated_by` (เฉพาะที่ต้องการ integrity)
- **Action:** เพิ่ม FK ON DELETE SET NULL บน created_by/updated_by ของตารางธุรกิจ (คง actor_id/entity_id ของ audit เป็น snapshot)
- **Effort:** M · **Risk:** Medium (เพิ่ม FK บนตารางมีข้อมูล) · **Acceptance:** ลบ user → created_by กลายเป็น NULL ไม่ orphan

---

## 🟢 LOW

### BL-12 · DB-015 — แก้ seed `lifecycle.property` เป็น 3 สถานะ
- **Action:** `seed/seed.ts` value = `['draft','available','rented']` · **Effort:** S · **Risk:** None · **Acceptance:** `SELECT value FROM settings WHERE key='lifecycle.property'` = 3 ค่า

### BL-13 · DB-016 — ตั้ง `connection_limit` ใน prod DATABASE_URL (+ pgBouncer ถ้าหลาย instance)
- **Effort:** S · **Risk:** Low · **Acceptance:** `pg_stat_activity` ของ role แอป ≤ limit ภายใต้ load

### BL-14 · DB-012 — ปิด race ของ lead convert
- **Action:** `updateMany where {id, customerId: null}` ตรวจ `count===1` ก่อนสร้าง customer (หรือ partial unique) · **Effort:** S · **Acceptance:** convert พร้อมกัน 2 ครั้ง → customer 1 ราย

### BL-15 · DB-013 — แยกการนับ view ออกจาก read path (แก้คู่กับ BUG-HUNT H2)
- **Action:** endpoint นับ view แยก (no-cache) หรือ buffer+flush async · **Effort:** M · **Acceptance:** viewCount สะท้อนจำนวนเปิดจริง + ไม่มี lock contention ตอน concurrent

### BL-16 · DB-017 — กระบวนการ rollback: `pg_dump` ก่อน migrate + rollback SQL คู่มือ
- **Action:** เพิ่มขั้น backup ใน deploy pipeline ก่อน `migrate deploy`; เขียน down-SQL สำหรับ migration destructive (เช่น 0007) · **Effort:** M · **Acceptance:** ซ้อม restore บน staging สำเร็จภายใน RTO

### BL-17 · DB-014 — (ทางเลือก) RLS ตาม branch_id เป็น backstop
- **Action:** `ENABLE ROW LEVEL SECURITY` + policy บน branch_id (ตั้ง `app.branch` ต่อ session) · **Effort:** L · **Risk:** High (กระทบทุก query path) · **Acceptance:** query ที่ลืม scope ยังถูกกรองตาม branch ที่ DB

---

## แผนการทำเป็นรอบ (Suggested Order)

```
รอบ 1 (index — ผลกระทบสูง, เสี่ยงต่ำ):  BL-01 → BL-02 → BL-04 → BL-06 → BL-09
รอบ 2 (integrity & security):           BL-05 → BL-07 → BL-03
รอบ 3 (scalability):                    BL-08 → BL-10 → BL-15
รอบ 4 (cleanup & process):              BL-11 → BL-12 → BL-13 → BL-14 → BL-16 → (BL-17)
```

**หลักการ migration ที่ปลอดภัย (ใช้กับทุก BL):**
1. `pg_dump` ก่อนเสมอ (จนกว่าจะมี backup อัตโนมัติ)
2. index ใหม่ใช้ `CREATE INDEX CONCURRENTLY` (ไม่ lock ตาราง)
3. CHECK/FK บนตารางใหญ่ใช้ `ADD CONSTRAINT ... NOT VALID` แล้ว `VALIDATE CONSTRAINT` แยก (ไม่ lock เขียนนาน)
4. ทดสอบบน staging ที่มีข้อมูลใกล้เคียง prod + วัด `EXPLAIN ANALYZE` ก่อน/หลัง

---

*จบเอกสาร — Database Remediation Backlog (เรียง Critical→High→Medium→Low)*

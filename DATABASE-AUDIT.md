# ROS — Database Audit

> ผู้ตรวจ (จำลอง): **Staff Database Engineer · PostgreSQL Architect · Performance Engineer**
> อ่าน: `db/prisma/schema.prisma` · migrations 0001–0010 · `db/prisma/sql/*` · repository · ทุก service · `$transaction` (24 จุด) · seed
> ใช้ข้อมูลจริงจาก source เท่านั้น — ทุก finding มี: **Severity · Evidence · Root Cause · Impact · Recommendation · Migration Example · Validation Method**
> DB: PostgreSQL 16 · Prisma 5.22 · 29 ตาราง · 18 enums · ext: `citext, pg_trgm, btree_gist`

---

## Scores

```
Database Quality   ███████████████████████████████████░░░░░  78 / 100
Performance        █████████████████████████░░░░░░░░░░░░░░░░  62 / 100
Scalability        ██████████████████████░░░░░░░░░░░░░░░░░░░  55 / 100
```

| Score | ค่า | เหตุผลย่อ |
|---|---:|---|
| **Database Quality** | **78** | schema แข็งแรง (UUID v7, soft-delete, audit cols, FK policy ชัด, unique, EXCLUDE constraint, immutable trigger, citext) — หัก: ไม่มี CHECK, logical FK ไม่บังคับ, agent-Restrict ขัด user-delete |
| **Performance** | **62** | index ครอบ FK/status ดี + partial/GIN/trigram มี — หัก: smart search ใช้ ILIKE ที่ index ไม่รับ, ไม่มี index published_at/view_count/created_by, JSONB lockout ไม่มี index |
| **Scalability** | **55** | หัก: audit/activity/notification โตไม่จำกัด (ไม่ partition, ไม่มี retention job), OFFSET pagination, single DB instance, advanced-indexes ไม่อยู่ใน migrate chain |

| Severity | จำนวน |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High | 3 |
| 🟡 Medium | 8 |
| 🟢 Low | 5 |

---

## ✅ Strengths (ทำถูกแล้ว — ยืนยันจาก source)

| ด้าน | หลักฐาน |
|---|---|
| PK design | `uuid(7)` ทุกตาราง — เรียงตามเวลา + ปลอดภัย + พร้อม multi-branch |
| Soft delete + audit | `deleted_at/by`, `created_at/by`, `updated_at/by` ทุกตารางธุรกิจ |
| Multi-tenant | `branch_id` ทุกตาราง + scope filter ที่ app |
| FK policy | Restrict (อ้างอิงสำคัญ) · Cascade (children: media/version/link/token/join) · SetNull (assignee/customer/renewedFrom) — เลือกถูกตามความหมาย |
| Money/Time/i18n | `Decimal(12,2)` เงิน · `Timestamptz` (UTC) · `_th/_en` + master_data/translations |
| Race-safe constraint | `appointments` `EXCLUDE USING gist (agent_id =, tstzrange(scheduled_at, ends_at) &&) WHERE status='upcoming'` (`0005/0007`) — กันนัดซ้อนระดับ DB |
| Immutable audit | trigger `BEFORE UPDATE OR DELETE ON audit_logs RAISE` (`0006`) |
| Atomic ops | `$transaction` 24 จุด: status+history, lead convert, contract renew, receipt (doc+version+link), user role update |
| Index พื้นฐาน | @@index ครบบน FK + status + (province,district) + monthly_rent; partial `WHERE deleted_at IS NULL`; `is_featured` partial; GIN `amenities`; trigram บาง column |
| Unique | code, email(citext), (resource,action,scope), (category,code), (documentId,versionNo), (userId,category,channel) ฯลฯ |
| Code-gen race | retry P2002 ทุก service + ใช้ max-code (ไม่ใช่ count) |

---

# Findings

## 🟠 HIGH

### DB-001 — Smart search ใช้ `ILIKE %q%` ที่ใช้ GIN full-text index ไม่ได้ + ขาด trigram บน title/description

**Severity:** 🟠 High (Performance)

**Evidence:**
- `common/search/property-search.ts:60` `propertySmartWhere` สร้าง `{ field: { contains: q, mode: 'insensitive' } }` → Prisma แปลเป็น `field ILIKE '%q%'` สำหรับ titleTh/titleEn/descriptionTh/descriptionEn/projectName/province/district/subdistrict/address
- `db/prisma/sql/advanced-indexes.sql` มี **GIN full-text** `idx_properties_fts` = `to_tsvector('simple', ...)` (ใช้กับ `@@`/`to_tsquery` เท่านั้น) และ **trigram** เฉพาะ `project_name`, ไม่มีบน `title_th/description_th`
- ใช้โดย: `PropertyService.findMany` (admin) + `PublicService.search` (public)

**Root Cause:** operator ที่ query ใช้ (`ILIKE '%...%'`) ไม่ match กับ index ที่สร้าง (tsvector GIN รองรับ `@@` ไม่ใช่ ILIKE; ILIKE `%x%` ใช้ btree ไม่ได้ ต้อง trigram GIN)

**Impact:** ค้นหาทรัพย์ (admin + public — ใช้บ่อยสุด) ทำ **sequential scan + ILIKE หลายคอลัมน์** ต่อ row ทั้งตาราง → ช้าเชิงเส้นตามจำนวนทรัพย์; index FTS ที่สร้างไว้แทบไม่ถูกใช้

**Recommendation:** เพิ่ม trigram GIN บนคอลัมน์ที่ ILIKE จริง (title/description) **หรือ** เปลี่ยน query เป็น full-text (`to_tsvector @@ plainto_tsquery`) ให้ตรงกับ `idx_properties_fts`

**Migration Example:**
```sql
-- เลือกแนวทาง A: trigram ให้ ILIKE เร็ว (กระทบโค้ดน้อย)
CREATE INDEX IF NOT EXISTS idx_properties_title_th_trgm
  ON properties USING gin (title_th gin_trgm_ops) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_properties_desc_th_trgm
  ON properties USING gin (description_th gin_trgm_ops) WHERE deleted_at IS NULL;
-- (ทำซ้ำกับ title_en/description_en ถ้าต้องการ EN search)
```

**Validation Method:**
```sql
EXPLAIN ANALYZE
SELECT id FROM properties
WHERE deleted_at IS NULL AND title_th ILIKE '%อโศก%';
-- ก่อน: Seq Scan ... | หลัง: Bitmap Index Scan on idx_properties_title_th_trgm
```

---

### DB-002 — `advanced-indexes.sql` ไม่อยู่ใน migration chain → prod อาจรันโดยไม่มี index สำคัญ

**Severity:** 🟠 High (Operational / Performance)

**Evidence:**
- `db/prisma/sql/advanced-indexes.sql` (GIN FTS, trigram, partial, geo, jsonb) **ไม่ถูกอ้างใน migrations** — เป็นไฟล์แยกที่ `db/README.md` สั่งรัน manual (`psql -f ...`); ต่างจาก `0006`(audit trigger) ที่ฝังเข้า migrate แล้ว
- `prisma migrate deploy` จะสร้างเฉพาะ index ใน schema (`@@index`) — partial/GIN/trigram ไม่อยู่ใน schema

**Root Cause:** index ที่ Prisma schema แสดงไม่ได้ ถูกแยกเป็น manual SQL ที่ไม่มีใน chain → ขั้นตอน deploy ต้องจำรันเอง

**Impact:** ถ้า deploy แล้วลืมรัน → query หลัก (search/filter/public listing/geo) ทำ seq scan ทั้งหมด → ช้ารุนแรงบนข้อมูลจริง; ไม่มี gate ใดเตือน

**Recommendation:** ย้าย `advanced-indexes.sql` เข้าเป็น migration (เหมือนที่ทำกับ `0006`) ใช้ `CREATE INDEX CONCURRENTLY` (ต้องแยก migration ไม่มี transaction wrap)

**Migration Example:**
```sql
-- db/prisma/migrations/0011_advanced_indexes/migration.sql
-- (Prisma รองรับ raw SQL migration; CONCURRENTLY ต้องไม่อยู่ใน transaction block)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_properties_fts
  ON properties USING gin (to_tsvector('simple',
    coalesce(title_th,'')||' '||coalesce(description_th,'')||' '||coalesce(project_name,'')));
-- ... (ย้ายทุก statement จาก advanced-indexes.sql มาที่นี่)
```

**Validation Method:**
```sql
SELECT indexname FROM pg_indexes WHERE tablename='properties' AND indexname LIKE 'idx_%';
-- ต้องเห็น idx_properties_fts, idx_properties_*_trgm, idx_properties_public ฯลฯ ครบ
```

---

### DB-003 — FK `onDelete: Restrict` บน agent ขัดกับ user hard-delete (comment ระบุผิด → ลบ agent ที่มีสัญญาไม่ได้)

**Severity:** 🟠 High (Data Integrity / Functional)

**Evidence:**
- `schema.prisma:581` `appointment.agent ... onDelete: Restrict` · `:622` `contract.agent ... onDelete: Restrict`
- `modules/user/user.service.ts:190` `await this.prisma.user.delete({ where: { id } })` = **hard delete**
- `:172` comment: *"FK: assigned* = SetNull, userRoles/refreshToken = Cascade → ปลอดภัย"* — **ตกหล่น** ว่า `appointment.agent_id` / `contract.agent_id` เป็น Restrict

**Root Cause:** agent relation ใช้ Restrict (กันลบ user ที่ถือสัญญา/นัด) แต่โค้ด user-delete สมมติว่าทุก relation เป็น SetNull/Cascade

**Impact:** ลบผู้ใช้ที่เป็น agent ของ contract/appointment ใด ๆ → Postgres ปฏิเสธด้วย FK violation (Prisma P2003 → map เป็น 400 BAD_REQUEST "ข้อมูลอ้างอิงไม่ถูกต้อง") → **ลบ agent ที่ทำงานจริงไม่ได้เลย** (และข้อความ error ไม่สื่อสาเหตุ)

**Recommendation:** เลือกหนึ่ง — (A) เปลี่ยน agent FK เป็น `SetNull` (agent_id nullable) ให้สอดคล้องกับ assigned* หรือ (B) เพิ่ม pre-check ใน `UserService.remove` แบบ deletion-guard (เหมือน owner/property) ที่ตรวจ appointment/contract ก่อน + ใช้ soft delete user

**Migration Example (แนวทาง A):**
```sql
-- 0011: agent → SetNull (ต้องทำ agent_id nullable ก่อน)
ALTER TABLE appointments ALTER COLUMN agent_id DROP NOT NULL;
ALTER TABLE appointments DROP CONSTRAINT appointments_agent_id_fkey,
  ADD CONSTRAINT appointments_agent_id_fkey FOREIGN KEY (agent_id)
  REFERENCES users(id) ON DELETE SET NULL;
-- (ทำเช่นเดียวกันกับ contracts.agent_id — พิจารณาผลกระทบทางธุรกิจ: สัญญาไร้ผู้รับผิดชอบ)
```
> หมายเหตุ: แนวทาง B (pre-check + soft delete) ปลอดภัยกว่าเชิงข้อมูลธุรกิจ (เก็บประวัติ agent)

**Validation Method:**
```bash
# สร้าง user เป็น agent ของสัญญา → ลบ → คาดหวัง: ไม่ได้รับ 400 FK error (แต่ได้ข้อความชัดเจน/SetNull สำเร็จ)
curl -i -X DELETE -H "Authorization: Bearer $ADMIN" http://localhost:4000/api/v1/users/$AGENT_ID
```

---

## 🟡 MEDIUM

### DB-004 — ไม่มี CHECK constraint ใด ๆ (data integrity พึ่ง app layer 100%)

**Severity:** 🟡 Medium · **Evidence:** grep migrations = **ไม่มี CHECK** ใด ๆ; เงื่อนไขเช่น `monthly_rent ≥ 0`, `end_date > start_date`, `deposit ≥ 0`, `bedrooms ≥ 0`, `duration_min 5..480` ตรวจเฉพาะที่ DTO/service (`contract.service`, DTOs) · **Root Cause:** ใช้ class-validator แทน DB constraint · **Impact:** การเขียนตรง DB / bug / migration / import นอก app ใส่ค่าผิดได้ (เช่น ค่าเช่าติดลบ, สัญญาจบก่อนเริ่ม) · **Recommendation:** เพิ่ม CHECK ที่ DB เป็น backstop
- **Migration Example:**
```sql
ALTER TABLE properties ADD CONSTRAINT chk_property_rent_nonneg CHECK (monthly_rent >= 0);
ALTER TABLE contracts  ADD CONSTRAINT chk_contract_dates CHECK (end_date IS NULL OR start_date IS NULL OR end_date > start_date);
ALTER TABLE contracts  ADD CONSTRAINT chk_contract_money CHECK (monthly_rent >= 0 AND coalesce(deposit_amount,0) >= 0 AND coalesce(commission_amount,0) >= 0);
ALTER TABLE appointments ADD CONSTRAINT chk_appt_duration CHECK (duration_min BETWEEN 5 AND 480);
```
- **Validation:** `INSERT ... monthly_rent = -1` → ต้องถูกปฏิเสธ `new row ... violates check constraint`

### DB-005 — ขาด index บน `published_at` (default public sort) และ `view_count` (popular sort)

**Severity:** 🟡 Medium (High เมื่อข้อมูลโต) · **Evidence:** `PublicService.search` orderBy default `{ publishedAt: 'desc' }` และ `popular → { viewCount: 'desc' }` (`public.service.ts:43-47`); schema/advanced-indexes **ไม่มี index** บน 2 คอลัมน์นี้; public listing index = `(property_type,province,monthly_rent,bedrooms) WHERE available` (ไม่รวม sort key) · **Root Cause:** sort key ไม่มี index → top-N ต้อง sort ทั้งชุด · **Impact:** หน้า public listing (โหลดทุกผู้เยี่ยมชม) sort โดยไม่มี index → ช้า + memory sort · **Recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_properties_published ON properties (published_at DESC)
  WHERE deleted_at IS NULL AND status = 'available';
CREATE INDEX IF NOT EXISTS idx_properties_viewcount ON properties (view_count DESC)
  WHERE deleted_at IS NULL AND status = 'available';
```
- **Validation:** `EXPLAIN ANALYZE SELECT ... WHERE status='available' ORDER BY published_at DESC LIMIT 20;` → Index Scan (ไม่ใช่ Sort + Seq Scan)

### DB-006 — ขาด index บน `created_by` (own-scope ของ owner/document)

**Severity:** 🟡 Medium · **Evidence:** `OwnerService.scopeWhere` own = `{ createdBy: user.id }` (`owner.service.ts:36`); `DocumentService.scopeWhere` own = `{ createdBy }`; ไม่มี index บน `owners.created_by`/`documents.created_by` · **Root Cause:** scope own กรองด้วย created_by ที่ไม่มี index · **Impact:** ผู้ใช้ scope own (เช่นบางบทบาท) query owner/document → seq scan · **Recommendation:**
```sql
CREATE INDEX IF NOT EXISTS idx_owners_created_by ON owners (created_by) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON documents (created_by) WHERE deleted_at IS NULL;
```
- **Validation:** `EXPLAIN ANALYZE SELECT ... FROM owners WHERE created_by = '...' AND deleted_at IS NULL;` → Index Scan

### DB-007 — Account-lockout query ใช้ JSONB path บน `audit_logs` ที่ไม่มี index + ตารางโตไม่จำกัด

**Severity:** 🟡 Medium · **Evidence:** `AuditService.countRecentLoginFailures` (`audit.service.ts:25-32`) `where action='login_failed' AND createdAt>=X AND newValue path ['email'] equals` — มี index `action`+`createdAt` แต่ **JSONB `newValue->>'email'` ไม่มี GIN/expression index** · **Root Cause:** lockout เก็บ email ใน JSONB แทนคอลัมน์ · **Impact:** ทุก login ทำการ filter JSONB บน subset ของ audit_logs (โตเรื่อย ๆ) → login ช้าลงตามเวลา · **Recommendation:** expression index หรือเก็บ email ในคอลัมน์ index ได้
- **Migration Example:**
```sql
CREATE INDEX IF NOT EXISTS idx_audit_login_email
  ON audit_logs ((new_value->>'email'), created_at)
  WHERE action = 'login_failed';
```
- **Validation:** `EXPLAIN ANALYZE SELECT count(*) FROM audit_logs WHERE action='login_failed' AND created_at>=now()-interval '15 min' AND new_value->>'email'='a@b.c';` → ใช้ idx_audit_login_email

### DB-008 — ตาราง log โตไม่จำกัด: ไม่มี partitioning + ไม่มี retention job (ทั้งที่มี `retention.policy`)

**Severity:** 🟡 Medium (Scalability) · **Evidence:** `audit_logs`, `activity_logs`, `notifications` ไม่มี partition (schema comment ระบุ partition = "optional future"); setting `retention.policy` (audit_days 730 ฯลฯ) ถูก seed แต่ **ไม่มีโค้ดอ่าน/บังคับ** (grep retention ใน api = ว่าง); Scheduler ไม่ลบ log เก่า · **Root Cause:** retention เป็น metadata ที่ยังไม่มี enforcement · **Impact:** ตาราง append-only โตไม่จำกัด → index บวม, vacuum หนัก, query log ช้าขึ้นเรื่อย ๆ · **Recommendation:** เพิ่ม retention job (Scheduler) + พิจารณา monthly partition สำหรับ audit/activity/notification
- **Migration Example (retention job pseudo / SQL):**
```sql
-- รันใน Scheduler รอบรายวัน (อ่าน retention.policy)
DELETE FROM activity_logs WHERE created_at < now() - interval '730 days';
-- audit_logs เป็น append-only (trigger บล็อก DELETE) → ต้อง archive ออกก่อน หรือใช้ partition DROP
```
> หมายเหตุ: audit_logs มี trigger กัน DELETE → retention ต้องทำผ่าน **partition DROP** (ตัด partition เก่า) ไม่ใช่ DELETE

- **Validation:** หลังตั้ง partition: `SELECT count(*) FROM pg_inherits WHERE inhparent='audit_logs'::regclass;` > 0

### DB-009 — Pagination ใช้ OFFSET/LIMIT (`skip/take`) — deep page ช้า

**Severity:** 🟡 Medium · **Evidence:** ทุก list service ใช้ `skip:(page-1)*limit, take:limit` (`property.repository.ts:56`, lead/appointment/contract/owner/customer services) · **Root Cause:** OFFSET ต้องอ่าน+ทิ้ง row จนถึง offset · **Impact:** หน้าลึก (page สูง) บนตารางใหญ่ → ช้าเชิงเส้นตาม offset · **Recommendation:** keyset/cursor pagination สำหรับ list ใหญ่ (เรียงตาม id/created_at + `WHERE id < lastId`)
- **Migration Example:** (เปลี่ยนที่ query ไม่ใช่ schema)
```ts
// แทน skip/take: where: { ...scope, id: { lt: cursor } }, orderBy: { id: 'desc' }, take: limit
```
- **Validation:** `EXPLAIN ANALYZE ... OFFSET 10000 LIMIT 8` vs keyset → keyset คงที่ไม่ขึ้นกับ page

### DB-010 — ไม่มี DB role แยกสำหรับแอป + ไม่ได้ REVOKE UPDATE/DELETE บน `audit_logs`

**Severity:** 🟡 Medium (Security) · **Evidence:** `db/README.md` + `0006` comment แนะนำ `REVOKE UPDATE,DELETE ON audit_logs FROM ros_app` แต่ไม่มี migration/สคริปต์ทำ; `.env` ใช้ user เดียว (`iiamtikm`/`ros`) · **Root Cause:** ยังไม่ตั้ง least-privilege DB user · **Impact:** แอปเชื่อม DB ด้วยสิทธิ์เต็ม → ถ้าแอปถูก compromise ทำได้ทุกอย่าง (audit trigger ยังกัน DELETE audit ได้ชั้นหนึ่ง) · **Recommendation:** สร้าง role `ros_app` สิทธิ์จำกัด + REVOKE บน audit_logs (defense-in-depth ชั้น 2 นอกเหนือ trigger)
- **Migration Example:**
```sql
CREATE ROLE ros_app LOGIN PASSWORD '***';
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO ros_app;
REVOKE UPDATE, DELETE ON audit_logs FROM ros_app;
-- DATABASE_URL ของแอปชี้ ros_app (ไม่ใช่ superuser)
```
- **Validation:** `SET ROLE ros_app; DELETE FROM audit_logs;` → permission denied (ก่อนถึง trigger ด้วยซ้ำ)

### DB-011 — Logical FK (created_by/updated_by/changed_by/actor_id/entity_id + DocumentLink polymorphic) ไม่บังคับ referential integrity

**Severity:** 🟡 Medium · **Evidence:** schema comment (บรรทัด 11-15) ระบุ "เก็บเป็น UUID (logical FK→users) ไม่ผูก relation"; `DocumentLink (entity_type, entity_id)` ไม่มี FK · **Root Cause:** ตั้งใจเลี่ยง back-relation บวมบน User + รองรับ polymorphic · **Impact:** ค่าเหล่านี้อาจชี้ไป record ที่ไม่มี/ถูกลบ (orphan) — DB ไม่กัน; เช่น created_by ชี้ user ที่ถูก hard-delete (audit page จึงแสดง "(ลบแล้ว)") · **Recommendation:** ยอมรับได้สำหรับ audit/actor (snapshot ตั้งใจ); สำหรับ `created_by/updated_by` พิจารณา FK SetNull ถ้าต้องการ integrity
- **Migration Example (ตัวเลือก, เฉพาะที่ต้องการ):**
```sql
ALTER TABLE owners ADD CONSTRAINT owners_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;
```
- **Validation:** ลบ user → `created_by` ของ owner กลายเป็น NULL (แทน orphan)

---

## 🟢 LOW

### DB-012 — Lead convert race (guard นอก transaction, ไม่มี unique constraint)
- **Severity:** Low · **Evidence:** `lead.service.ts:163-176` เช็ค `if (lead.customerId)` ก่อน `$transaction` · **Root Cause:** check-then-act นอก tx · **Impact:** 2 request พร้อมกัน → customer ซ้ำ (race สั้น) · **Recommendation:** ใส่เงื่อนไขใน update เดียว (`updateMany where {id, customerId: null}` ตรวจ affected) หรือ partial unique
- **Migration Example:** `CREATE UNIQUE INDEX uq_lead_customer ON leads (id) WHERE customer_id IS NOT NULL;` (หรือ logic-level guard) · **Validation:** ยิง convert 2 ครั้งพร้อมกัน → customer 1 ราย

### DB-013 — `view_count` เพิ่มบน read path (write บนการอ่าน → row-lock ถ้า hot)
- **Severity:** Low · **Evidence:** `public.service.ts:65` `update viewCount increment` ใน `getByCode` · **Root Cause:** counter เขียนตรง row · **Impact:** ถ้าทรัพย์ยอดนิยมถูกเปิดพร้อมกันมาก → lock contention/ table bloat (HOT update); *และ* ชนกับ ISR (นับไม่ครบ — ดู BUG-HUNT H2) · **Recommendation:** แยกตารางนับ/aggregate async หรือ buffer แล้ว flush · **Validation:** โหลดทดสอบทรัพย์เดียว concurrent → ดู lock waits

### DB-014 — ไม่มี Row-Level Security (tenant isolation พึ่ง app เท่านั้น)
- **Severity:** Low (by design) · **Evidence:** ไม่มี `ENABLE ROW LEVEL SECURITY`/`CREATE POLICY`; isolation = `scopeWhere` ที่ app · **Root Cause:** เลือก app-level enforcement · **Impact:** ถ้า query ใดลืม scope → ไม่มี backstop ระดับ DB · **Recommendation:** (ทางเลือก) RLS ตาม branch_id เป็นชั้นป้องกันที่ 2 · **Validation:** `SET app.branch='...'` + policy → query ข้าม branch คืน 0 row

### DB-015 — Seed `lifecycle.property` ค้างค่า 8 สถานะเก่า (หลัง 0007 เหลือ 3)
- **Severity:** Low · **Evidence:** `seed/seed.ts:86-88` value = `['draft','pending_review','published','reserved','contract_processing','rented','renewed','archived']`; enum จริง = draft/available/rented · **Root Cause:** seed ไม่อัปเดตหลัง migration 0007 · **Impact:** setting ใน DB ไม่ตรง enum (FE ไม่ใช้ค่านี้ — ใช้ `lib/status.ts`) · **Recommendation:** อัปเดต seed เป็น `['draft','available','rented']` · **Validation:** `SELECT value FROM settings WHERE key='lifecycle.property';`

### DB-016 — ไม่มี `connection_limit` ใน DATABASE_URL (ใช้ Prisma default)
- **Severity:** Low · **Evidence:** `.env.example` DATABASE_URL ไม่มี `connection_limit` (prod comment แนะนำ `connection_limit=20` แต่ commented) · **Root Cause:** ยังไม่ตั้ง pool · **Impact:** Prisma default (num_cpus*2+1) อาจไม่ตรง Postgres `max_connections` ตอน scale · **Recommendation:** ตั้ง `connection_limit` ใน prod DATABASE_URL + pgBouncer ถ้าหลาย instance · **Validation:** `SELECT count(*) FROM pg_stat_activity WHERE usename='ros_app';` ≤ limit

### DB-017 — ไม่มี down/rollback migration (Prisma) + 0007 เป็น destructive enum rewrite
- **Severity:** Low (process) · **Evidence:** Prisma ไม่มี down migration; `0007_simplify_statuses` ทำ `ALTER TYPE ... USING CASE` + DROP TYPE เก่า (irreversible); rollback = restore backup · **Root Cause:** Prisma migrate ไม่รองรับ auto-down · **Impact:** rollback DB ต้องพึ่ง backup (ซึ่งยังไม่มี — ดู PRODUCTION-READINESS) · **Recommendation:** บังคับ `pg_dump` ก่อนทุก migrate + เขียน rollback SQL คู่มือสำหรับ migration destructive · **Validation:** ซ้อม restore จาก dump ก่อน migrate บน staging

---

## สรุปตามหัวข้อที่กำหนด

| หมวด | หัวข้อ | ผล |
|---|---|---|
| **Schema Design** | Normalization | ดี (3NF; amenities JSONB เป็น denormalize ตั้งใจ + GIN) |
| | Foreign Key | policy ชัด — ยกเว้น agent-Restrict ขัด user-delete (DB-003) |
| | Constraint | unique/EXCLUDE ดี — **ไม่มี CHECK** (DB-004) |
| | Data Integrity | soft-delete+audit ดี — logical FK ไม่บังคับ (DB-011) |
| **Performance** | Missing Index | DB-001 (search), DB-005 (sort), DB-006 (created_by), DB-007 (JSONB) |
| | Slow Query | ILIKE seq scan (DB-001), OFFSET (DB-009) |
| | N+1 | **ไม่พบ** — audit feed/notifyRoles batch แล้ว; list ใช้ groupBy bounded |
| | Full Table Scan | search/sort ที่ขาด index (DB-001/005) |
| **Transaction** | Race Condition | กันดี (EXCLUDE, code-gen retry) — ยกเว้น lead convert (DB-012) |
| | Deadlock | ไม่พบ pattern เสี่ยง (tx สั้น, lock order สม่ำเสมอ) |
| | Data Corruption | ป้องกันด้วย $transaction (status+history atomic) — ไม่พบ |
| **Security** | DB Role | ไม่มี least-privilege role (DB-010) |
| | DB Permission | ไม่ได้ REVOKE บน audit_logs (DB-010) |
| | Audit Log | immutable trigger ดีมาก (strength) |
| **Migration** | Migration Chain | 0001-0010 sequential ดี — advanced-indexes อยู่นอก chain (DB-002) |
| | Rollback Strategy | ไม่มี down migration + destructive 0007 (DB-017) |

---

*จบเอกสาร — Database Audit (source-based) · ดู backlog เรียงลำดับใน `DATABASE-REMEDIATION-BACKLOG.md`*

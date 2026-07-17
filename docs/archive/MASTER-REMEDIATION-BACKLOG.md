# ROS — Master Remediation Backlog

> รวมทุก finding จาก Architecture · Security · Database · Bug · Production-Readiness audit เป็น backlog เดียว
> เรียง **Critical → High → Medium → Low** · แต่ละข้อมี: **Priority · Impact · Difficulty · Estimated Effort · Dependency · Acceptance Criteria** + source finding-id
> Effort: S=<½วัน · M=½–2วัน · L=2–5วัน · XL=>1สัปดาห์ · Difficulty: Low/Med/High (ความเสี่ยง+ความซับซ้อนตอนทำ)

**สรุป:** Critical 4 · High 10 · Medium 17 · Low 13 = **44 รายการ**

---

## 🔴 CRITICAL (บล็อก production launch — ทำก่อนเสมอ)

### MR-01 · ตั้ง Backup อัตโนมัติ (DB + ไฟล์) + ทดสอบ restore
- **Priority:** Critical · **Impact:** ป้องกัน data loss ถาวร · **Difficulty:** Med · **Effort:** M
- **Source:** PROD-READINESS C1 · DB-017
- **Dependency:** ไม่มี (ทำได้ทันที) — ถ้ามี MinIO (MR-04) ค่อยเก็บ backup ไปที่นั่น
- **Acceptance:** `pg_dump` รันตามรอบ (cron) → ไฟล์ขึ้น object storage นอกเครื่อง; ทดสอบ restore บน DB เปล่าสำเร็จ + ข้อมูลครบ; มี RPO/RTO เอกสาร

### MR-02 · Build/Deploy pipeline (Dockerfile 3 แอป + CI gate)
- **Priority:** Critical · **Impact:** artifact reproducible + rollback ได้ · **Difficulty:** Med · **Effort:** L
- **Source:** PROD-READINESS C2
- **Dependency:** ไม่มี
- **Acceptance:** มี Dockerfile multi-stage (api/web-admin/web-public) build เป็น image tag/digest; CI (.github) รัน lint+typecheck+`jest`+build เป็น required check ทุก PR; deploy จาก image (ไม่ใช่ `npm run dev`)

### MR-03 · Monitoring + Error tracking + Log aggregation + Alerting
- **Priority:** Critical · **Impact:** ออกจาก production-blind · **Difficulty:** Med · **Effort:** L
- **Source:** PROD-READINESS C3 · DB-008
- **Dependency:** MR-02 (deploy พร้อม sidecar/agent)
- **Acceptance:** metrics endpoint (req/latency/error/DB-pool); Sentry ผูก `AllExceptionsFilter`+`request_id`; log ship เป็น JSON; alert ทำงานจริง (5xx, DB latency, disk, login_failed spike, token-reuse)

### MR-04 · ย้ายไฟล์ upload → MinIO/S3 (wire StorageService) — durable + แยก domain
- **Priority:** Critical · **Impact:** ไฟล์ durable + scale-out + ลด XSS surface · **Difficulty:** High · **Effort:** L
- **Source:** ARCH-H1 · SEC-001 · PROD-READINESS C4
- **Dependency:** MR-09 (magic-byte) ทำคู่กัน
- **Acceptance:** `StorageService` ใช้ MinIO client จริง (presigned upload/download); ไฟล์ไม่อยู่ local disk; เสิร์ฟจาก domain แยก (ไม่ใช่ app origin); backup bucket (MR-01)

---

## 🟠 HIGH (ต้องปิดก่อน production / ก่อนข้อมูลโต)

### MR-05 · เพิ่ม `app.enableShutdownHooks()` (graceful shutdown)
- **Priority:** High · **Impact:** Prisma disconnect + scheduler clear ตอน SIGTERM (กัน connection leak/งานค้าง) · **Difficulty:** Low · **Effort:** S
- **Source:** PROD-READINESS H1
- **Dependency:** ไม่มี
- **Acceptance:** ส่ง SIGTERM → log "Disconnected from PostgreSQL" + timer ถูก clear (onModuleDestroy fire); zero-downtime ระหว่าง rolling deploy

### MR-06 · ย้าย `advanced-indexes.sql` เข้า migration chain (0011)
- **Priority:** High · **Impact:** index สำคัญถูกสร้างอัตโนมัติบน prod · **Difficulty:** Low · **Effort:** S
- **Source:** DB-002 · PROD must-fix
- **Dependency:** ไม่มี · รวม MR-10/MR-11 ในมิเกรชันเดียว
- **Acceptance:** `migrate deploy` บน DB เปล่า → `pg_indexes` เห็น `idx_properties_fts/_public/_*_trgm/_geo/_amenities` ครบ โดยไม่รัน psql มือ

### MR-07 · Reverse proxy + TLS (Caddy/Nginx)
- **Priority:** High · **Impact:** ไม่ expose 4000/3000/3001 ตรง + HTTPS · **Difficulty:** Low · **Effort:** M
- **Source:** PROD-READINESS H4
- **Dependency:** MR-02 (compose/orchestrator)
- **Acceptance:** เข้าผ่าน 443 เท่านั้น; cert auto-renew; `COOKIE_SECURE=true` ทำงาน (cookie ส่งเฉพาะ HTTPS)

### MR-08 · แก้ FK agent-Restrict ขัด user hard-delete
- **Priority:** High · **Impact:** ลบ agent ที่มีสัญญาได้ (ปัจจุบัน 400 เสมอ) · **Difficulty:** Med · **Effort:** M
- **Source:** DB-003
- **Dependency:** ไม่มี
- **Acceptance:** ลบ user-agent ที่ถือสัญญา → ไม่เกิด 400 FK; ได้ข้อความชัด หรือ agent_id=NULL; comment `user.service.ts:172` แก้ให้ตรงจริง; regression test ครอบ

### MR-09 · File upload magic-byte validation + บล็อก SVG/HTML (+ nosniff)
- **Priority:** High · **Impact:** ปิด Stored XSS · **Difficulty:** Med · **Effort:** M
- **Source:** SEC-001 · SEC-004
- **Dependency:** ทำคู่ MR-04 (ปลายทางคนละ domain)
- **Acceptance:** อัป SVG ปลอมเป็น image → 400; เอกสาร download = `attachment`+nosniff; เปิดรูปจริงมี header `X-Content-Type-Options: nosniff`

### MR-10 · Trigram index ให้ตรง ILIKE search (title/description)
- **Priority:** High · **Impact:** ค้นหาทรัพย์เร็ว (query บ่อยสุด) · **Difficulty:** Low · **Effort:** S
- **Source:** DB-001
- **Dependency:** รวมใน MR-06
- **Acceptance:** `EXPLAIN ANALYZE ... title_th ILIKE '%x%'` → Bitmap Index Scan; p95 ของ `/public/properties?q=` ลดลงบน ≥10k rows

### MR-11 · Index `published_at`/`view_count` (public sort) + `created_by`
- **Priority:** High · **Impact:** public listing ไม่ sort ทั้งชุด · **Difficulty:** Low · **Effort:** S
- **Source:** DB-005 · DB-006
- **Dependency:** รวมใน MR-06
- **Acceptance:** `EXPLAIN` default/popular sort → Index Scan (ไม่มี Sort node)

### MR-12 · ส่ง `sort` ไป API ทุกลิสต์ (เลิก client-side sort บนหน้าเดียว)
- **Priority:** High · **Impact:** sort ถูกต้องข้ามหน้า (กระทบทุก list) · **Difficulty:** Low · **Effort:** M
- **Source:** BUG-H1
- **Dependency:** MR-11 (index sort key); pattern มีอยู่แล้วที่ properties page
- **Acceptance:** เลือก "ชื่อ ก-ฮ" ใน /leads,/customers,/owners,/contracts,/appointments → หน้า 2 ต่อเนื่องจากหน้า 1 ตามลำดับจริง

### MR-13 · แยกการนับ view ออกจาก endpoint ที่ถูก ISR cache
- **Priority:** High · **Impact:** "ทรัพย์ดูเยอะ" ทำงานจริง · **Difficulty:** Med · **Effort:** M
- **Source:** BUG-H2 · DB-013
- **Dependency:** ไม่มี
- **Acceptance:** เปิด detail 100 ครั้ง → viewCount ≈ 100 (ไม่ขึ้นกับ revalidate window); ไม่มี write บน hot read path / lock contention

### MR-14 · Integration/E2E test + CI gate
- **Priority:** High · **Impact:** ป้องกัน regression + gate คุณภาพ · **Difficulty:** Med · **Effort:** L
- **Source:** PROD-READINESS H10 · QA
- **Dependency:** MR-02 (CI)
- **Acceptance:** มี supertest integration (auth/RBAC/contract-sign-guard/no-orphan); E2E flow public→contract→receipt; CI required check รัน lint+typecheck+jest+build+e2e ทุก PR

---

## 🟡 MEDIUM

### MR-15 · HTTP security headers (helmet + Next headers)
- **Priority:** Medium · **Impact:** ลด clickjacking/XSS surface · **Difficulty:** Low · **Effort:** S · **Source:** SEC-002
- **Dependency:** ไม่มี · **Acceptance:** response มี `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, CSP, HSTS (ทั้ง api + 2 web)

### MR-16 · `REVALIDATE_SECRET` เข้า env.validation prod + constant-time compare
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** SEC-003
- **Dependency:** ไม่มี · **Acceptance:** prod boot โดยไม่ตั้ง secret → ไม่บูต; webhook secret ผิด → 401 (timingSafeEqual)

### MR-17 · บังคับ `PII_ENCRYPTION_KEY` ใน staging + ไม่ derive จาก constant
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** SEC-006
- **Dependency:** ไม่มี · **Acceptance:** `NODE_ENV=staging` ไม่มี key → ไม่บูต; ไม่มี dev-key fallback นอก development

### MR-18 · DB role least-privilege + REVOKE audit_logs
- **Priority:** Medium · **Difficulty:** Med · **Effort:** M · **Source:** DB-010
- **Dependency:** MR-01 (พิจารณา backup user แยก) · **Acceptance:** `SET ROLE ros_app; DELETE FROM audit_logs` → denied; แอปทำงานครบทุก endpoint ด้วย role นี้

### MR-19 · CHECK constraints (rent/dates/money/duration)
- **Priority:** Medium · **Difficulty:** Med (NOT VALID/VALIDATE) · **Effort:** S · **Source:** DB-004
- **Dependency:** MR-06 · **Acceptance:** `INSERT` ค่าผิด → violates check; ข้อมูลเดิม validate ผ่าน

### MR-20 · Expression index lockout JSONB + retention/partition log tables
- **Priority:** Medium · **Difficulty:** High (partition) · **Effort:** L · **Source:** DB-007 · DB-008
- **Dependency:** MR-03 (monitor log growth) · **Acceptance:** lockout query ใช้ index; ตาราง log ไม่โตเกิน `retention.policy`; audit immutable ยังทำงาน (partition DROP ไม่ใช่ DELETE)

### MR-21 · Document download `attachment` + nosniff (ถ้ายังไม่ทำใน MR-09)
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** SEC-004
- **Dependency:** MR-09 · **Acceptance:** `Content-Disposition: attachment` สำหรับ renderable types

### MR-22 · JWT `tokenVersion` (revoke ทันทีตอน suspend/logout-all)
- **Priority:** Medium · **Difficulty:** Med · **Effort:** M · **Source:** SEC-005
- **Dependency:** ไม่มี · **Acceptance:** suspend user → token เก่าใช้ /auth/me ไม่ได้ภายใน ~30s

### MR-23 · Server-side timezone ในข้อความ notify (pin Asia/Bangkok)
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** BUG-M1
- **Dependency:** ไม่มี · **Acceptance:** notify ของนัด 14:00 ไทย แสดง "14:00" แม้ server TZ=UTC (appointment.service + scheduler.service)

### MR-24 · Server-side search สำหรับ dropdown + debounce list search
- **Priority:** Medium · **Difficulty:** Med · **Effort:** M · **Source:** BUG-M2 · BUG-M3
- **Dependency:** ไม่มี · **Acceptance:** เลือกเจ้าของ/ลูกค้า/ทรัพย์รายที่ 101+ ได้ใน Combobox; ค้นหาในลิสต์ยิง API 1 ครั้งหลังหยุดพิมพ์

### MR-25 · แก้ `DELETE /audit-logs/feed` ที่ขัด immutable trigger
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** BUG-M4
- **Dependency:** ไม่มี · **Acceptance:** ตัดสินใจ — ลบ endpoint (audit immutable) หรือเปลี่ยนเป็น partition-archive; ไม่มี endpoint ที่ error เสมอ

### MR-26 · Error state ใน manual-load pages
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** BUG-M5
- **Dependency:** ไม่มี · **Acceptance:** ปิด API → Dashboard/Calendar/Notifications แสดง "โหลดไม่สำเร็จ/ลองใหม่" (ไม่ใช่ 0/ว่าง)

### MR-27 · เพิ่ม service layer ให้ 5 single-file modules
- **Priority:** Medium · **Difficulty:** Med · **Effort:** M · **Source:** ARCH-H2
- **Dependency:** ไม่มี · **Acceptance:** controller (audit/customer/community/search/settings) ไม่เรียก prisma ตรง; logic ย้ายเข้า service ที่ unit-test ได้

### MR-28 · ย้าย `RequestMeta` ออกจาก property.service → `common/`
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** ARCH-H3
- **Dependency:** ไม่มี · **Acceptance:** ~10 โมดูล import จาก `common/types` แทน property.service; import graph ไม่ผูก property domain

### MR-29 · แตก God component `properties/[id]` + ลด ContractService
- **Priority:** Medium · **Difficulty:** Med · **Effort:** M · **Source:** ARCH-M1 · ARCH-M3
- **Dependency:** ไม่มี · **Acceptance:** gallery/media-management แยกเป็น component (reuse กับ public PropertyGallery); receipt/sync แยกออกจาก ContractService

### MR-30 · DTO สำหรับ addTerm + ตรวจ validation gap ที่เหลือ
- **Priority:** Medium · **Difficulty:** Low · **Effort:** S · **Source:** ARCH-M4
- **Dependency:** ไม่มี · **Acceptance:** `POST /contracts/:id/terms` ใช้ DTO + class-validator (termKey/termValue maxLength)

### MR-31 · Keyset pagination สำหรับ list ใหญ่
- **Priority:** Medium · **Difficulty:** Med · **Effort:** M · **Source:** DB-009
- **Dependency:** MR-12 (เปลี่ยน list pattern คู่กัน) · **Acceptance:** latency หน้าลึกคงที่ (properties/leads/audit feed)

---

## 🟢 LOW

### MR-32 · CORS dev allowlist (เลิก reflect-any)
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** SEC-007 · **Acceptance:** `Origin: evil.com` → ไม่มี ACAO

### MR-33 · CAPTCHA ฟอร์ม public (lead/community)
- **Priority:** Low · **Difficulty:** Med · **Effort:** M · **Source:** SEC-008 · **Acceptance:** POST โดยไม่มี/captcha ปลอม → 400

### MR-34 · author_ip retention job
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** SEC-011 · **Dependency:** MR-20 · **Acceptance:** โพสต์เก่า `author_ip IS NULL`

### MR-35 · บังคับ `SEED_ADMIN_PASSWORD` non-dev + เปลี่ยนรหัส admin
- **Priority:** Low (impact Med) · **Difficulty:** Low · **Effort:** S · **Source:** SEC-013 · **Acceptance:** seed prod ไม่มี password → error

### MR-36 · ปิด lead convert race
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** BUG-L1 · DB-012 · **Acceptance:** convert พร้อมกัน 2 ครั้ง → customer 1 ราย

### MR-37 · shared package (`packages/shared`) สำหรับ format/Icon/types
- **Priority:** Low · **Difficulty:** Med · **Effort:** M · **Source:** ARCH-M2 · **Acceptance:** format.ts/Icon.tsx/types ใช้ร่วม 2 frontend (เลิก copy); ตรงกับ README ที่อ้าง packages/

### MR-38 · ลบ dead exports
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** ARCH-L1 · **Acceptance:** SelectField/FilterChips/getDownloadUrl/TRAIN_AMENITY_CODES/leadAllowed ถูกลบหรือมีผู้ใช้

### MR-39 · แก้ seed `lifecycle.property` เป็น 3 สถานะ
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** DB-015 · **Acceptance:** setting = `['draft','available','rented']`

### MR-40 · ตั้ง `connection_limit` + พิจารณา pgBouncer
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** DB-016 · **Dependency:** MR-41 (multi-instance) · **Acceptance:** `pg_stat_activity` ≤ limit ภายใต้ load

### MR-41 · Redis: ย้าย authCache + throttler store (รองรับ multi-instance)
- **Priority:** Low (สูงขึ้นถ้า scale-out) · **Difficulty:** Med · **Effort:** L · **Source:** ARCH-H1 · **Dependency:** MR-04 (object storage) · **Acceptance:** สิทธิ์/throttle sync ข้าม instance; scheduler มี distributed lock

### MR-42 · UX เล็ก: Modal dirty-check, renew client-nav, doc name truncate
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** BUG-L2/L3/L4 · **Acceptance:** Modal เตือนก่อนปิดถ้ามีข้อมูล; renew ใช้ router.push; ชื่อไฟล์ >200 ถูก truncate

### MR-43 · cookie signing + login MinLength alignment (ทบทวน)
- **Priority:** Low · **Difficulty:** Low · **Effort:** S · **Source:** SEC-010 · SEC-012 · **Acceptance:** ตัดสินใจ/เอกสารให้ตรง

### MR-44 · (ทางเลือก) RLS ตาม branch_id เป็น backstop
- **Priority:** Low · **Difficulty:** High · **Effort:** XL · **Source:** DB-014 · **Acceptance:** query ที่ลืม scope ยังถูกกรองตาม branch ที่ DB

---

## Dependency Graph (ลำดับที่ต้องมาก่อน)

```
MR-02 (CI/Docker) ──┬──▶ MR-03 (Monitoring)
                    └──▶ MR-07 (TLS) ──▶ MR-14 (E2E/CI gate)
MR-04 (MinIO) ──────┬──▶ MR-09 (magic-byte) ──▶ MR-21 (doc disposition)
                    └──▶ MR-01 (backup → bucket) , MR-41 (Redis)
MR-06 (migrate indexes) ──┬──▶ MR-10/MR-11 (trigram/sort index) ──▶ MR-12 (server sort) ──▶ MR-31 (keyset)
                          └──▶ MR-19 (CHECK)
MR-20 (retention/partition) ──▶ MR-34 (author_ip)
MR-41 (Redis) ──▶ MR-40 (conn limit/pgBouncer)
อิสระ (ทำเมื่อไรก็ได้): MR-05, MR-08, MR-13, MR-15, MR-16, MR-17, MR-22, MR-23, MR-24, MR-25, MR-26, MR-27, MR-28, MR-29, MR-30, MR-32, MR-33, MR-35, MR-36, MR-37, MR-38, MR-39, MR-42, MR-43
```

*จบ — ดูลำดับเวลาใน `PHASE-12-IMPLEMENTATION-ROADMAP.md`*

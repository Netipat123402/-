# ROS — Final Production Readiness Audit

> สังเคราะห์จากเอกสารทั้งหมด: `SYSTEM-KNOWLEDGE` · `RELATIONSHIP-MAP` · `ARCHITECTURE-AUDIT` · `SECURITY-AUDIT` · `DATABASE-AUDIT` · `BUG-HUNT` · `PRODUCTION-READINESS`
> ผู้ตรวจ (จำลอง): **Principal Engineer · Staff Backend · Staff Frontend · Security · DevOps · SRE · QA Lead**
> อ้างอิงจากโค้ดและเอกสารจริงเท่านั้น · ทุกข้อ trace ได้ถึง finding-id ในเอกสารต้นทาง

---

## 1. Executive Summary

ROS คือ **modular monolith ที่มีคุณภาพ application สูง** (NestJS + 2× Next.js + PostgreSQL/Prisma) — auth/RBAC/crypto/DB-schema/validation อยู่ระดับ production แต่ **ชั้น operations แทบยังไม่ถูกสร้าง** ระบบประกาศตัวเองเป็น "Phase 11/12, single VPS, Redis/MinIO ทีหลัง" ซึ่งสอดคล้องกับช่องว่างที่พบ

**คำตัดสินตามบทบาท:**
| บทบาท | คำตัดสิน | เหตุผลหลัก (อ้าง finding) |
|---|---|---|
| Principal Engineer | Conditional Go | core ดี แต่ `enableShutdownHooks()` ขาด (ungraceful shutdown) + scale-out blockers (ARCH-H1) |
| Staff Backend | Go (app) | API design/validation/error-envelope ดี; ช่อง = addTerm untyped (ARCH-M4), timezone notify (BUG-M1) |
| Staff Frontend | Conditional Go | UX/responsive ดีมาก; bug ที่ผู้ใช้เจอ = sort ข้ามหน้า (BUG-H1), limit=100 (BUG-M2), error เงียบ (BUG-M5) |
| Security | Conditional Go | auth/RBAC/crypto แข็งแรง (prod env enforced); ช่อง = file-upload XSS (SEC-001), no headers (SEC-002) |
| DevOps | **No-Go** | ไม่มี Dockerfile/CI/backup/monitoring/TLS — deploy = `npm run dev` ผ่าน control scripts |
| SRE | **No-Go** | ไม่มี observability/alerting/backup/DR; log โตไม่จำกัด (DB-008); single-instance state |
| QA Lead | **No-Go** | ไม่มี integration/E2E/CI gate; functional bugs ที่ยืนยันแล้ว 12 ข้อ (BUG-HUNT) |

**สรุป:** **แอปพร้อม — operations ยังไม่พร้อม** ระบบเหมาะกับ **staging/pilot บน single VPS** แต่ **ยังไม่พร้อม production launch จริง** จนกว่าจะปิด Critical ด้านล่าง

---

## 2. Production Readiness Score

```
Application Core     ████████████████████████████████████░░░░  82
  ├ Architecture     ███████████████████████████████████░░░░░  80   (ARCHITECTURE-AUDIT)
  ├ Backend/API      ████████████████████████████████████░░░░  82
  ├ Frontend/UX      ██████████████████████████████████░░░░░░  78
  ├ Security         ████████████████████████████████░░░░░░░░  72   (SECURITY-AUDIT: 72)
  └ Database         ████████████████████████████████░░░░░░░░  72   (DATABASE-AUDIT: Q78/P62/S55)

Operations           ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  22
  ├ Build/Deploy     ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  17
  ├ Monitoring/Obs   ██████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  15
  ├ Backup/DR        ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░   8
  └ Testing/CI       ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  30

┌─────────────────────────────────────────────────────────┐
│  PRODUCTION READINESS SCORE:   48 / 100                   │
│  (App core 82 ถ่วงกับ Operations 22)                      │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Go / Conditional Go / No-Go

```
┌───────────────────────────────────────────────────────────────┐
│  PRODUCTION LAUNCH (ลูกค้าจริงใช้งาน)        →  🔴 NO-GO         │
│     บล็อกโดย Critical C1–C4 (backup/deploy/monitoring/storage)  │
│                                                                 │
│  STAGING / PILOT (ผู้ใช้ภายใน, single VPS)   →  🟡 CONDITIONAL   │
│     เงื่อนไข: backup ขั้นต่ำ (pg_dump cron) + enableShutdownHooks│
│     + TLS + เปลี่ยนรหัส admin + รัน advanced-indexes            │
│                                                                 │
│  DEVELOPMENT                                  →  🟢 GO           │
└───────────────────────────────────────────────────────────────┘
```

**Go-criteria สำหรับ production:** ต้องปิด **Critical 4 ข้อ + High 6 ข้อแรก** (C1–C4, H1–H6) และมีหลักฐานผ่าน acceptance ใน `MASTER-REMEDIATION-BACKLOG.md`

---

## 4. Risk Matrix

```
ผลกระทบ →     Low              Medium                  High / Critical
Likelihood ↓
  High      BUG-M3 SEC-008    BUG-H1 BUG-M2 SEC-002    C1-Backup C3-Monitor
            ARCH-L*           DB-004 DB-008 SEC-006     C2-Deploy SEC-001
  Medium    SEC-007 DB-016    DB-001 DB-003 BUG-M1      C4-Storage H1-Shutdown
            DB-012            SEC-003 SEC-004 ARCH-H2    DB-002
  Low       SEC-010 DB-015    SEC-005 ARCH-H3 BUG-M4    ARCH-H1(scale-out)
```

| โซน | ความหมาย | ตัวอย่าง |
|---|---|---|
| 🔴 มุมขวาบน | เกิดง่าย + กระทบสูง = ทำก่อน | Backup, Monitoring, Deploy pipeline, File-upload XSS |
| 🟠 กลาง | จัดการตามลำดับ | search index, FK agent, timezone, scale-out |
| 🟢 ซ้ายล่าง | hardening/cleanup | dead exports, CORS dev, seed stale |

---

## 5. Critical Issues (บล็อก production launch)

| ID | ปัญหา | ที่มา | Impact |
|---|---|---|---|
| **C1** | **ไม่มี Backup/Recovery** — DB + ไฟล์ ไม่มี backup อัตโนมัติ (db/README เป็น TODO) | PROD-READINESS · DB-017 | data loss ถาวรถ้า VPS/disk ตาย |
| **C2** | **ไม่มี Build/Deploy pipeline** — ไม่มี Dockerfile (3 แอป), ไม่มี CI (.github หาย); deploy = `npm run dev` ผ่าน `ควบคุมระบบ/*.command` | PROD-READINESS | ไม่มี artifact/version → rollback ไม่ปลอดภัย, deploy ไม่ reproducible |
| **C3** | **ไม่มี Monitoring/Error tracking/Alerting** — มีแค่ `/health` + `/health/db`; ไม่มี metrics/APM/Sentry/log-shipping | PROD-READINESS · DB-008 | production blind: ไม่รู้ error/latency/abuse/disk-full |
| **C4** | **File storage ไม่ durable** — multer local disk (`apps/api/uploads/`); `StorageService` (MinIO) เป็น stub; ไม่ backup, ไม่ share ข้าม instance | ARCH-H1 · SEC-001 · PROD | ไฟล์หายถ้า node ตาย; scale-out ไม่ได้ |

---

## 6. High Priority Issues

| ID | ปัญหา | ที่มา |
|---|---|---|
| **H1** | `app.enableShutdownHooks()` ขาดใน `main.ts` → `onModuleDestroy` ของ Prisma/Scheduler **ไม่ fire** ตอน SIGTERM (ungraceful shutdown) | PROD-READINESS |
| **H2** | `advanced-indexes.sql` (GIN/trigram/partial/geo) **ไม่อยู่ใน migrate chain** → prod อาจรันไม่มี index สำคัญ | DB-002 |
| **H3** | File upload เชื่อ `mimetype` จาก client + ไม่ตรวจ magic-byte + เสิร์ฟ static → **Stored XSS** | SEC-001 |
| **H4** | ไม่มี reverse proxy + TLS (port 4000/3000/3001 expose ตรง) | PROD-READINESS |
| **H5** | Scale-out blockers: `authCache`(in-memory Map) + Scheduler `setInterval` (in-process) → หลาย instance = สิทธิ์ stale + แจ้งเตือนซ้ำ | ARCH-H1 |
| **H6** | **Sort ในลิสต์เรียงเฉพาะหน้าปัจจุบัน** (client-side บน 8 แถว ไม่ส่ง sort ไป API) — กระทบทุกหน้า list | BUG-H1 |
| **H7** | `viewCount` แทบไม่เพิ่มเพราะหน้า detail ถูก ISR cache → "ทรัพย์ดูเยอะ" ผิด | BUG-H2 |
| **H8** | Smart search ใช้ `ILIKE %q%` ที่ GIN full-text index ใช้ไม่ได้ → seq scan | DB-001 |
| **H9** | FK `onDelete: Restrict` บน agent ขัด user hard-delete → ลบ agent ที่มีสัญญาไม่ได้ (400) | DB-003 |
| **H10** | ไม่มี Integration/E2E test + ไม่มี CI gate (มีแค่ unit บน pure logic) | PROD-READINESS · QA |

---

## 7. Medium Priority Issues

| ID | ปัญหา | ที่มา |
|---|---|---|
| M1 | ไม่มี HTTP security headers (helmet/CSP/nosniff/X-Frame-Options/HSTS) | SEC-002 |
| M2 | `REVALIDATE_SECRET` ไม่ enforce prod + default fallback + non-constant compare | SEC-003 |
| M3 | Document download `Content-Disposition: inline` (HTML/SVG render) | SEC-004 |
| M4 | PII dev-key derive จาก constant → idCard ถอดได้ใน non-prod (staging) | SEC-006 |
| M5 | JWT access เพิกถอนก่อนหมดอายุไม่ได้ (stateless) | SEC-005 |
| M6 | ไม่มี CHECK constraint (rent ติดลบ/end<start เขียน DB ตรงได้) | DB-004 |
| M7 | ขาด index `published_at`/`view_count` (public sort) + `created_by` (own scope) + JSONB lockout | DB-005/006/007 |
| M8 | Log โตไม่จำกัด (audit/activity/notification) ไม่มี partition/retention job | DB-008 |
| M9 | ไม่มี DB role least-privilege + ไม่ REVOKE UPDATE/DELETE บน audit_logs | DB-010 |
| M10 | Server-side timezone ในข้อความ notify (`toLocaleString('th-TH')` ไม่ pin TZ) | BUG-M1 |
| M11 | Dropdown/Calendar/Dashboard hardcode `limit=100` → ข้อมูล >100 หาย/เลือกไม่ได้ | BUG-M2 |
| M12 | ค้นหาในลิสต์ไม่มี debounce (ยิง API ทุก keystroke) | BUG-M3 |
| M13 | `DELETE /audit-logs/feed` ขัด DB immutable trigger → error เสมอ (latent) | BUG-M4 |
| M14 | Manual-load pages กลืน error เงียบ → แสดง 0/ว่างแทน "โหลดไม่สำเร็จ" | BUG-M5 |
| M15 | Layer inconsistency: 5 single-file module controller→prisma + logic | ARCH-H2 |
| M16 | `RequestMeta` type anchor จาก property.service (~10 โมดูล import) | ARCH-H3 |
| M17 | God component `properties/[id]/page.tsx` (331) + ContractService (440) | ARCH-M1/M3 |

---

## 8. Low Priority Issues

| ID | ปัญหา | ที่มา |
|---|---|---|
| L1 | CORS dev reflect-any + credentials | SEC-007 |
| L2 | Public form ไม่มี CAPTCHA (spam) | SEC-008 |
| L3 | CSRF token ไม่มี (sameSite=strict กันแล้ว) · cookie ไม่ sign | SEC-009/010 |
| L4 | `author_ip` ไม่มี retention (PDPA) | SEC-011 |
| L5 | Login DTO MinLength(6) ≠ policy 8 · seed admin default credential | SEC-012/013 |
| L6 | OFFSET pagination (deep page ช้า) · no connection_limit | DB-009/016 |
| L7 | Lead convert race · view_count write บน read path | BUG-L1 · DB-012/013 |
| L8 | Duplicate logic (format/Icon/timeAgo/genCode) — ไม่มี shared package | ARCH-M2 |
| L9 | Dead exports (SelectField/FilterChips/getDownloadUrl/TRAIN_AMENITY_CODES/leadAllowed) | ARCH-L1 |
| L10 | Untyped `@Body` addTerm · Modal backdrop เสียฟอร์ม · renew hard-nav · seed lifecycle stale | ARCH-M4 · BUG-L2/L3 · DB-015 |

---

## 9. Deployment Checklist

**Build**
- [ ] สร้าง Dockerfile multi-stage: api / web-admin / web-public *(C2 — ยังไม่มี)*
- [ ] CI gate: lint + typecheck + `jest` + build *(C2 — ไม่มี .github)*
- [ ] ใช้ `start:prod` (`node dist/main.js`) + `next start` (ไม่ใช่ `dev`)
- [ ] tag/digest image (สำหรับ rollback)

**Database**
- [ ] `prisma migrate deploy` (ไม่ใช่ `migrate dev`)
- [ ] รัน `advanced-indexes.sql` *(H2/DB-002)* — หรือย้ายเข้า migration 0011
- [ ] ยืนยัน trigger: audit append-only + appointment no-overlap
- [ ] สร้าง DB role `ros_app` + `REVOKE UPDATE,DELETE ON audit_logs` *(M9/DB-010)*
- [ ] ตั้ง `connection_limit` ใน DATABASE_URL *(L6)*

**Runtime**
- [ ] เพิ่ม `app.enableShutdownHooks()` ใน main.ts *(H1)*
- [ ] reverse proxy + TLS (Caddy/Nginx) *(H4)*
- [ ] process manager + restart policy
- [ ] ย้ายไฟล์ upload → MinIO/S3 + wire StorageService *(C4)*

**Config/Secrets**
- [ ] env prod ครบ + แข็งแรง (env.validation จะ fail-fast ถ้าอ่อน)
- [ ] ตั้ง `REVALIDATE_SECRET` *(M2/SEC-003)*
- [ ] เปลี่ยนรหัส seed admin *(L5/SEC-013)*

---

## 10. Production Launch Checklist (วันเปิดจริง)

- [ ] Smoke: `/health`=200, `/health/db`=200 (latency ปกติ)
- [ ] Auth flow: login → access+refresh(httpOnly/Secure/SameSite=Strict); refresh rotation; reuse→family revoke
- [ ] E2E ธุรกิจ: Owner→Property→approve→web-public; public lead→notify; contract sign(lease verified)→rented→receipt
- [ ] RBAC spot-check: sales_agent ไม่เห็น /users, ไม่ approve
- [ ] ยืนยัน CORS prod = domain จริง (ไม่ reflect); headers มี nosniff/X-Frame *(M1)*
- [ ] ยืนยัน advanced-indexes ถูกสร้าง (search ไทยเร็ว)
- [ ] backup รอบแรกสำเร็จ + ทดสอบ restore *(C1)*
- [ ] monitoring/alert เปิด (5xx, DB latency, disk) *(C3)*
- [ ] เปลี่ยนรหัส admin + revoke token เก่า

---

## 11. Rollback Checklist

- [ ] **App:** deploy image tag ก่อนหน้า *(ต้องมี image versioning — C2)*
- [ ] **DB:** Prisma ไม่มี down → **restore จาก backup** *(C1 — ต้องมี backup ก่อน)*
- [ ] ก่อน migrate ทุกครั้ง: `pg_dump` (point-in-time) *(DB-017)*
- [ ] ยืนยัน migration ใหม่ backward-compatible กับ app เก่า (rolling)
- [ ] migration destructive (เช่น 0007 enum rewrite): มี down-SQL คู่มือ + ทดสอบ restore บน staging
- [ ] เก็บ env/secret เวอร์ชันเก่าระหว่าง transition
- [ ] runbook "migrate ค้างกลางคัน" (`_prisma_migrations` failed state)

---

## 12. Disaster Recovery Checklist

- [ ] Backup อัตโนมัติ DB: `pg_dump` ตามรอบ → object storage นอกเครื่อง *(C1)*
- [ ] Backup ไฟล์ upload (MinIO bucket / uploads/) นอกเครื่อง *(C4)*
- [ ] กำหนด RPO/RTO + ทดสอบ restore จริง (drill)
- [ ] เก็บ `audit_logs` นอกเครื่อง (immutable แต่ disk หาย = หลักฐานหาย — DB-008)
- [ ] เก็บ `PII_ENCRYPTION_KEY` แยกปลอดภัย (หาย = ถอด idCard ไม่ได้ตลอดกาล — SEC-006)
- [ ] DR runbook: กู้ DB + app + storage + secret
- [ ] ทดสอบ "VPS ตาย": provision ใหม่ + restore ภายใน RTO

---

## 13. Monitoring Checklist

- [ ] Liveness `/health` + Readiness `/health/db` ผูก probe *(มี endpoint แล้ว)*
- [ ] Metrics endpoint (Prometheus): req rate/latency/error, DB pool, event-loop lag *(C3 — ยังไม่มี)*
- [ ] Error tracking (Sentry) ผูก `AllExceptionsFilter` + `request_id` *(C3)*
- [ ] Log aggregation: ship stdout → structured JSON + `request_id` correlation *(ปัจจุบัน text local)*
- [ ] Alert: 5xx rate, `/health/db` latency_ms, disk (uploads/), cert expiry
- [ ] Alert security: `login_failed` spike, refresh-token reuse (มี log warn — ต้อง ship+alert)
- [ ] Scheduler health: ยืนยัน `flagExpiringContracts`/`remindUpcomingAppointments` รัน *(DB-008)*
- [ ] Log table growth monitor (audit/activity/notification — DB-008)

---

## 14. Security Checklist (จาก SECURITY-AUDIT)

- [ ] **SEC-001** magic-byte validation (`file-type`) + บล็อก SVG/HTML upload
- [ ] **SEC-002** helmet (api) + Next `headers()` (nosniff/X-Frame/HSTS/CSP)
- [ ] **SEC-003** `REVALIDATE_SECRET` เข้า env.validation prod + constant-time compare
- [ ] **SEC-004** เอกสาร download `Content-Disposition: attachment` + nosniff
- [ ] **SEC-006** บังคับ `PII_ENCRYPTION_KEY` ใน staging ด้วย
- [ ] **SEC-013** บังคับ `SEED_ADMIN_PASSWORD` non-dev + เปลี่ยนรหัส admin
- [ ] (คงไว้) env fail-fast, JWT 15m+rotation+reuse-detection, scrypt, RBAC+scope, audit immutable, Prisma param
- [ ] (ทางเลือก) CAPTCHA public form (SEC-008), CORS dev allowlist (SEC-007), author_ip retention (SEC-011)

---

## 15. Performance Checklist (จาก DATABASE-AUDIT + BUG-HUNT)

- [ ] **DB-001** trigram index บน title/description (ILIKE search เร็ว) — `EXPLAIN` = Bitmap Index Scan
- [ ] **DB-005** index `published_at`/`view_count` (public sort) — ไม่มี Sort node
- [ ] **DB-006** index `created_by` (own scope)
- [ ] **DB-007** expression index lockout JSONB
- [ ] **DB-008** retention/partition log tables (กันโตไม่จำกัด)
- [ ] **DB-009** keyset pagination สำหรับ list ใหญ่ (แทน OFFSET)
- [ ] **BUG-H1** ส่ง `sort` ไป API (เลิก client-side sort บนหน้าเดียว)
- [ ] **BUG-H2** ย้ายนับ view ออกจาก endpoint ที่ถูก ISR cache
- [ ] **BUG-M2/M3** server-side search สำหรับ dropdown + debounce list search
- [ ] Load test: public listing + search ที่ ≥10k properties; วัด p95 latency + DB pool saturation

---

## 16. Testing Checklist

- [ ] (มีแล้ว) Unit tests บน pure logic: lifecycle×4, scope, crypto, deletion-guard, scheduler.logic, receipt (22 ผ่าน)
- [ ] **Integration tests** (supertest มีใน devDeps แต่ไม่มีไฟล์): auth flow, RBAC scope, contract sign-guard, no-orphan document
- [ ] **E2E** (web-admin + web-public): public lead → admin → contract → receipt
- [ ] **CI gate**: lint + typecheck + jest + build (ทุก PR) *(H10 — ไม่มี .github)*
- [ ] Regression tests ปิด functional bugs: BUG-H1 (sort), BUG-H2 (viewCount), BUG-M1 (timezone), BUG-M2 (limit), BUG-M4 (audit clear)
- [ ] Contract test ระหว่าง FE ↔ API envelope (`{data,meta}` / `{error}`)
- [ ] Smoke test script (post-deploy verification §10)

---

## ภาคผนวก — Cross-Reference

| เอกสารต้นทาง | Findings | นำมาใช้ใน |
|---|---|---|
| ARCHITECTURE-AUDIT | H1-H3, M1-M5, L1-L5 | C4, H5, M15-M17, L8-L10 |
| SECURITY-AUDIT (72) | SEC-001..013 | H3, M1-M5, L1-L5, §14 |
| DATABASE-AUDIT (Q78/P62/S55) | DB-001..017 | H2, H8, H9, M6-M9, L6-L7, §15 |
| BUG-HUNT | BUG-H1-2, M1-5, L1-5 | H6, H7, M10-M14, L7, L10 |
| PRODUCTION-READINESS (45) | C, must-fix | C1-C4, H1, H4, H10, §11-13 |

*จบ — ดูแผนแก้ใน `MASTER-REMEDIATION-BACKLOG.md` + `PHASE-12-IMPLEMENTATION-ROADMAP.md`*

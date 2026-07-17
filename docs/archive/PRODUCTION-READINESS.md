# ROS — Production Readiness Audit

> ประเมินจาก **source code + infra จริงเท่านั้น** (ยืนยันด้วย grep) — ไม่แก้โค้ด
> จำลอง 4 บทบาท: **Principal Engineer · Security Engineer · DevOps Engineer · QA Lead**
> อ้างอิงผลจาก: Knowledge Base · Relationship Map · Architecture/Security/Bug Audit (ไฟล์ในโปรเจกต์)

---

## Executive Verdict

| | |
|---|---|
| **Production Readiness Score** | **45 / 100** |
| **Go / No-Go** | 🔴 **NO-GO** สำหรับ production launch จริง · 🟢 **GO** สำหรับ internal/staging บน single VPS |
| **สรุป 1 บรรทัด** | **แอปพลิเคชันแกนแข็งแรงมาก (auth/RBAC/DB/validation) แต่ยังขาดชั้น operations เกือบทั้งหมด** (build/deploy pipeline, backup, monitoring, error tracking, graceful shutdown, durability) |

> เหตุผล: ระบบถูกออกแบบสำหรับ "single VPS, Phase 11/12" — โค้ด business/security พร้อมระดับ production แต่ **ความพร้อมเชิงปฏิบัติการ (operational readiness) ยังไม่ถูกสร้าง** → deploy production จริงจะไม่มี backup/observability/rollback ที่จำเป็น

---

## คะแนนรายมิติ (16 ด้าน)

| มิติ | คะแนน | หลักฐาน |
|---|---:|---|
| Build Process | 20 | มีแค่ `nest build` / `next build`; **ไม่มี Dockerfile** สำหรับ 3 แอป, ไม่มี multi-stage build |
| Deployment Process | 15 | deploy = control scripts (`เปิดระบบ.command` → `npm run dev`) = **dev เท่านั้น**; ไม่มี reverse proxy/TLS/process manager (Caddy = Phase 12) |
| Environment Variables | 85 | Zod validate + fail-fast + prod hardening (`env.validation.ts`) — **แข็งแรง** |
| Secrets | 70 | gitignore `.env*` (เก็บ `.env.example`), env-based, prod บังคับ secret แข็ง; **ไม่มี secret manager/vault**, มี default ใน source |
| Logging | 45 | Nest `Logger` 10 จุด + `request_id` middleware; **unstructured (text), ไม่มี log shipping/correlation อัตโนมัติ** |
| Monitoring | 15 | มีแค่ `/health` + `/health/db`; **ไม่มี metrics/APM/dashboard/alerting** |
| Error Tracking | 10 | **ไม่มี** (ไม่มี Sentry/equiv); error log ลง stdout เครื่องเดียว |
| Backup | 5 | **ไม่มีสคริปต์ backup** (db/README ระบุ pg_dump→MinIO เป็น TODO Phase 7/10 ยังไม่ทำ) |
| Recovery | 10 | ไม่มี DR plan/runbook; migration reproducible ได้ (ดีจุดเดียว) |
| Database Migration | 70 | `prisma migrate deploy` พร้อม; **แต่ `advanced-indexes.sql` (GIN/trigram/partial/geo) ไม่อยู่ใน migration chain → ต้องรัน manual** + seed `lifecycle.property` ค้างค่าเก่า |
| Caching | 40 | ISR (web-public) ดี; **Redis ยังไม่ wire**; authCache/throttler in-memory |
| Rate Limiting | 55 | per-route throttle ดี (login 10, public 5–60); **in-memory store → ไม่ share ข้าม instance, reset ตอน restart** |
| Performance | 55 | index ดี + `$transaction` 24 จุด; **แต่มี client-side processing bugs (sort/viewCount/limit=100), ไม่มี load test** |
| Security | 70 | auth/RBAC/crypto แข็งแรง; gap = file-upload magic-byte + REVALIDATE_SECRET ไม่ enforce prod (ดู SECURITY-AUDIT) |
| Scalability | 25 | **single-instance only by design** — authCache/scheduler/throttler/files ทั้งหมดใน-process |
| Observability | 20 | `request_id` ใน response/log เท่านั้น; **ไม่มี trace/metric/dashboard** |

**เฉลี่ยถ่วงน้ำหนัก ≈ 45/100** (ดึงลงโดย Build/Deploy/Backup/Monitoring/Error-tracking ที่ต่ำมาก แม้ App-core สูง)

---

## ความเห็นตามบทบาท (Role-play)

### 👷 Principal Engineer — *Conditional No-Go*
> "โค้ด application พร้อม production: layering สะอาด, env fail-fast, RBAC+scope, DB design แข็งแรง, migration reproducible. **แต่ขาด graceful shutdown** — `main.ts` ไม่เรียก `app.enableShutdownHooks()` ทั้งที่ `PrismaService`/`SchedulerService` มี `onModuleDestroy` → บน SIGTERM (container/PM2 stop) hook **ไม่ทำงาน** → Prisma ไม่ disconnect, timer ไม่ clear. และ `RequestMeta`/single-instance state ทำให้ scale-out ไม่ได้ทันที"

### 🔐 Security Engineer — *Conditional Go (prod env enforced)*
> "secret/cookie/CORS/PII ถูก gate ด้วย env.validation ตอนบูต prod — ดีมาก. ค้างคา: file-upload เชื่อ mimetype + เสิร์ฟ static (stored XSS), `REVALIDATE_SECRET` ไม่อยู่ใน prod check. **ไม่มี secret manager** (env file บน VPS) และ **ไม่มี audit log shipping ออกนอกเครื่อง** (audit immutable แต่ถ้า disk หาย = หลักฐานหาย)"

### 🛠 DevOps Engineer — *No-Go*
> "นี่คือ blocker หลัก: **ไม่มี Dockerfile, ไม่มี CI/CD, ไม่มี backup, ไม่มี monitoring/alerting, ไม่มี reverse proxy/TLS, ไม่มี log aggregation**. deploy ปัจจุบัน = รัน `npm run dev` ผ่านสคริปต์ desktop. ไฟล์อัปโหลดอยู่ local disk (ไม่ durable, ไม่ backup). throttler in-memory. ไม่มีทางทำ rollback ที่ปลอดภัยถ้าไม่มี image versioning + backup"

### 🧪 QA Lead — *No-Go*
> "unit test ครอบ pure logic ดี (22 ผ่าน) แต่ **ไม่มี integration/E2E test, ไม่มี smoke test, ไม่มี CI gate**. มี functional bug ที่ผู้ใช้เจอแน่ (sort ข้ามหน้า, viewCount, timezone notification, limit=100). ไม่มี staging environment แยกที่พิสูจน์ได้"

---

## ✅ Pre-Deploy Checklist

**Build & Artifact**
- [ ] สร้าง Dockerfile (multi-stage) สำหรับ api / web-admin / web-public — *ปัจจุบันไม่มี*
- [ ] ตั้ง CI: lint + typecheck + `jest` + build เป็น gate — *ปัจจุบันไม่มี .github*
- [ ] `npm run build -w @ros/api` + `next build` ทั้ง 2 เว็บ ผ่าน (ใช้ `start:prod`, ไม่ใช่ `dev`)
- [ ] pin image digest + version tag (สำหรับ rollback)

**Config & Secrets**
- [ ] ตั้ง env production ครบ: `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` (≠ default), `COOKIE_SECURE=true`, `PII_ENCRYPTION_KEY` (hex 64), `CORS_ORIGINS` (domain จริง, ไม่มี localhost), `DATABASE_URL`
- [ ] ตั้ง `REVALIDATE_SECRET` (ค่าลับจริง) — *เตือน: env.validation ไม่ได้บังคับตัวนี้ใน prod*
- [ ] ยืนยัน `.env` ไม่ถูก commit (gitignore ครอบแล้ว) + ไม่อยู่ใน image layer
- [ ] เปลี่ยนรหัส seed admin (`admin@ros.local / ChangeMe!2026`) ทันทีหลัง seed

**Database**
- [ ] `prisma migrate deploy` (ไม่ใช่ `migrate dev`)
- [ ] **รัน `db/prisma/sql/advanced-indexes.sql` manual** (GIN/trigram/partial/geo — ไม่อยู่ใน migration chain) — ใช้ `CONCURRENTLY` บน prod
- [ ] ยืนยัน trigger ทำงาน: `audit_logs` append-only, `appointments` no-overlap
- [ ] สร้าง DB role แยกสำหรับ app + `REVOKE UPDATE,DELETE ON audit_logs`
- [ ] ตั้ง connection pool limit (Prisma) ให้เหมาะกับ Postgres `max_connections`

**Runtime**
- [ ] เพิ่ม `app.enableShutdownHooks()` ใน `main.ts` — *ปัจจุบันไม่มี → shutdown ไม่ graceful*
- [ ] วาง reverse proxy + TLS (Caddy/Nginx) หน้า api/web (port 4000/3000/3001 ไม่ควร expose ตรง)
- [ ] ตั้ง process manager / orchestrator (systemd/PM2/compose) + restart policy
- [ ] ย้ายไฟล์อัปโหลด → object storage (MinIO/S3) + wire `StorageService` (ปัจจุบัน stub, local disk ไม่ durable)

**Security (จาก SECURITY-AUDIT)**
- [ ] ตรวจ magic-byte ไฟล์อัปโหลด + บล็อก SVG/HTML (SEC-H1)
- [ ] เสิร์ฟ user upload จาก domain แยก + `Content-Disposition: attachment` (SEC-H1/M2)

---

## ↩️ Rollback Checklist

- [ ] **App rollback:** deploy image tag/digest ก่อนหน้า (ต้องมี image versioning — *ยังไม่มี*)
- [ ] **DB rollback:** Prisma migrate ไม่มี auto-down → ต้อง **restore จาก backup** (*ยังไม่มี backup → rollback DB ทำไม่ได้ปลอดภัย*)
- [ ] ก่อน migrate ทุกครั้ง: snapshot/`pg_dump` (point-in-time)
- [ ] ทดสอบว่า migration ใหม่ **backward-compatible** กับ app เวอร์ชันเก่า (rolling deploy)
- [ ] เก็บ `REVALIDATE_SECRET`/env เวอร์ชันเก่าไว้ระหว่าง transition
- [ ] ตรวจ refresh-token family: หลัง rollback token เก่ายังใช้ได้ (schema ไม่เปลี่ยน)
- [ ] มี runbook "ถ้า migrate ค้างกลางคัน" (Prisma `_prisma_migrations` failed state)

---

## 📊 Monitoring Checklist

- [ ] **Liveness probe** → `GET /api/v1/health` (มีแล้ว)
- [ ] **Readiness probe** → `GET /api/v1/health/db` (มีแล้ว — เช็ค DB)
- [ ] เพิ่ม **metrics endpoint** (Prometheus): request rate/latency/error, DB pool, event-loop lag — *ยังไม่มี*
- [ ] **Error tracking** (Sentry/equiv) ผูกกับ `AllExceptionsFilter` + `request_id` — *ยังไม่มี*
- [ ] **Log aggregation** (ship stdout → Loki/ELK) + structured JSON + `request_id` correlation — *ปัจจุบัน text local*
- [ ] Alert: API 5xx rate, DB latency (`/health/db` latency_ms), disk usage (uploads/), cert expiry
- [ ] Alert ความปลอดภัย: `login_failed` spike, refresh-token reuse (มี log warn อยู่แล้ว — ต้อง ship+alert)
- [ ] Uptime monitor ภายนอก (ping /health)
- [ ] Scheduler health: ยืนยัน `flagExpiringContracts`/`remindUpcomingAppointments` รันจริง (log มี แต่ต้อง monitor)

---

## 🆘 Disaster Recovery Checklist

- [ ] **Backup อัตโนมัติ:** `pg_dump` ตามรอบ → object storage นอกเครื่อง (R2/S3) — *ยังไม่มี (db/README เป็น TODO)*
- [ ] **Backup ไฟล์อัปโหลด:** sync `uploads/` (หรือ MinIO bucket) นอกเครื่อง — *ยังไม่มี*
- [ ] กำหนด **RPO/RTO** + ทดสอบ restore จริง (restore drill)
- [ ] เก็บ **audit_logs นอกเครื่อง** (immutable ดี แต่ disk หาย = หลักฐานหาย)
- [ ] เอกสาร DR runbook: ขั้นตอนกู้ DB + app + storage + env/secret
- [ ] ทดสอบ "VPS ตาย": provision ใหม่จาก image + restore backup ภายใน RTO
- [ ] เก็บ `PII_ENCRYPTION_KEY` แยกอย่างปลอดภัย (ถ้าหาย = ถอด idCard ไม่ได้ตลอดกาล)

---

## 🔍 Post-Deploy Verification Checklist

**Smoke (อัตโนมัติได้)**
- [ ] `GET /health` = 200, `GET /health/db` = 200 (latency ปกติ)
- [ ] `POST /auth/login` (admin) → ได้ access token + refresh cookie (httpOnly, Secure, SameSite=Strict)
- [ ] `POST /auth/refresh` (cookie) → token ใหม่; ทดสอบ reuse → family revoke
- [ ] `GET /api/v1/public/properties` = 200 (throttle header) ; เปิด web-public `/` render

**Functional (manual)**
- [ ] สร้าง Owner → Property (draft) → approve → ขึ้น web-public (revalidate ทำงานทันที)
- [ ] ฟอร์ม public lead → lead เข้า admin + notify ทีม
- [ ] Contract: แนบ lease → verify → sign → ทรัพย์ rented → ออก receipt (ดาวน์โหลดได้, audited)
- [ ] อัปโหลดรูป/เอกสาร → ดาวน์โหลดเอกสารผ่าน endpoint authed
- [ ] ตรวจ RBAC: sales_agent ไม่เห็น /users, ไม่ approve ทรัพย์ได้

**Security/Config**
- [ ] ยืนยัน CORS prod = domain จริงเท่านั้น (ไม่ reflect)
- [ ] ยืนยัน env validation ผ่าน (ถ้า secret อ่อน แอปจะไม่บูต = ดี)
- [ ] ตรวจ headers: ไม่มี stack trace ใน 500, response มี envelope + request_id
- [ ] เปลี่ยนรหัส admin แล้ว + token เก่าถูก revoke

**Data/Index**
- [ ] ยืนยัน advanced-indexes ถูกสร้าง (`\di idx_properties_fts` ฯลฯ)
- [ ] ทดสอบ search ภาษาไทย (GIN) + filter ทำงาน

---

## สรุปสุดท้าย

### 🔴 Critical Issues (บล็อก production)
1. **ไม่มี Backup/Recovery** — DB + ไฟล์ ไม่มี backup → data loss ถาวรถ้า VPS ตาย (DR score 10, Backup 5)
2. **ไม่มี Build/Deploy pipeline** — ไม่มี Dockerfile/CI; deploy = `npm run dev` ผ่านสคริปต์ → ไม่มี artifact/rollback ที่ปลอดภัย
3. **ไม่มี Monitoring/Error tracking** — มีแค่ health endpoint; production blind (ไม่รู้ error/latency/abuse)
4. **File storage ไม่ durable** — local disk, ไม่ backup, ไม่ share ข้าม instance (StorageService stub)

### 🟠 Must Fix Before Deploy
5. เพิ่ม `app.enableShutdownHooks()` — graceful shutdown ปัจจุบันไม่ทำงาน (Prisma/Scheduler hook ไม่ fire บน SIGTERM)
6. รัน `advanced-indexes.sql` manual (ไม่อยู่ใน migrate chain) — ไม่งั้น search/filter ช้าบนข้อมูลจริง
7. ตั้ง `REVALIDATE_SECRET` prod + เพิ่มเข้า env.validation (ปัจจุบันไม่ถูกบังคับ)
8. Reverse proxy + TLS (ไม่ expose 4000/3000/3001 ตรง)
9. File-upload magic-byte validation + serve upload แยก domain (SEC-H1)
10. สร้าง DB role app + REVOKE UPDATE/DELETE บน audit_logs

### 🟢 Recommended Improvements
- Redis: ย้าย authCache + throttler store + (อนาคต) refresh session → รองรับ multi-instance
- Distributed lock/queue สำหรับ Scheduler ก่อน scale-out
- Structured JSON logging + ship ออกนอกเครื่อง + `request_id` correlation
- E2E/integration test + smoke test ใน CI
- แก้ functional bugs ที่ผู้ใช้เจอ (sort ข้ามหน้า, viewCount/ISR, timezone notification, limit=100) — ดู BUG-HUNT
- ย้าย `RequestMeta` ออกจาก property.service + เพิ่ม service layer ให้ 5 single-file modules — ดู ARCHITECTURE-AUDIT
- CAPTCHA ฟอร์ม public + retention policy `author_ip`

### Go / No-Go Decision
```
┌─────────────────────────────────────────────────────────────┐
│  PRODUCTION LAUNCH (จริง, มีลูกค้าใช้งาน)   →  🔴 NO-GO        │
│     ต้องปิด Critical 1–4 + Must-Fix 5–10 ก่อน                  │
│                                                               │
│  INTERNAL / STAGING / PILOT (single VPS, ผู้ใช้ภายใน)  → 🟢 GO  │
│     โดยมีเงื่อนไข: ตั้ง backup ขั้นต่ำ (pg_dump cron) +         │
│     enableShutdownHooks + TLS + เปลี่ยนรหัส admin              │
└─────────────────────────────────────────────────────────────┘
```

**เหตุผลของคะแนน 45/100:** application core ทำได้ระดับ production (env validation, security, RBAC, DB design, migration) แต่ **operational readiness แทบเป็นศูนย์** (build/deploy/backup/monitoring/observability) — ซึ่งตรงกับสถานะที่ระบบประกาศตัวเอง ("Phase 11/12, single VPS, Redis/MinIO ทีหลัง") ระบบ **พร้อมเป็น staging/pilot** แต่ **ยังไม่พร้อม production launch** จนกว่าจะสร้างชั้น ops ที่ขาด

---

*จบเอกสาร — Production Readiness Audit (source-based, no code changes)*

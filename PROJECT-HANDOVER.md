# ROS — Project Handover

> **เอกสารส่งต่อโปรเจกต์ฉบับเดียวจบ** — สำหรับ AI session ใหม่/ทีมใหม่ ที่จะทำงานต่อโดยไม่สูญเสีย context
> สังเคราะห์จากเอกสารทั้ง 10 ฉบับ: SYSTEM-KNOWLEDGE · RELATIONSHIP-MAP · ARCHITECTURE-AUDIT · SECURITY-AUDIT · DATABASE-AUDIT · BUG-HUNT · PRODUCTION-READINESS · FINAL-PRODUCTION-AUDIT · MASTER-REMEDIATION-BACKLOG · PHASE-12-IMPLEMENTATION-ROADMAP
> **ทุกข้อมูลมาจากการอ่าน source code จริงทั้งหมด (100% ของไฟล์)** — ไม่ใช่การเดา
> 📍 Working dir: `/Users/iiamtikm/Desktop/ไม่มีชื่อโฟลเดอร์` · ⚠️ **ไม่ใช่ git repo** · Platform: macOS

---

## 1. Project Overview

**ROS (Real Estate Operating System)** — ระบบบริหารงานนายหน้าอสังหาริมทรัพย์ **เน้นปล่อยเช่า** (คอนโด / บ้าน / ทาวน์โฮม / อพาร์ทเมนท์)

- **คืออะไร:** OS สำหรับบริษัทนายหน้าหลายสาขา — รวม CRM + คลังทรัพย์ + จัดการสัญญา + เอกสาร + เว็บประกาศสาธารณะ
- **Business flow:** เจ้าของฝากทรัพย์ → ลงประกาศ → ลูกค้าสนใจ (Lead จากเว็บ) → นัดดู → แปลงเป็นลูกค้า → ทำสัญญาเช่า → ออกใบเสร็จ/ต่อสัญญา
- **ผู้ใช้หลัก (web-admin):** พนักงาน 7 บทบาท (super_admin, company_admin, branch_manager, team_lead, sales_agent, back_office, auditor)
- **ผู้ใช้รอง (web-public):** ลูกค้าทั่วไป ไม่ต้องล็อกอิน — ค้นหาทรัพย์, นัดดู, กระดานชุมชน
- **สถานะ:** README บอก "Phase 11" แต่โค้ดจริงเลยไปถึง **Phase 12** (backend ครบทุก bounded context + 2 frontend ทำงานได้ + Community board Phase 14) — **แอปพร้อม แต่ operations ยังไม่พร้อม**

---

## 2. Current Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│ web-public :3000      │         │ web-admin :3001       │
│ Next.js 14 SSR/ISR    │         │ Next.js 14 CSR        │
│ LanguageProvider(i18n)│         │ AuthProvider(bearer)  │
└──────────┬───────────┘         └──────────┬───────────┘
           │ GET /public/* (no auth)          │ protected /api/v1/* (JWT + cookie ros_rt)
           │ POST /public/leads,community      │
           │   ◀── POST /api/revalidate ───────┼── RevalidationService (fire-and-forget)
           ▼                                   ▼
        ┌──────────────────────────────────────────────────┐
        │  NestJS API :4000  /api/v1  (modular monolith)     │
        │  Middleware: RequestId                             │
        │  Global guards: Throttler → JwtAuth → Permissions  │
        │  Global pipe: ValidationPipe(whitelist)            │
        │  Global filter+interceptor: error/response envelope│
        │  ~20 modules (1 module = 1 bounded context)        │
        │  Cross-cutting: Audit·Activity·Crypto·             │
        │   Storage(stub)·Revalidation·Scheduler             │
        └───────────────────────┬──────────────────────────┘
                                │ Prisma 5 (singleton PrismaService)
                                ▼
                  ┌──────────────────────────────┐
                  │ PostgreSQL 16                  │
                  │ ext: citext, pg_trgm, btree_gist│
                  │ 29 tables · triggers:          │
                  │  - audit_logs append-only      │
                  │  - appointments no-overlap(GiST)│
                  └──────────────────────────────┘
        local disk: apps/api/uploads/{properties(static), documents(authed)}
```

**หลักการที่บังคับใช้จริง:** RBAC 2 ชั้น (resource:action + scope) · 3-state lifecycle ต่อ entity · dual trail (Audit immutable + Activity) · multi-branch tenancy + soft-delete + audit columns ทุกตาราง · i18n th/en · PII AES-256-GCM · PDPA consent · response/error envelope กลาง

**สิ่งที่ wire แล้ว:** PostgreSQL, JWT, refresh token (เก็บใน Postgres ไม่ใช่ Redis), AES-256-GCM, multer local disk, ISR revalidation webhook, scheduler ในตัว
**สิ่งที่เป็น stub/เตรียมไว้:** Redis (ไม่มี client), MinIO/S3 (`StorageService` stub), LINE/Email (NotificationService log แทนส่งจริง)

---

## 3. Current Tech Stack

| ชั้น | เทคโนโลยี (เวอร์ชันจริงจาก package.json) |
|---|---|
| Monorepo | npm workspaces (`apps/*`, `packages/*`(ไม่มีจริง), `db`) · Node ≥20 |
| Backend | **NestJS 10.4** (modular monolith), class-validator, class-transformer, zod (env), @nestjs/jwt, @nestjs/throttler, cookie-parser, multer |
| Frontend | **Next.js 14.2.15** App Router × 2 (React 18, Tailwind 3.4) — admin CSR, public SSR/ISR |
| Database | **PostgreSQL 16** + **Prisma 5.22** · ext: citext, pg_trgm, btree_gist |
| Auth | JWT HS256 (access 15m) + opaque refresh (hash ใน Postgres) + cookie httpOnly |
| Crypto | AES-256-GCM (PII) + scrypt (password) — built-in node:crypto |
| Storage | multer local disk (stub MinIO) |
| Infra | docker-compose (postgres ใช้, redis+minio เตรียม) · dev จริงใช้ **Postgres.app** ผ่าน control scripts |
| Test | Jest (unit บน pure logic เท่านั้น, 22 ผ่าน) |

**ไม่มี:** Redux/Zustand/React-Query/SWR · message queue · WebSocket · OAuth/social login · self-service register/forgot-password · Dockerfile · CI · E2E test · monitoring · backup

---

## 4. Folder Structure

```
ros/ (working dir = "ไม่มีชื่อโฟลเดอร์")
├── apps/
│   ├── api/                         NestJS backend (port 4000, /api/v1)
│   │   └── src/
│   │      ├── main.ts               bootstrap (prefix, validation, envelope, CORS, static uploads)
│   │      ├── app.module.ts         ประกอบ ~20 module + 3 global guard
│   │      ├── config/env.validation.ts   Zod validate + fail-fast prod hardening
│   │      ├── infrastructure/{prisma,storage}/   PrismaService · StorageService(stub)
│   │      ├── common/
│   │      │   ├── auth/             guards, decorators, resolveScope(), AuthenticatedUser, NEVER_MATCH
│   │      │   ├── trail/            AuditService(immutable) + ActivityService(timeline)
│   │      │   ├── crypto/           CryptoService (AES-256-GCM PII)
│   │      │   ├── filters/ interceptors/ middleware/   error/response envelope + request_id
│   │      │   ├── search/property-search.ts   propertySmartWhere() (ใช้ร่วม admin+public)
│   │      │   ├── guards/deletion-guard.ts    assertDeletable()
│   │      │   └── revalidation/     RevalidationService (webhook → web-public)
│   │      └── modules/              1 module = 1 bounded context:
│   │          health, identity(users), auth, property(+repository), owner, lead,
│   │          appointment, contract, document, notification, public, user,
│   │          settings, customer, audit, search, community, scheduler
│   │          (แต่ละ domain: controller + service + lifecycle.ts + dto/)
│   │          (customer/community/audit/search/settings = single-file module)
│   │      └── uploads/{properties(static),documents(authed)}   ★ไฟล์จริงอยู่ที่นี่
│   ├── web-admin/  (port 3001, CSR)
│   │   └── src/
│   │      ├── app/(app)/...         20 หน้า (login, dashboard, owners, properties, leads,
│   │      │                          appointments, calendar, customers, contracts,
│   │      │                          notifications, audit, users, settings, community)
│   │      ├── components/           ui.tsx(480, primitives) + PropertyForm, DocumentSection,
│   │      │                          NotificationBell, GlobalSearch, Toast, Icon, Lightbox ฯลฯ
│   │      └── lib/                  auth.tsx, api.ts, useList.ts, lookups.ts, status.ts, format.ts
│   └── web-public/  (port 3000, SSR/ISR)
│       └── src/
│          ├── app/                 home, /properties, /properties/[code], /privacy, /api/revalidate
│          ├── components/          SearchBar, PropertyCard, PropertyGallery, FeaturedCarousel,
│          │                          AppointmentForm, CommunityBoard, T.tsx(i18n), Lightbox ฯลฯ
│          └── lib/                 api.ts(publicGet/ISR), lang.tsx(i18n dict)
├── db/
│   ├── prisma/schema.prisma         29 tables, 18 enums
│   ├── prisma/migrations/0001..0010 sequential
│   ├── prisma/sql/advanced-indexes.sql  ★ไม่อยู่ใน migrate chain (ต้องรัน manual)
│   └── seed/{seed,roles-permissions,master-data}.ts
├── infra/docker/docker-compose.yml  postgres(ใช้) + redis,minio(เตรียม)
├── ควบคุมระบบ/*.command             สคริปต์ macOS เปิด/ปิด/รีเซ็ตระบบ (Postgres.app)
├── .run/                            pid/log ของ 3 services
└── [เอกสาร audit 11 ฉบับ + handover นี้]
```

---

## 5. Database Summary

**29 ตาราง · 18 enums** · PostgreSQL 16 + Prisma 5.22

**หลักการทุกตาราง:** PK = `uuid(7)` · audit columns (`created/updated/deleted_at/by`) · soft-delete (`deleted_at`) · multi-branch (`branch_id`) · เงิน `Decimal(12,2)` · เวลา `Timestamptz`(UTC) · i18n `_th/_en` · PII `id_card_no` = ciphertext

**ตารางตาม bounded context:**
- Identity & Access (7): `branches, teams, users, refresh_tokens, roles, permissions, role_permissions, user_roles`
- Owner (1): `owners`
- Property (3): `properties, property_media, property_status_history`
- Lead & Customer (3): `leads, lead_interests, customers`
- Appointment (1): `appointments` (มี `ends_at` + EXCLUDE no-overlap จัดการที่ DB)
- Contract (2): `contracts, contract_terms`
- Document (3): `documents, document_versions, document_links` (no-orphan, polymorphic link)
- Notification (2): `notifications, notification_preferences`
- Activity & Audit (2): `activity_logs, audit_logs` (logical FK, audit immutable trigger)
- Settings & i18n (3): `settings, master_data, translations`
- Community (1): `community_posts`

**Triggers/constraints (DB level):** audit_logs append-only (BEFORE UPDATE/DELETE RAISE) · appointments no-overlap (GiST EXCLUDE WHERE status='upcoming')
**Enums (3-state lifecycle):** property(draft/available/rented) · lead(new/working/closed) · appointment(upcoming/done/cancelled) · contract(draft/active/ended) · document(uploaded/verified/active/archived) · community(pending/published/archived/rejected)
**Default login:** `admin@ros.local` / `ChangeMe!2026` (override `SEED_ADMIN_EMAIL/PASSWORD`)

> รายละเอียดคอลัมน์ครบทุกตาราง → `SYSTEM-KNOWLEDGE.md §16` · ปัญหา DB → `DATABASE-AUDIT.md`

---

## 6. Auth / RBAC Summary

**Authentication:**
- Access = JWT HS256, 15 นาที, payload `{sub,email,roles,branchId,teamId}`
- Refresh = opaque 32-byte hex, เก็บ sha256 hash ใน `refresh_tokens`, family ต่อ login, cookie `ros_rt` (httpOnly, sameSite=strict, path `/api/v1/auth`, secure ตาม env)
- **Rotation + reuse detection:** refresh ที่ถูก revoke ถูกใช้ซ้ำ → เพิกถอนทั้ง family
- Lockout 5 ครั้ง/15 นาที (นับจาก audit_logs) · no-enumeration · password = scrypt + timingSafeEqual · revoke tokens เมื่อ reset/suspend
- Frontend (`web-admin/lib/auth.tsx`): access token in-memory (useRef), single-flight refresh เมื่อ 401, idle auto-logout 30 นาที
- **ไม่มี:** self-service register, forgot-password (admin reset เท่านั้น), OAuth

**Authorization (RBAC 2 ชั้น):**
- ชั้น 1 `PermissionsGuard`: `@RequirePermission(resource,action)` — มี permission ไหม (scope ใดก็ได้)
- ชั้น 2 `resolveScope()` → scope กว้างสุด (own<team<branch<all) → service สร้าง Prisma `where` + `NEVER_MATCH` กัน null-leak
- `Permission(resource,action,scope)` · privilege-escalation guard (`ROLE_RANK`) · Community moderation = role-gated

**Role Matrix (7 บทบาท):**
| Role | scope | สรุป |
|---|---|---|
| super_admin | all | ทุกอย่าง |
| company_admin | all | เกือบทุกอย่าง (role=read) |
| branch_manager | branch | บริหารสาขา |
| team_lead | team | approve ทรัพย์, assign lead, sign |
| sales_agent | branch | สร้าง/แก้ทรัพย์/lead/นัด/สัญญา (ไม่ approve) |
| back_office | branch | เอกสาร+สัญญา (verify) |
| auditor | all | read-only + audit |

> Permission matrix เต็ม → `RELATIONSHIP-MAP.md §10-11` · ช่องโหว่ → `SECURITY-AUDIT.md`

---

## 7. Completed Audits (เอกสารที่มีแล้ว)

| เอกสาร | เนื้อหา | คะแนน/ผล |
|---|---|---|
| `SYSTEM-KNOWLEDGE.md` | Knowledge base 26 หัวข้อ (เข้าใจระบบทั้งหมด) | — |
| `RELATIONSHIP-MAP.md` | 16 graph ความสัมพันธ์ + dead/unused/circular/duplicate | — |
| `ARCHITECTURE-AUDIT.md` | Architecture: coupling, god, layer, duplicate | H3·M5·L5 |
| `SECURITY-AUDIT.md` | OWASP, auth/authz/injection/upload/secrets | **72/100** (C0·H1·M5·L7) |
| `DATABASE-AUDIT.md` | schema/index/transaction/migration | **Q78·P62·S55** (C0·H3·M8·L6) |
| `DATABASE-REMEDIATION-BACKLOG.md` | DB backlog 17 ข้อ (BL-01..17) | — |
| `BUG-HUNT.md` | functional/logic/state/data/perf bugs | C0·H2·M5·L5 |
| `PRODUCTION-READINESS.md` | 16 มิติ + 5 checklist | **45/100** No-Go |
| `FINAL-PRODUCTION-AUDIT.md` | สังเคราะห์ + 16 section + 8 checklist | **48/100** No-Go |
| `MASTER-REMEDIATION-BACKLOG.md` | รวม 44 รายการ (MR-01..44) Critical-first | — |
| `PHASE-12-IMPLEMENTATION-ROADMAP.md` | แผน 4 สัปดาห์ → production-ready | — |

**ผลรวม:** ไม่พบ Critical เชิงความถูกต้อง/ช่องโหว่ร้ายแรง · จุดแข็ง = auth/RBAC/crypto/DB-schema/validation · จุดอ่อน = **operations (build/deploy/backup/monitoring)** + performance เมื่อข้อมูลโต

---

## 8. Outstanding Findings (สรุปรวมทุก audit)

**นับรวม:** Critical 4 · High 10 · Medium 17 · Low 13 = **44 รายการ** (ดู MASTER-REMEDIATION-BACKLOG)

**แยกตามด้าน:**
- **Operations (หนักสุด):** ไม่มี Dockerfile/CI/backup/monitoring/error-tracking/TLS/E2E · `enableShutdownHooks()` ขาด · ไฟล์ local disk
- **Security:** file-upload XSS (magic-byte) · ไม่มี security headers · REVALIDATE_SECRET ไม่ enforce · PII dev-key · JWT no-revoke
- **Database:** advanced-indexes นอก migrate chain · ILIKE-vs-FTS index mismatch · FK agent-Restrict vs user-delete · ไม่มี CHECK · log โตไม่จำกัด
- **Bug (ผู้ใช้เจอ):** sort ข้ามหน้า · viewCount/ISR · timezone notification · limit=100 caps · error เงียบ
- **Architecture:** layer inconsistency (5 modules) · RequestMeta type anchor · god component · duplicate (no shared package)

---

## 9. Critical Issues (บล็อก production launch — 4 ข้อ)

| ID | ปัญหา | Source | ทำที่ MR |
|---|---|---|---|
| **C1** | ไม่มี Backup/Recovery (DB + ไฟล์) → data loss ถาวร | PROD · DB-017 | MR-01 |
| **C2** | ไม่มี Build/Deploy pipeline (ไม่มี Dockerfile/CI; deploy = `npm run dev`) | PROD | MR-02 |
| **C3** | ไม่มี Monitoring/Error-tracking/Alerting (มีแค่ /health) | PROD · DB-008 | MR-03 |
| **C4** | File storage ไม่ durable (local disk, MinIO stub, ไม่ backup, ไม่ share) | ARCH-H1 · SEC-001 | MR-04 |

---

## 10. High Priority Issues (10 ข้อ)

| ID | ปัญหา | Source | MR |
|---|---|---|---|
| H1 | `enableShutdownHooks()` ขาด → ungraceful shutdown | PROD | MR-05 |
| H2 | `advanced-indexes.sql` ไม่อยู่ใน migrate chain | DB-002 | MR-06 |
| H3 | File upload เชื่อ mimetype + static serve → Stored XSS | SEC-001 | MR-09 |
| H4 | ไม่มี reverse proxy + TLS | PROD | MR-07 |
| H5 | Scale-out blockers (authCache + scheduler in-process) | ARCH-H1 | MR-41 |
| H6 | Sort ในลิสต์เรียงเฉพาะหน้าปัจจุบัน (client-side) | BUG-H1 | MR-12 |
| H7 | viewCount แทบไม่เพิ่ม (ISR cache) | BUG-H2 | MR-13 |
| H8 | Smart search ILIKE ใช้ GIN full-text index ไม่ได้ | DB-001 | MR-10 |
| H9 | FK agent-Restrict ขัด user hard-delete (ลบ agent ไม่ได้) | DB-003 | MR-08 |
| H10 | ไม่มี Integration/E2E test + CI gate | PROD · QA | MR-14 |

> Medium 17 + Low 13 → ดู `FINAL-PRODUCTION-AUDIT.md §7-8` + `MASTER-REMEDIATION-BACKLOG.md`

---

## 11. Current Production Readiness Score

```
┌──────────────────────────────────────────────────┐
│  Production Readiness:  48 / 100   → 🔴 NO-GO       │
│    App Core 82  (Arch80·BE82·FE78·Sec72·DB72)      │
│    Operations 22 (Build17·Monitor15·Backup8·Test30)│
│  Security: 72/100 · Database: Q78·P62·S55          │
└──────────────────────────────────────────────────┘
```
**Go/No-Go:** 🔴 NO-GO production · 🟡 CONDITIONAL GO staging/pilot · 🟢 GO dev
**เป้าหมายหลัง Phase 12 (4 สัปดาห์):** ≥80 (Operations 22→≥70)

---

## 12. Current Phase

- **โค้ด:** เลย Phase 11 (DB) ไปแล้ว — backend ครบทุก bounded context, 2 frontend ทำงานได้, Community board (Phase 14)
- **กำลังจะเข้า:** **Phase 12** = Operations readiness (Docker, CI, MinIO, Redis, monitoring, backup) ตาม `PHASE-12-IMPLEMENTATION-ROADMAP.md`
- **เอกสารตามหลังโค้ด:** README ยังเขียน "Phase 11"; db/README "27 ตาราง" (จริง 29); seed `lifecycle.property` ค้าง 8 สถานะเก่า; `docs/`+`packages/` ที่อ้างไม่มีจริง

---

## 13. Recommended Next Actions

1. **เริ่ม Phase 12 สัปดาห์ 1** (Infra Foundation) — quick win คือ **MR-05** (`enableShutdownHooks()`, แก้ 1 บรรทัด) แล้วตามด้วย MR-02/06/01/07
2. **ถ้าจะ deploy staging ก่อน:** ต้องมีอย่างน้อย — backup ขั้นต่ำ (pg_dump cron) + enableShutdownHooks + TLS + เปลี่ยนรหัส admin + รัน advanced-indexes
3. **ถ้าจะแก้ bug ที่ผู้ใช้เจอก่อน:** MR-12 (sort), MR-13 (viewCount), MR-23 (timezone), MR-24 (limit-100/debounce) — กระทบ UX ตรง
4. **อย่าเพิ่งทำ:** MR-41 (Redis), MR-44 (RLS), MR-37 (shared package) — เป็น post-launch/scale-out (จำเป็นเฉพาะตอน >1 instance)

---

## 14. Exact Remediation Order (ลำดับการแก้จริง)

```
สัปดาห์ 1 (Infra):     MR-05 → MR-02 → MR-06(+MR-10,11,19) → MR-01 → MR-07
สัปดาห์ 2 (Security):  MR-04 → MR-09(+MR-21) → MR-15 → MR-16 → MR-17 → MR-18 → MR-03
สัปดาห์ 3 (Bug/Perf):  MR-12 → MR-13 → MR-23 → MR-24 → MR-08 → MR-25 → MR-26 → MR-22 → MR-20
สัปดาห์ 4 (Test/Go):   MR-14 → MR-27 → MR-28 → MR-29(+30) → MR-31 → [MR-32..39] → Load test → Go-Live
Post-launch:           MR-37 · MR-40 · MR-41 · MR-42 · MR-43 · MR-44
```
**คู่ที่ทำพร้อมกัน:** MR-04↔MR-09 (storage+upload) · MR-06↔MR-10/11/19 (มิเกรชันเดียว) · MR-12↔MR-31 (list pattern)
**หลักการ migration:** pg_dump ก่อนเสมอ · `CREATE INDEX CONCURRENTLY` · CHECK/FK ใหญ่ใช้ `NOT VALID` แล้ว `VALIDATE` แยก
> รายละเอียดแต่ละ MR (Priority/Impact/Difficulty/Effort/Dependency/Acceptance) → `MASTER-REMEDIATION-BACKLOG.md`

---

## 15. Known Risks

| ความเสี่ยง | รายละเอียด | mitigation ปัจจุบัน |
|---|---|---|
| **Data loss** | ไม่มี backup → VPS/disk ตาย = ข้อมูลหายถาวร | ไม่มี (ต้องทำ MR-01 ด่วน) |
| **Ungraceful shutdown** | SIGTERM → Prisma ไม่ disconnect, scheduler ไม่ clear | ไม่มี (MR-05) |
| **PII key หาย** | `PII_ENCRYPTION_KEY` หาย = ถอด idCard ไม่ได้ตลอดกาล | ต้องเก็บ key แยกปลอดภัย |
| **Multi-instance ไม่ได้** | authCache/scheduler/throttler/files in-process | single-instance only by design |
| **Performance เมื่อโต** | ILIKE search + log โตไม่จำกัด + OFFSET pagination | index มี (ถ้ารัน manual) + ยังไม่ load-test |
| **Stored XSS** | file upload ไม่ตรวจ magic-byte + static serve | origin :4000 แยกจาก app (ลดทอน) |
| **Functional bugs** | sort ข้ามหน้า, viewCount, timezone, limit=100 | ยังไม่แก้ (ผู้ใช้เจอแน่) |
| **Destructive migration** | 0007 enum rewrite irreversible, ไม่มี down | rollback = restore backup (ที่ยังไม่มี) |

---

## 16. Open Questions (ต้องถามเจ้าของโปรเจกต์/ตัดสินใจก่อนทำต่อ)

1. **Deployment target:** single VPS ต่อไป หรือจะ scale-out หลาย instance? (กระทบว่าต้องทำ MR-41 Redis เมื่อไร)
2. **MinIO vs S3/R2:** จะใช้ object storage ตัวไหน? (กระทบ MR-04)
3. **MR-08 (FK agent):** เลือก soft-delete user (เก็บประวัติ agent) หรือ SetNull (งานไร้ผู้รับผิดชอบ)?
4. **MR-25 (audit clear):** จะลบ endpoint `DELETE /audit-logs/feed` (audit immutable) หรือเปลี่ยนเป็น partition-archive?
5. **LINE/Email:** มี credential/provider จริงหรือยัง? (NotificationService ยัง stub)
6. **CI/CD platform:** GitHub Actions? (ยังไม่มี .github) — และ project ยัง**ไม่ใช่ git repo** (ต้อง `git init` ก่อน)
7. **Retention policy:** `retention.policy` setting (audit 730 วัน ฯลฯ) จะบังคับใช้จริงไหม? (กระทบ MR-20 partition)
8. **เอกสาร UX-UI-AUDIT.md** (19KB) ยังไม่ถูกสรุปในชุด audit — มีประเด็น UX ที่ต้องดูเพิ่มไหม?

---

## 17. Session Continuation Instructions (สำหรับ AI session ใหม่)

**เริ่มที่นี่:**
1. อ่านเอกสารนี้ (`PROJECT-HANDOVER.md`) ให้จบก่อน = ได้ context ครบ
2. ถ้าต้องการรายละเอียดด้านใด เปิดเอกสารเฉพาะ (ตาราง §7)
3. **ยืนยันสถานะปัจจุบัน** ก่อนแก้ — โค้ดอาจเปลี่ยนหลัง handover: `grep`/อ่านไฟล์จริงเพื่อ confirm finding ยังอยู่

**ข้อควรระวัง (จาก source จริง):**
- Working dir = `/Users/iiamtikm/Desktop/ไม่มีชื่อโฟลเดอร์` (มีช่องว่าง/อักษรไทย — quote path เสมอ) · **ไม่ใช่ git repo** (ถ้าจะ commit ต้อง `git init` ก่อน)
- zsh กิน glob `*.tsx` ใน `--include` — ใช้ `grep -r ... --include='*.tsx'` (quote)
- `.next/` build artifacts ทำให้ grep ผลบวม — exclude `-not -path '*/.next/*'`
- รันระบบ dev: ดับเบิลคลิก `ควบคุมระบบ/เปิดระบบ.command` (เปิด Postgres.app + 3 services + เบราว์เซอร์) · login `admin@ros.local` / `ChangeMe!2026`
- ปิด: `ควบคุมระบบ/ปิดระบบ.command` · รีเซ็ตข้อมูล: `รีเซ็ทระบบ.command` (⚠️ ลบข้อมูลหมด)

**ถ้าจะแก้โค้ด:** ทำตาม `PHASE-12-IMPLEMENTATION-ROADMAP.md` ลำดับ §14 · เริ่ม MR-05 (quick win) · ทุกการแก้ DB → pg_dump ก่อน + ทดสอบ acceptance ใน MASTER-REMEDIATION-BACKLOG

**Pattern สำคัญที่ต้องเคารพ (ถ้าแก้ backend):**
- 1 module = 1 bounded context (controller→service→repository/prisma)
- ทุก mutation → `audit.record()` + `activity.log()`
- ทุก query → `resolveScope()` + `scopeWhere()` + `NEVER_MATCH` กัน null-leak
- gen code → max-code + retry P2002
- transition → `canTransition*()` จาก lifecycle.ts
- ทุก endpoint → `@RequirePermission(resource,action)` + DTO + class-validator

---

## 18. Everything Required to Continue Without Losing Context

**Quick Facts (ท่องไว้):**
- 3 services: api(4000,/api/v1) · web-admin(3001) · web-public(3000) · DB(5432)
- 29 tables · 18 enums · 7 roles · ~20 modules · 44 remediation items
- Score: Prod 48 · Security 72 · DB Q78/P62/S55 · Critical 4 · High 10
- Auth: JWT 15m + refresh rotation+reuse · scrypt · cookie ros_rt
- Storage: local disk (MinIO stub) · Scheduler: setInterval 30min in-process
- Revalidation: api → web-public webhook (ISR tag `public-properties`)

**Entry points (อ่านโค้ดเริ่มที่):**
- Backend bootstrap: `apps/api/src/main.ts` + `app.module.ts`
- Auth core: `apps/api/src/common/auth/*` + `modules/auth/*` + `modules/identity/users.service.ts`
- Template module (แม่แบบ): `apps/api/src/modules/property/*` (มี repository แยก)
- DB: `db/prisma/schema.prisma` + `db/seed/*`
- Frontend admin: `apps/web-admin/src/lib/{auth.tsx,api.ts}` + `app/(app)/layout.tsx` + `components/ui.tsx`
- Frontend public: `apps/web-public/src/lib/{api.ts,lang.tsx}` + `app/page.tsx`

**สิ่งที่ทำเสร็จแล้ว (อย่าทำซ้ำ):**
- ✅ Reverse engineering ครบ 100% · Knowledge base · Relationship map
- ✅ Audit 5 ด้าน (Architecture/Security/Database/Bug/Production) ครบ
- ✅ Remediation backlog 44 ข้อ + Phase 12 roadmap 4 สัปดาห์

**สิ่งที่ยังไม่ทำ (งานต่อไป):**
- ❌ การ**แก้โค้ด**ใด ๆ (ทุก audit เป็นเอกสาร ไม่แตะ source) — เริ่มได้ตาม roadmap
- ❌ Phase 12 implementation (Docker/CI/MinIO/Redis/monitoring/backup/E2E)
- ❌ ตอบ Open Questions §16

**กฎที่ใช้มาตลอด (ถ้าเจ้าของยังต้องการ):** ห้ามแก้โค้ด / ห้าม refactor ระหว่างทำ audit — ทุกอย่างเป็นเอกสาร · ถ้าจะเข้าสู่ implementation เจ้าของต้องสั่งชัดเจน

---

## ภาคผนวก — แผนผังเอกสารทั้งหมด

```
PROJECT-HANDOVER.md  ◀── คุณอยู่ที่นี่ (เริ่มอ่านที่นี่)
│
├─ ความเข้าใจระบบ
│   ├─ SYSTEM-KNOWLEDGE.md        (26 หัวข้อ — เข้าใจระบบทั้งหมด)
│   └─ RELATIONSHIP-MAP.md        (16 graph — ความสัมพันธ์/dependency)
│
├─ Audit (วิเคราะห์)
│   ├─ ARCHITECTURE-AUDIT.md      (coupling/god/layer/duplicate)
│   ├─ SECURITY-AUDIT.md          (72/100 — OWASP, มีตัวอย่างโค้ดแก้+test)
│   ├─ DATABASE-AUDIT.md          (Q78/P62/S55 — schema/index/tx/migration)
│   ├─ BUG-HUNT.md                (functional/logic/perf bugs)
│   └─ PRODUCTION-READINESS.md    (45/100 — 16 มิติ + 5 checklist)
│
└─ แผนแก้ (ปฏิบัติ)
    ├─ FINAL-PRODUCTION-AUDIT.md       (48/100 — สังเคราะห์ + 16 section)
    ├─ MASTER-REMEDIATION-BACKLOG.md   (44 รายการ MR-01..44, Critical-first)
    ├─ DATABASE-REMEDIATION-BACKLOG.md (17 รายการ BL-01..17)
    └─ PHASE-12-IMPLEMENTATION-ROADMAP.md (4 สัปดาห์ → production-ready)
```

*จบ Project Handover — เอกสารเดียวจบ พร้อมส่งต่อ session ใหม่ · อ้างอิงจาก source code จริง 100%*

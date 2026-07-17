# ROS — System Knowledge Base

> **Real Estate Operating System** — ระบบบริหารงานนายหน้าอสังหาริมทรัพย์ (เน้นปล่อยเช่า: คอนโด / บ้าน / ทาวน์โฮม / อพาร์ทเมนท์)
>
> เอกสารนี้สร้างจาก **Reverse Engineering source code จริงทั้งหมด** (backend + 2 frontend + database + infra)
> เป้าหมาย: ให้ Senior Developer คนใหม่อ่านจบแล้วเข้าใจระบบทั้งหมดโดยไม่ต้องเปิด source code
>
> อ้างอิงโค้ด ณ สถานะปัจจุบัน · เวลาทั้งหมดเป็น UTC ใน DB · เงินเป็น `Decimal(12,2)`

## สารบัญ
1. [Executive Summary](#1-executive-summary)
2. [Business Overview](#2-business-overview)
3. [System Architecture](#3-system-architecture)
4. [Frontend Architecture](#4-frontend-architecture)
5. [Backend Architecture](#5-backend-architecture)
6. [Database Architecture](#6-database-architecture)
7. [Storage Architecture](#7-storage-architecture)
8. [Authentication Architecture](#8-authentication-architecture)
9. [Authorization Architecture](#9-authorization-architecture)
10. [Feature Matrix](#10-feature-matrix)
11. [Route Map](#11-route-map)
12. [Screen Map](#12-screen-map)
13. [Component Hierarchy](#13-component-hierarchy)
14. [State Management](#14-state-management)
15. [API Catalog](#15-api-catalog)
16. [Database Catalog](#16-database-catalog)
17. [Event Flow](#17-event-flow)
18. [Background Jobs](#18-background-jobs)
19. [Third Party Services](#19-third-party-services)
20. [Deployment Architecture](#20-deployment-architecture)
21. [Environment Variables](#21-environment-variables)
22. [Configuration Architecture](#22-configuration-architecture)
23. [Testing Architecture](#23-testing-architecture)
24. [Documentation Analysis](#24-documentation-analysis)
25. [Known Facts](#25-known-facts)
26. [Unknown Areas](#26-unknown-areas)

---

## 1. Executive Summary

ROS เป็น **monorepo (npm workspaces)** ประกอบด้วย 4 workspace:

| Workspace | เทคโนโลยี | พอร์ต | บทบาท |
|---|---|---|---|
| `apps/api` | NestJS 10 (modular monolith) | 4000 | Backend REST API (`/api/v1`) |
| `apps/web-admin` | Next.js 14 (App Router, client-rendered) | 3001 | ระบบหลังบ้านพนักงาน |
| `apps/web-public` | Next.js 14 (App Router, SSR + ISR) | 3000 | เว็บลูกค้า (ไม่ต้องล็อกอิน) |
| `db` | Prisma 5.22 + PostgreSQL 16 | 5432 | schema, migrations, seed |

**หลักการสถาปัตยกรรมที่บังคับใช้จริงในโค้ด:**
- **1 module = 1 bounded context** (NestJS) — แต่ละโดเมนมี controller / service / lifecycle / dto แยก
- **RBAC 2 ชั้น** — `resource:action` (guard ระดับ route) + `scope` own/team/branch/all (บังคับที่ service/repository)
- **3 สถานะต่อ lifecycle** — Property / Lead / Appointment / Contract ถูกรื้อให้เหลือ 3 ขั้น (state machine แยกไฟล์ pure + unit test)
- **Dual trail** — `AuditLog` (immutable, DB trigger กัน UPDATE/DELETE) + `ActivityLog` (timeline แบบ best-effort)
- **Multi-branch tenancy** — `branch_id` ทุกตารางธุรกิจ + soft delete (`deleted_at`) + audit columns ทุกตาราง
- **i18n (th/en)** + **PII encryption (AES-256-GCM)** + **PDPA consent**
- **Response/Error envelope กลาง** — `{ data, meta:{ request_id } }` / `{ error:{ code, message, request_id } }`

**สิ่งที่ wire แล้ว vs เตรียมไว้:**
- ✅ ใช้งานจริง: PostgreSQL, Prisma, JWT, refresh token (เก็บใน Postgres), AES-256-GCM PII, multer (local disk), ISR revalidation webhook, scheduler ในตัว
- 🟡 เตรียมไว้แต่ยังไม่ wire: **Redis** (ไม่มี client ในโค้ด), **MinIO/S3** (`StorageService` เป็น stub), **LINE/Email** (NotificationService log แทนการส่งจริง)

---

## 2. Business Overview

**ระบบนี้คืออะไร:** OS สำหรับธุรกิจนายหน้าเช่าอสังหาฯ — รวม CRM + คลังทรัพย์ + จัดการสัญญา + เอกสาร + เว็บประกาศสาธารณะ ในที่เดียว รองรับหลายสาขา/หลายทีม

**Value Flow (วงจรธุรกิจหลัก):**
```
เจ้าของ (Owner) ──ฝากทรัพย์──▶ Property (draft)
                                  │ approve
                                  ▼
                            Property (available) ──โชว์บนเว็บ public──▶ ลูกค้าทั่วไป
                                                                          │ กรอกฟอร์มนัด
                                                                          ▼
                                                                    Lead (new) ──notify ทีม
                                                                          │ assign / เริ่มดูแล
                                                                          ▼
                                                                    Lead (working)
                                                       ├── Appointment (นัดดูทรัพย์) ──complete
                                                       └── convert ──▶ Customer
                                                                          │
                            Property (available) ◀──┐                    ▼
                                                    │              Contract (draft)
                                                    │ sign (ต้องมี lease verified)
                                                    │                    ▼
                            Property (rented) ◀─────┴──sync──── Contract (active)
                                                                          ├── Receipt (เอกสาร)
                                                                          ├── Renew ──▶ Contract ใหม่ (draft)
                                                                          │ end
                                                                          ▼
                            Property (available) ◀──sync──── Contract (ended)
```

**ผู้ใช้:**
- **Primary (web-admin):** พนักงานภายใน 7 บทบาท — `super_admin`, `company_admin`, `branch_manager`, `team_lead`, `sales_agent`, `back_office`, `auditor`
- **Secondary (web-public):** ลูกค้าทั่วไป (ไม่ล็อกอิน) — ค้นหาทรัพย์, นัดดู, โพสต์กระดานชุมชน

**Core Business Entities:** Branch · Team · User · Owner · Property · Lead · Customer · Appointment · Contract · Document · Notification

**Critical Features:** RBAC+scope, Property lifecycle+publish, Lead capture (public), Contract+sync ทรัพย์, Document (no-orphan/versioned/audited), Auth (rotation+reuse detection)
**Supporting Features:** Notification (in-app), Scheduler (เตือนสัญญา/นัด), Audit/Activity feed, Global search, Community board, Settings/master-data, i18n

---

## 3. System Architecture

```
┌──────────────────────┐         ┌──────────────────────┐
│  web-public  :3000     │        │  web-admin   :3001    │
│  Next.js SSR / ISR     │        │  Next.js CSR          │
│  LanguageProvider      │        │  AuthProvider         │
│  publicGet(tag,reval)  │        │  bearer + refresh     │
└──────────┬───────────┘         └──────────┬───────────┘
           │  GET /public/* (no auth)         │  protected /api/v1/* (JWT)
           │  POST /public/leads,community     │  + cookie ros_rt
           │                                   │
           │   ◀── POST /api/revalidate ───────┼── RevalidationService (fire-and-forget)
           ▼                                   ▼
        ┌────────────────────────────────────────────────┐
        │            NestJS API  :4000   /api/v1            │
        │  Middleware: RequestIdMiddleware                  │
        │  Global guards: ThrottlerGuard → JwtAuthGuard     │
        │                 → PermissionsGuard                │
        │  Global pipe: ValidationPipe (whitelist)          │
        │  Global filter+interceptor: error/response envelope│
        │  ~20 domain modules (1 = 1 bounded context)       │
        │  Cross-cutting: Audit · Activity · Crypto ·       │
        │   Storage(stub) · Revalidation · Scheduler        │
        └───────────────────────┬──────────────────────────┘
                                │ Prisma 5 (singleton PrismaService)
                                ▼
                  ┌──────────────────────────────┐
                  │  PostgreSQL 16                 │
                  │  ext: citext, pg_trgm,         │
                  │       btree_gist               │
                  │  29 tables · triggers:         │
                  │   - audit_logs append-only     │
                  │   - appointments ends_at +     │
                  │     no_overlap (GiST EXCLUDE)  │
                  └──────────────────────────────┘
        local disk: apps/api/uploads/{properties(static), documents(authed)}
```

**Startup flow (`apps/api/src/main.ts`):**
1. patch `BigInt.prototype.toJSON` (กัน 500 ตอนคืน `fileSize`)
2. สร้าง `NestExpressApplication` จาก `AppModule`
3. `cookieParser()` → อ่าน refresh cookie `ros_rt`
4. `mkdirSync uploads/{properties,documents}` + serve static เฉพาะ `/uploads/properties/`
5. `setGlobalPrefix('api/v1')`
6. `ValidationPipe({ whitelist:true, forbidNonWhitelisted:true, transform:true })`
7. `AllExceptionsFilter` + `TransformInterceptor`
8. CORS — prod = allowlist จาก `CORS_ORIGINS`, dev = reflect origin (รองรับ LAN IP บนมือถือ)
9. `listen(PORT=4000)`

**ความสัมพันธ์ระหว่างแอป:**
- web-admin/web-public → API ผ่าน HTTP เท่านั้น (ไม่มี shared code package; `packages/` ที่ README อ้างไม่มีจริง)
- API → web-public ทางเดียวผ่าน revalidation webhook (เมื่อทรัพย์ขึ้น/ลงเว็บ)
- ทั้งสาม service รันแยกกัน (dev: `npm run dev` ต่อ workspace)

---

## 4. Frontend Architecture

มี 2 แอป Next.js 14 (App Router) คนละ paradigm:

### 4.1 web-admin (Client-Side Rendering)
- **เกือบทุกหน้าเป็น `'use client'`** — ดึงข้อมูลผ่าน `useAuth().api()` (bearer + auto-refresh)
- **Auth (`src/lib/auth.tsx`):** `AuthProvider` เก็บ access token ใน `useRef` (in-memory เท่านั้น ไม่ลง storage) · refresh token เป็น httpOnly cookie · `api()`/`upload()`/`apiBlob()` แนบ bearer และ retry เมื่อ 401 ผ่าน **single-flight refresh** (รวม refresh ที่ชนกันให้เหลือครั้งเดียว กัน token-reuse false positive) · `can(resource,action)` gate ทุกปุ่ม/เมนู
- **API client (`src/lib/api.ts`):** base = `${window.location.hostname}:4000/api/v1` (รองรับ LAN IP) · `apiRaw()` คืน envelope `{data,meta}` · `apiUpload()` ใช้ XHR เพื่อรายงาน progress % · `mediaUrl(storageKey)`
- **List pattern (`src/lib/useList.ts`):** hook โหลด list + pagination + `pollMs` (รีเฟรชเงียบ near-realtime) + ฟัง event `app:refresh` (pull-to-refresh)
- **Lookup (`src/lib/lookups.ts`):** `useLookup(path,map,enabled)` โหลด dropdown ตอนเปิด modal (lazy)
- **Design system (`tailwind.config.ts` + `globals.css`):** โทน ink/gold/warm-neutral · ดูหัวข้อ [22](#22-configuration-architecture)
- **Responsive shell switch:** Tailwind variant `mouse:` = `(min-width:768px) and (not (any-pointer:coarse))` → เดสก์ท็อปได้ sidebar+table · `touch:` = `(any-pointer:coarse)` → มือถือ/แท็บเล็ต/iPad ได้ bottom-nav+การ์ดเสมอ

### 4.2 web-public (Server-Side Rendering + ISR)
- **หน้า server component** ดึงข้อมูลด้วย `publicGet(path, revalidate=300, tags=['public-properties'])` → cache 5 นาที + invalidate ทันทีผ่าน webhook
- **i18n (`src/lib/lang.tsx`):** `LanguageProvider` + dictionary (th/en) เก็บภาษาใน localStorage · helper `t()`, `pick()`, `typeLabel()`, `amenityLabel()`
- **ฟอร์ม public** (AppointmentForm/CommunityBoard) เป็น client component ยิงตรง `apiBase()` (ไม่ผ่าน auth)
- **API client (`src/lib/api.ts`):** SSR ใช้ `API_BASE_INTERNAL`, client ใช้ `window.location.hostname:4000`

### 4.3 หลักการ UX ที่ implement จริง (ตรงกับ comment อ้าง "เทคนิค UX/UI" PDF)
- `PAGE_SIZE = 8` ทุกตาราง (Global Design Rule, `ui.tsx`)
- ทุก action มี Toast feedback
- ลำดับสายตา PRIMARY → SECONDARY → ADVANCED ในหน้า detail
- label บนช่อง (ไม่ใช้ placeholder แทน label) · error ใต้ช่อง · hint แปลง พ.ศ.
- การลบ/อันตราย → `ConfirmDialog` (แทน window.confirm) ขอเหตุผลได้
- ไอคอนชุดเดียว (`Icon.tsx`, stroke 1.75) แทนอิโมจิ

---

## 5. Backend Architecture

NestJS modular monolith — ประกอบใน `apps/api/src/app.module.ts`

**Cross-cutting (`common/` + `infrastructure/`):**
| โมดูล/ไฟล์ | หน้าที่ |
|---|---|
| `infrastructure/prisma` | `PrismaService` (singleton, connect/disconnect lifecycle) |
| `infrastructure/storage` | `StorageService` — abstraction เหนือ MinIO/S3 (**stub**) |
| `common/auth` | `JwtAuthGuard`, `PermissionsGuard`, decorators (`@Public/@RequirePermission/@CurrentUser`), `resolveScope()`, `AuthenticatedUser`, `NEVER_MATCH` |
| `common/trail` | `AuditService` (immutable) + `ActivityService` (timeline) — **exported** ให้ทุกโมดูล |
| `common/crypto` | `CryptoService` — AES-256-GCM encrypt/decrypt/mask PII |
| `common/filters` | `AllExceptionsFilter` — error envelope + map Prisma error (P2025→404, P2002→409, P2003→400) |
| `common/interceptors` | `TransformInterceptor` — response envelope `{data,meta}`, ตรวจ key `items` = paginated, ปล่อย `StreamableFile` ผ่าน |
| `common/middleware` | `RequestIdMiddleware` — แนบ `x-request-id` ทุก request |
| `common/search` | `propertySmartWhere()` — smart search (คำพ้องประเภท/จังหวัด/amenity) ใช้ร่วม public+admin |
| `common/guards` | `assertDeletable()` — กัน soft-delete entity ที่มี dependent (เพราะ FK Restrict ไม่ยิงกับ soft delete) |
| `common/revalidation` | `RevalidationService` — ยิง webhook ไป web-public (fire-and-forget) |

**Domain modules (แม่แบบเดียวกันทุกตัว — ดูจาก Property):**
```
modules/<domain>/
  <domain>.controller.ts   @RequirePermission + @CurrentUser (thin)
  <domain>.service.ts      business rules + transitions + audit/activity
  <domain>.repository.ts   DB access + scope filter อัตโนมัติ (เฉพาะ Property; โมดูลอื่นรวมใน service)
  <domain>.lifecycle.ts    state machine (pure, unit-tested)
  dto/*.ts                 class-validator
```

**โมดูลทั้งหมด (ลงทะเบียนใน app.module):** Health, Identity, Auth, Property, Owner, Lead, Appointment, Contract, Document, Notification, Public, User, Settings, Customer, Audit, Search, Community, Scheduler (+ Prisma/Trail/Crypto/Revalidation/Config/Throttler global)

> หมายเหตุ: Customer / Community / Audit / Search / Settings เป็น **single-file module** (controller+module อยู่ไฟล์เดียว)

**Convention การเขียน service (เหมือนกันทุกโดเมน):**
1. `require(user, action)` → `resolveScope()` (ไม่มีสิทธิ์ = `ForbiddenException`)
2. `scopeWhere(user, scope)` → สร้าง Prisma `where` ตาม scope + `deletedAt: null` + `NEVER_MATCH` กัน null-leak
3. mutation → `activity.log()` (best-effort) + `audit.record()` (immutable)
4. gen code แบบ `<PREFIX>-<YEAR>-<0001>` ผ่าน "max code ล่าสุด" + retry P2002 (กันชนตอน concurrent)
5. transition ผ่าน `canTransition*()` จาก lifecycle.ts (โยน `ConflictException` ถ้าผิด)

---

## 6. Database Architecture

PostgreSQL 16 + Prisma 5.22. **29 ตาราง · 18 enums** (`db/prisma/schema.prisma`)

**หลักการ (Phase 3) บังคับใช้ทุกตาราง:**
- PK = **UUID v7** (`@default(uuid(7))`) — เรียงตามเวลา, ปลอดภัย, รองรับ multi-branch
- Audit columns: `created_at/by`, `updated_at/by`, `deleted_at/by`
- **Soft delete** (`deleted_at`) — query หลักบวก `WHERE deleted_at IS NULL`
- **Multi-branch** (`branch_id` ทุกตารางธุรกิจ)
- **i18n** (`title_th/title_en`, master_data, translations)
- **PII ciphertext** (`id_card_no` เข้ารหัสที่ app layer)
- เงิน `Decimal(12,2)` · เวลา `Timestamptz` (UTC)
- Extensions: `citext` (email case-insensitive), `pg_trgm` (fuzzy), `btree_gist` (exclusion constraint)

**ER (FK จริง):**
```
Branch 1─* Team 1─* User
User *─* Role (UserRole)  ;  Role *─* Permission (RolePermission)
User 1─* RefreshToken (Cascade)
User 1─* Notification / NotificationPreference
Owner 1─* Property *─1 User(assignedTo, SetNull) , *─1 Branch
Property 1─* PropertyMedia (Cascade) / PropertyStatusHistory (Restrict)
Lead *─1 Customer (SetNull)  ;  Lead *─* Property (LeadInterest, Cascade)
Appointment *─1 Lead?/Property?(Restrict) , *─1 User(agent, Restrict)
Contract *─1 Property/Owner/Customer/User(agent) [Restrict] , self-ref renewedFrom (SetNull)
Contract 1─* ContractTerm (Cascade)
Document 1─1 currentVersion , 1─* DocumentVersion (Cascade) , 1─* DocumentLink (Cascade, polymorphic)
ActivityLog / AuditLog = logical FK only (actorId/entityId ไม่ผูก relation — คงประวัติแม้ user ถูกลบ)
```

**Triggers / DB-level constraints (จาก migrations):**
- `audit_logs` BEFORE UPDATE/DELETE → `RAISE EXCEPTION` (append-only) — `0006_audit_immutable`
- `appointments.ends_at` set โดย trigger + `EXCLUDE USING gist (agent_id =, tstzrange(scheduled_at,ends_at) &&) WHERE status='upcoming'` (กันนัดซ้อนระดับ DB) — `0005` ปรับใน `0007`
- `0007_simplify_statuses` รื้อ enum ทุกตัวเหลือ 3 สถานะ + map ค่าเก่า + archived→soft-delete

**Advanced indexes (`db/prisma/sql/advanced-indexes.sql`):** partial index `WHERE deleted_at IS NULL`, public-listing index, GIN full-text (`to_tsvector('simple', titles+desc+project)`), trigram (project/lead/customer name), JSONB amenities, geo btree

ดูรายละเอียดทุกตารางใน [16. Database Catalog](#16-database-catalog)

---

## 7. Storage Architecture

```
อัปโหลด (multer, local disk)
 ├─ รูปทรัพย์   → apps/api/uploads/properties/   ── serve STATIC ที่ /uploads/properties/ (public โดยตั้งใจ)
 │                 filter image/*, ≤8MB, รูปแรก=cover, IDOR guard ตอนลบ/setCover
 └─ เอกสาร      → apps/api/uploads/documents/    ── ไม่ serve static
                   filter image/* | application/pdf, ≤15MB
                   ดาวน์โหลดผ่าน GET /documents/:id/download เท่านั้น
                     → scope check + audit('download') + path-traversal guard (normalize+prefix)
                     → StreamableFile

Receipt: render HTML จาก receipt.template → เขียน uploads/documents/*.html
          → สร้าง Document(receipt) + version + link (no-orphan) ในทรานแซกชันเดียว

MinIO/S3 (StorageService): generateKey() ใช้จริง; getUploadUrl/getDownloadUrl = stub
          คืน "minio://..." placeholder — ยังไม่ wire (production Phase 12)
```

**No-orphan rule:** ทุก Document ต้องผูก entity ผ่าน `DocumentLink` (entityType+entityId) — บังคับที่ DTO (`RegisterDocumentDto`) และสร้างพร้อมกันในทรานแซกชัน

**Media URL (frontend):** `mediaUrl(storageKey)` = host เดียวกับที่เปิดเว็บ + `:4000/uploads/<key>` (รูปขึ้นทั้ง localhost และ LAN/มือถือ)

---

## 8. Authentication Architecture

**ไฟล์หลัก:** `modules/auth/{auth,token,password}.service.ts`, `auth.controller.ts`, `common/auth/jwt-auth.guard.ts`, `modules/identity/users.service.ts`

**Token model:**
- **Access token** = JWT (HS256 ใน dev, RS256-ready), อายุ 15 นาที (`JWT_ACCESS_TTL=900s`), payload: `{ sub, email, roles, branchId, teamId }`
- **Refresh token** = opaque random 32-byte hex; เก็บ **sha256 hash** ใน `refresh_tokens`; แต่ละ login = `familyId` ใหม่; ส่งเป็น httpOnly cookie `ros_rt` (path `/api/v1/auth`, sameSite strict, secure ตาม `COOKIE_SECURE`)

**Flow:**
```
LOGIN (POST /auth/login, public, throttle 10/min)
  lockout check (≥5 login_failed ใน 15 นาที จาก audit_logs → ปฏิเสธ)
  → findActiveByEmail → verify scrypt password
  → ข้อความเดียวกันทุกกรณีผิด (no enumeration)
  → sign access + issue refresh(cookie) + touchLastLogin + audit('login')

REQUEST ใด ๆ (JwtAuthGuard)
  @Public() → ผ่าน
  อื่น ๆ → verify access → UsersService.getAuthContext(sub) (cache 30s) → req.user

REFRESH (POST /auth/refresh, public via cookie)
  rotateRefreshToken:
    ไม่เจอ token        → 401
    เจอแต่ revoked แล้ว  → REUSE DETECTED → เพิกถอนทั้ง family → 401
    หมดอายุ            → 401
    ปกติ              → revoke ตัวเก่า + ออกตัวใหม่ใน family เดิม (transaction)

LOGOUT → revoke refresh + audit('logout')
แก้ password / suspend user → เพิกถอน refresh token ทั้งหมดของ user (force re-login)
```

**Frontend (`web-admin/src/lib/auth.tsx`):** access token ใน memory (useRef) · single-flight refresh เมื่อ 401 · restore session ตอนโหลด (เรียก refresh จาก cookie) · idle auto-logout 30 นาที

**Password hashing:** `scrypt` (built-in, รูปแบบ `scrypt$<salt>$<hash>`) ทั้ง seed และ `PasswordService` (เอกสารระบุ Argon2id เป็นเป้าหมายอนาคต แต่โค้ดยังเป็น scrypt)

**ไม่มี:** self-service register, forgot-password (admin reset เท่านั้น), OAuth/social login

---

## 9. Authorization Architecture

**RBAC 2 ชั้น:**

```
ชั้น 1 — PermissionsGuard (route level)
  @RequirePermission('property','read') → user มี permission resource:action (scope ใดก็ได้) ไหม?
  ไม่มี → 403

ชั้น 2 — Scope (service/repository level)
  resolveScope(user,resource,action) → คืน scope กว้างสุด (own<team<branch<all)
  scopeWhere(user,scope) → สร้าง Prisma where:
     all    → { deletedAt: null }
     branch → { branchId: user.branchId }  (ถ้า branchId=null → NEVER_MATCH กัน null-leak)
     team   → { assignedTo: { teamId } } / { agent: { teamId } }
     own    → { assignedToId / agentId / createdBy: user.id }
```

**Permission model:** `Permission(resource, action, scope)` — seed สร้างทุก (resource × action × ทุก scope) แล้ว grant ให้ role ตาม `role.scope` เดียว (`db/seed/roles-permissions.ts`)

**Role Matrix (7 บทบาท, isSystem=true):**
| Role | scope | สิทธิ์โดยสรุป |
|---|---|---|
| `super_admin` | all | ทุก resource ทุก action (เห็น audit ของ admin, ล้าง activity feed ได้) |
| `company_admin` | all | เกือบทุกอย่าง; `role` = read เท่านั้น |
| `branch_manager` | branch | บริหารทรัพย์/ทีมในสาขา; audit/dashboard = read |
| `team_lead` | team | approve/reject ทรัพย์, assign lead, sign สัญญา, verify เอกสาร |
| `sales_agent` | branch | สร้าง/แก้ทรัพย์·lead·นัด·สัญญา (ไม่ approve); assign (รับ lead เอง) |
| `back_office` | branch | เน้นเอกสาร+สัญญา (verify doc); ทรัพย์/lead = read |
| `auditor` | all | read-only ทุกอย่าง + audit:read/export |

**Resource:action catalog:** property(create/read/update/delete/approve/reject/change_status), lead(+assign/change_status/convert), contract(+change_status/sign), document(+upload/download/verify), owner/customer/user/role/branch/team(CRUD), appointment(+change_status), notification(read), activity(read), audit(read/export), dashboard(read), setting(read/update)

**Privilege-escalation guard (`user.service.ts`):** `ROLE_RANK` — ผู้กระทำกำหนด/ลบได้เฉพาะบทบาทที่ **ต่ำกว่า** ตน (ยกเว้น super_admin); ห้ามแก้บทบาทตัวเอง; ห้ามลบ super_admin/ตัวเอง

**Role-gated (ไม่ผ่าน permission):** Community moderation — เช็ค `user.roles` ตรง ๆ ว่าอยู่ใน `['super_admin','company_admin','branch_manager']`

---

## 10. Feature Matrix

| Feature | Entry (FE) | API | Tables | Permission | Logic เด่น |
|---|---|---|---|---|---|
| Auth | `/login` | `/auth/{login,refresh,logout,me}` | users, refresh_tokens, audit_logs | public | lockout, no-enum, rotation+reuse |
| Property | `/properties` | `/properties` CRUD+media+lifecycle | properties, property_media, property_status_history | `property:*` | code CD/HS/TH/AP-YYYY-0001, draft→available→rented |
| Owner | `/owners` | `/owners` CRUD | owners | `owner:*` | idCard เข้ารหัส+mask, deletion-guard |
| Lead | `/leads` | `/leads` +assign/status/convert | leads, lead_interests, customers | `lead:*` | new→working→closed, convert→Customer |
| Appointment | `/appointments`, `/calendar` | `/appointments` +reschedule/cancel/no-show/complete | appointments | `appointment:*` | upcoming→done/cancelled, no-overlap (JS+DB) |
| Contract | `/contracts` | `/contracts` +sign/status/renew/receipt/terms | contracts, contract_terms, documents | `contract:*` | draft→active→ended, sign ต้องมี lease verified, sync ทรัพย์ |
| Document | inline ในแต่ละ entity | `/documents*`, `/entities/:type/:id/documents` | documents, document_versions, document_links | `document:*` | no-orphan, versioned, download/print→audit |
| Notification | `/notifications` + Bell | `/notifications` +read/read-all/preferences | notifications, notification_preferences | `notification:read` | in_app เท่านั้น (line/email stub) |
| Public site | web-public | `/public/properties*`, `/public/leads`, `/public/community` | properties, leads, community_posts | `@Public()` + throttle | smart search, similar ranking, view count |
| Community | `/community` (mod) + เว็บ | `/public/community`, `/community/:id/{approve,reject,archive}` | community_posts | role-gated | anonymous, banned-words, pending→published |
| Audit/Activity | `/audit` | `/audit-logs`, `/audit-logs/feed`, `/actions` | audit_logs | `audit:read` / `activity:read` | super_admin เห็น action ของ admin, feed มี/ไม่มี detail ตามสิทธิ์ |
| Users/RBAC | `/users` | `/users` CRUD +assignable/roles | users, roles, user_roles | `user:*` | privilege-escalation guard, revoke tokens เมื่อ reset/suspend |
| Global search | header | `/search` | property/lead/customer/owner | login + per-resource scope | min 2 ตัว, scope-filtered |
| Settings | `/settings` | `/settings`, `PATCH /settings/:key` | settings | `setting:*` | JSON value |
| Scheduler | background | — | contracts, appointments, notifications | — | setInterval 30 นาที |

---

## 11. Route Map

### Backend (NestJS, prefix `/api/v1`)
**Public (`@Public()`):**
```
GET  /health                         liveness
GET  /health/db                      readiness (SELECT 1)
POST /auth/login                     throttle 10/min
POST /auth/refresh                   (cookie)
POST /auth/logout                    (cookie)
GET  /public/properties              throttle 60/min  — search
GET  /public/properties/:code        detail (+เพิ่ม view_count)
GET  /public/properties/:code/similar  throttle 60/min — ranking
GET  /public/master-data             province/type/amenity/furnished
POST /public/leads                   throttle 5/min   — ฟอร์มนัด
POST /public/contact                 throttle 5/min   — = createLead
GET  /public/community               list published
POST /public/community               throttle 5/min   — โพสต์ (pending)
```
**Protected (JWT global):**
```
GET   /auth/me                       (แค่ login)
GET   /auth/permissions              user:read
properties:   POST / · GET / · GET /:id · GET /:id/activities · PATCH /:id · DELETE /:id
              POST /:id/media · DELETE /:id/media/:mediaId · POST /:id/media/:mediaId/cover
              POST /:id/submit-review · POST /:id/approve · POST /:id/reject · PATCH /:id/status
owners:       POST / · GET / · GET /:id · PATCH /:id · DELETE /:id
leads:        POST / · GET / · GET /:id · GET /:id/activities · PATCH /:id
              POST /:id/assign · PATCH /:id/status · POST /:id/convert · DELETE /:id
appointments: POST / · GET / · GET /:id · POST /:id/{reschedule,cancel,no-show,complete}
contracts:    POST / · GET / · GET /:id · DELETE /:id · POST /:id/sign · PATCH /:id/status
              POST /:id/renew · POST /:id/receipt · GET/POST /:id/terms · DELETE /:id/terms/:termId
documents:    POST /documents · POST /documents/upload · GET /entities/:type/:id/documents
              GET /documents/:id · GET /documents/:id/download · POST /documents/:id/versions
              POST /documents/:id/{verify,print,archive} · DELETE /documents/:id
notifications:GET / · GET/PATCH /preferences · PATCH /read-all · PATCH /:id/read
users:        GET / · GET /assignable · GET /roles · POST / · PATCH /:id · DELETE /:id
customers:    GET / · GET /:id · PATCH /:id · DELETE /:id
settings:     GET / · PATCH /:key
audit-logs:   GET / · GET /feed · DELETE /feed (super_admin) · GET /actions
search:       GET /
community:    GET / · PATCH /:id/{approve,reject,archive}   (role-gated)
```

### Frontend web-admin (`(app)` = authed)
`/login` · `/` · `/owners` `/owners/[id]` · `/properties` `/properties/new` `/properties/[id]` `/properties/[id]/edit` · `/leads` · `/appointments` · `/calendar` · `/customers` `/customers/[id]` · `/contracts` `/contracts/[id]` · `/notifications` · `/audit` · `/users` · `/settings` · `/community`

### Frontend web-public
`/` · `/properties` · `/properties/[code]` · `/privacy` · `/api/revalidate` (webhook)

**ความต่าง id vs code:** admin route ใช้ **UUID** (`[id]`) · public route ใช้ **code** (`[code]` เช่น CD-2026-0001 — ไม่เผย UUID, SEO-friendly)

---

## 12. Screen Map

### web-admin
```
/login              การ์ดกลางจอ + show/hide password
/ (dashboard)       KPI 4 ตัว (ทรัพย์ว่าง/Lead กำลังดูแล/นัดรอพบ/สัญญามีผล) + "สิ่งที่ต้องทำ" (Segmented today/7d/30d)
/owners             List(Avatar+ค้นหา+sort) → Modal สร้าง
/owners/[id]        Detail: ติดต่อ(edit inline) · ทรัพย์ · สัญญา · ข้อมูลเพิ่มเติม(idCard/address/note)
/properties         List(thumbnail+filter status/type/province+sort) → Modal PropertyForm(create)
/properties/new     PropertyForm(create) เต็มหน้า
/properties/[id]    Detail: gallery+lightbox · lifecycle actions(เผยแพร่/ถอน/ลบ/ดาว) · groups(ห้อง/ราคา/ทำเล)
                     · เจ้าของ(กดเข้า) · DocumentSection · ActivityTimeline · Modal edit
/properties/[id]/edit  PropertyForm(edit)
/leads              List → Modal detail(รับ/เริ่มดูแล/แปลงลูกค้า/ปิด/ลบ + ทรัพย์ที่สนใจ) + Modal create(walk-in)
/appointments       List → Modal detail(พบแล้ว/ยกเลิก) + Modal create(Segmented นัดดูทรัพย์/นัดนอกรอบ)
/calendar           ปฏิทินเดือน grid + day detail + Modal เพิ่มนัดนอกรอบ
/customers          List → /customers/[id]: ติดต่อ(edit) + สัญญา + DocumentSection + ลบถ้าไม่มีสัญญา
/contracts          List → /contracts/[id]: actions(sign/renew/receipt/close) + การเงิน/ระยะเวลา + terms + DocumentSection
/notifications      ฟีด + CategoryBar(IG-style ปัดได้) + อ่านทั้งหมด
/audit              ฟีดกิจกรรม(poll 10s) + expandable diff(ค่าเดิม→ใหม่ + IP) + filter action/range
/users              List → Modal create + Modal จัดการ(role/status/reset pw/ลบ)
/settings           ฟอร์มบริษัท + แสดง consent/retention (read-only)
/community          Moderation: Segmented(pending/published/archived/rejected) + approve/reject/archive (poll 20s)
```

### web-public
```
/                  hero + SearchBar(overlap) + type shortcuts + FeaturedCarousel ×4 (featured/BTS/MRT/pet) + CommunityBoard
/properties        ผลค้นหา (SSR จาก searchParams) + SearchBar(compact) + grid PropertyCard
/properties/[code] detail (SSR+generateMetadata): PropertyGallery+Lightbox · SpecStrip/Amenity/ReadMore
                     · AppointmentForm(sticky) · similar carousel · StickyCTA(mobile)
/privacy           PDPA policy (static)
```

---

## 13. Component Hierarchy

### web-admin
```
RootLayout (app/layout.tsx)
└ AuthProvider
  └ (app)/layout.tsx
     ToastProvider
       ├ aside rail (mouse: เท่านั้น) — NavLinks(can-gated)
       ├ header — QuickAddProperty(+) · GlobalSearch · NotificationBell · ProfileMenu
       ├ main → PullToRefresh → {page}
       ├ bottom-nav (touch: 5 ช่อง IG-style)
       └ profile drawer (มือถือ)
{page} ใช้ primitives จาก components/ui.tsx:
  PageHeader · FilterBar(→Modal+Combobox) · ListView(table↔cards auto) · Pagination ·
  Modal · ConfirmDialog · Field/SelectField/Combobox · StatusBadge · Avatar · PhoneLink ·
  Segmented · SectionLabel · ProgressBar/Spinner/ListSkeleton/EmptyState
detail components:
  PropertyForm(4-step wizard) · DocumentSection · ActivityTimeline · Lightbox · Toast · Icon
```

**ui.tsx — components สำคัญ:**
- `ListView<T>` — responsive: desktop = `<table>`, mobile = การ์ด (อัตโนมัติ) ขับด้วย flag `Col.primary/sub/right`
- `FilterBar` — ช่องค้นหา inline + ตัวกรอง/sort ซ่อนหลังปุ่มเดียว (เปิดเป็น Modal)
- `Combobox` — dropdown พิมพ์ค้นหา + เมนู fixed-position (flip ขึ้นถ้าที่ล่างไม่พอ)
- `Modal` — กลางจอ, `max-h-90dvh`, header/footer ตรึง, body เลื่อน (กันคีย์บอร์ดมือถือกิน)
- `ConfirmDialog` — ยืนยันมาตรฐาน (danger tone + withReason)

### web-public
```
RootLayout (app/layout.tsx)
└ LanguageProvider
   ├ Header (LangToggle + ติดต่อ LINE)
   ├ PullToRefresh → {page}
   └ Footer
{page} ใช้:
  SearchBar (→ PriceRange dual-thumb slider + ProvinceCombobox 77 จังหวัด)
  FeaturedCarousel → PropertyCard (CardImages + useSwipe)
  PropertyGallery (+ Lightbox ซูม/ลาก/wheel)
  AppointmentForm · CommunityBoard · StickyCTA
  T / MetaLine / SpecStrip / AmenityBadges / PriceMonthly / ResultCount (i18n helpers)
  Localized · ReadMore · loaders (Spinner/Skeleton/CardGridSkeleton)
```

---

## 14. State Management

| กลไก | ที่ตั้ง | Source of truth |
|---|---|---|
| React Context | `AuthProvider`(admin) · `LanguageProvider`(public) · `ToastProvider` | server / localStorage |
| useState/useRef | ทุกหน้า | local |
| **Access token** | `tokenRef` (useRef, in-memory) | server JWT |
| **Refresh token** | httpOnly cookie `ros_rt` | DB `refresh_tokens` |
| localStorage | `lang` (public) | client pref |
| `useList` | admin lists | server (poll + `app:refresh` event) |
| `useLookup` | admin dropdowns | server (lazy on open) |
| Server cache (ISR) | web-public | Next Full Route Cache + tag `public-properties` (invalidate ผ่าน webhook) |
| Server-side cache | `UsersService.authCache` (Map, TTL 30s, `invalidateAuth()` เมื่อแก้ role/status) | DB |

**State flow สำคัญ — single-flight refresh (`auth.tsx`):** หลาย request เจอ 401 พร้อมกัน → `refreshing` ref รวมเป็น refresh ครั้งเดียว → กัน server มองเป็น token reuse แล้วเพิกถอนทั้ง family (เคยเป็น root cause ของอาการ "ข้อมูลไม่ persist" ที่แก้แล้ว)

**ไม่มี:** Redux/Zustand/MobX/React Query/SWR — ใช้ Context + hook ภายในล้วน

---

## 15. API Catalog

**Envelope ทุก response:**
- success: `{ data, meta: { request_id, ...pagination } }`
- list: controller คืน `{ items, total, page, limit, totalPages }` → interceptor map เป็น `{ data: items, meta: {...} }`
- error: `{ error: { code, message, request_id, timestamp, details? } }` (ไม่รั่ว stack)
- Prisma error map: P2025→404 NOT_FOUND, P2002→409 CONFLICT, P2003→400 BAD_REQUEST

**Endpoint สำคัญ (method · auth · logic):**

| Endpoint | Auth | Logic flow |
|---|---|---|
| `POST /auth/login` | public, 10/min | lockout → verify scrypt → sign access + issue refresh cookie → audit |
| `POST /auth/refresh` | cookie | rotate (revoke old + new in family; reuse→revoke family) |
| `POST /properties` | property:create | gen code (retry P2002) → create draft → activity+audit |
| `GET /properties` | property:read | scope filter + smart search + pagination (include cover media) |
| `POST /properties/:id/approve` | property:approve | draft→available + publishedAt + history(atomic) → notify assignee → revalidate |
| `POST /properties/:id/submit-review` | property:change_status | (สำหรับคนไม่มีสิทธิ์ approve) ไม่เปลี่ยนสถานะ แค่ notify หัวหน้า |
| `PATCH /properties/:id/status` | property:change_status | `canTransition` check → update+history → revalidate |
| `POST /leads` (+`/public/leads`) | lead:create / public | gen code, public ใส่ consent → notify roles |
| `POST /leads/:id/convert` | lead:convert | สร้าง Customer + ปิด lead (closed) atomic |
| `POST /appointments` | appointment:create | future-time check · viewing(lead+property in-scope) / general(title) · assertAgent · no-overlap(JS) → create (DB EXCLUDE กันอีกชั้น) · ดัน lead new→working |
| `POST /contracts` | contract:create | date check · property in-scope+available · ไม่มี live contract · assert customer/owner/agent → create draft |
| `POST /contracts/:id/sign` | contract:sign | draft→active · ไม่มี occupying contract · **ต้องมี lease doc verified/active** → sync property→rented |
| `POST /contracts/:id/renew` | contract:create | สร้างฉบับใหม่(draft, renewedFrom) + ปิดเดิม(ended) atomic |
| `POST /contracts/:id/receipt` | contract:update | render HTML → Document(receipt)+version+link no-orphan |
| `GET /documents/:id/download` | document:download | scope check → audit('download') → stream (path-traversal guard) |
| `GET /search` | login + per-resource scope | min 2 ตัว, ค้น property/lead/customer/owner (เฉพาะ resource ที่มีสิทธิ์ read) |
| `GET /audit-logs/feed` | activity:read | ฟีดทีม; detail (diff+IP) เฉพาะผู้มี audit:read; non-super ไม่เห็น action ของ super_admin |
| `DELETE /audit-logs/feed` | audit:read + **super_admin only** | ล้าง activity feed |

**API consumer map:** web-admin (authed) ↔ ทุก protected endpoint · web-public SSR (`API_BASE_INTERNAL`) + client forms ↔ `/public/*` · web-public webhook `/api/revalidate` ← API RevalidationService

---

## 16. Database Catalog

ทุกตารางมี audit columns (`created_at/by`, `updated_at/by` ตามที่ระบุ) + `deleted_at/by` (soft delete) เว้นแต่ระบุ "immutable/append-only"

### Identity & Access (7)
| Table | PK/Keys | คอลัมน์เด่น | หมายเหตุ |
|---|---|---|---|
| `branches` | id | code(unique), name, is_active | tenant root |
| `teams` | id | branch_id→branches(Restrict), lead_user_id→users(SetNull) | |
| `users` | id | email(citext,unique), phone, full_name, password_hash, status(user_status), locale, team_id, branch_id, last_login_at | |
| `refresh_tokens` | id | user_id→users(Cascade), token_hash(unique sha256), family_id, expires_at, revoked_at, ip_address(inet), user_agent | ไม่มี soft delete |
| `roles` | id | name(unique), description, is_system | |
| `permissions` | id | (resource,action,scope)unique, scope(permission_scope) | |
| `role_permissions` | (role_id,permission_id) | Cascade ทั้งคู่ | join |
| `user_roles` | (user_id,role_id) | Cascade ทั้งคู่ | join |

### Owner / Property (4)
| Table | คอลัมน์เด่น |
|---|---|
| `owners` | full_name, phone, email, **id_card_no(ciphertext)**, address, note, branch_id |
| `properties` | code(unique), owner_id→owners(Restrict), assigned_to→users(SetNull), property_type, status(property_status), title_th/en, description_th/en, address/province/district/subdistrict/project_name, latitude/longitude, monthly_rent(Dec 12,2), deposit_months, bedrooms, bathrooms, area_sqm, floor, furnished, amenities(JsonB), **is_featured**, **view_count**, published_at, branch_id |
| `property_media` | property_id→properties(Cascade), storage_key, media_type, sort_order, is_cover |
| `property_status_history` | property_id→properties(Restrict), from_status, to_status, reason, changed_by, changed_at |

### Lead / Customer (3)
| Table | คอลัมน์เด่น |
|---|---|
| `leads` | code(unique), full_name, phone, email, source(lead_source), status(lead_status), assigned_to→users(SetNull), customer_id→customers(SetNull), lost_reason, message, preferred_view_at, **consent_at, consent_version** (PDPA), branch_id |
| `lead_interests` | (lead_id,property_id) Cascade — ทรัพย์ที่ lead สนใจ |
| `customers` | full_name, phone, email, **id_card_no(ciphertext)**, address, branch_id |

### Appointment / Contract (3)
| Table | คอลัมน์เด่น |
|---|---|
| `appointments` | code(unique), lead_id?→leads(Restrict), property_id?→properties(Restrict), agent_id→users(Restrict), status(appointment_status), title?, scheduled_at, duration_min, location, note, cancel_reason, branch_id; **ends_at + EXCLUDE no-overlap (DB-managed)** |
| `contracts` | code(unique), property_id/owner_id/customer_id/agent_id (Restrict), status(contract_status), start_date/end_date(Date), monthly_rent, deposit_amount, commission_amount, signed_at, renewed_from_id(self,SetNull), terminated_reason, branch_id |
| `contract_terms` | contract_id→contracts(Cascade), term_key, term_value |

### Document (3)
| Table | คอลัมน์เด่น |
|---|---|
| `documents` | document_type(doc_type), name, status(doc_status), current_version_id(unique→DocumentVersion,SetNull), verified_by, verified_at, branch_id |
| `document_versions` | document_id→documents(Cascade), version_no, storage_key, file_size(BigInt), mime_type, checksum; (document_id,version_no)unique |
| `document_links` | document_id→documents(Cascade), entity_type(entity_type), entity_id; (document_id,entity_type,entity_id)unique — **polymorphic, no-orphan** |

### Notification / Trail / Settings (8)
| Table | คอลัมน์เด่น | หมายเหตุ |
|---|---|---|
| `notifications` | recipient_user_id?→users(Cascade), recipient_line_id?, channel(notification_channel), category(notification_category), title, body, entity_type?, entity_id?, status(notification_status), read_at | ไม่มี soft delete |
| `notification_preferences` | user_id→users(Cascade), (user_id,category,channel)unique, is_enabled | |
| `activity_logs` | entity_type, entity_id, action, actor_id, summary, metadata(JsonB), created_at | append-only, logical FK |
| `audit_logs` | actor_id, actor_role, action, entity_type?, entity_id?, old_value/new_value(JsonB), ip_address(inet), user_agent, branch_id, created_at | **immutable (trigger)**, logical FK |
| `settings` | key(unique), value(JsonB), scope | |
| `master_data` | (category,code)unique, label_th/en, sort_order, is_active | dropdown lookup |
| `translations` | (namespace,key,locale)unique, value | i18n |
| `community_posts` | category(community_category), body, display_name(สุ่ม), status(community_status), author_ip(inet), reviewed_by, reviewed_at, published_at | anonymous board |

### Enums (18)
`user_status`(active/suspended/invited) · `property_type`(condo/house/townhome/apartment) · `property_status`(draft/available/rented) · `furnished`(fully/partial/unfurnished) · `media_type`(image/video/floor_plan) · `lead_source`(public_web/walk_in/phone/referral) · `lead_status`(new/working/closed) · `appointment_status`(upcoming/done/cancelled) · `contract_status`(draft/active/ended) · `doc_type`(8 ค่า) · `doc_status`(uploaded/verified/active/archived) · `entity_type`(property/owner/customer/lead/contract/appointment/company) · `notification_channel`(line/email/in_app) · `notification_category`(lead/appointment/property/contract/system) · `notification_status`(queued/delivered/read/failed) · `permission_scope`(own/team/branch/all) · `community_category`(5) · `community_status`(pending/published/archived/rejected)

**Master data ที่ seed:** property_type(4), furnished(3), amenity(14), doc_type(8), province(12 จาก 77)
**Settings ที่ seed:** company.name/contact/locales, privacy.consent_version, retention.policy, lifecycle.property

---

## 17. Event Flow

```
USER EVENT (login/CRUD/lifecycle)
  → AuditService.record() [immutable] + ActivityService.log() [best-effort timeline]

PUBLIC LEAD (POST /public/leads จากฟอร์มเว็บ)
  → create lead(public_web, consent) → activityLog → notifyRoles(sales_agent..super_admin)

COMMUNITY POST (POST /public/community)
  → banned-words/spam filter → status=pending → notifyRoles(mod) → admin approve → published

PROPERTY publish/status / CONTRACT sign/status
  → update DB → RevalidationService.revalidatePublicProperties(code)
     → POST /api/revalidate (web-public) → revalidateTag + revalidatePath → ISR cache อัปเดตทันที

NOTIFICATION (cross-module notify())
  → เคารพ NotificationPreference → in_app เก็บ DB(delivered) | line/email = log stub(queued)
  → notifyRoles: ดึง user+pref คิวรีเดียว → createMany (กัน N+1)

LEAD lifecycle side-effect
  → create appointment(viewing) → ดัน lead new→working
  → convert → สร้าง customer + lead closed

FE near-realtime
  → useList pollMs (silent) · audit feed poll 10s · community poll 20s · NotificationBell poll 30s
  → pull-to-refresh → window event 'app:refresh'
```

**ไม่มี:** message queue, inbound webhook จาก 3rd party, WebSocket จริง (near-realtime = polling)

---

## 18. Background Jobs

**SchedulerService (`modules/scheduler/scheduler.service.ts`)** — `setInterval` ในตัว (ไม่พึ่ง external; เหมาะ VPS เดียว)
- เริ่มหลังบูต 30 วินาที แล้วทุก `SCHEDULER_INTERVAL_MS` (default 30 นาที); ไม่รันใน `NODE_ENV=test`; กันรอบซ้อนด้วย `running` flag; `unref()` ไม่บล็อก process exit
- **`flagExpiringContracts`** — สัญญา active ที่ `end_date ≤ now+30วัน` → notify agent (กันเตือนซ้ำด้วยการนับ notification เดิมในกรอบ 30 วัน) — ไม่เปลี่ยนสถานะ ("ใกล้ครบ" เป็นป้ายคำนวณ)
- **`remindUpcomingAppointments`** — นัด upcoming ที่จะถึงใน 24 ชม. → notify agent (กันเตือนซ้ำ)
- Pure logic แยกใน `scheduler.logic.ts` (`isContractExpiring`, `isWithinReminderWindow`) + unit test

**ข้อจำกัด scale:** in-process — หลาย instance ต้อง distributed lock/queue (comment ในโค้ดยอมรับ)

---

## 19. Third Party Services

| Service | สถานะในโค้ด | จุดเชื่อม |
|---|---|---|
| **PostgreSQL** | ✅ ใช้งานจริง | Prisma (PrismaService) |
| **MinIO / S3** | 🟡 stub | `StorageService` คืน `minio://...` placeholder; ไฟล์จริงอยู่ local disk |
| **Redis** | 🟡 เตรียมใน docker-compose | ไม่มี client ในโค้ด (refresh token เก็บ Postgres แทน) |
| **LINE** | 🟡 stub | `notification_channel='line'`, `recipient_line_id` มีใน schema; NotificationService log แทนการส่ง; web-public/footer ลิงก์ `https://line.me` (placeholder) |
| **Email (SMTP)** | 🟡 stub | `notification_channel='email'`; log แทนการส่ง |
| **Cloudflare** | 📄 เอกสารเท่านั้น | ไม่มีในโค้ด |
| **Google Fonts** | ✅ | `<link>` IBM Plex Sans Thai + Inter ใน root layout ทั้งสองแอป |
| Analytics/Monitoring | ❌ | ไม่มี (มีแค่ /health, /health/db) |

**ไม่มี:** Firebase, Supabase, AWS SDK, Cloudinary, Stripe/PayPal, OAuth providers

---

## 20. Deployment Architecture

**Dev (จริง — control scripts `ควบคุมระบบ/`):**
- DB = **Postgres.app** บนเครื่อง (ไม่ใช่ docker), socket `/tmp`
- `เปิดระบบ.command` — ซิงค์ LAN IP ลง `.env.local` + CORS อัตโนมัติ → start API(4000)/web-public(3000)/web-admin(3001) แบบ background → เก็บ pid/log ใน `.run/` → เปิดเบราว์เซอร์
- `ปิดระบบ.command` (หยุด services), `รีเซ็ทระบบ.command` (ล้างข้อมูล+เริ่มใหม่)
- รองรับทดสอบบนมือถือ/แท็บเล็ตผ่าน WiFi เดียวกัน (`http://<LAN_IP>:3000/3001`)

**Infra (เตรียม prod — `infra/docker/docker-compose.yml`):**
- `postgres:16-alpine` (ใช้), `redis:7-alpine` + `minio` (เตรียม Phase 12), healthcheck ครบ, volumes persist
- เป้าหมาย: Single VPS + Docker Compose (+ Caddy/Cloudflare ใน Phase 12 ตามเอกสาร)

**Build/run:** API `nest build` → `node dist/main.js` · Next `next build`/`next start` · DB `prisma migrate deploy` (prod) + `prisma migrate dev` (dev)

```
[dev]    Postgres.app ── API(4000) ── web-public(3000) + web-admin(3001)   ← เปิดระบบ.command
[prod]   docker compose: postgres (+redis+minio) — API — 2 web — caddy(Phase12)
```

---

## 21. Environment Variables

**API (`config/env.validation.ts` — Zod, fail-fast ตอนบูต):**
| Var | Default | หมายเหตุ |
|---|---|---|
| `NODE_ENV` | development | enum dev/staging/production/test |
| `PORT` | 4000 | |
| `DATABASE_URL` | — | postgresql:// (required) |
| `CORS_ORIGINS` | localhost:3000,3001 | allowlist (prod ห้าม localhost) |
| `JWT_ACCESS_SECRET` | dev default | prod ห้ามใช้ค่า default |
| `JWT_REFRESH_SECRET` | dev default | prod ห้ามใช้ค่า default |
| `JWT_ACCESS_TTL` | 900s | |
| `JWT_REFRESH_TTL_DAYS` | 7 | |
| `COOKIE_SECURE` | false | prod ต้อง true |
| `PII_ENCRYPTION_KEY` | (dev fallback) | prod ต้อง hex 64 ตัว (`openssl rand -hex 32`) |
| `WEB_PUBLIC_REVALIDATE_URL` | localhost:3000/api/revalidate | |
| `REVALIDATE_SECRET` | dev_revalidate_secret | |
| `SCHEDULER_INTERVAL_MS` | 1800000 (30 นาที) | |
| `SEED_ADMIN_EMAIL/PASSWORD` | admin@ros.local / ChangeMe!2026 | seed only |

> **superRefine:** production บังคับ secret แข็งแรง, COOKIE_SECURE=true, ไม่มี localhost ใน CORS, PII key hex 64 — ไม่ผ่าน = แอปไม่บูต

**web-public (`next.config.js`):** `NEXT_PUBLIC_API_BASE` (client), `API_BASE_INTERNAL` (SSR), `REVALIDATE_SECRET` (ตรวจ webhook)
**web-admin:** `NEXT_PUBLIC_API_BASE` (fallback; runtime ใช้ `window.location.hostname:4000`)
**docker-compose:** `POSTGRES_USER/PASSWORD/DB`, `REDIS_PASSWORD`, `MINIO_ROOT_USER/PASSWORD`

---

## 22. Configuration Architecture

**Design tokens (`tailwind.config.ts` — เหมือนกันทั้ง 2 แอป):**
| Token | ค่า |
|---|---|
| `ink`/`ink-soft` | #1A1A1A / #44403C |
| `gold`/`gold-dark`/`gold-light` | #B89968 / #A07F4F / #C4A35A |
| `surface`/`canvas`/`border` | #FDFDFC / #FAFAF9 / #E7E5E2 |
| `muted`/`faint` | #78716C / #A8A29E |
| `success/warning/danger/info` | #2E7D5B / #B7791F / #B4413C / #3B6E8F |
| font | IBM Plex Sans Thai + Inter |
| radius | card 12px · xl2 16px |
| shadow | card (เบา) · lift (ยก) |

**Tailwind plugin (web-admin):** variant `mouse:` / `touch:` สลับ shell (ดู [4.1](#41-web-admin-client-side-rendering))
**globals.css:** `.btn`(h-44) + variants + `.btn-sm`(h-36) · `.card` · `.badge` · `.field`(text-16px กัน iOS zoom) · `.seg*` · focus-visible ring ทอง (a11y)

**Build config:** `nest-cli.json` (deleteOutDir), `tsconfig.base.json` (root), per-package tsconfig, `jest.config.js` (api), `postcss.config.js`

**Workspaces (`package.json` root):** `apps/*`, `packages/*` (ไม่มีจริง), `db` · Node `>=20` · scripts: `db:generate/migrate/seed/studio`, `api:dev/build`

---

## 23. Testing Architecture

**กรอบ:** Jest (api เท่านั้น). กลยุทธ์ = แยก "pure logic" ออกจาก service เพื่อทดสอบโดยไม่พึ่ง DB

**Unit tests (`*.spec.ts`):**
- `common/auth/permissions.spec.ts` — resolveScope
- `common/crypto/crypto.service.spec.ts` — encrypt/decrypt/mask
- `common/guards/deletion-guard.spec.ts`
- `modules/property/property.lifecycle.spec.ts` + `property.scope.spec.ts`
- `modules/contract/contract.lifecycle.spec.ts` + `receipt.template.spec.ts`
- `modules/scheduler/scheduler.logic.spec.ts`

**ครอบคลุม:** state machines, scope resolution, crypto, deletion guard, scheduler logic, receipt template (README ระบุ "22 tests ผ่าน")
**ไม่มี:** integration/E2E test (มี `supertest` ใน devDeps แต่ไม่พบไฟล์), factories/fixtures, frontend test

---

## 24. Documentation Analysis

เปรียบเทียบเอกสารกับ source จริง (delta ที่ควรรู้):

| เอกสารบอก | โค้ดจริง |
|---|---|
| README: "Phase 11 — Production Database" | โค้ดเลย Phase 11 ไปไกล (backend ครบ + 2 frontend + Community Phase 14) |
| README อ้าง `docs/` และ `packages/` | **ไม่มีอยู่จริง** |
| `db/README`: 27 ตาราง / 16 enums | จริง **29 ตาราง / 18 enums** (เพิ่ม refresh_tokens, community_posts + 2 community enums) |
| PasswordService comment: Argon2id เป็นหลัก | โค้ดใช้ **scrypt** ทั้งหมด (Argon2 = เป้าหมายอนาคต) |
| README: manual SQL อยู่ `migrations/manual/` | จริงอยู่ `prisma/sql/` + ฝังเข้า migration 0004/0006 แล้ว (`audit-immutable.sql` มีหมายเหตุ "SUPERSEDED") |
| seed `lifecycle.property` = 8 สถานะเก่า | enum จริงเหลือ 3 (migration 0007); setting นี้ค้างค่าเก่า — **FE ไม่ได้ใช้** (ใช้ `lib/status.ts` ของตัวเอง) |
| README: Redis/MinIO Phase 12 | สอดคล้อง — ยังไม่ wire |
| `apps/api/README` (Auth/Property tables) | ตรงกับโค้ด ✓ |

**เอกสารในโปรเจกต์:** `README.md`(root), `apps/api/README.md`, `db/README.md`, `UX-UI-AUDIT.md`, `ควบคุมระบบ/อ่านก่อน.txt` (คู่มือ operator ภาษาไทย)

---

## 25. Known Facts

**Source-of-truth ที่ยืนยันจากโค้ด:**
1. Monorepo npm workspaces; 4 workspace (api, web-admin, web-public, db); `packages/` ไม่มีจริง
2. Backend = NestJS modular monolith, ~20 module, prefix `/api/v1`, port 4000
3. Frontend = Next.js 14 App Router ×2 (admin CSR port 3001, public SSR/ISR port 3000)
4. DB = PostgreSQL 16 + Prisma 5.22; 29 ตาราง, 18 enums; UUID v7 PK; soft delete + audit columns + multi-branch ทุกตาราง
5. RBAC 2 ชั้น: `resource:action` (guard) + scope own/team/branch/all (service); 7 system roles
6. 3-state lifecycle: Property(draft/available/rented), Lead(new/working/closed), Appointment(upcoming/done/cancelled), Contract(draft/active/ended); Document(uploaded/verified/active/archived); Community(pending/published/archived/rejected)
7. Auth: JWT HS256 access 15 นาที + opaque refresh (hash ใน Postgres) + rotation + reuse detection; cookie `ros_rt`; lockout 5/15นาที; no-enumeration; scrypt password
8. PII (`id_card_no`) เข้ารหัส AES-256-GCM ที่ app layer, แสดงเป็น mask (`••••1234`)
9. PDPA consent บังคับใน public lead form (`@Equals(true)`)
10. Storage: local disk (multer); รูปทรัพย์ static, เอกสาร stream แบบ authed + audit; MinIO stub
11. Notification in-app เก็บ DB; LINE/email = log stub; เคารพ preference
12. Scheduler `setInterval` 30 นาที (in-process): เตือนสัญญาใกล้หมด + นัดล่วงหน้า 24 ชม.
13. Public site ใช้ ISR (revalidate 300) + on-demand revalidation webhook (tag `public-properties`)
14. Smart search ใช้ร่วม admin+public (คำพ้องประเภท/จังหวัด/amenity); public เห็นเฉพาะ `available`
15. PAGE_SIZE = 8 ทุกตาราง; responsive shell switch (mouse/touch); design tokens ink+gold
16. Code format: `CD/HS/TH/AP-YYYY-0001`(property), `LD-`(lead), `APT-`(appointment), `CT-`(contract), `RC-`(receipt)
17. dual trail: AuditLog (immutable, DB trigger) + ActivityLog (best-effort timeline)
18. deletion-guard ที่ app layer (เพราะ FK Restrict ไม่ยิงกับ soft delete)
19. ไม่มี: Redux/RQ/SWR, message queue, WebSocket, OAuth/social login, self-service register/forgot-password, E2E test
20. Default admin: `admin@ros.local` / `ChangeMe!2026` (เปลี่ยนทันทีหลัง deploy)

---

## 26. Unknown Areas

ความไม่ชัด **เชิงโค้ด = หมดแล้ว** (อ่านครบ 100%) เหลือเฉพาะการตัดสินใจ runtime/ops ที่ต้องยืนยันจากเจ้าของระบบ:

1. **MinIO/Redis** — เมื่อใดจะ wire จริง? ปัจจุบันไฟล์อยู่ local disk ของ API, refresh token อยู่ Postgres (ไม่ใช่ Redis), `StorageService` เป็น stub
2. **Argon2 migration** — แผนสลับ scrypt→argon2 ยังไม่อยู่ในโค้ด (PasswordService แยก interface ไว้รองรับ)
3. **Multi-instance scale** — `authCache`(30s, in-memory Map) + Scheduler `setInterval` เป็น in-process; ถ้า scale หลาย instance ต้อง distributed lock/cache/queue
4. **LINE/Email provider** — credential + provider จริงยังไม่ตั้ง (channel/recipient_line_id มีใน schema แล้ว)
5. **Doc deltas** (ดู [24](#24-documentation-analysis)) — README/db อ้างจำนวนตาราง/path/Argon2 ที่ตามหลังโค้ด; seed `lifecycle.property` ค้างค่า 8 สถานะเก่า (ไม่กระทบ FE)
6. **ไฟล์ boilerplate Next.js** (`error/loading/not-found/manifest.ts`, postcss, tsconfig) — เป็น scaffolding มาตรฐาน ไม่มี business logic (ไม่ได้อ่านบรรทัดต่อบรรทัด แต่ไม่กระทบความเข้าใจระบบ)
7. **UX-UI-AUDIT.md** — เอกสาร audit UX (19KB) ยังไม่ได้สรุปในเอกสารนี้ (เป็น design reference ไม่ใช่ source code)

---

*จบเอกสาร — สร้างจาก Reverse Engineering source code จริงทั้งหมด*

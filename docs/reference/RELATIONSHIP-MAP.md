# ROS — System Relationship Mapping

> เอกสารคู่กับ [`SYSTEM-KNOWLEDGE.md`](SYSTEM-KNOWLEDGE.md) — โฟกัส **ความสัมพันธ์/การพึ่งพา/การไหลของข้อมูล** ระหว่างทุกส่วน
> สร้างจาก source code จริง + ยืนยันการใช้งานด้วย grep (รายงานสิ่งที่พบเท่านั้น — ไม่ใช่การ audit/แก้)
> สัญลักษณ์: `──▶` ขึ้นกับ/เรียกใช้ · `◀──` ถูกเรียก · `(type)` = type-only import (ถูก erase ตอน compile)

## สารบัญ
1. [Dependency Graph](#1-dependency-graph)
2. [Import Graph](#2-import-graph)
3. [Export Graph](#3-export-graph)
4. [Module Relationship Graph](#4-module-relationship-graph)
5. [Component Relationship Graph](#5-component-relationship-graph)
6. [Service Relationship Graph](#6-service-relationship-graph)
7. [Repository Relationship Graph](#7-repository-relationship-graph)
8. [API Dependency Graph](#8-api-dependency-graph)
9. [Database Relationship Graph](#9-database-relationship-graph)
10. [Permission Matrix](#10-permission-matrix)
11. [Role Matrix](#11-role-matrix)
12. [Feature Matrix](#12-feature-matrix)
13. [State Flow Map](#13-state-flow-map)
14. [Event Flow Map](#14-event-flow-map)
15. [Storage Flow Map](#15-storage-flow-map)
16. [User Journey Map](#16-user-journey-map)
17. [Data Flow / Ownership / Dependencies / Lifecycle / Consumers / Providers](#17-data-flow--ownership--dependencies--lifecycle--consumers--providers)
18. [Findings: Dead / Unused / Circular / Duplicate](#18-findings-dead--unused--circular--duplicate)

---

## 1. Dependency Graph

**ระดับ Workspace:**
```
web-admin ──HTTP(JWT)──▶ api ──Prisma──▶ PostgreSQL
web-public ──HTTP(public)─▶ api ──Prisma──▶ PostgreSQL
api ──webhook──▶ web-public (/api/revalidate)
api ──(stub)──▶ MinIO/S3 · Redis · LINE/Email   [ยังไม่ wire]
ทั้ง 3 แอป ──▶ @prisma/client (root dep) , Google Fonts (CDN)

ไม่มี shared code package: web-admin และ web-public ไม่ import ซึ่งกันและกัน
(README อ้าง packages/ แต่ไม่มีจริง → โค้ดที่ซ้ำกันถูก copy เช่น format.ts, Icon.tsx)
```

**ระดับ runtime dependency (npm):**
```
api:        @nestjs/* , @prisma/client , @nestjs/jwt , @nestjs/throttler ,
            @nestjs/config , class-validator , class-transformer , zod , cookie-parser , multer , rxjs
web-admin:  next 14.2.15 , react 18 (ไม่มี dep อื่น — UI ทำเอง, Tailwind dev)
web-public: next 14.2.15 , react 18 (เหมือนกัน)
db:         prisma , @prisma/client , tsx
```

---

## 2. Import Graph (backend internal)

```
main.ts ──▶ AppModule , AllExceptionsFilter , TransformInterceptor
AppModule ──▶ ConfigModule(validateEnv) , ThrottlerModule , PrismaModule , TrailModule ,
              CryptoModule , RevalidationModule , [18 domain modules] , 3 APP_GUARD

ทุก *.controller ──▶ decorators(@RequirePermission/@CurrentUser) , *.service , dto/*
ทุก *.service    ──▶ PrismaService , AuditService , ActivityService , resolveScope , NEVER_MATCH ,
                     *.lifecycle , (type) RequestMeta จาก property.service
property.service ──▶ PropertyRepository , NotificationService , RevalidationService , assertDeletable
contract.service ──▶ canTransition(property.lifecycle) , RevalidationService , receipt.template , Storage(ผ่าน doc) 
JwtAuthGuard     ──▶ TokenService , UsersService
PermissionsGuard ──▶ (เฉพาะ Reflector) ; export resolveScope() ให้ทุก service
```

**Hub ที่ถูก import มากสุด (fan-in สูง):**
- `PrismaService` — ทุก service/controller
- `AuditService` + `ActivityService` (TrailModule) — ~ทุก domain service
- `resolveScope()` (จาก `permissions.guard.ts`) — ทุก service ที่มี scope
- `AuthenticatedUser` (type) — ทุก controller/service
- `RequestMeta` (type จาก `property.service.ts`) — ~10 โมดูล (type coupling, ดู §18)

---

## 3. Export Graph (สิ่งที่แต่ละไฟล์ provide)

```
common/auth/decorators.ts      → @Public , @RequirePermission , @CurrentUser , IS_PUBLIC_KEY , PERMISSION_KEY
common/auth/permissions.guard  → PermissionsGuard , resolveScope()
common/auth/authenticated-user → AuthenticatedUser , AuthPermission , Scope , SCOPE_RANK
common/auth/scope.util         → IMPOSSIBLE_ID , NEVER_MATCH
common/trail/*                 → AuditService , ActivityService  (exported จาก TrailModule)
common/crypto/*                → CryptoService  (exported จาก CryptoModule)
common/revalidation/*          → RevalidationService
common/search/property-search  → propertySmartWhere , trainWhere , TRAIN_AMENITY_CODES(unused)
common/guards/deletion-guard   → assertDeletable , blockingReasons
infrastructure/prisma          → PrismaService  (exported global)
infrastructure/storage         → StorageService  (generateKey ใช้ , getUploadUrl ใช้ , getDownloadUrl unused)
modules/auth/token.service      → TokenService , AccessTokenPayload , RequestContext
modules/identity/users.service  → UsersService (getAuthContext , findActiveByEmail , invalidateAuth static)
modules/property/property.service → PropertyService , RequestMeta(type ที่โมดูลอื่นยืมใช้)
*.lifecycle.ts                  → canTransition* , allowed*/LIVE_*/OCCUPYING_*/RENEWABLE_* constants

frontend web-admin/lib:
  auth.tsx   → AuthProvider , useAuth , AuthUser
  api.ts     → apiBase , mediaUrl , apiRaw , apiUpload , ApiError , ApiResult
  useList.ts → useList
  lookups.ts → useLookup , Opt
  status.ts  → PROPERTY/LEAD/APPOINTMENT/CONTRACT_STATUS , badgeClass , bahtFormat , isExpiringSoon , ...
  format.ts  → formatPhone , phoneDigits , thaiDate , thaiDateTime
components/ui.tsx → 19 exports (PageHeader/ListView/Modal/Combobox/... ดู §18 สำหรับตัวที่ไม่ถูกใช้)

frontend web-public/lib:
  api.ts   → publicGet , mediaUrl , baht , PUBLIC_PROPERTIES_TAG , PropertyCard/Detail (type)
  lang.tsx → LanguageProvider , useLang , pick , typeLabel , amenityLabel , T_DICT
```

---

## 4. Module Relationship Graph

```
                         ┌─────────── PrismaModule (global) ───────────┐
                         │                                              │
   ┌── TrailModule(Audit/Activity) ──┬── CryptoModule ──┬── RevalidationModule ──┐
   │            ▲          ▲          │       ▲          │         ▲              │
   │            │          │          │       │          │         │              │
 Auth ── Identity        Property ──┬─ Owner  Customer   Contract ─┘              │
   │       (Users)         │        │   │       │          │                     │
   │                       │        │   │       │          ▼                     │
   │                  NotificationModule ◀──────┴─ Lead ── Appointment           │
   │                       ▲                         │         │                 │
 Public ───────────────────┘  (notifyRoles/notifyUser)        │                 │
   │                                                           │                 │
 Scheduler ──▶ Notification + Prisma + Audit + Activity ───────┘                 │
 Document ──▶ Storage + Prisma + Audit                                           │
 Search/Audit/Settings/Community/User/Health ── (ดู §6)                          │
```

**ใครพึ่ง NotificationModule:** Property, Lead, Appointment, Public, Community, Scheduler
**ใครพึ่ง RevalidationModule:** Property, Contract
**ใครพึ่ง CryptoModule:** Owner, Customer
**ใครพึ่ง TrailModule:** ทุก domain module
**Health/Search/Settings/Audit:** พึ่งแค่ Prisma (+auth decorators)

---

## 5. Component Relationship Graph (frontend)

**web-admin:**
```
AuthProvider (lib/auth)
  └ (app)/layout ── ToastProvider
        ├ GlobalSearch ──▶ api(/search)
        ├ NotificationBell ──▶ api(/notifications,/appointments,/contracts)
        ├ ProfileMenu ──▶ useAuth(logout,can)
        ├ QuickAddProperty ──▶ Modal,Combobox ──▶ api(/properties,/owners,/public/master-data)
        └ {page}
            ├─ ui.tsx primitives (PageHeader,FilterBar,ListView,Pagination,Modal,
            │   ConfirmDialog,Field,Combobox,StatusBadge,Avatar,PhoneLink,Segmented,SectionLabel)
            ├─ useList / useLookup ──▶ useAuth.api
            ├─ status.ts (badge map) , format.ts (phone/date)
            ├─ PropertyForm ──▶ Combobox + api(/properties,/owners,/public/master-data)
            ├─ DocumentSection ──▶ Combobox,ConfirmDialog,ProgressBar + api/upload/apiBlob
            ├─ ActivityTimeline ──▶ api(/:entity/:id/activities)
            └─ Lightbox , Toast , Icon
```
ทุก primitive อยู่ใน `components/ui.tsx` (single source). ทุกหน้าใช้ `useAuth()` เป็นประตูเดียวสู่ API.

**web-public:**
```
LanguageProvider (lib/lang)
  └ layout ── Header(LangToggle) + PullToRefresh + Footer
        └ {page server comp} ──▶ publicGet (SSR/ISR)
            ├ SearchBar ──▶ PriceRange + ProvinceCombobox  (client, router.push)
            ├ FeaturedCarousel ──▶ PropertyCard ──▶ CardImages + useSwipe
            ├ PropertyGallery ──▶ Lightbox + useSwipe
            ├ AppointmentForm ──▶ fetch(/public/leads)   [inline apiBase]
            ├ CommunityBoard ──▶ fetch(/public/community) [inline apiBase]
            ├ T/MetaLine/SpecStrip/AmenityBadges/PriceMonthly/ResultCount (i18n helpers)
            └ Localized , ReadMore , StickyCTA , loaders
```

---

## 6. Service Relationship Graph (backend services)

```
AuthService ──▶ UsersService , PasswordService , TokenService , AuditService
TokenService ──▶ PrismaService (refresh_tokens) , JwtService , ConfigService
UsersService ──▶ PrismaService  ◀── JwtAuthGuard , AuthService
PropertyService ──▶ PropertyRepository , Prisma , Audit , Activity , Notification , Revalidation
OwnerService ──▶ Prisma , Audit , CryptoService , assertDeletable
LeadService ──▶ Prisma , Audit , Activity , Notification , canTransitionLead
AppointmentService ──▶ Prisma , Audit , Activity , Notification , canTransitionAppt , NEVER_MATCH
ContractService ──▶ Prisma , Audit , Activity , Revalidation , receipt.template ,
                    canTransitionContract , canTransition(property.lifecycle)
DocumentService ──▶ Prisma , StorageService , Audit
NotificationService ──▶ Prisma  ◀── Property/Lead/Appointment/Public/Community/Scheduler
SchedulerService ──▶ Prisma , Notification , Audit , Activity , scheduler.logic , Config
UserService ──▶ Prisma , PasswordService , UsersService(invalidateAuth) , Audit
PublicService ──▶ Prisma , Notification , serializer , propertySmartWhere/trainWhere
(single-file) Customer/Community/Audit/Search/Settings controllers ──▶ Prisma (+Crypto/Audit/Notification ตามต้อง)
```

**Cross-module service calls (สำคัญ):**
- `ContractService` เรียก `canTransition` ของ **property.lifecycle** (reuse state machine เพื่อ sync ทรัพย์)
- `*.service` หลายตัว `resolveScope(other_resource,'read')` เพื่อ assert entity ที่อ้างถึงอยู่ใน scope (กันผูกข้ามสาขา)

---

## 7. Repository Relationship Graph

```
PropertyRepository (โมดูลเดียวที่มี repository แยกจริง)
  ──▶ PrismaService
  ──▶ NEVER_MATCH , Scope/AuthenticatedUser (type)
  methods: scopeWhere , create , findManyScoped , findOneScoped , update , softDelete ,
           recordStatusHistory , updateStatusWithHistory(atomic) , generateCode
  consumer: PropertyService เท่านั้น
```
**โมดูลอื่น (Owner/Lead/Appointment/Contract/Document/Customer/...)** ไม่มี repository แยก — เข้าถึง Prisma ตรงใน service พร้อม `scopeWhere()` private method ของตัวเอง (pattern เดียวกับ repository แต่ inline)

→ ความสัมพันธ์: **Repository layer = optional**; Property เป็นแม่แบบที่ "แยกเต็มรูป" ส่วนโมดูลอื่นยุบ repository เข้า service

---

## 8. API Dependency Graph (endpoint → service → table)

```
POST /auth/login ─▶ AuthService ─▶ Users, Password, Token, Audit ─▶ users, refresh_tokens, audit_logs
GET  /properties ─▶ PropertyService.findMany ─▶ PropertyRepository ─▶ properties (+media cover)
POST /properties/:id/approve ─▶ PropertyService.approve ─▶ properties, property_status_history,
                                  Notification, RevalidationService ─▶ web-public
POST /leads (+/public/leads) ─▶ Lead/PublicService ─▶ leads, lead_interests, Notification
POST /leads/:id/convert ─▶ LeadService.convert ─▶ customers + leads (atomic)
POST /appointments ─▶ AppointmentService ─▶ appointments (DB no-overlap) , leads(working) , Notification
POST /contracts ─▶ ContractService ─▶ contracts (อ้าง property available + no live contract)
POST /contracts/:id/sign ─▶ ContractService.sign ─▶ contracts(active) + properties(rented)
                            ตรวจ documents(lease verified) ─▶ Revalidation
POST /contracts/:id/receipt ─▶ generateReceipt ─▶ documents+versions+links (no-orphan) , uploads/
GET  /documents/:id/download ─▶ DocumentService ─▶ documents + audit('download') ─▶ stream file
GET  /search ─▶ SearchController ─▶ properties/leads/customers/owners (per-resource scope)
GET  /audit-logs/feed ─▶ AuditController ─▶ audit_logs + resolve names/labels (batch)
POST /public/community ─▶ Community ─▶ community_posts(pending) + Notification(mod)

Consumer map:
  web-admin   → ทุก protected endpoint (bearer + cookie)
  web-public  → /public/* (SSR internal + client forms)
  api(self)   → /api/revalidate (web-public) ผ่าน RevalidationService
```

---

## 9. Database Relationship Graph

```
branches ─1:N─ teams ─1:N─ users ─M:N─ roles ─M:N─ permissions
                            │
              users ─1:N─ refresh_tokens (Cascade)
              users ─1:N─ notifications / notification_preferences

owners ─1:N─ properties ─N:1─ users(assignedTo,SetNull) , ─N:1─ branches
                │
                ├─1:N─ property_media (Cascade)
                ├─1:N─ property_status_history (Restrict)
                ├─M:N─ leads (lead_interests, Cascade)
                ├─1:N─ appointments (Restrict)
                └─1:N─ contracts (Restrict)

leads ─N:1─ customers (SetNull)        customers ─1:N─ contracts (Restrict)
appointments ─N:1─ leads?/properties?(Restrict) , ─N:1─ users(agent)
contracts ─N:1─ properties/owners/customers/users , ─self─ renewedFrom (SetNull) , ─1:N─ contract_terms

documents ─1:1─ current_version , ─1:N─ document_versions (Cascade) , ─1:N─ document_links (Cascade)
document_links ─(polymorphic)─▶ entity_type + entity_id   [no FK; no-orphan บังคับที่ app]

activity_logs / audit_logs ─(logical FK)─▶ actor_id/entity_id   [ไม่ผูก relation — คงประวัติ]
settings / master_data / translations / community_posts = standalone
```

**Ownership boundary:** `branch_id` = tenant boundary หลัก; ทุก query ผ่าน scopeWhere
**Delete behavior:** Cascade (children ของ media/version/link/token/join) · Restrict (property/owner/customer/agent ที่ถูกอ้าง) · SetNull (assignee/customer/renewedFrom) — แต่ระบบใช้ soft-delete จึงเสริม `assertDeletable()` ที่ app

---

## 10. Permission Matrix

`Permission(resource, action, scope)` — seed สร้างทุก combination แล้ว grant ตาม role.scope

| resource | actions |
|---|---|
| property | create, read, update, delete, approve, reject, change_status |
| lead | create, read, update, delete, assign, change_status, convert |
| contract | create, read, update, delete, change_status, sign |
| document | create, read, update, delete, upload, download, verify |
| appointment | create, read, update, delete, change_status |
| owner / customer / user / role / branch / team | create, read, update, delete |
| notification | read |
| activity | read |
| audit | read, export |
| dashboard | read |
| setting | read, update |

**scope:** own (1) < team (2) < branch (3) < all (4) — `resolveScope` คืนค่ากว้างสุดที่ user มี

---

## 11. Role Matrix

| resource\role | super_admin | company_admin | branch_manager | team_lead | sales_agent | back_office | auditor |
|---|---|---|---|---|---|---|---|
| **scope** | all | all | branch | team | branch | branch | all |
| property | * | * | * | C R U Ap Rj Cs | C R U Cs | R | R |
| owner | * | * | * | C R U | C R U | R | R |
| lead | * | * | * | C R U As Cs Cv | C R U As Cs Cv | R | R |
| customer | * | * | * | C R U | C R U | R U | R |
| appointment | * | * | * | C R U Cs | C R U Cs | R | R |
| contract | * | * | * | C R U Cs Sg | C R U Cs Sg | C R U Cs Sg | R |
| document | * | * | * | C R Up Dl Vf | C R Up Dl | C R U Up Dl Vf | R Dl |
| notification | * | * | R | R | R | R | — |
| activity | * | * | R | R | R | R | R |
| audit | R Ex | R Ex | R | — | — | — | R Ex |
| dashboard | * | * | R | R | R | R | R |
| user | * | * | R | — | — | — | — |
| role | * | R | — | — | — | — | — |
| branch/team | * | * | R(team) | — | — | — | — |
| setting | * | * | R | — | — | — | — |

> `*` = ทุก action · C=create R=read U=update D=delete Ap=approve Rj=reject Cs=change_status As=assign Cv=convert Sg=sign Up=upload Dl=download Vf=verify Ex=export
> **Community moderation** = role-gated (super_admin/company_admin/branch_manager) ไม่ใช่ permission

---

## 12. Feature Matrix

(ความสัมพันธ์ Feature ↔ ทุกชั้น — สรุป; รายละเอียดเต็มใน SYSTEM-KNOWLEDGE §10)

| Feature | FE entry | API | Service | Tables | Notify | Revalidate |
|---|---|---|---|---|---|---|
| Property | /properties | /properties* | PropertyService(+Repo) | properties, media, status_history | ✔(approve/submit) | ✔ |
| Lead | /leads | /leads*, /public/leads | Lead/PublicService | leads, lead_interests, customers | ✔ | — |
| Appointment | /appointments,/calendar | /appointments* | AppointmentService | appointments | ✔ | — |
| Contract | /contracts | /contracts* | ContractService | contracts, terms, documents | — | ✔(sync ทรัพย์) |
| Document | inline | /documents* | DocumentService | documents, versions, links | — | — |
| Owner/Customer | /owners,/customers | /owners,/customers | Owner/CustomerService | owners, customers | — | — |
| Notification | /notifications,Bell | /notifications* | NotificationService | notifications, preferences | self | — |
| Public site | web-public | /public/* | PublicService | properties, leads, community | ✔(lead) | (consumer) |
| Community | /community | /community,/public/community | (single-file) | community_posts | ✔(mod) | — |
| Audit/Activity | /audit | /audit-logs* | (single-file)+TrailService | audit_logs | — | — |
| Users | /users | /users* | UserService | users, roles, user_roles | — | — |
| Search | header | /search | (single-file) | property/lead/customer/owner | — | — |

---

## 13. State Flow Map

```
ACCESS TOKEN  (tokenRef in-memory) ── sign ที่ login/refresh ── verify ทุก request
REFRESH TOKEN (cookie ros_rt → hash ใน refresh_tokens) ── rotate ── reuse→revoke family

FRONTEND (web-admin):
  AuthProvider.refresh() [single-flight] ─▶ token ใหม่ ─▶ retry request
  useList(path, pollMs) ─▶ api ─▶ rows/meta ; event 'app:refresh' ─▶ reload
  useLookup(open) ─▶ dropdown options (lazy)
  UsersService.authCache (server, 30s) ─ invalidate เมื่อแก้ role/status

PUBLIC (web-public):
  publicGet(tag='public-properties', revalidate=300) ─▶ ISR cache
  webhook /api/revalidate ─▶ revalidateTag + revalidatePath ─▶ cache สด

ENTITY LIFECYCLE STATE (DB):
  Property  draft ⇄ available ⇄ rented        (canTransition, property.lifecycle)
  Lead      new → working → closed            (canTransitionLead)
  Appointment upcoming → done | cancelled      (canTransitionAppt)
  Contract  draft → active → ended            (canTransitionContract)
  Document  uploaded → verified → active → archived
  Community pending → published | rejected | archived
```

**Cross-state sync:** Contract sign/active → Property `rented` · Contract ended → Property `available` · Appointment(viewing) สร้าง → Lead `new→working` · Lead convert → Customer + Lead `closed`

---

## 14. Event Flow Map

```
[USER ACTION] ─▶ Controller ─▶ Service
                                 ├─▶ AuditService.record()   (immutable, ห้ามพลาด)
                                 ├─▶ ActivityService.log()    (best-effort timeline)
                                 ├─▶ NotificationService.*()  (in-app; line/email=stub)
                                 └─▶ RevalidationService      (ทรัพย์ขึ้น/ลงเว็บ → webhook)

[PUBLIC FORM] /public/leads ─▶ create lead ─▶ activityLog + notifyRoles(sales..super)
[PUBLIC FORM] /public/community ─▶ filter ─▶ pending ─▶ notifyRoles(mod)

[SCHEDULER tick 30m] ─▶ flagExpiringContracts ─▶ notifyUser(agent)
                       └▶ remindUpcomingAppointments ─▶ notifyUser(agent)   (กันซ้ำด้วยนับ notification เดิม)

[FE polling] useList.pollMs · audit 10s · community 20s · NotificationBell 30s · pull-to-refresh→'app:refresh'

ไม่มี: message queue / inbound webhook / WebSocket
```

---

## 15. Storage Flow Map

```
UPLOAD รูปทรัพย์:
  FE PropertyDetail ─multipart─▶ POST /properties/:id/media (multer disk)
    ─▶ uploads/properties/<uuid>.ext ; row property_media (cover ถ้ารูปแรก)
    ─▶ serve STATIC /uploads/properties/  ◀── mediaUrl() (admin + public)

UPLOAD เอกสาร:
  FE DocumentSection ─multipart─▶ POST /documents/upload (multer disk, ≤15MB, image/pdf)
    ─▶ uploads/documents/<uuid>.ext ; documents+version+link (no-orphan, transaction)
  DOWNLOAD: FE apiBlob ─▶ GET /documents/:id/download
    ─▶ scope check ─▶ audit('download') ─▶ path-traversal guard ─▶ StreamableFile
    ─▶ FE: blob → URL.createObjectURL → window.open

RECEIPT:
  POST /contracts/:id/receipt ─▶ renderReceiptHtml ─▶ uploads/documents/<uuid>.html
    ─▶ Document(receipt)+version+link ─▶ ดาวน์โหลดผ่าน flow เอกสาร (audited)

MinIO/S3 (StorageService): generateKey ใช้จริง ; getUploadUrl/getDownloadUrl = stub (ยังไม่ wire)
```

---

## 16. User Journey Map

**ลูกค้า (public) → พนักงาน (admin):**
```
1. ลูกค้าเปิด web-public / ─▶ ค้นหา (SearchBar) ─▶ /properties?filter ─▶ /properties/[code]
2. กรอก AppointmentForm (consent บังคับ) ─▶ POST /public/leads
3. ระบบ: lead(new) + activityLog + notifyRoles(sales_agent..super_admin)
4. พนักงานเห็นใน NotificationBell/Dashboard ─▶ /leads ─▶ รับ Lead (assign) / เริ่มดูแล (working)
5. สร้าง Appointment (viewing) ─▶ lead→working ; พบลูกค้า ─▶ complete
6. convert Lead ─▶ Customer
7. สร้าง Contract (ต้องมีทรัพย์ available) ─▶ แนบ lease ─▶ verify ─▶ sign ─▶ ทรัพย์ rented
8. ออก Receipt / ต่อสัญญา (renew) ; สัญญา end ─▶ ทรัพย์ available ─▶ revalidate กลับขึ้นเว็บ
```

**พนักงานขายตั้งต้นคลังทรัพย์:**
```
สร้าง Owner ─▶ สร้าง Property (draft, QuickAdd/PropertyForm) ─▶ เพิ่มรูป ─▶
  approve (team_lead+) / submit-review (sales) ─▶ available ─▶ ขึ้น web-public (revalidate)
```

**Admin จัดการระบบ:** /users (สร้าง/role/reset pw) · /settings (บริษัท) · /audit (ฟีดกิจกรรม) · /community (อนุมัติโพสต์)

---

## 17. Data Flow / Ownership / Dependencies / Lifecycle / Consumers / Providers

**Data Flow (ทิศทางหลัก):**
```
public form ─▶ API ─▶ DB ─▶ (notify) ─▶ admin UI
admin UI ─(bearer)─▶ API ─(Prisma)─▶ DB ─(revalidate webhook)─▶ public ISR cache ─▶ public UI
```

**Ownership (ใครเป็นเจ้าของข้อมูล):**
| ข้อมูล | เจ้าของ (source of truth) |
|---|---|
| ทรัพย์/lead/สัญญา/นัด | DB (PostgreSQL) — แสดงผ่าน scope |
| access token | API (sign) ; FE ถือชั่วคราวใน memory |
| refresh session | DB refresh_tokens (FE ถือแค่ cookie opaque) |
| public listing cache | web-public ISR (invalidate โดย API) |
| auth context | DB (cache 30s ที่ API) |
| ภาษา UI (public) | localStorage (client) |
| ไฟล์ | local disk API (uploads/) |

**Dependencies (ใครพึ่งใคร — สรุป):** ทุก service พึ่ง Prisma+Trail; domain ที่มี side-effect พึ่ง Notification/Revalidation; guard พึ่ง Token+Users; Contract พึ่ง property.lifecycle

**Lifecycle (วงจรชีวิตทรัพยากร):**
- **PrismaService:** connect ตอน `onModuleInit`, disconnect ตอน `onModuleDestroy`
- **SchedulerService:** start timer ตอน init (เว้น test), clear ตอน destroy
- **Access token:** 15 นาที → refresh; **Refresh:** 7 วัน + prune (หมดอายุ/revoked>30วัน)
- **authCache:** 30 วินาที หรือจน invalidate
- **ISR cache:** 300 วินาที หรือจน revalidate webhook
- **Entity:** create → (transitions) → soft-delete (`deleted_at`)

**Consumers / Providers (สรุปตาราง):**
| Provider | Consumers |
|---|---|
| PrismaService | ทุก service |
| AuditService/ActivityService | ทุก domain service |
| NotificationService | Property, Lead, Appointment, Public, Community, Scheduler |
| RevalidationService | Property, Contract |
| CryptoService | Owner, Customer |
| resolveScope() | ทุก service ที่มี scope |
| TokenService/UsersService | JwtAuthGuard, AuthService |
| property.lifecycle.canTransition | PropertyService, **ContractService** |
| web-public /api/revalidate | API RevalidationService |

---

## 18. Findings: Dead / Unused / Circular / Duplicate

> รายงานสิ่งที่พบจาก source + ยืนยันด้วย grep — **ไม่ใช่การ audit หรือเสนอแก้** เป็นข้อมูลความสัมพันธ์เท่านั้น

### 18.1 Unused Exports (ไม่มี consumer ใน source)
| Export | ไฟล์ | สถานะ |
|---|---|---|
| `SelectField` | web-admin `components/ui.tsx` | 0 consumer (มี Combobox ใช้แทน) |
| `FilterChips` | web-admin `components/ui.tsx` | 0 consumer (เป็น backward-compat re-export ของ `Segmented` ตาม comment) |
| `ProgressBar` | web-public `components/loaders.tsx` | 0 consumer (web-admin มี ProgressBar ของตัวเองใน ui.tsx ใช้ 2 ที่) |
| `StorageService.getDownloadUrl` | api `infrastructure/storage` | 0 consumer (ใช้แค่ generateKey + getUploadUrl) |
| `TRAIN_AMENITY_CODES` | api `common/search/property-search.ts` | 0 consumer (ใช้แค่ `trainWhere`) |
| `leadAllowed` | api `modules/lead/lead.lifecycle.ts` | 0 consumer ภายนอก (มีแค่ในไฟล์ตัวเอง) |

### 18.2 Exports ที่ consumer = test เท่านั้น (runtime ไม่เรียก)
| Export | ใช้โดย |
|---|---|
| `isPubliclyVisible` / `allowedTransitions` (property.lifecycle) | `property.lifecycle.spec.ts` เท่านั้น |
| `hasLiveContract` (contract.lifecycle) | `contract.lifecycle.spec.ts` เท่านั้น |
| `blockingReasons` (deletion-guard) | spec (runtime ใช้ `assertDeletable`) |

### 18.3 Dead Files / Unused Components / Unused Services
- **ไม่พบ dead file** — ทุก component/service/module ถูก import อย่างน้อย 1 ที่
- web-public components: ใช้ครบทุกตัว (Localized/ReadMore/StickyCTA/LangToggle/Lightbox/PullToRefresh/ProvinceCombobox/PriceRange/FeaturedCarousel/PropertyGallery/SearchBar/CommunityBoard/PropertyCard/Header — ≥1 consumer)
- `PropertyCardSkeleton`/`CardGridSkeleton` (loaders) ถูกใช้ภายใน (CardGridSkeleton → PropertyCardSkeleton) — ไม่ dead
- ไม่มี module ที่ลงทะเบียนแล้วไม่มี route/consumer

### 18.4 Circular Dependencies
- **ไม่พบ runtime circular dependency**
- มี **type coupling** เด่น: `type RequestMeta` ถูก import จาก `modules/property/property.service.ts` โดย ~10 โมดูล (lead/owner/appointment/contract/document/user/...) — เป็น **type-only import** จึงถูก erase ตอน compile (ไม่เป็น cycle ตอน runtime) แต่ทำให้ property.service กลายเป็น "type anchor" โดยพฤตินัย
- cross-module call `ContractService → property.lifecycle.canTransition` เป็นทางเดียว (lifecycle เป็น pure module ไม่ import กลับ)

### 18.5 Duplicate Logic (โค้ดรูปแบบเดียวกันหลายที่)
| Pattern | ที่พบ | หมายเหตุ |
|---|---|---|
| `genCode()` + `padStart(4,'0')` + retry P2002 | property.repository, lead.service, appointment.service, contract.service, public.service (5 ที่) | per-module template เดียวกัน (prefix ต่างกัน) |
| `scopeWhere(user,scope)` private | ทุก domain service (Owner/Lead/Appointment/Contract/Document/Customer/Search) | template เดียว (Property แยกเป็น repository) |
| `timeAgo()` | web-admin: notifications page, community page, NotificationBell, ActivityTimeline · web-public: CommunityBoard (5 นิยาม) | relative-time helper ก๊อปต่อ component |
| `formatPhone`/`phoneDigits` | `web-admin/lib/format.ts` + `web-public/lib/format.ts` (2 ชุดเหมือนกัน) | ไม่มี shared package จึง copy |
| `Icon.tsx` (ชุดไอคอน SVG) | web-admin + web-public (web-admin มี `star`,`phone` เพิ่ม) | copy ข้ามแอป |
| inline `apiBase()` | web-public: AppointmentForm, CommunityBoard | client component นิยามเองแทน import (lib/api.ts ของ public export `publicGet`/`mediaUrl` ไม่ได้ export apiBase) |
| `ProgressBar`/`Spinner` | web-admin ui.tsx + web-public loaders.tsx | คนละแอป (คาดหวังได้) |
| `meta(req)` helper (ip/userAgent) | ทุก controller ที่ทำ mutation | template เดียว |

### 18.6 สรุปลักษณะ coupling โดยรวม
- **Backend:** coupling ผ่าน NestJS DI + cross-cutting services ที่ออกแบบให้ reuse (Trail/Notification/Revalidation/Crypto) — สะอาด, fan-in สูงที่ Prisma/Trail ตามคาด
- **ความซ้ำหลัก** เกิดจาก (1) per-module template ที่ตั้งใจ (genCode/scopeWhere/meta) และ (2) **ไม่มี shared package ระหว่าง 2 frontend** ทำให้ helper เล็ก ๆ ถูก copy

---

*จบเอกสาร — System Relationship Mapping จาก source code จริง (ยืนยันการใช้งานด้วย grep)*

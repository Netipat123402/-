# ROS — Architecture Audit

> ตรวจจาก **source code จริงเท่านั้น** (ยืนยันด้วย grep/line-count) — ไม่แก้โค้ด ไม่ refactor
> ขอบเขต: **สถาปัตยกรรม** (ไม่ใช่การไล่ bug การทำงาน) · คู่กับ [`SYSTEM-KNOWLEDGE.md`](SYSTEM-KNOWLEDGE.md) + [`RELATIONSHIP-MAP.md`](RELATIONSHIP-MAP.md)
> ทุก finding มี: **Severity · Evidence · Source Files · Impact · Root Cause**

## Overall Assessment

ROS เป็น **modular monolith ที่ออกแบบดีและสม่ำเสมอ** สำหรับ deployment แบบ single-VPS:
- ✅ Layering ชัด (controller → service → repository/prisma), guard 2 ชั้น, cross-cutting แยกสะอาด, $transaction 24 จุด (atomicity ดี)
- ✅ ไม่มี `as any` (0), ไม่มี `@ts-ignore` (0), ไม่มี `process.env` อ่านตรงนอก config, ไม่มี direct `fetch()` bypass auth wrapper, ไม่เก็บ token ใน localStorage
- ✅ ไม่พบ **circular dependency** ระดับ runtime, ไม่พบ **dead file**

**ผลสรุปสำคัญ:** ปัญหาที่พบ **ไม่ใช่ความถูกต้อง** แต่เป็น (1) **ความพร้อมต่อ horizontal scaling** และ (2) **ความสม่ำเสมอของ convention** ระหว่างโมดูล/แอป

| ระดับ | จำนวน finding |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High | 3 |
| 🟡 Medium | 5 |
| 🟢 Low | 5 |

---

## 🔴 Critical

**ไม่พบปัญหาสถาปัตยกรรมระดับ Critical** — ไม่มีจุดที่ทำให้ระบบ "พังเชิงสถาปัตยกรรม" ในโหมด deployment ที่ออกแบบไว้ (single VPS, single instance)
> หมายเหตุ: รายการใน High ด้านล่างจะกลายเป็น Critical ทันทีถ้ามีการ deploy **หลาย instance** โดยไม่แก้

---

## 🟠 High

### H1 — Horizontal-scale blockers: state ใน process (authCache + scheduler) + ไฟล์ใน local disk

| | |
|---|---|
| **Severity** | High (Scalability) |
| **Evidence** | `UsersService.authCache = new Map(...)` **static in-memory**, TTL 30s (`users.service.ts:19,82`) · `SchedulerService` ใช้ `setInterval` ในตัว (`scheduler.service.ts:50`) · ไฟล์อัปโหลดเก็บ local disk ผ่าน `multer.diskStorage` → `apps/api/uploads/{properties,documents}` (`property.controller.ts:97`, `document.controller.ts:35`, `main.ts:27-33`) · `StorageService` (MinIO) เป็น stub |
| **Source Files** | `modules/identity/users.service.ts`, `modules/scheduler/scheduler.service.ts`, `infrastructure/storage/storage.service.ts`, `main.ts`, `*.controller.ts` (multer) |
| **Impact** | ถ้า scale เป็น ≥2 instance: (1) authCache ไม่ sync → สิทธิ์ที่แก้แล้วยัง stale ได้นานสุด 30s ต่อ instance (invalidateAuth ลบเฉพาะ instance ตัวเอง), (2) scheduler รันซ้อนทุก instance → แจ้งเตือนซ้ำ, (3) ไฟล์ผูกกับ node เดียว → instance อื่นเปิด/ดาวน์โหลดไฟล์ไม่ได้ + ไม่มี durability/backup |
| **Root Cause** | ดีไซน์ตั้งใจเป็น single VPS (comment ในโค้ดยอมรับ: "หลาย instance ควรใช้ distributed lock/queue") + Redis/MinIO ยังไม่ wire (Phase 12) |

### H2 — Layer inconsistency: 5 โมดูลข้ามชั้น service (controller เรียก Prisma + ใส่ business logic ตรง)

| | |
|---|---|
| **Severity** | High (Maintainability / Module Boundaries) |
| **Evidence** | controller ใน single-file module เรียก `this.prisma` ตรง: `audit.module.ts` (16 refs), `customer.module.ts` (12), `community.module.ts` (7), `search.module.ts` (4), `settings.module.ts` (2) — ขัดกับแม่แบบที่ documented (controller→service→repository) ซึ่ง Property/Lead/Contract ใช้ · `audit.module.ts` controller มี logic หนัก: `buildChanges()`, `resolveEntityLabels()` (batch query 6 ตาราง), name-resolution อยู่ใน controller |
| **Source Files** | `modules/audit/audit.module.ts` (167 บรรทัด), `modules/customer/customer.module.ts`, `modules/community/community.module.ts`, `modules/search/search.module.ts`, `modules/settings/settings.module.ts` |
| **Impact** | สองมาตรฐานในโค้ดเบสเดียว → dev ใหม่สับสนว่าควรเขียนแบบไหน · logic ใน controller ทดสอบยาก (ไม่มี service ให้ mock) · `audit.module` controller เป็น **God controller** (CRUD + diff building + entity label resolve + visibility rule) |
| **Root Cause** | โมดูล "อ่านเป็นหลัก/CRUD บาง" ถูกเขียนแบบ single-file เพื่อความเร็ว แต่บางตัว (audit/customer/community) โตเกินกว่าที่ pattern นี้รองรับ |

### H3 — `RequestMeta` เป็น shared type ที่วางผิดที่ → property.service กลายเป็น coupling hub

| | |
|---|---|
| **Severity** | High (Dependency Structure) |
| **Evidence** | `export interface RequestMeta` นิยามใน `modules/property/property.service.ts:23` แล้วถูก **import แบบ type โดย ~10 โมดูล** (lead/owner/appointment/contract/document/user/...) เช่น `import type { RequestMeta } from '../property/property.service'` |
| **Source Files** | `modules/property/property.service.ts` + ผู้ import ทั้งหมด (lead/appointment/contract/document/owner/user services & controllers) |
| **Impact** | property domain กลายเป็น dependency ของแทบทุกโมดูลโดยไม่ตั้งใจ (แม้เป็น type-only จึงไม่ใช่ runtime cycle) → ทำลาย module boundary เชิงแนวคิด · ย้าย/แก้ property.service กระทบ import graph กว้าง · สื่อความหมายผิด (ทำไม contract ต้องรู้จัก property internal type?) |
| **Root Cause** | ไม่มีที่วาง shared type กลาง (เช่น `common/types`) → ใช้ตัวแรกที่นิยามขึ้นมา (property) เป็นที่อ้างอิงร่วม |

---

## 🟡 Medium

### M1 — God component (frontend): หน้า property detail รวมงานหลายอย่างในไฟล์เดียว

| | |
|---|---|
| **Severity** | Medium (Maintainability) |
| **Evidence** | `properties/[id]/page.tsx` = **331 บรรทัด** ทำ: โหลด + media upload/gallery/lightbox/cover/delete + lifecycle actions (approve/reject/submit/delete/featured) + groups render + edit modal + DocumentSection + ActivityTimeline + confirm dialogs ในไฟล์เดียว |
| **Source Files** | `apps/web-admin/src/app/(app)/properties/[id]/page.tsx` (331), รองลงมา `PropertyForm.tsx`(278), `leads/page.tsx`(277), `(app)/layout.tsx`(273), `appointments/page.tsx`(249) |
| **Impact** | แก้ไขเสี่ยง regression ข้ามฟีเจอร์ · reuse ส่วนย่อย (เช่น gallery) ไม่ได้เพราะ inline · onboarding อ่านยาก |
| **Root Cause** | gallery/media-management ทำ inline ในหน้าแทนแยกเป็น component (ขณะที่ public แยก `PropertyGallery` แล้ว — admin ไม่ได้ reuse) |

### M2 — Duplicate logic จากการ "ไม่มี shared package" ระหว่าง 2 frontend และ per-module template

| | |
|---|---|
| **Severity** | Medium (Maintainability / DRY) |
| **Evidence** | `formatPhone`/`phoneDigits` ซ้ำใน `web-admin/lib/format.ts` + `web-public/lib/format.ts` · `Icon.tsx` ซ้ำ 2 แอป (admin มี `star`,`phone` เพิ่ม) · `timeAgo()` นิยาม **5 ที่** (notifications/community page, NotificationBell, ActivityTimeline, CommunityBoard) · `genCode()+padStart(4)+retry P2002` ซ้ำ 5 service · `scopeWhere()` private ซ้ำในทุก domain service |
| **Source Files** | `apps/*/src/lib/format.ts`, `apps/*/src/components/Icon.tsx`, หลายหน้า/หลาย service (ดู RELATIONSHIP-MAP §18.5) |
| **Impact** | แก้ logic เดียวต้องแก้หลายที่ (เช่น เปลี่ยนรูปแบบเบอร์/เวลา) → เสี่ยงหลุดไม่ครบ · `packages/` ที่ README อ้างไม่มีจริง |
| **Root Cause** | ไม่มี shared library package (`packages/ui`, `packages/shared-types`, `packages/validation` ตามดีไซน์เดิม) → copy ข้ามแอป; per-module template จงใจ copy เพื่อความอิสระของ bounded context |

### M3 — Large service: ContractService รวมหลาย responsibility (รวม document + property sync + receipt)

| | |
|---|---|
| **Severity** | Medium (Single Responsibility) |
| **Evidence** | `contract.service.ts` = **440 บรรทัด, 11 async methods** — นอกจาก CRUD/lifecycle ยังทำ: `generateReceipt()` (render HTML + เขียนไฟล์ + สร้าง Document+version+link), `syncProperty()` (เปลี่ยนสถานะ + status history ของ **property** domain), assert customer/owner/agent/property in-scope, ContractTerm CRUD |
| **Source Files** | `modules/contract/contract.service.ts`; ใกล้เคียง `property.service.ts` (388, 12 methods) |
| **Impact** | contract domain ถือ logic ของ document + property (cross-domain) → boundary เบลอ · เทสต์/แก้ contract ต้องเข้าใจ 3 โดเมน |
| **Root Cause** | side-effect เชิงธุรกิจ (เซ็นสัญญา → ทรัพย์ rented, ออกใบเสร็จ → สร้างเอกสาร) ถูกฝังใน service เดียวแทนใช้ event/handler หรือเรียก DocumentService/PropertyService |

### M4 — Validation gap: endpoint ที่รับ `@Body` แบบ inline type (ไม่มี DTO/class-validator)

| | |
|---|---|
| **Severity** | Medium (API Design consistency) |
| **Evidence** | `contract.controller.ts:69` `addTerm(... @Body() body: { termKey: string; termValue: string })` — เป็น inline type ไม่ใช่ DTO class → `ValidationPipe(whitelist)` ตรวจไม่ได้ (ไม่มี decorator) ขณะที่ทุก endpoint อื่นใช้ DTO + class-validator |
| **Source Files** | `modules/contract/contract.controller.ts` (POST `/:id/terms`) |
| **Impact** | termKey/termValue ไม่ถูก validate ความยาว/ชนิดที่ระดับ pipe (ต่างจากมาตรฐานทั้งระบบ) · ไม่สม่ำเสมอ |
| **Root Cause** | endpoint รอง (sub-resource) ถูกเขียนเร็วโดยข้าม DTO |

### M5 — RBAC permission seed สร้าง row เกินที่ใช้ (over-provisioning)

| | |
|---|---|
| **Severity** | Medium (Over-engineering, ผลกระทบต่ำ) |
| **Evidence** | `seedRolesAndPermissions` สร้าง permission ทุก (resource × action × **ทุก 4 scope**) = ~รวมหลายร้อย row แต่แต่ละ role grant เฉพาะ permission ที่ `role.scope` เดียว (`db/seed/roles-permissions.ts:142-153`) → permission ส่วนใหญ่ไม่มี role อ้างถึง |
| **Source Files** | `db/seed/roles-permissions.ts`, `permissions` table |
| **Impact** | ตาราง permission มี row ที่ไม่ถูกใช้จำนวนมาก (ไม่กระทบ performance จริง แต่ทำให้ data งง) |
| **Root Cause** | ออกแบบเผื่อความยืดหยุ่น (รองรับ grant scope อื่นภายหลัง) — flexibility ที่ยังไม่ถูกใช้ |

---

## 🟢 Low

### L1 — Dead/Unused exports (ยืนยัน 0 consumer ด้วย grep)
- **Severity:** Low (Dead Code) · **Evidence/Source:** `SelectField`, `FilterChips` (`web-admin/components/ui.tsx`); `ProgressBar`, (`web-public/components/loaders.tsx`); `StorageService.getDownloadUrl` (`infrastructure/storage`); `TRAIN_AMENITY_CODES` (`common/search/property-search.ts`); `leadAllowed` (`modules/lead/lead.lifecycle.ts`)
- **Impact:** เพิ่ม surface ที่ต้องดูแลโดยไม่มีคนใช้ · **Root Cause:** เผื่ออนาคต / backward-compat re-export / refactor แล้วลืมลบ

### L2 — Over-engineering: โครงสร้างที่สร้างเต็มแต่ยังไม่ถูกใช้
- **Severity:** Low · **Evidence:** `StorageService` มี `getUploadUrl/getDownloadUrl` (presigned, stub) เต็มรูปแต่ flow จริงใช้ local disk; `PriceRange` เป็น dual-thumb slider เขียนเอง (window-level pointer handling); `loaders.tsx` มี 5 export ใช้จริง 3
- **Source:** `infrastructure/storage/storage.service.ts`, `web-public/components/{PriceRange,loaders}.tsx`
- **Impact:** โค้ดที่ต้องเข้าใจ/ดูแลก่อนถึงเวลาใช้ · **Root Cause:** เตรียมล่วงหน้าสำหรับ Phase 12

### L3 — Under-engineering: ฟีเจอร์ที่เป็น stub/อนาคต
- **Severity:** Low · **Evidence:** NotificationService line/email = `this.logger.log('[stub]...')` ไม่ส่งจริง (`notification.service.ts:59,105`); หน้า `/settings` retention "ปรับได้ในเฟสถัดไป" (read-only); ไม่มี forgot-password (admin reset เท่านั้น); ไม่มี integration/E2E test (มีแค่ unit บน pure logic)
- **Source:** `modules/notification/notification.service.ts`, `web-admin/.../settings/page.tsx`, `apps/api` (ไม่มี `*.e2e-spec.ts`)
- **Impact:** ฟีเจอร์ที่เอกสารบอกว่ามี (LINE/email) ยังไม่ทำงานจริง · **Root Cause:** รอ credential/Phase 12

### L4 — Anti-pattern เล็ก: best-effort swallow + business logic ใน module file
- **Severity:** Low · **Evidence:** `ActivityService.log()` จับ error เงียบ (`activity.service.ts:41`) — *ตั้งใจ* (timeline ไม่ควรทำ business op ที่ commit แล้วพัง) จึงยอมรับได้; single-file module ผสม controller+module+DTO+helper (`community.module.ts` มี `violatesPolicy`, `randomName`, `BANNED_WORDS`)
- **Impact:** ต่ำ (มี comment อธิบายเจตนา) · **Root Cause:** pragmatic trade-off

### L5 — Unused infra dependencies (ประกาศแต่ไม่ wire)
- **Severity:** Low · **Evidence:** `infra/docker/docker-compose.yml` ประกาศ `redis` + `minio` แต่ไม่มี client ในโค้ด (refresh token เก็บ Postgres, ไฟล์อยู่ disk) · **npm deps:** ไม่พบ dependency ที่ไม่ถูกใช้ใน 3 แอป (ตรวจแล้ว)
- **Source:** `infra/docker/docker-compose.yml`
- **Impact:** service ที่รันแต่ไม่ถูกเรียก (ถ้าเปิด compose ครบ) · **Root Cause:** เตรียม Phase 12

---

## ตรวจตาม 12 หัวข้อที่กำหนด (สรุปผล)

| # | หัวข้อ | ผลประเมิน | finding ที่เกี่ยว |
|---|---|---|---|
| 1 | System Architecture | ดี (monolith ชัดเจน, envelope/guard กลาง) — จุดอ่อนคือ scale-out | H1 |
| 2 | Frontend Architecture | ดี (auth wrapper เดียว, ไม่มี fetch bypass, token in-memory) — จุดอ่อน god component + duplicate | M1, M2 |
| 3 | Backend Architecture | ดีและสม่ำเสมอ (controller→service→repo) — จุดอ่อน 5 โมดูลข้ามชั้น | H2 |
| 4 | API Design | ดี (RESTful, envelope, throttle, Prisma error map) — จุดอ่อน 1 endpoint untyped | M4 |
| 5 | Database Design | แข็งแรงมาก (UUID v7, soft delete, audit cols, trigger, partial/GIN index, FK policy) | M5 (seed over-provision) |
| 6 | State Management | ดี (single-flight refresh, no localStorage token, ISR+webhook) — authCache multi-instance | H1 |
| 7 | Dependency Structure | สะอาด (no circular) — จุดอ่อน type anchor | H3 |
| 8 | Module Boundaries | ชัดส่วนใหญ่ — เบลอที่ contract↔document/property + single-file modules | H2, M3 |
| 9 | Feature Separation | ดี (1 module = 1 context) — cross-domain side-effect ฝังใน service | M3 |
| 10 | Scalability | จำกัดที่ single-instance (state in-process + local disk) | H1 |
| 11 | Maintainability | ดี (สม่ำเสมอ, typed, test pure logic) — duplicate + god component | M1, M2 |
| 12 | Technical Debt | ต่ำ-ปานกลาง: stub (LINE/email/MinIO/Redis), doc drift, dead exports | H1, L1, L3, L5 |

## ค้นหาตาม checklist (สรุป)

| รายการ | พบ? | อ้างอิง |
|---|---|---|
| Tight Coupling | บางส่วน — RequestMeta type anchor, contract↔property/document | H3, M3 |
| God Components | ใช่ — `properties/[id]/page.tsx` (331) | M1 |
| God Services | ก้ำกึ่ง — `contract.service` (440/11), `audit.module` controller | M3, H2 |
| Circular Dependencies | **ไม่พบ** (runtime); type-only coupling เท่านั้น | H3 |
| Layer Violations | ใช่ — 5 single-file module controller→prisma + logic | H2 |
| Duplicate Logic | ใช่ — format/Icon/timeAgo/genCode/scopeWhere | M2 |
| Over Engineering | เล็กน้อย — StorageService stub, RBAC seed, PriceRange | M5, L2 |
| Under Engineering | เล็กน้อย — LINE/email/settings stub, no E2E | L3 |
| Anti Patterns | เล็กน้อย — logic in controller, swallow (ตั้งใจ) | H2, L4 |
| Dead Code | ใช่ (exports) — ไม่มี dead file | L1 |
| Unused Dependencies | infra (redis/minio) ไม่ wire; npm: ไม่พบ | L5 |

---

## บทสรุป (Prioritized)

1. **ก่อน scale-out:** จัดการ H1 (ย้าย authCache→Redis, scheduler→distributed lock/queue, ไฟล์→MinIO/S3) — ปัจจุบันปลอดภัยเฉพาะ single instance
2. **เพื่อความสม่ำเสมอระยะยาว:** H2 (เพิ่ม service layer ให้ 5 โมดูล) + H3 (ย้าย `RequestMeta` ไป `common/`)
3. **ลดภาระดูแล:** M1 (แตก god component), M2 (สร้าง `packages/shared`), M3 (แยก receipt/sync ออกจาก contract)
4. **เก็บกวาด:** L1 (ลบ dead exports), L5/doc drift

> ทั้งหมดเป็น **ข้อสังเกตเชิงสถาปัตยกรรม** จาก source จริง — ไม่มีการแก้โค้ดในเอกสารนี้ และไม่พบปัญหา "ความถูกต้อง" ระดับ Critical ในโหมด deployment ที่ออกแบบไว้

*จบเอกสาร — Architecture Audit (source-based, no code changes)*

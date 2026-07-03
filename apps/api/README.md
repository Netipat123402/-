# ROS API (NestJS — Modular Monolith)

Backend ของ ROS ตามดีไซน์ Phase 2/4/7 — 1 module = 1 bounded context

## โครงสร้าง (Stage 1 — Foundation)

```
apps/api/src/
├── main.ts                       # bootstrap: prefix /api/v1, validation, envelope, CORS
├── app.module.ts                 # ประกอบ module (เพิ่มทีละ stage)
├── config/
│   └── env.validation.ts         # ตรวจ env ตอนบูต (Zod, fail-fast)
├── infrastructure/
│   └── prisma/                    # PrismaService + Module (ต่อ DB Phase 11)
├── common/                       # cross-cutting (Phase 4)
│   ├── middleware/request-id      # แนบ request_id ทุก request
│   ├── filters/all-exceptions     # error envelope กลาง
│   └── interceptors/transform     # response envelope { data, meta }
└── modules/
    └── health/                    # /health (liveness) + /health/db (readiness)
```

## รัน (dev)
```bash
cp .env.example .env        # ชี้ DATABASE_URL ไปฐานข้อมูล Phase 11
npm run start:dev -w @ros/api
```

## ทดสอบ
```bash
curl http://localhost:4000/api/v1/health
curl http://localhost:4000/api/v1/health/db
```

## มาตรฐานที่วางไว้แล้ว (ใช้ต่อทุก module)
- ✅ **API versioning** — prefix `/api/v1` (Phase 4 §7)
- ✅ **Validation กลาง** — whitelist + transform (Phase 4 §4)
- ✅ **Response envelope** — `{ data, meta:{ request_id } }` (Phase 4 §1.4)
- ✅ **Error envelope** — `{ error:{ code, message, request_id } }` ไม่รั่ว stack (Phase 4 §6)
- ✅ **Request ID** — โยง log ↔ audit (Phase 4/7)
- ✅ **CORS allowlist** — เฉพาะ origin ที่อนุญาต (Phase 7)
- ✅ **Prisma lifecycle** — connect/disconnect อัตโนมัติ

## Auth (Stage 2) — Phase 7

| Endpoint | สิทธิ์ | ทำอะไร |
|----------|--------|--------|
| `POST /auth/login` | public | login → access token (15น.) + refresh cookie (httpOnly) |
| `POST /auth/refresh` | public (cookie) | หมุน token + rotation + reuse detection |
| `POST /auth/logout` | public (cookie) | เพิกถอน refresh token |
| `GET /auth/me` | ต้อง login | ข้อมูล user + roles + permissions |

- **JWT** access อายุ 15 นาที (HS256 dev / RS256 prod-ready)
- **Refresh** opaque token เก็บ hash ใน DB (`refresh_tokens`) — rotation + reuse detection (เจอ reuse = เพิกถอนทั้ง family)
- **RBAC** 2 global guards: `JwtAuthGuard` (ยืนยันตัวตน) → `PermissionsGuard` (`@RequirePermission(resource, action)`)
- **Scope** helper `resolveScope()` (own/team/branch/all) — บังคับที่ service layer (Stage 3)
- **No enumeration** — login ผิดทุกกรณีตอบข้อความเดียวกัน
- **Decorators:** `@Public()` · `@RequirePermission()` · `@CurrentUser()`

## Property (Stage 3) — แม่แบบทุกโมดูล

| Endpoint | สิทธิ์ | ทำอะไร |
|----------|--------|--------|
| `POST /properties` | property:create | สร้าง (→ draft, gen code CD-2026-xxxx) |
| `GET /properties` | property:read | list (scope-filtered + pagination) |
| `GET /properties/:id` | property:read | รายละเอียด (นอก scope → 404) |
| `GET /properties/:id/activities` | property:read | timeline |
| `PATCH /properties/:id` | property:update | แก้ไข (audit old/new) |
| `DELETE /properties/:id` | property:delete | soft delete |
| `POST /properties/:id/submit-review` | property:change_status | draft → pending_review |
| `POST /properties/:id/approve` | property:approve | pending_review → published |
| `POST /properties/:id/reject` | property:reject | pending_review → draft |
| `PATCH /properties/:id/status` | property:change_status | transition อื่น ๆ (ตรวจ state machine) |

**Pattern ที่ทุกโมดูลถัดไปทำตาม:**
- `*.lifecycle.ts` = state machine (pure, unit-tested)
- `*.repository.ts` = DB access + **scope filter อัตโนมัติ** (own/team/branch/all)
- `*.service.ts` = business rules + transitions + audit/activity
- `*.controller.ts` = `@RequirePermission` + `@CurrentUser`
- ทุก mutation → `AuditService` (immutable) + `ActivityService` (timeline)

## Test
```bash
npx jest          # unit tests (lifecycle + scope) — 22 ผ่าน
```

## ถัดไป
- **Stage 4:** Owner, Lead, Appointment, Contract, Document, Notification (ทำตามแม่แบบ Property)

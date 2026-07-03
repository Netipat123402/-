# ROS Database (Phase 11)

ฐานข้อมูล Production — **PostgreSQL + Prisma ORM** ตามดีไซน์ Phase 3

## เนื้อหา

```
db/
├── prisma/
│   ├── schema.prisma              # ★ 27 ตาราง + 16 enums (Phase 3)
│   └── migrations/
│       ├── <timestamp>_init/      # migration จริง (สร้างโดย prisma migrate)
│       └── manual/                # SQL ที่ Prisma แสดงไม่ได้ (รันเพิ่มหลัง migrate)
│           ├── advanced-indexes.sql   # GIN full-text, partial, trigram, jsonb
│           └── audit-immutable.sql    # audit_logs append-only (trigger)
├── seed/
│   ├── seed.ts                    # orchestrator (branch, admin, settings)
│   ├── roles-permissions.ts       # RBAC (7 roles + permissions)
│   └── master-data.ts             # property type, amenity, province, doc type
├── package.json
└── .env.example
```

## 27 ตาราง (ตาม Bounded Context)

| Context | Tables |
|---------|--------|
| Identity & Access | `branches` `teams` `users` `roles` `permissions` `role_permissions` `user_roles` |
| Owner | `owners` |
| Property | `properties` `property_media` `property_status_history` |
| Lead & Customer | `leads` `lead_interests` `customers` |
| Appointment | `appointments` |
| Contract | `contracts` `contract_terms` |
| Document | `documents` `document_versions` `document_links` |
| Notification | `notifications` `notification_preferences` |
| Activity & Audit | `activity_logs` `audit_logs` |
| Settings & i18n | `settings` `master_data` `translations` |

## หลักการที่ใส่ไว้แล้ว (Phase 3 / 7)

- ✅ **PK = UUID v7** ทุกตาราง (`@default(uuid(7))`)
- ✅ **Audit columns** (`created_at/by`, `updated_at/by`, `deleted_at/by`)
- ✅ **Soft delete** (`deleted_at` — query หลักบวก `WHERE deleted_at IS NULL`)
- ✅ **Multi-branch** (`branch_id` ทุกตารางธุรกิจ)
- ✅ **i18n** (`title_th/title_en`, master data, translations)
- ✅ **PII ciphertext** (`id_card_no` — เข้ารหัสที่ app layer)
- ✅ **PDPA consent** (`consent_at`, `consent_version` บน leads)
- ✅ **No-orphan documents** (`document_links` บังคับผูก entity)
- ✅ **Audit append-only** (trigger ใน `audit-immutable.sql`)
- ✅ **เงิน Decimal(12,2)** · **เวลา Timestamptz (UTC)**

---

## วิธีติดตั้ง (Local Dev)

### 1. เปิด PostgreSQL ผ่าน Docker
```bash
cd ../infra/docker
docker compose up -d postgres
```

### 2. ตั้งค่า env
```bash
cd ../../db
cp .env.example .env      # ค่า default ตรงกับ docker-compose แล้ว
```

### 3. ติดตั้ง + สร้างตาราง + seed
```bash
npm install
npm run db:migrate        # สร้าง migration + ตารางทั้งหมด (+ extensions citext, pg_trgm)
npm run db:seed           # ใส่ roles, permissions, admin, master data
```

### 4. รัน index ขั้นสูง + audit trigger
```bash
psql "$DATABASE_URL" -f prisma/migrations/manual/advanced-indexes.sql
psql "$DATABASE_URL" -f prisma/migrations/manual/audit-immutable.sql
```

### 5. ตรวจ/แก้ข้อมูลด้วย GUI (ออปชัน)
```bash
npm run db:studio         # เปิด Prisma Studio
```

---

## บัญชี Admin เริ่มต้น (เปลี่ยนรหัสทันทีบน production)

```
email:    admin@ros.local       (override: SEED_ADMIN_EMAIL)
password: ChangeMe!2026          (override: SEED_ADMIN_PASSWORD)
```
> รหัส seed ใช้ scrypt (built-in). Phase 12 (auth) ใช้ Argon2id เป็นหลัก —
> โมดูล auth ต้องรองรับ verify รูปแบบ scrypt สำหรับบัญชี seed หรือให้ admin
> reset รหัสผ่านผ่าน flow "ลืมรหัสผ่าน" ตอน login ครั้งแรก

---

## คำสั่งที่ใช้บ่อย

| คำสั่ง | ทำอะไร |
|--------|--------|
| `npm run db:validate` | ตรวจ schema ถูกต้อง (ไม่ต้องมี DB) |
| `npm run db:format` | จัดรูปแบบ schema |
| `npm run db:migrate` | สร้าง migration ใหม่ + apply (dev) |
| `npm run db:migrate:deploy` | apply migration (production — ไม่สร้างใหม่) |
| `npm run db:seed` | seed ข้อมูลตั้งต้น |
| `npm run db:reset` | ล้าง + migrate + seed ใหม่ (dev เท่านั้น ⚠️) |
| `npm run db:studio` | เปิด GUI |

## Production (VPS — Phase 12)
- ใช้ `db:migrate:deploy` (ไม่ใช่ `db:migrate dev`)
- สร้าง DB role แยกสำหรับแอป + REVOKE UPDATE/DELETE บน `audit_logs`
- ตั้ง backup อัตโนมัติ (pg_dump → MinIO/R2) ตาม Phase 7/10

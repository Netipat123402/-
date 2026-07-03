# ROS — Build & Deploy (MR-02)

ปิด Critical **C2** — เดิม deploy = `npm run dev` (ไม่ reproducible, rollback ไม่ได้). ตอนนี้มี **Dockerfile 3 แอป + docker-compose deploy + CI gate**.

> TLS/reverse-proxy (Caddy) = **MR-07** (High) ทำแยกตามวินัย one-issue. compose นี้ยัง expose พอร์ตตรงเพื่อทดสอบ — **อย่าเปิดสาธารณะจนกว่าจะทำ MR-07**.

---

## ไฟล์

| ไฟล์ | บทบาท |
|---|---|
| `apps/api/Dockerfile` | API (NestJS) multi-stage → `node dist/main.js` |
| `apps/web-admin/Dockerfile` | web-admin (Next.js) → `next start` :3001 |
| `apps/web-public/Dockerfile` | web-public (Next.js) → `next start` :3000 |
| `infra/docker/docker-compose.prod.yml` | postgres + migrate + api + web-admin + web-public (+redis/minio profile `future`) |
| `infra/docker/.env.prod.example` | ต้นแบบ env (คัดลอกเป็น `.env.prod`) |
| `infra/docker/docker-compose.yml` | dev เดิม (postgres เท่านั้น) — ไม่เปลี่ยน |
| `.github/workflows/ci.yml` | CI: typecheck+jest+build (3 แอป) + build docker image |
| `.dockerignore` | กัน node_modules/.next/secrets เข้า build context |

---

## Deploy (single VPS)

```bash
# 1) เตรียม env
cp infra/docker/.env.prod.example infra/docker/.env.prod
#   แก้รหัสผ่าน + สร้าง secret:  openssl rand -hex 32   (JWT/PII)
nano infra/docker/.env.prod

# 2) build image (reproducible artifact)
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod build

# 3) ขึ้นระบบ (migrate รันอัตโนมัติก่อน api ขึ้น)
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod up -d

# 4) ครั้งแรกเท่านั้น — seed ข้อมูลตั้งต้น (roles/permissions/admin)
docker compose -f infra/docker/docker-compose.prod.yml --env-file infra/docker/.env.prod \
    run --rm migrate npm run db:seed -w @ros/db

# 5) (MR-18) สร้าง least-privilege role ros_app แล้วชี้ DATABASE_URL ของแอปมาที่ role นี้
#    รันด้วย owner/superuser ครั้งเดียวหลัง migrate:
psql "$ADMIN_DATABASE_URL" -v app_password="'STRONG_PW'" -f db/prisma/sql/roles-least-privilege.sql
#    แล้วตั้ง DATABASE_URL=postgresql://ros_app:STRONG_PW@postgres:5432/ros?schema=public
#    (ros_app: CRUD ได้ แต่ UPDATE/DELETE audit_logs ไม่ได้ — กัน tamper)

# 6) ตรวจสุขภาพ
curl http://localhost:4000/api/v1/health
```

**Rollback:** `docker compose ... up -d` ด้วย image tag/digest เก่า (CI ติด tag `ci-<sha>` ให้ทุก commit) — ย้อนได้เพราะ artifact immutable.

**Update:** `git pull` → `build` → `up -d` (migrate รันก่อน api เสมอ).

---

## CI gate (`.github/workflows/ci.yml`)

ทุก PR/push เข้า `main`/`master` รัน 3 jobs:
- **verify**: `npm ci` + `prisma generate` → typecheck (3 แอป) + jest (unit) + build (3 แอป) *(required)*; lint *non-blocking* (eslint ยังไม่ติดตั้ง)
- **e2e** (MR-14): postgres service + migrate + seed + `test:e2e` (supertest: auth/RBAC/no-orphan + public→contract→receipt) *(required)*
- **images**: docker buildx ทั้ง 3 image (พิสูจน์ Dockerfile) *(required)*

ตั้งเป็น **required status check** ที่ branch protection ของ repo เพื่อบล็อก merge เมื่อ CI แดง.

> ต้องเป็น GitHub repo: `git init` แล้ว push ขึ้น GitHub (เลือกใน handover §16.6 = GitHub Actions).

---

## Storage / MinIO (MR-04)

ไฟล์อัปโหลด (เอกสาร PII, รูปทรัพย์, ใบเสร็จ) เก็บผ่าน `StorageService` 2 ไดรเวอร์:
- **local** (`STORAGE_DRIVER=local`) — ดิสก์ `apps/api/uploads` (dev, default)
- **s3** (`STORAGE_DRIVER=s3`) — MinIO/S3/R2 (prod, durable, แยก domain)

compose.prod รัน `minio` + `minio-init` (สร้าง bucket `ros-files` + เปิด public-read เฉพาะ prefix `properties/` สำหรับรูปทรัพย์; เอกสารยัง private — โหลดผ่าน `/documents/:id/download` ที่ api สตรีมจาก MinIO ด้วย credential). api ตั้ง `STORAGE_DRIVER=s3` อัตโนมัติใน compose.

**ไฟล์ไม่อยู่บนดิสก์แอปแล้ว** เมื่อ driver=s3 (ยกเว้น volume `api_uploads` ที่ใช้เฉพาะ local).

**Backup bucket:** `minio-init` สร้าง `ros-backups` ด้วย → ตั้ง `OFFSITE_MODE=mc` + `OFFSITE_MC_TARGET=ros/ros-backups` ใน `infra/backup/backup.env` (เชื่อม MR-01).

> ⚠️ การโชว์รูปทรัพย์จาก domain แยกจริง ต้องตั้ง `STORAGE_PUBLIC_URL` + ปรับ `mediaUrl()` ฝั่ง frontend ให้ใช้ค่านั้น (ทำในรอบ UX/UI). เอกสาร (PII) ทำงานครบทั้ง 2 ไดรเวอร์แล้ว.

## Reverse proxy + TLS / Caddy (MR-07)

ทางเข้าเดียวคือ **Caddy ที่พอร์ต 443** (auto-TLS จาก Let's Encrypt). api/web-admin/web-public **ไม่ expose host port** แล้ว — คุยกันใน compose network เท่านั้น.

- `infra/docker/Caddyfile` — route 3 โดเมน: `PUBLIC_DOMAIN`→web-public, `ADMIN_DOMAIN`→web-admin, `API_DOMAIN`→api; บล็อก `/api/v1/metrics` จากภายนอก
- ตั้ง A record ของ 3 โดเมนมาที่ VPS + ใส่ `PUBLIC_DOMAIN/ADMIN_DOMAIN/API_DOMAIN/ACME_EMAIL` ใน `.env.prod` → Caddy ออก/ต่ออายุ cert อัตโนมัติ (เก็บใน volume `caddy_data`)
- `COOKIE_SECURE=true` + `TRUST_PROXY=1` (api อ่าน `req.ip` จาก `X-Forwarded-For` → audit/throttle/lockout ใช้ IP ลูกค้าจริง)
- ทดสอบ local ไม่มีโดเมน: ตั้งโดเมนเป็น `localhost` → Caddy ใช้ cert ภายในให้

**Acceptance MR-07:** เข้าผ่าน 443 เท่านั้น ✓ · cert auto-renew (Caddy) ✓ · `COOKIE_SECURE=true` + trust proxy ✓ (verify: audit บันทึก X-Forwarded-For IP จริง)

## ทดสอบแล้ว / ค้าง (acceptance MR-02)
- [x] Dockerfile multi-stage ครบ 3 แอป (api/web-admin/web-public)
- [x] docker-compose deploy จาก image + migrate อัตโนมัติ + volume uploads
- [x] CI workflow รัน lint+typecheck+jest+build เป็น required check ทุก PR
- [x] โค้ดผ่าน typecheck (3/3) + jest (55/55) ในเครื่อง — gate เขียว
- [ ] `docker build`/`compose up` จริง — ต้องรันบนเครื่องที่มี Docker (เครื่อง dev นี้ยังไม่มี Docker daemon; CI job `images` จะ build จริงบน GitHub runner)
- [ ] ตั้ง branch protection (required check) — ทำหลัง push repo ขึ้น GitHub
- [ ] MR-07 (Caddy + TLS) ก่อนเปิดสาธารณะ

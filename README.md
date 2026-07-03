# ROS — Real Estate Operating System

ระบบบริหารงานนายหน้าอสังหาริมทรัพย์ (เน้นปล่อยเช่า: คอนโด / บ้าน / ทาวน์โฮม / อพาร์ทเมนท์)

> **สถานะปัจจุบัน:** Phase 11 — Production Database
> เอกสารออกแบบทั้งหมด (Phase 1–10) สรุปไว้ที่ [`docs/`](docs/)

---

## โครงสร้าง Monorepo

```
ros/
├── apps/                    # แอป (สร้างใน Phase 12)
│   ├── web-public/          # เว็บลูกค้า (Next.js, SSR/SSG)
│   ├── web-admin/           # ระบบพนักงาน (Next.js)
│   └── api/                 # Backend (NestJS, modular monolith)
│
├── packages/                # Shared libraries (Phase 12)
│   ├── ui/ design-tokens/ shared-types/ validation/ ...
│
├── db/                      # ★ ฐานข้อมูล (Phase 11 — ที่นี่)
│   ├── prisma/              # schema + migrations
│   ├── seed/                # ข้อมูลตั้งต้น (roles, master data)
│   └── README.md
│
├── infra/                   # Infrastructure (Docker Compose — VPS)
│   └── docker/
│
└── docs/                    # เอกสารสถาปัตยกรรม Phase 1–10
```

## Tech Stack (ล็อกแล้ว — Phase 8/10)

| ชั้น | เทคโนโลยี |
|------|-----------|
| Monorepo | Turborepo + npm/pnpm workspace |
| Frontend | Next.js (TypeScript) — web-public + web-admin |
| Backend | NestJS — Modular Monolith |
| Database | **PostgreSQL + Prisma ORM** |
| Cache/Queue | Redis |
| Storage | MinIO (S3-compatible, self-hosted) |
| Edge/CDN | Cloudflare |
| Deploy | Single VPS + Docker Compose |

## เริ่มต้นใช้งานฐานข้อมูล (Phase 11)

ดูคู่มือใน [`db/README.md`](db/README.md)

```bash
# 1. เปิด PostgreSQL (ผ่าน Docker)
cd infra/docker && docker compose up -d postgres

# 2. ติดตั้ง + migrate + seed
cd db
npm install
npm run db:migrate      # สร้างตารางทั้งหมด
npm run db:seed         # ใส่ roles, permissions, master data
```

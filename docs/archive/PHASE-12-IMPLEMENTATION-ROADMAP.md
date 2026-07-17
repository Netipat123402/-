# ROS — Phase 12 Implementation Roadmap (4 สัปดาห์)

> แปลง `MASTER-REMEDIATION-BACKLOG.md` เป็นลำดับการทำงานจริงรายสัปดาห์ เพื่อพา ROS จาก **Score 48 (No-Go)** → **production-ready (Go)**
> หลักการลำดับ: (1) ตั้ง **ฐาน infra** ที่ของอื่นพึ่ง → (2) ปิด **Critical/High** → (3) **performance/data** → (4) **hardening/cleanup + go-live**
> อ้างอิงเฉพาะ finding จริง (MR-xx) · ทุกสัปดาห์มี **Exit Criteria** ที่วัดได้

**เป้าหมายปลายทาง:** ปิด Critical 4 + High 10 + Medium ที่จำเป็น → ผ่าน Go-criteria ใน `FINAL-PRODUCTION-AUDIT §3`

---

## 🗓 สัปดาห์ที่ 1 — Infrastructure Foundation (ปลด Critical ที่ของอื่นพึ่ง)

> ธีม: "ทำให้ deploy/observe/recover ได้" — ของพวกนี้ต้องมาก่อนเพราะงานอื่นพึ่ง

| ลำดับ | งาน (MR) | ผู้รับผิดชอบ | Effort |
|---|---|---|---|
| 1 | **MR-05** `enableShutdownHooks()` (quick win, ปลด H1) | Backend | S |
| 2 | **MR-02** Dockerfile 3 แอป (multi-stage) + CI gate (lint/typecheck/jest/build) | DevOps | L |
| 3 | **MR-06 + MR-10 + MR-11 + MR-19** มิเกรชัน `0011`: ย้าย advanced-indexes + trigram + sort index + CHECK (CONCURRENTLY / NOT VALID) | DB | M |
| 4 | **MR-01** Backup อัตโนมัติ (`pg_dump` cron → object storage) + ทดสอบ restore | SRE | M |
| 5 | **MR-07** Reverse proxy + TLS (Caddy) หน้า 3 แอป | DevOps | M |

**Exit Criteria สัปดาห์ 1:**
- `migrate deploy` บน DB เปล่า → `pg_indexes` มี FTS/trigram/sort/geo ครบ (MR-06) ✔
- CI required check รันทุก PR (MR-02) ✔ · image build เป็น tag/digest
- SIGTERM → log disconnect + timer clear (MR-05) ✔
- backup รอบแรก + restore drill สำเร็จ (MR-01) ✔
- เข้าผ่าน HTTPS 443 เท่านั้น, COOKIE_SECURE ทำงาน (MR-07) ✔

---

## 🗓 สัปดาห์ที่ 2 — Security Hardening + Storage Durability (ปลด Critical/High ที่เหลือ)

> ธีม: "ปิดช่องโจมตี + ทำไฟล์ให้ durable" — พึ่ง infra จากสัปดาห์ 1

| ลำดับ | งาน (MR) | ผู้รับผิดชอบ | Effort |
|---|---|---|---|
| 1 | **MR-04** ย้ายไฟล์ → MinIO/S3 (wire StorageService, presigned) + backup bucket | Backend/DevOps | L |
| 2 | **MR-09 + MR-21** magic-byte validation + บล็อก SVG/HTML + `attachment`+nosniff | Backend/Security | M |
| 3 | **MR-15** helmet (api) + Next `headers()` (nosniff/X-Frame/HSTS/CSP) | Backend/Frontend | S |
| 4 | **MR-16** `REVALIDATE_SECRET` เข้า env.validation + constant-time | Backend | S |
| 5 | **MR-17** บังคับ `PII_ENCRYPTION_KEY` ใน staging + เลิก dev-key fallback | Backend/Security | S |
| 6 | **MR-18** DB role `ros_app` + REVOKE audit_logs | DB/DevOps | M |
| 7 | **MR-03** Monitoring/Sentry/log-shipping/alerting (เริ่มตั้งคู่กับ deploy) | SRE | L |

**Exit Criteria สัปดาห์ 2:**
- อัป SVG ปลอม → 400; ไฟล์อยู่ MinIO ไม่ใช่ local disk (MR-04/09) ✔
- response มี nosniff/X-Frame-Options/CSP/HSTS (MR-15) ✔
- prod boot โดยไม่ตั้ง REVALIDATE_SECRET/PII key (staging) → ไม่บูต (MR-16/17) ✔
- `SET ROLE ros_app; DELETE FROM audit_logs` → denied (MR-18) ✔
- Sentry รับ error + alert 5xx/DB-latency/disk ทำงาน (MR-03) ✔

---

## 🗓 สัปดาห์ที่ 3 — Functional Bugs + Performance + Data Integrity

> ธีม: "แก้สิ่งที่ผู้ใช้เจอ + ทำให้เร็วเมื่อข้อมูลโต" — พึ่ง index จากสัปดาห์ 1

| ลำดับ | งาน (MR) | ผู้รับผิดชอบ | Effort |
|---|---|---|---|
| 1 | **MR-12** ส่ง `sort` ไป API ทุกลิสต์ (เลิก client-side sort) | Frontend/Backend | M |
| 2 | **MR-13** แยกนับ view ออกจาก endpoint ที่ ISR cache | Backend | M |
| 3 | **MR-23** pin timezone (Asia/Bangkok) ในข้อความ notify | Backend | S |
| 4 | **MR-24** server-side search dropdown + debounce list search | Frontend/Backend | M |
| 5 | **MR-08** แก้ FK agent-Restrict (deletion-guard + soft-delete user) | Backend/DB | M |
| 6 | **MR-25** แก้ `DELETE /audit-logs/feed` (ลบ endpoint / partition-archive) | Backend | S |
| 7 | **MR-26** error state ใน manual-load pages | Frontend | S |
| 8 | **MR-22** JWT `tokenVersion` (revoke ทันที) | Backend/Security | M |
| 9 | **MR-20** expression index lockout + retention/partition log | DB/SRE | L |

**Exit Criteria สัปดาห์ 3:**
- sort ใน /leads,/contracts ฯลฯ ต่อเนื่องข้ามหน้า (MR-12) ✔
- เปิด detail 100 ครั้ง → viewCount ≈ 100 (MR-13) ✔
- notify นัด 14:00 ไทย แสดง "14:00" (MR-23) ✔
- เลือกเจ้าของรายที่ 101+ ได้; list search debounce 1 request (MR-24) ✔
- ลบ user-agent ที่มีสัญญาได้ (ไม่ 400) (MR-08) ✔
- suspend user → token เก่าใช้ไม่ได้ ~30s (MR-22) ✔
- ตาราง log ไม่โตเกิน retention (MR-20) ✔

---

## 🗓 สัปดาห์ที่ 4 — Testing, Quality Gate, Cleanup + Go-Live

> ธีม: "พิสูจน์ว่าพร้อม + เก็บกวาด + เปิดจริง"

| ลำดับ | งาน (MR) | ผู้รับผิดชอบ | Effort |
|---|---|---|---|
| 1 | **MR-14** Integration/E2E test + ผูกเข้า CI gate | QA/Backend | L |
| 2 | **MR-27** service layer ให้ 5 single-file modules | Backend | M |
| 3 | **MR-28** ย้าย `RequestMeta` → `common/` | Backend | S |
| 4 | **MR-29 + MR-30** แตก god component + DTO addTerm | Frontend/Backend | M |
| 5 | **MR-31** keyset pagination (list ใหญ่) | Backend | M |
| 6 | **MR-32/33/34/35/36/39** hardening เล็ก: CORS dev, CAPTCHA, author_ip retention, seed admin, lead-convert race, seed lifecycle | ทีม | M (รวม) |
| 7 | **Load test**: public listing+search ≥10k properties (วัด p95, DB pool) | SRE/QA | M |
| 8 | **Go-Live**: รัน Production Launch Checklist + Post-Deploy Verification (FINAL §10) | ทุกบทบาท | — |

**Exit Criteria สัปดาห์ 4 (= Go-criteria):**
- CI มี integration+E2E เป็น required check (MR-14) ✔
- regression test ปิด BUG-H1/H2/M1/M2/M4 ✔
- load test ผ่าน: p95 latency ยอมรับได้ที่ ≥10k properties, DB pool ไม่ saturate ✔
- Production Launch Checklist + Rollback + DR + Monitoring + Security + Performance Checklist (FINAL §9-15) ครบ ✔
- **Production Readiness Score ≥ 80** (Operations score ขึ้นจาก 22 → ≥70)

---

## ลำดับการแก้ไขจริง (Critical-path เรียงตามเวลา)

```
สัปดาห์ 1:  MR-05 → MR-02 → MR-06(+10,11,19) → MR-01 → MR-07
สัปดาห์ 2:  MR-04 → MR-09(+21) → MR-15 → MR-16 → MR-17 → MR-18 → MR-03
สัปดาห์ 3:  MR-12 → MR-13 → MR-23 → MR-24 → MR-08 → MR-25 → MR-26 → MR-22 → MR-20
สัปดาห์ 4:  MR-14 → MR-27 → MR-28 → MR-29(+30) → MR-31 → [MR-32..39] → Load test → Go-Live
ภายหลัง (post-launch): MR-37 shared package · MR-40 conn-limit · MR-41 Redis · MR-42/43 UX · MR-44 RLS
```

## เกณฑ์ตัดสิน Go/No-Go ปลายสัปดาห์ 4

| เงื่อนไข | ต้องผ่าน |
|---|---|
| Critical C1-C4 (backup/deploy/monitor/storage) ปิดครบ | ✅ บังคับ |
| High H1-H6 (shutdown/indexes/upload/TLS/sort/viewCount) ปิดครบ | ✅ บังคับ |
| Backup restore drill + Rollback drill สำเร็จ | ✅ บังคับ |
| Load test ผ่านเกณฑ์ p95 | ✅ บังคับ |
| CI gate (lint/type/jest/e2e/build) เขียว | ✅ บังคับ |
| Medium ที่เหลือ (M7-M17) | 🟡 ทำได้ → ดี, ค้างได้บางส่วนถ้ามี mitigation |
| Low | 🟢 post-launch ได้ |

**ถ้าผ่านทั้งหมด → 🟢 GO production launch**
**ถ้าค้าง Critical/High ใด → 🔴 NO-GO (เลื่อน)**

---

## หมายเหตุการดำเนินงาน (จาก source จริง)

- **migration ปลอดภัย:** `pg_dump` ก่อนทุกครั้ง (จนกว่า MR-01 จะ auto) · index ใหม่ `CREATE INDEX CONCURRENTLY` · CHECK/FK ใหญ่ใช้ `NOT VALID` แล้ว `VALIDATE` แยก
- **งานที่กระทบ behavior น้อยสุด ทำก่อน:** MR-05/06/15/16 (config/index) → MR-04/08/22 (เปลี่ยน flow)
- **คู่ที่ควรทำพร้อมกัน:** MR-04↔MR-09 (storage+upload), MR-06↔MR-10/11/19 (มิเกรชันเดียว), MR-12↔MR-31 (list pattern)
- **post-launch ได้ (ไม่บล็อก):** MR-37 (shared package), MR-41 (Redis — จำเป็นเฉพาะตอน scale-out >1 instance), MR-44 (RLS)

*จบ Roadmap — Phase 12 (4 สัปดาห์ → production-ready)*

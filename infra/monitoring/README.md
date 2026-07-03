# ROS — Monitoring, Error Tracking & Alerting (MR-03)

ปิด Critical **C3** — เดิมมีแค่ `/health` (production-blind). ตอนนี้มี **metrics + structured logs + error tracking + alerting**.

---

## สิ่งที่อยู่ในแอปแล้ว (apps/api)

| ด้าน | รายละเอียด |
|---|---|
| **Metrics** | `GET /api/v1/metrics` (Prometheus format) — Node (mem/cpu/event-loop/gc) + HTTP (req count/latency ราย method/route/status, route = pattern กัน cardinality) + **Prisma DB-pool/query** (`prisma_*`) + security counters |
| **Security metrics** | `ros_login_failed_total` (brute-force), `ros_token_reuse_total` (token ถูกขโมย), `ros_unhandled_errors_total` (5xx) |
| **Error tracking** | Sentry ผูกใน `AllExceptionsFilter` (จับ 5xx + แนบ `request_id`) — เปิดด้วย env `SENTRY_DSN` (ไม่ตั้ง = no-op) |
| **Structured logs** | JSON 1 บรรทัด/log เมื่อ `LOG_FORMAT=json` (default ใน production) → log aggregation (Loki/ELK) parse ได้ |
| **/metrics auth** | ตั้ง `METRICS_TOKEN` → ต้องใส่ `Authorization: Bearer <token>` |

**env ที่เกี่ยว (ทั้งหมด optional):** `LOG_FORMAT` · `SENTRY_DSN` · `SENTRY_RELEASE` · `SENTRY_TRACES_SAMPLE_RATE` · `METRICS_TOKEN`

> หมายเหตุ: `/metrics` ต้องการ Prisma preview feature `metrics` (เปิดแล้วใน `db/prisma/schema.prisma` — client-only, ไม่มี migration)

---

## สแต็ก monitoring (infra/monitoring)

| ไฟล์ | บทบาท |
|---|---|
| `prometheus.yml` | scrape `api:4000/api/v1/metrics` + node-exporter |
| `alert.rules.yml` | alert: ApiDown · High5xxRate · ServerErrors · p95 latency · DB latency · LoginFailedSpike · **RefreshTokenReuse** · DiskAlmostFull · HighApiMemory |
| `alertmanager.yml` | routing → Email + LINE webhook (ตัวอย่าง — แก้ค่าจริงก่อนใช้) |
| `docker-compose.monitoring.yml` | Prometheus + Alertmanager + Grafana(:3002) + node-exporter |

### รัน
```bash
docker compose -f infra/docker/docker-compose.prod.yml \
               -f infra/monitoring/docker-compose.monitoring.yml \
               --env-file infra/docker/.env.prod up -d
# Prometheus :9090 · Alertmanager :9093 · Grafana :3002 (admin / GRAFANA_ADMIN_PASSWORD)
```
อยู่ network เดียวกับ app stack จึง scrape `http://api:4000` ได้. ถ้าตั้ง `METRICS_TOKEN` ให้ใส่ใน `prometheus.yml` (มี comment ชี้จุด).

---

## ทดสอบแล้ว (acceptance MR-03)
- [x] metrics endpoint คืน req/latency/error + **DB-pool** (`prisma_*`) — ยืนยันรันจริง (`/metrics` :4099 + :4000)
- [x] route label เป็น pattern (`/api/v1/public/properties/:code`) ไม่ใช่ id จริง — กัน cardinality
- [x] Sentry ผูก `AllExceptionsFilter` + `request_id` (เปิดด้วย `SENTRY_DSN`, no-op ถ้าไม่ตั้ง)
- [x] log JSON เมื่อ `LOG_FORMAT=json`
- [x] alert rules ครบ: 5xx · DB latency · disk · login_failed spike · token-reuse
- [x] unit test ผ่าน (observability.spec.ts) + typecheck + build + jest 61/61
- [ ] เชื่อม Sentry DSN จริง + SMTP/LINE ของ Alertmanager (ต้องมี credential — handover §16.5)
- [ ] รัน monitoring stack จริงบนเครื่องที่มี Docker + ทำ Grafana dashboard

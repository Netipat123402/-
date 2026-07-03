# ROS Backup & Recovery (MR-01)

> ป้องกัน **data loss ถาวร** — สำรองฐานข้อมูล (29 ตาราง รวม PII/สัญญา/audit) + ไฟล์อัปโหลด (`apps/api/uploads`) อัตโนมัติ และ **ทดสอบ restore ได้จริง**

ปิด Critical **C1 / MR-01**. แก้เฉพาะ operations — ไม่แตะ source code ของแอป, ไม่มี migration.

---

## ไฟล์ในโฟลเดอร์นี้

| ไฟล์ | หน้าที่ |
|---|---|
| `backup.sh` | สำรอง DB (`pg_dump -Fc`) + ไฟล์ (`uploads.tar.gz`) + manifest/checksum + prune + offsite |
| `restore.sh` | กู้คืน DB + ไฟล์ จากโฟลเดอร์ backup |
| `test-restore.sh` | **ทดสอบ restore อัตโนมัติ** → ฐานเปล่าชั่วคราว + เทียบจำนวนแถว (acceptance) |
| `lib.sh` | helper ร่วม: หา pg binaries, แปลง `DATABASE_URL` → `PG*`, โหลด config |
| `backup.env.example` | ต้นแบบ config (คัดลอกเป็น `backup.env`) |
| `com.ros.backup.plist` | ตั้งเวลาอัตโนมัติบน macOS (launchd) |

> `backup.env`, `*.log`, และโฟลเดอร์ backup ถูก gitignore (ดู `.gitignore` ของโปรเจกต์)

---

## ใช้งานเร็ว (dev — Postgres.app)

```bash
cd infra/backup
./backup.sh            # สร้าง backup ล่าสุด → ~/ros-backups/ros-<timestamp>/
./test-restore.sh      # พิสูจน์ว่า restore ได้ + ข้อมูลครบ (ฐานชั่วคราว, ไม่แตะของจริง)
```

กู้คืนของจริง:
```bash
./restore.sh ~/ros-backups/ros-20260622-170000           # ถามยืนยันก่อนเขียนทับ
./restore.sh ~/ros-backups/ros-20260622-170000 --db ros_copy --yes   # ลงฐานอื่น (กู้ทดสอบ)
```

โครงสร้าง backup แต่ละชุด:
```
ros-<timestamp>/
├── db.dump          # pg_dump custom format (-Fc) — restore ทีละ object ได้
├── uploads.tar.gz   # properties/ + documents/
├── manifest.txt      # เวอร์ชัน + row counts + เวลา
└── SHA256SUMS        # checksum (restore.sh ตรวจอัตโนมัติ)
```

---

## ตั้งเวลาอัตโนมัติ

### macOS (launchd) — เครื่องนี้
```bash
sed "s#<PROJECT_ROOT>#$(cd ../.. && pwd)#g" com.ros.backup.plist > ~/Library/LaunchAgents/com.ros.backup.plist
launchctl load ~/Library/LaunchAgents/com.ros.backup.plist
launchctl list | grep com.ros.backup      # ตรวจว่าติดตั้งแล้ว
```
รันทุกวัน **02:00**.

### Linux VPS (cron)
```cron
# /etc/cron.d/ros-backup
0 2 * * *  ros  /srv/ros/infra/backup/backup.sh           >> /var/log/ros-backup.log 2>&1
30 2 * * 0 ros  /srv/ros/infra/backup/test-restore.sh     >> /var/log/ros-backup-test.log 2>&1
```
แนะนำ: backup ทุกวัน + **test-restore อัตโนมัติทุกสัปดาห์** (backup ที่ restore ไม่ได้ = ไม่มี backup)

---

## Offsite (สำคัญ — backup ในเครื่องเดียวไม่ป้องกัน disk ตาย)

ตั้งใน `backup.env`:
```bash
OFFSITE_MODE=mc
OFFSITE_MC_TARGET="myminio/ros-backups"     # ต้อง mc alias set ก่อน
```
รองรับ `mc` (MinIO/S3 — เชื่อมกับ **MR-04**), `aws` (S3/R2), `rsync`. เมื่อ MR-04 (MinIO) เสร็จ ให้เก็บ backup ลง bucket แยกนอกเครื่องที่รันแอป

---

## RPO / RTO

| ตัวชี้วัด | ค่าเป้าหมาย | ที่มา |
|---|---|---|
| **RPO** (ข้อมูลที่ยอมเสียได้) | **≤ 24 ชม.** | backup รายวัน 02:00 — เหตุการณ์ที่แย่สุดคือพังก่อนรอบถัดไป เสียได้ ≤ 1 วัน |
| **RTO** (เวลาในการกู้คืน) | **≤ 1 ชม.** | สร้างฐานใหม่ + `pg_restore` + คลาย `uploads.tar.gz` (ข้อมูลขนาดต้น–กลางใช้เวลาไม่กี่นาที) |
| Retention | 14 วัน (local) + ตามนโยบาย bucket (offsite) | `RETENTION_DAYS` |

ลด RPO ได้ภายหลังด้วย PITR (WAL archiving) — ดู "ขั้นต่อไป"

### ขั้นตอน Disaster Recovery (เมื่อ DB/ไฟล์หาย)
1. เตรียมเครื่อง + ติดตั้ง PostgreSQL 16 + Postgres.app/Docker
2. ดึง backup ล่าสุดจาก offsite (`mc cp` / `aws s3 cp` / `rsync`)
3. `./restore.sh <backup-dir> --db ros` → ตรวจ checksum + restore DB + uploads อัตโนมัติ
4. ตั้ง `DATABASE_URL` ของแอปให้ชี้ฐานที่กู้คืน → เปิดระบบ → ตรวจ `/api/v1/health`
5. ยืนยันข้อมูล: เทียบ `manifest.txt` กับจำนวนแถวจริง

> ⚠️ **PII key:** ฐานเก็บ `id_card_no` เป็น ciphertext (AES-256-GCM) — ต้องสำรอง `PII_ENCRYPTION_KEY` **แยกต่างหาก** ใน secret manager มิฉะนั้นถอดรหัสไม่ได้ตลอดกาล (อยู่นอกขอบเขต DB backup — ดู Known Risks ใน handover)

---

## ทดสอบแล้ว (acceptance MR-01)

- [x] `pg_dump` รันได้ → `db.dump` valid (`pg_restore --list` ผ่าน)
- [x] ไฟล์ `uploads.tar.gz` ครบ properties + documents
- [x] `test-restore.sh` restore ลงฐานเปล่า + จำนวนแถว core tables ตรงต้นฉบับ
- [x] audit immutable trigger ติดมากับ restore (โครงสร้างครบ)
- [x] prune backup เก่ากว่า retention
- [x] checksum ตรวจตอน restore
- [ ] **offsite จริง** — รอ MR-04 (MinIO) แล้วตั้ง `OFFSITE_MODE`
- [ ] ตั้ง cron/launchd บนเครื่อง production จริง

## ขั้นต่อไป (นอกขอบเขต MR-01)
- PITR (WAL archiving / pgBackRest) เพื่อ RPO ระดับนาที
- backup `PII_ENCRYPTION_KEY` + secrets ลง secret manager
- เชื่อม offsite กับ MinIO bucket หลัง MR-04

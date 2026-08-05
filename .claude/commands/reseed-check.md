---
description: re-seed demo data (mock-bulk) อย่างปลอดภัย — กัน FK landmine ที่ทำ demo หายครึ่ง
---

re-seed ข้อมูล demo admin โดยไม่โดน FK landmine. อ่าน memory `ros-reseed-and-contract-side-effects` ประกอบ.

**ไฟล์:** `db/seed/mock-bulk.ts` (16 props CD/HS/TH/AP-2026-100x · `mock.owner*`/`mock.cust*` · 8 contracts CT-2026-100x)
**รัน:**
```bash
export PATH="/Users/iiamtikm/.local/node/bin:$PATH"
cd db && DATABASE_URL="postgresql://iiamtikm@localhost:5432/ros?schema=public&host=/tmp" node_modules/.bin/tsx seed/mock-bulk.ts
```
(ไม่มี flag = clean+recreate · `--clean` = ลบอย่างเดียว · `db:seed` ปกติ **ไม่** สร้าง business data)

**⚠️ Landmine (เคยโดน 2026-07-16):** `clean()` ลบ children แล้วค่อย `owner.deleteMany({email startsWith mock.owner})` — ถ้ามี property ขยะอ้าง mock owner ค้างอยู่ → **โยน FK P2003**. ตอนนั้น clean ลบ contracts/appointments/customers/leads ไปแล้วก่อน throw → demo หายครึ่ง.

**ก่อน re-seed ให้เช็คก่อน:**
1. หา property ที่ ownerId ∈ mock owners แต่ไม่ใช่ของ mock-bulk (ขยะค้าง) — ถ้ามี ลบ property นั้น + children ก่อน
2. ค่อยรัน mock-bulk
3. ข้อมูล non-mock (props/customers/leads/owners ต้นฉบับ 2026-000x) ปลอดภัย — mock-bulk ไม่แตะ

**side-effect ที่ต้องรู้ก่อนทดสอบแล้วล้าง:**
- **renew** = original `active→ended` + สร้าง draft ใหม่ — **UI ย้อนไม่ได้**
- **DELETE ผ่าน UI** = soft-delete (`deletedAt`) — raw prisma ต้อง filter เอง
- **sign** ปิดจนกว่าจะแนบ + verify เอกสาร lease (guard ถูก) — ทดสอบ path enabled ต้อง upload ไฟล์จริง

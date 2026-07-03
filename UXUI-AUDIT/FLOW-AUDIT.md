# FLOW AUDIT — ROS (Lead · Customer · Contract · Appointment · Calendar · Property)
> อิง **โค้ดจริงปัจจุบัน = source of truth** (อ่านจาก `apps/api` + `apps/web-admin`) · วันที่ 2026-06-26
> รวมเอกสารที่ผู้ใช้ขอ (LEAD_FLOW / CUSTOMER_FLOW / CONTRACT_FLOW / CALENDAR_FLOW) ไว้ไฟล์เดียวเพื่อเห็นการเชื่อมข้ามโมดูล + ตอบคำถาม "flow ซ้ำ"

---

## 0) ภาพรวม (จุดเข้า → ปลายทาง)

```
[เว็บ public: ฟอร์มนัด/สอบถาม]  ─┐
[แอดมิน: + สร้าง Lead (walk-in/โทร)] ─┴─►  LEAD  ──(แปลงเป็นลูกค้า)──►  CUSTOMER  ──►  CONTRACT
                                          │                                         ▲
                                          └──(นัดชม)──► APPOINTMENT ──(แสดง)──► CALENDAR
                                                                                  
PROPERTY (เจ้าของ=OWNER) ── ผูกกับ ──► APPOINTMENT / CONTRACT
```

**กฎสำคัญที่พบในโค้ด:** `customer` ถูก **สร้างได้ทางเดียวเท่านั้น** = แปลงจาก Lead (`POST /leads/:id/convert`). ไม่มี endpoint/ปุ่ม "เพิ่มลูกค้า" ตรง ๆ (customer.controller ไม่มี `@Post`; หน้า customers ไม่มีปุ่มเพิ่ม + empty state เขียนว่า "ลูกค้าจะถูกสร้างเมื่อแปลงจาก Lead"). → **ทางสร้างคนมีจุดเดียว ไม่มี path ซ้ำ**

---

## 1) LEAD FLOW
**จุดเข้า:** (ก) เว็บ public ส่งฟอร์ม → `POST /public/leads` · (ข) แอดมินกด `+ สร้าง Lead (walk-in/โทรศัพท์)` → `POST /leads`
**Table:** `leads` (มี `customerId?`, `assignedToId?`, `status: new|working|closed`, `source`, `lostReason?`)

| ปุ่ม (หน้า leads) | กดแล้ว | Route/API | เขียน Table | เงื่อนไข |
|---|---|---|---|---|
| สร้าง Lead | สร้าง lead ใหม่ | `POST /leads` | leads | walk-in/phone |
| (แถว) | เปิด **Modal** รายละเอียด | `GET /leads/:id` | — | row→Modal (ไม่มีหน้า detail แยก) |
| รับมาดูแล | claim เป็นผู้ดูแล | `POST /leads/:id/assign` | leads.assignedToId | status=new |
| เปลี่ยนสถานะ | new→working→closed | `PATCH /leads/:id/status` | leads.status, lostReason | — |
| **แปลงเป็นลูกค้า** | สร้าง customer + ปิด lead | `POST /leads/:id/convert` | **customers (create)** + leads(customerId,status=closed) | status=working & ยังไม่ convert |
| ลบ | ลบ lead | `DELETE /leads/:id` | leads.deletedAt | **เฉพาะที่ยังไม่ convert** (มี customerId/นัด = ลบไม่ได้) |

**deep-link:** แจ้งเตือน/ค้นหา → `/leads?focus={id}` → เปิด Modal นั้น (ทำใน E1/E4)

## 2) CUSTOMER FLOW
**จุดเข้า:** **มีทางเดียว** = `POST /leads/:id/convert` (copy `fullName/phone/email/branchId` จาก lead → customers). ไม่มีปุ่มสร้างตรง
**Table:** `customers` (มี `leads[]`, `contracts[]`)

| ปุ่ม (หน้า customers) | กดแล้ว | Route/API | Table |
|---|---|---|---|
| (แถว) | ไปหน้า detail | `/customers/:id` (มีหน้าจริง) | `GET /customers/:id` |
| แก้ไข (ใน detail) | inline edit | `PATCH /customers/:id` | customers |
| ลบ | ลบลูกค้า | `DELETE /customers/:id` | customers.deletedAt |
| (การ์ดสัญญา) | ไปสัญญานั้น | `/contracts/:id` | — |

**deep-link:** ค้นหา/แจ้งเตือน → `/customers/:id` ตรง (มีหน้า detail)

## 3) CONTRACT FLOW
**จุดเข้า:** หน้า contracts กด `+ สร้างสัญญา` (Modal) — ต้องเลือก **ทรัพย์(ว่าง) + เจ้าของ + ลูกค้า(ที่มีอยู่) + พนักงาน**
**Table:** `contracts` (FK → property, owner, customer, agent) + `contract_terms`

| ปุ่ม | กดแล้ว | Route/API | Table | หมายเหตุ |
|---|---|---|---|---|
| สร้างสัญญา | สร้าง (เชื่อม customer/property/owner เดิม — **ไม่สร้าง customer**) | `POST /contracts` | contracts | ต้องมี customerId อยู่แล้ว (assertCustomer) |
| (แถว) | หน้า detail | `/contracts/:id` | `GET /contracts/:id` | |
| เซ็นสัญญา | ลงนาม | `POST /contracts/:id/sign` | contracts.signedAt | |
| เปลี่ยนสถานะ | draft→active→ended | `PATCH /contracts/:id/status` | contracts.status | |
| ต่อสัญญา | สร้างสัญญาใหม่จากเดิม | `POST /contracts/:id/renew` | contracts (ใหม่, renewedFromId) | |
| ออกใบเสร็จ | gen receipt | `POST /contracts/:id/receipt` | — | |
| เพิ่ม/ลบ เงื่อนไข | terms | `POST/DELETE /contracts/:id/terms` | contract_terms | |
| ลบ | ลบสัญญาร่าง | `DELETE /contracts/:id` | contracts.deletedAt | |

## 4) APPOINTMENT FLOW
**จุดเข้า:** หน้า appointments หรือ calendar กด `+ เพิ่มนัด` — เลือก **Lead + ทรัพย์ + พนักงาน + วันเวลา**
**Table:** `appointments` (FK → lead, property, agent)

| ปุ่ม | Route/API | Table |
|---|---|---|
| สร้างนัด | `POST /appointments` | appointments |
| (แถว/การ์ดปฏิทิน) | เปิด Modal รายละเอียด (`?focus={id}`) | `GET /appointments/:id` |
| เลื่อนนัด | `POST /appointments/:id/reschedule` | appointments.scheduledAt |
| ยกเลิก | `POST /appointments/:id/cancel` | appointments.status,cancelReason |
| ไม่มาตามนัด | `POST /appointments/:id/no-show` | appointments.status |
| เสร็จสิ้น | `POST /appointments/:id/complete` | appointments.status |

## 5) CALENDAR FLOW
**สำคัญ:** ปฏิทิน **ไม่มี entity ของตัวเอง** — เป็น "view" ที่ `GET /appointments?limit=100` แล้ววางตามวัน
- **Event มีชนิดเดียว = appointment** (ไม่มี Lead/Customer/Contract event แยกบนปฏิทิน)
- กดการ์ดนัด → `/appointments?focus={id}` → เปิด detail นัดนั้น (แก้ #1 รอบนี้)
- **ลบ/แก้นัด → sync:** ปฏิทิน fetch สดทุกครั้ง → นัดที่ลบ (deletedAt) ไม่โผล่; แก้แล้วเห็นทันทีเมื่อโหลด · focus ที่ลบแล้ว → toast "ไม่พบนัดหมายนี้" (ไม่ค้าง)

## 6) PROPERTY / OWNER (ย่อ)
- Property: `+ เพิ่มทรัพย์` (wizard 1-4, `POST /properties` → draft) → `approve` (เผยแพร่) / `reject` (ถอน) / media / `isFeatured` toggle. Detail `/properties/:id`
- Owner: เพิ่มเจ้าของ (`POST /owners`) → ผูกกับ property. Detail `/owners/:id`

---

## 7) ⚠️ คำถาม "flow ซ้ำกัน ตรง Lead/ลูกค้า" — วิเคราะห์

**ข้อเท็จจริงจากโค้ด:** ทางสร้าง "คน" มี **จุดเดียว** (Lead → convert → Customer). ไม่มี path สร้าง customer ซ้ำ → **โครงสร้าง flow ไม่ซ้ำ**

**สิ่งที่ทำให้ "รู้สึก" ซ้ำ (และคำอธิบาย):**
1. **คนที่ convert แล้วอยู่ 2 ลิสต์** — Lead (status=closed, มี customerId) **และ** Customer (คนเดียวกัน). นี่คือ "ประวัติ Lead" ที่เก็บไว้โดยตั้งใจ (ลบ lead ที่ convert แล้วไม่ได้) → **ไม่ใช่บั๊ก** แต่ดูเหมือนซ้ำ
2. **หน้า Lead กับ Customer หน้าตาคล้ายกัน** (คน + ชื่อ/เบอร์/อีเมล) → สับสนเชิงแนวคิด

**ความเสี่ยงจริง (เล็ก) ที่ควรรู้:** `convert` **ไม่มี dedup** — ถ้าสร้าง Lead ใหม่ให้คนที่เป็นลูกค้าอยู่แล้วแล้ว convert → ได้ลูกค้าซ้ำ (ไม่เช็คเบอร์ซ้ำ)

**ข้อเสนอ (ต้องอนุญาตก่อน — แตะ backend/UX):**
- (ก) ตอน convert: ถ้ามี customer เบอร์เดียวกันอยู่แล้ว → เตือน/ให้เลือก "ใช้ลูกค้าเดิม" แทนสร้างใหม่ *(แตะ backend)*
- (ข) ในลิสต์ Lead: ทำ badge "→ เป็นลูกค้าแล้ว" + ลิงก์ไป `/customers/:id` ให้ชัด (ลด confusion) *(UI ล้วน — บางส่วนมีในmodalแล้ว)*
- (ค) ไม่ต้องรวม logic เพิ่ม — เพราะจุดสร้างเป็นจุดเดียวอยู่แล้ว (สถาปัตยกรรมถูก)

---

## 8) Route → Table → Permission (สรุป)
| Module | Detail route | สร้างที่ | Tables | Permission prefix |
|---|---|---|---|---|
| Lead | row→Modal (`?focus=`) | public form / admin | leads | `lead` |
| Customer | `/customers/:id` | **lead convert เท่านั้น** | customers | `customer` |
| Contract | `/contracts/:id` | `+ สร้างสัญญา` | contracts, contract_terms | `contract` |
| Appointment | row→Modal (`?focus=`) | `+ เพิ่มนัด` | appointments | `appointment` |
| Calendar | — (view) | — | (อ่าน appointments) | `appointment` |
| Property | `/properties/:id` | wizard 1-4 | properties, property_media | `property` |
| Owner | `/owners/:id` | `+ เพิ่มเจ้าของ` | owners | `owner` |

> เอกสารนี้สร้างจากการอ่านโค้ดรอบ 2026-06-26 · ดูรายละเอียด schema เต็มที่ `DATABASE-AUDIT.md` + `RELATIONSHIP-MAP.md` (ของเดิม)

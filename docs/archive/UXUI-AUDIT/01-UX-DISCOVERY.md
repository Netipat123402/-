# PHASE 1 — UX DISCOVERY
> Information / Feature / Navigation Architecture · User & Business Flow · Screen Hierarchy
> อ้างอิงโค้ดจริง (`NAV`, `SLOTS`, RBAC `can()`, routes) · วันที่: 2026-06-24

---

## 1. Information Architecture (IA)

ระบบมี **2 IA แยกขาดตามกลุ่มผู้ใช้** ซึ่งถูกต้องตามหลัก (ลูกค้า ≠ ทีมงาน):

### 1.1 web-public — IA แบน (flat) เน้นค้นพบทรัพย์
```
Home (/)
├── ค้นหา/หมวด → Properties (/properties?filters)
│                 └── รายละเอียดทรัพย์ (/properties/[code]) → นัดชม (AppointmentForm)
├── Community board (anonymous)
└── Privacy (/privacy)
```
- ลึกสุด **2 ระดับ** จาก Home ถึง conversion (นัด) → ดีต่อ SEO และ cognitive load ต่ำ

### 1.2 web-admin — IA จัดกลุ่มตาม flow ธุรกิจอสังหา
จาก `NAV` ใน `layout.tsx` (เรียงตาม flow จริง: ตั้งคลัง → งานขาย):
```
ภาพรวม      → แดชบอร์ด (/)
คลังทรัพย์   → เจ้าของ (/owners) → ทรัพย์ (/properties)
งานขาย      → Lead → นัดหมาย → ปฏิทิน → ลูกค้า → สัญญา
ระบบ (ซ่อนใน ProfileMenu) → บันทึกกิจกรรม · ผู้ใช้งาน · ตั้งค่า · ชุมชน
```
- **การตัดสินใจ IA ที่ดี:** กลุ่ม "ระบบ" ถูกย้ายออกจาก sidebar หลัก → ProfileMenu เพื่อลด noise ของเมนูที่ใช้น้อย

---

## 2. Feature Architecture
| โดเมน | ฟีเจอร์หลัก | Lifecycle |
|---|---|---|
| Property | สร้าง(wizard)/แก้ไข/รูป(ปก,ลบ,lightbox)/เผยแพร่/ถอน | draft → available → rented |
| Owner | CRUD เจ้าของ + ผูกทรัพย์ | — |
| Lead | สร้าง(walk-in)/รับดูแล/เริ่มดูแล/แปลงเป็นลูกค้า/ปิด(เหตุผล)/ลบ | new → working → closed |
| Appointment | สร้าง(ดูทรัพย์/นอกรอบ)/เลื่อน/ยกเลิก/no-show/เสร็จ | upcoming → done/cancelled |
| Customer | จาก Lead converted + แก้ไข inline | — |
| Contract | สร้าง/ลงนาม/ต่อสัญญา/ใบเสร็จ/สิ้นสุด | draft → active → ended |
| Cross-cutting | Global search · Notifications · Activity/Audit · Settings · Community moderation · RBAC | — |

---

## 3. Navigation Architecture (สองโหมดจาก CSS variant)

### Desktop (`mouse`, ≥768 ไม่มี touch) — **Rail sidebar 84px**
- ไอคอน + ป้ายเล็กแนวตั้ง, แบ่งกลุ่มด้วยเส้นบาง, ไม่มีชื่อกลุ่ม (rail แคบ)
- Header: GlobalSearch + NotificationBell + ProfileMenu

### Mobile/Tablet (`touch`) — **Bottom-nav ลอย 5 ช่องแบบ IG**
- `หน้าหลัก · นัด · ทรัพย์(กลาง,ทอง) · ค้นหา · โปรไฟล์`
- หุบเล็กเมื่อเลื่อนลง / ขยายเมื่อเลื่อนขึ้น (rAF throttle)
- "โปรไฟล์" เปิด drawer ขวา รวมเมนูที่เหลือ + ระบบ + logout
- **กฎไม่ซ้ำ:** `BOTTOM_HREFS` กันเมนูที่อยู่บน bottom-nav ไม่ให้โผล่ซ้ำใน drawer

> ทุกลิงก์ใน NAV ผูก `perm` → ซ่อนอัตโนมัติถ้าไม่มีสิทธิ์ (`can()`); "ชุมชน" เป็น role-gated (super_admin/company_admin/branch_manager)

---

## 4. Screen Hierarchy (ระดับความลึกของหน้า)
| ระดับ | admin | public |
|---|---|---|
| L0 entry | Dashboard | Home |
| L1 list/search | owners, properties, leads, appointments, calendar, customers, contracts | properties |
| L2 detail | property/[id], customer/[id], contract/[id], owner/[id] | properties/[code] |
| L2.5 action | wizard new/edit, modal สร้าง/detail/confirm | AppointmentForm (in-page) |
| Lเสริม | notifications, users, audit, settings, community | privacy |

**ลึกสุด 2–3 ระดับ** ทั้งสองแอป → IA ตื้น เข้าถึงเร็ว (สอดคล้องเป้า "Fast Workflow")

---

## 5. Per-screen Spec (Purpose · User · Entry · Exit · CTA · Business Goal)

> รวบเป็นตารางอ่านเร็ว — รายละเอียด journey อยู่ใน `02-USER-JOURNEY.md`

### web-public
| หน้า | Purpose | User | Entry | Main CTA | Business Goal |
|---|---|---|---|---|---|
| `/` | ค้นพบทรัพย์ + สร้างความน่าเชื่อถือ | Guest/Visitor | SEO/แชร์/โฆษณา | ค้นหา / เปิดทรัพย์แนะนำ | ดึง traffic → lead |
| `/properties` | คัดกรองทรัพย์ | Visitor | Home, หมวด, ลิงก์ลึก | เปิดทรัพย์ | นำสู่หน้า detail |
| `/properties/[code]` | ตัดสินใจ + ติดต่อ | Visitor/Customer | ผลค้นหา, แชร์ | **นัดชม / LINE** | **conversion (lead)** |
| `/privacy` | เชื่อถือ/กฎหมาย (PDPA) | ทุกคน | footer | — | trust/compliance |

### web-admin
| หน้า | Purpose | User | Main CTA | Secondary | Business Goal |
|---|---|---|---|---|---|
| `/` Dashboard | รู้ว่า "วันนี้ต้องทำอะไร" | ทุก role | เปิดงานใน Agenda | เปลี่ยนช่วงเวลา | ลดงานตกหล่น |
| `/properties` | จัดการคลังทรัพย์ | staff/manager | + เพิ่มทรัพย์ | filter/ค้นหา | คลังพร้อมขาย |
| `/properties/[id]` | จัดการ 1 ทรัพย์ + รูป + เผยแพร่ | staff/manager | เผยแพร่/ถอน | แก้ไข/รูป | ทรัพย์ออนไลน์ |
| `/leads` | แปลง lead เป็นลูกค้า | staff | รับ/เริ่มดูแล/แปลง | สร้าง walk-in | ปิดการขาย |
| `/appointments`·`/calendar` | บริหารนัด | staff | + นัด | เลื่อน/ยกเลิก | ลด no-show |
| `/customers` | ดูแลลูกค้า | staff | แก้ไข inline | — | retention |
| `/contracts` | สัญญาเช่า | manager | ลงนาม/ต่อ/ใบเสร็จ | — | รายได้ |
| `/users`·`/audit`·`/settings`·`/community` | บริหารระบบ | admin/manager | ตาม role | — | governance |

---

## 6. ข้อสังเกตเชิง Discovery (นำเข้า audit เฟส 3–4)
1. **Entry point ของ admin คือ Dashboard ที่ "task-first"** (Agenda = สิ่งที่ต้องทำ) ไม่ใช่ vanity metrics → ดีมาก
2. **Public มี conversion path สั้น** (Home→detail→นัด ใน 2 hop) แต่ CTA "ติดต่อ" ใน Header ลิงก์ `https://line.me` (placeholder) — ต้องชี้ไป LINE OA จริง (ดูเฟส 3/8)
3. **Exit points ของ admin modal** ชัด (footer ตรึง, ปุ่มปิด) — UX modal เป็นมาตรฐานเดียว
4. **ไม่มี breadcrumb** ในหน้า detail admin — ระดับตื้นพอที่จะยังไม่จำเป็น แต่ดูในเฟส 7

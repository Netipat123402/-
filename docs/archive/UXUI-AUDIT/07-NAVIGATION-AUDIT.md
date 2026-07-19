# PHASE 7 — NAVIGATION AUDIT
> Public nav · Admin nav · Sidebar · Topbar · Tabs · Breadcrumbs · Mobile nav
> หา: เมนูซ้ำ · เมนูเยอะ · คลิกเยอะ · ซับซ้อน · หา feature ยาก
> วันที่: 2026-06-24

---

## 1. Public Navigation — ✅ มินิมอลมาก
- `Header`: โลโก้ "R" + `LangToggle` + ปุ่ม "ติดต่อ" (pill เส้นทอง) — แค่นั้น
- ไม่มีเมนูหลัก (search-driven) → cognitive load ต่ำ, เหมาะ marketplace
- `Footer`: ค้นหาทรัพย์ · privacy · LINE
- **พบ 🟠:** "ติดต่อ" + footer LINE → `https://line.me` (placeholder) ต้องผูก OA จริง
- **พบ 🟢:** ไม่มีลิงก์ "ทรัพย์ทั้งหมด" ใน Header (เข้าได้ผ่าน search/หมวดเท่านั้น) — เพิ่มได้เพื่อ discoverability

## 2. Admin Navigation — ✅ จัดกลุ่มตาม flow ธุรกิจ
- Sidebar rail (desktop) 3 กลุ่ม: ภาพรวม / คลังทรัพย์ / งานขาย
- ระบบ (users/audit/settings/community) → ProfileMenu (ลด noise)
- **เมนูซ้ำ?** ❌ — `BOTTOM_HREFS` กันซ้ำระหว่าง bottom-nav กับ drawer
- **เมนูเยอะ?** ❌ — 7 หลัก + 4 ระบบในเมนูรอง

## 3. Sidebar (rail 84px)
- ไอคอน+ป้ายเล็กแนวตั้ง, active = ink เต็ม, คั่นกลุ่มเส้นบาง
- **พบ 🟢:** rail แคบไม่มีชื่อกลุ่ม → ผู้ใช้ใหม่ต้องเรียนรู้ไอคอน (มีป้ายช่วยแล้ว ลดผลกระทบ)
- **พบ 🟢:** ไม่มีปุ่มขยาย/ยุบ rail เป็น full sidebar (บางคนชอบเห็นชื่อกลุ่ม) — optional

## 4. Topbar (header)
- desktop: search + bell + profile (ชิดขวา)
- mobile: + เพิ่มทรัพย์ (ซ้าย) + search/bell/profile (ขวา)
- sticky + backdrop-blur → พรีเมียม ✅

## 5. Tabs — ไม่ใช้ tab navigation (ใช้ FilterBar/Segmented แทน) ✅ เหมาะ

## 6. Breadcrumbs — 🟢 มี back link แล้ว (ไม่ใช่ breadcrumb เต็ม)
- **แก้ไขข้อมูล (ตรวจซ้ำ 2026-06-24):** หน้า detail ทั้ง 4 (`properties/[id]`, `customers/[id]`, `contracts/[id]`, `owners/[id]`) **มี back link อยู่แล้ว** — `← กลับ` (arrow-left + ข้อความ) ชี้กลับหน้า list ที่ถูกต้อง รูปแบบเดียวกันทุกหน้า
- ดังนั้น C1 (กลับจากหน้าลึก) **ถือว่ามีแล้ว** — ผู้ใช้ที่ deep-link จาก search/แชร์ กลับได้
- **ข้อเสนอ (optional, ค่าต่ำ):** เปลี่ยน "กลับ" → ระบุปลายทาง ("← ทรัพย์", "← ลูกค้า") เพื่อบอกว่ากลับไปไหน · หรือทำ breadcrumb เต็มถ้าต่อไปมีชั้น >3

## 7. Mobile Navigation (bottom-nav แบบ IG)
- 5 ช่อง, ลอยกลาง, หุบ/ขยายตามทิศเลื่อน, center = ทอง
- ค้นหา/โปรไฟล์เป็น action (overlay/drawer) ไม่ใช่ route → ฉลาด
- z-index จัดชั้นถูก (เหนือ search overlay, ต่ำกว่า modal)
- **พบ 🟢:** ทรัพย์ "center" เด่น แต่ "เจ้าของ/ปฏิทิน/ลูกค้า/สัญญา" ต้องเข้าผ่าน drawer (โปรไฟล์) → คลิกเพิ่ม 1 ครั้งสำหรับเมนูรอง (ยอมรับได้ตาม IG pattern)

## 8. Global Search (เครื่องมือ navigation ข้ามหน้า)
- overlay มือถือ + inline desktop, debounce
- **ตรวจเพิ่ม:** keyboard nav (↑↓/Enter), entity coverage, recent — เป็นโอกาส "Raycast-grade" command palette (เฟส Luxury)

---

## สรุป Navigation findings
| # | จุด | ปัญหา | ระดับ | เฟส |
|---|---|---|---|---|
| N1 | Public Header/Footer | LINE placeholder | 🟠 High | ✅ A1 done |
| N2 | Admin detail | ~~ไม่มี breadcrumb/back~~ → จริง ๆ มี back link แล้ว (แก้ข้อมูล) | 🟢 มีแล้ว | C1 ปิด |
| N3 | Public Header | ไม่มีลิงก์ "ทรัพย์ทั้งหมด" | 🟢 Low | ✅ C2 done |
| N4 | Admin rail | ไม่มีชื่อกลุ่ม / ขยาย rail | 🟢 Low | C |
| N5 | Global search | ยกเป็น command palette | 🟢 Luxury | F |

**ภาพรวม:** navigation **ไม่ซับซ้อน ไม่ซ้ำ ไม่เยอะ** — ผ่านเกณฑ์ SPECIAL FOCUS เกือบทุกข้อ. งานที่เหลือคือ plumbing (LINE) + polish (breadcrumb, command palette)

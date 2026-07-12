# 🔍 PAGE-BY-PAGE QA SWEEP — ทุกหน้า ทุกปุ่ม ทุก device/responsive

> **กฎ:** ไล่ทีละหน้า → ทีละ device → ทีละ orientation → ทีละส่วน · กด/เปิดทุกปุ่ม/เมนู/โมดัล · เทียบก่อน-หลังทุกครั้ง · เสนอก่อนแก้ (เพิ่ม/ลด/ลบได้หมด) · ห้ามอวย · minimal/clean/ไม่รก
> **Protocol:** ดู memory `ros-comparison-responsive-protocol` · **มือถือ 375 → iPad 768(ตั้ง)/1024(นอน) → Desktop 1440**
> **สถานะ:** ⬜ ยังไม่ทำ · 🟡 กำลังทำ · ✅ ผ่าน · 🐞 เจอปัญหา (ดูโน้ตท้ายไฟล์)

---

## A) WEB-PUBLIC — 5 หน้า (:3000)

| # | หน้า | มือถือ375 | iPad-ตั้ง768 | iPad-นอน1024 | Desktop1440 | ปุ่ม/interactive หลัก |
|---|---|---|---|---|---|---|
| 1 | `/` home | ✅ | ✅ | ✅ | ✅ | สะอาดทุกจอ ไม่ล้น ไม่รก · ไม่ต้องแก้ (ภาพการ์ด=seed mock) |
| 2 | `/properties` listings | ✅ | ✅ | ✅ | ✅ | สะอาดทุกจอ · filter bottom-sheet(มือถือ)+FilterBar(desktop) ok · ไม่ล้น |
| 3 | `/properties/[code]` detail | ✅ | ✅ | ✅ | ✅ | **functional ครบ:** gallery bar✓ Lightbox(X+Esc)✓ AppointmentForm→201✓ StickyCTA #appointment scroll✓ ReadMore=conditional · ไม่ล้นทุกจอ |
| 4 | `/saved` | ✅ | ✅ | ✅ | ✅ | **favorite CRUD ครบ:** add→localStorage→ขึ้น saved→count badge sync→remove→empty · grid=listings(verified) · ไม่ล้น |
| 5 | `/privacy` | ✅ | ✅ | ✅ | ✅ | content page · capped 768px · อ่านง่าย · ไม่ล้น |

## B) WEB-ADMIN — 21 หน้า (:3001, login `admin@ros.local`)

| # | หน้า | มือถือ375 | iPad-ตั้ง768 | iPad-นอน1024 | Desktop1440 | interactive (button\|onClick\|Link) |
|---|---|---|---|---|---|---|
| 1 | `/login` | ✅ | ⬜ | ⬜ | ⬜ | **functional ผ่าน:** fill+submit→authed (requestSubmit) · session persist · ไม่ล้น |
| 2 | `/` dashboard | 🟡 | ⬜ | ⬜ | ⬜ | **มือถือ:** stat cards✓ todo tabs✓ NotificationBell✓ "+"เปิด wizard✓ · เหลือ: GlobalSearch, user menu, bottom-nav + iPad/desktop |
| 3 | `/properties` | ⬜ | ⬜ | ⬜ | ⬜ | 3\|3\|0 + ListView (landed หลัง delete — ยังไม่เทสเต็ม) |
| 4 | `/properties/[id]` | 🟡 | ⬜ | ⬜ | ⬜ | **มือถือ:** create→detail→delete(→404)✓ · **image upload POST/media 201✓ · ลบรูป DELETE 200✓** (seed คืนสภาพ) · Lightbox✓ · เหลือ: แก้ไขข้อมูล, เผยแพร่ toggle, tabs + iPad/desktop |
| 5 | `/properties/[id]/edit` | ⬜ | ⬜ | ⬜ | ⬜ | PropertyForm |
| 6 | `/properties/new` | ✅ | ✅ | ✅ | ✅ | **wizard 4 ขั้น ครบทุก device:** มือถือ=CRUD เต็ม(POST 201+DELETE) · iPad ตั้ง/นอน+desktop=modal centered ฟิลด์ครบ ไม่ล้น |
| 7 | `/leads` | ⬜ | ⬜ | ⬜ | ⬜ | 11\|13\|0 (หนัก) |
| 8 | `/appointments` | ⬜ | ⬜ | ⬜ | ⬜ | 10\|16\|0 (หนัก) |
| 9 | `/calendar` | ⬜ | ⬜ | ⬜ | ⬜ | 8\|7\|0 |
| 10 | `/contracts` | ⬜ | ⬜ | ⬜ | ⬜ | 5\|4\|0 |
| 11 | `/contracts/[id]` | ⬜ | ⬜ | ⬜ | ⬜ | 9\|11\|1 (หนัก) |
| 12 | `/customers` | ⬜ | ⬜ | ⬜ | ⬜ | ListView |
| 13 | `/customers/[id]` | ⬜ | ⬜ | ⬜ | ⬜ | 5\|5\|2 |
| 14 | `/owners` | ⬜ | ⬜ | ⬜ | ⬜ | 3\|2\|0 |
| 15 | `/owners/[id]` | ⬜ | ⬜ | ⬜ | ⬜ | 5\|5\|2 |
| 16 | `/community` | ⬜ | ⬜ | ⬜ | ⬜ | 3\|3\|0 |
| 17 | `/notifications` | ⬜ | ⬜ | ⬜ | ⬜ | 5\|11\|1 |
| 18 | `/audit` | ⬜ | ⬜ | ⬜ | ⬜ | 0\|1\|0 |
| 19 | `/users` | ⬜ | ⬜ | ⬜ | ⬜ | 7\|6\|0 |
| 20 | `/search` | ⬜ | ⬜ | ⬜ | ⬜ | GlobalSearch |
| 21 | `/settings` | ⬜ | ⬜ | ⬜ | ⬜ | 1\|0\|0 |

+ **shared chrome (ทุกหน้า admin):** sidebar/bottom-nav (layout), NotificationBell, GlobalSearch, Icon

---

## ลำดับที่เสนอ (มือถือก่อนทั้งหมด แล้วค่อยไต่ device)
1. **public ก่อน** (5 หน้า เล็ก customer-facing redesign เสร็จแล้ว) → มือถือ → iPad → desktop
2. **admin ต่อ** (21 หน้า) เริ่มหน้าใช้บ่อย: dashboard → properties → leads → appointments

## 🐞 ปัญหาที่เจอ (log)
- **[tooling ไม่ใช่บั๊กแอป]** preview_screenshot ที่ admin **1440×900** เรนเดอร์เพี้ยน (เนื้อหากระจุกมุมซ้ายบน) — DOM วัดได้ layout ถูกเต็มจอ · แก้: ใช้ **1280×800** สำหรับ admin desktop
- **ยังไม่เจอบั๊กแอป** จาก home + listings (สะอาดทุกจอ ไม่ล้น ไม่รก)
- **จุดสังเกต (ไม่ใช่บั๊ก รอเจ้าของตัดสิน):** PropertyCard mini-carousel ใช้ **dots** (เช่น 9–11 รูป) — ถ้ารูปเยอะ dots จะถี่ · อาจพิจารณาเปลี่ยนเป็น progress-bar แบบ detail เพื่อความสม่ำเสมอ (แต่เพิ่ม = อาจรก ต้องชั่ง)
- **seed mock images** (พระราม 8 = ภาพ TikTok analytics, ป้าย 1/10 ฯลฯ) = ข้อมูล seed ไม่ใช่บั๊ก (กันภาพพังด้วย onError แล้ว)
- **[created test data]** ส่งฟอร์มนัด → สร้าง lead จริงใน DB: ชื่อ "QA ทดสอบระบบ" เบอร์ 081-234-5678 (property AP-2026-1001) — ลบทีหลังตอน sweep หน้า admin/leads ได้

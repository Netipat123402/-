# PHASE 3 — UX AUDIT
> Navigation · Search · Filters · Pagination · Tables · Forms · CRUD · Auth · Upload · Settings · Notifications
> ให้คะแนน Usability / Efficiency / Learnability / Accessibility · วันที่: 2026-06-24

---

## บทสรุปคะแนน

| มิติ | คะแนน | เหตุผลย่อ |
|---|---|---|
| **Usability** | **A−** | pattern เดียวทั้งระบบ, state-aware actions, ทุก state มีทางออก |
| **Efficiency** | **B+** | dashboard task-first, debounce search; แต่ add-property หลายคลิก, public ไม่มี favorite |
| **Learnability** | **A−** | ภาษาไทยชัด, ปุ่มเปลี่ยนตามสถานะ, คำอธิบาย destructive ดีมาก |
| **Accessibility** | **B+** | focus-visible ทุก control, aria-label ครบจุดหลัก, touch 44px; แต่ยังไม่มี skip-link/aria-live ครบ |

---

## 1. Navigation — ✅ แข็งแรง
- โหมดแยกตามอุปกรณ์ (sidebar rail / bottom-nav) ผ่าน CSS variant → ไม่มี hydration flash
- เมนูซ่อนตามสิทธิ์, ไม่ซ้ำระหว่าง bottom-nav กับ drawer
- **พบ:** ไม่มี indication "หน้าปัจจุบันอยู่กลุ่มไหน" บน rail (ไม่มีหัวกลุ่ม) — เล็กน้อย เพราะมีไอคอน+active state
- **พบ 🟡:** ไม่มี breadcrumb ในหน้า detail (`/properties/[id]`) → กลับด้วยปุ่ม back/เบราว์เซอร์เท่านั้น

## 2. Global Search — ✅ ดี
- `GlobalSearch` (116) overlay มือถือ + inline desktop; debounce ผ่าน `useDebounce`
- **ตรวจเพิ่ม (เฟส 7):** ครอบคลุม entity ใดบ้าง, มี keyboard nav (↑↓/Enter) หรือไม่

## 3. Filters — ✅ มาตรฐานเดียว (`FilterBar`)
- ช่องค้นหาอยู่นอก (ใช้บ่อย) + filter/sort ซ่อนหลังปุ่มเดียว + badge นับ active + "ล้างตัวกรอง"
- มือถือ/เดสก์ท็อปใช้ Modal เดียวกัน (ไม่เด้งล่างให้แป้นพิมพ์กิน)
- **ดีเด่น:** debounce 350ms ยิง API ครั้งเดียวหลังหยุดพิมพ์ (MR-24)

## 4. Pagination
- admin: `Pagination` + กฎ `PAGE_SIZE=8`, แสดง "x–y จาก N", ซ่อนเมื่อหน้าเดียว ✅
- public: **❌ ไม่มี pagination** ใน `/properties` (ดึง limit=24 ครั้งเดียว) → 🟡 High-ish สำหรับ growth

## 5. Tables / Lists — ✅ เด่นที่สุดของระบบ
- `ListView<T>`: ตาราง desktop / การ์ด mobile อัตโนมัติจาก flag คอลัมน์เดียวกัน
- กฎ 8 แถว/หน้า → ไม่มีตารางแน่นเกิน, hover row, แตะทั้งแถวเปิด detail
- **พบ 🟢:** ตารางไม่มี sort by header (sort อยู่ใน FilterBar) — เป็น design choice ที่โอเคบนมือถือ

## 6. Forms / CRUD — ✅ ดีมาก
- `Field`/`Combobox` มี error/hint รูปแบบเดียว, input 16px กัน iOS zoom
- **PropertyForm = wizard 4 ขั้น** validate รายสเต็ป + เด้งสเต็ปผิดตอน submit + progress ชัด
- ChipGroup สำหรับ enum สั้น (ประเภท/เฟอร์), amenity จัดกลุ่ม + bucket "อื่น ๆ" อัตโนมัติ
- ConfirmDialog แทน `window.confirm`, destructive ขอเหตุผลได้
- **พบ 🟢:** validation บางหน้าใช้ inline error เอง (เช่น leads) ขณะ wizard มี `fe` แยก — pattern คล้ายแต่ไม่ใช่ helper เดียว (ดูเฟส 5)

## 7. Authentication / Authorization — ✅ (ห้ามแตะ logic ตามกติกา)
- `/login` quick-role; `useAuth().can()` คุมการแสดงผลทุกปุ่ม/เมนู (UI ตรงกับ backend RBAC)
- auto-logout idle 30 นาที (security) — UX: ไม่มี warning ก่อน logout → 🟡 ควรเตือน 1 นาทีก่อน (UI only)

## 8. Upload Flow (รูปทรัพย์ / เอกสาร)
- `DocumentSection` (152) + `Lightbox`; รูปทรัพย์อยู่ในหน้า detail (อัปโหลด/ตั้งปก/ลบ)
- `ProgressBar` มีไว้สำหรับงานยาว ✅
- **ตรวจเพิ่ม (เฟส 4):** สถานะ error อัปโหลด, ลาก-วาง, จำกัดชนิด/ขนาดไฟล์มี feedback หรือไม่

## 9. Settings Flow
- `/settings` ฟอร์มบริษัท + read-only system/policy + "บันทึกแล้ว" feedback (toast + inline) ✅
- editable ตาม `can('setting','update')` — read-only state ชัด (disabled fields)

## 10. Notifications
- `NotificationBell` (227) — ใหญ่สุดในกลุ่ม component; มีหน้า `/notifications` เต็ม
- **ตรวจเพิ่ม:** mark-as-read, real-time/polling, empty state (เฟส 4)

---

## 11. UX Anti-patterns — สแกนหาแล้ว: **พบน้อยมาก**
| Anti-pattern | พบ? | หมายเหตุ |
|---|---|---|
| ปุ่มที่ทำไม่ได้ยังโชว์ | ❌ | actions state-aware |
| destructive ไม่มี confirm | ❌ | ConfirmDialog ทุกจุด |
| ตารางแน่นเกิน | ❌ | PAGE_SIZE=8 |
| ฟอร์มยาวหน้าเดียว | ❌ | wizard แบ่งสเต็ป |
| filter ซับซ้อนรก | ❌ | ซ่อนหลังปุ่มเดียว |
| 0 ลวงตา (API ล่มโชว์ 0) | ❌ | dashboard มี ErrorState (MR-26) |
| ค้นหายิงทุกตัวอักษร | ❌ | debounce 350ms |
| **ไม่มี breadcrumb ในหน้าลึก** | ⚠️ | ตื้นพอ แต่ควรพิจารณา |
| **auto-logout ไม่เตือน** | ⚠️ | 30 นาทีหายเงียบ |
| **public ไม่มี pagination** | ⚠️ | scale risk |

---

## 12. สรุป UX findings เรียงตามผลกระทบ
1. 🟠 **public ไม่มี pagination** → เพิ่ม load-more/หน้า (เฟส B)
2. 🟠 **CTA LINE placeholder** → ผูก setting `company.contact.lineOaId` (เฟส A)
3. 🟡 **auto-logout ไม่เตือนล่วงหน้า** → modal เตือน + ต่ออายุ (เฟส A/E)
4. 🟡 **add-property หลายคลิก** → รวมเพิ่มรูปในขั้นจบ wizard หรือ deep-link (เฟส E)
5. 🟢 **ไม่มี breadcrumb / favorite / onboarding empty-state** → polish (เฟส E/F)

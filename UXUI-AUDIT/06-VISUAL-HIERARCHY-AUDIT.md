# PHASE 6 — VISUAL HIERARCHY AUDIT
> Heading / Section / CTA / Card / Table / Form hierarchy รายหน้า
> หา: ทุกอย่างเด่นหมด · CTA แข่งกัน · ไม่มีจุดโฟกัส · สแกนยาก
> วันที่: 2026-06-24

---

## หลักการที่ระบบใช้ (ดี)
- **1 primary CTA ต่อหน้า** (`.btn-gold`) + secondary เป็น ghost → ไม่แข่งกัน
- `PageHeader` (h1 + count จาง + action) สร้าง hierarchy หัวหน้าเหมือนกันทุกหน้า
- `SectionLabel` (uppercase faint) เป็น "ชั้นรอง" ที่ไม่แย่งซีน h1

---

## รายหน้า

### Dashboard (`/`) — ✅ hierarchy ดีเด่น
```
L1 วันที่ (eyebrow muted)         ← เบา
L2 KPI 4 (text-30 เด่น, ป้ายเล็ก) ← จุดโฟกัสตัวเลข
L3 "สิ่งที่ต้องทำ" (h2 + segmented control)
   └ Agenda rows (primary text + meta จาง)
```
- โฟกัสชัด: ตัวเลข KPI → งานที่ต้องทำ. ไม่มี vanity chart มากวน. **ผ่าน**

### Property list (`/properties`) — ✅
- PageHeader + count, FilterBar, ListView. primary cell ตัวหนา, sub จาง, ราคา/สถานะชิดขวา → สแกนง่าย

### Lead detail (modal) — ✅ จัดลำดับ "สิ่งที่เซลต้องรู้ก่อน"
```
PRIMARY   ชื่อ + แตะโทร + สถานะ (Avatar 48)
PRIMARY   ความต้องการลูกค้า (อ่านก่อน)
SECONDARY ข้อมูลติดต่อ/ผู้ดูแล (dl 2 คอลัมน์)
SECONDARY ทรัพย์ที่สนใจ (กดได้)
ADVANCED  เหตุผลปิด (เฉพาะ closed)
ACTIONS   ปุ่มตามสถานะ (คั่นด้วย border-top)
```
- คอมเมนต์ในโค้ดระบุชั้น PRIMARY/SECONDARY/ADVANCED ตรง ๆ → ทีมคิดเรื่องนี้แล้ว **ผ่าน**

### PropertyForm (wizard) — ✅
- Step indicator ด้านบน (เลข→เช็ค), 1 การ์ดต่อสเต็ป, ปุ่ม "ถัดไป/บันทึก" ขวาล่าง + "ขั้นที่ x/4"
- ลด cognitive load จากฟอร์มยาว **ผ่าน**

### Public Home — ✅ แต่มีจุดสังเกต
```
Hero (ink gradient, gold eyebrow, h1 ใหญ่) ← โฟกัสแบรนด์
SearchBar overlap hero                     ← โฟกัส action หลัก
หมวด 4 (การ์ดเท่ากัน)
carousel หลายหมวด (แนะนำ/BTS/MRT/pet)
Community board
```
- 🟡 **หลาย carousel เรียงต่อกัน** อาจทำให้ "ไม่มีลำดับความสำคัญ" ระหว่างหมวด — แต่ละหมวดน้ำหนักเท่ากัน → พิจารณาเน้น "แนะนำ" ให้เด่นกว่า
- 🟡 **Community board ปนท้าย Home** ดึงโฟกัสจาก conversion เล็กน้อย

### Public Property detail — (ตรวจจากโครง) 
- gallery + ราคา gold เด่น + StickyCTA มือถือ → CTA ไม่หาย **ดี**

---

## ปัญหา hierarchy ที่พบ (รวม)
| # | หน้า | ปัญหา | ระดับ |
|---|---|---|---|
| H1 | Public Home | หลาย carousel น้ำหนักเท่ากัน → ไม่มีลำดับ | 🟡 Med |
| H2 | Public Home | Community ปนท้าย ลดโฟกัส conversion | 🟢 Low |
| H3 | Admin rail | ไม่มีหัวกลุ่ม (เล็กน้อย) | 🟢 Low |
| H4 | ทั่วไป | arbitrary type size ทำ scale ไม่เป๊ะข้ามหน้า | 🟢 Low |

**สรุป:** hierarchy โดยรวม **แข็งแรงผิดคาด** — ทีมคอมเมนต์ระดับ PRIMARY/SECONDARY ในโค้ด. ปัญหาที่เหลือเป็น public composition ไม่ใช่ระบบพัง

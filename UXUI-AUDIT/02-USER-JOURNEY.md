# PHASE 2 — USER JOURNEY MAPPING
> Task / Screen / Decision / Conversion journeys · Dead ends · Friction
> อ้างอิง flow จากโค้ดจริง (handlers, modal states, lifecycle) · วันที่: 2026-06-24

---

## A. PUBLIC WEBSITE

### A1. Guest → Visitor → Lead (conversion journey หลัก)
```
[Guest] เปิด Home
  → เห็น hero + SearchBar (overlap hero) + หมวด 4 + carousel (แนะนำ/BTS/MRT/petfriendly)
  → [Decision] ค้นหาเอง  หรือ  คลิกหมวด/ทรัพย์แนะนำ
  → /properties (grid 3 คอลัมน์ desktop / 1 มือถือ) + ResultCount
  → เปิดทรัพย์ /properties/[code]
  → gallery + สเปก + ราคา + ReadMore + StickyCTA (มือถือ)
  → [Conversion] AppointmentForm (นัดชม) หรือ ปุ่ม LINE
```
**ความยาว:** 2–3 หน้า · cognitive load ต่ำ · CTA ราคาทองเด่นชัดในการ์ด

#### Friction / Dead ends (public)
| ระดับ | จุด | อาการ | อ้างอิง |
|---|---|---|---|
| 🟠 High | Header "ติดต่อ" + Footer LINE | `href="https://line.me"` (placeholder) ไม่ใช่ OA จริง | `Header.tsx` |
| 🟡 Med | `/properties` ไม่มี pagination | ดึง `limit=24` ใบเดียว — ทรัพย์เกิน 24 จะไม่เห็น | `properties/page.tsx` |
| 🟡 Med | ไม่มี "บันทึก/รายการโปรด" | visitor ที่ยังไม่นัด ไม่มีที่เก็บทรัพย์ที่สนใจ → กลับมาหายาก | — |
| 🟢 Low | Community board บน Home | ผสมเนื้อหา community กับ marketplace อาจลดโฟกัส conversion | `page.tsx` |

### A2. Visitor (i18n) journey
- `LangToggle` TH/EN, dict กลาง (`lib/lang` + `T`) → ครบทั้งสองภาษา; ทรัพย์ใช้ `pick(title, lang)` + fallback
- **ดี:** ราคา/หน่วยแปลภาษา (`bed`/`นอน`, `sqm`/`ตร.ม.`) · **ช่องว่าง:** description ทรัพย์อาจมีแต่ TH (titleEn optional)

---

## B. ADMIN

### B1. Staff — "เช้านี้ทำอะไร" (task journey)
```
Login (quick-role) → Dashboard
  → KPI 4 (ทรัพย์ว่าง/Lead ดูแล/นัดรอพบ/สัญญามีผล) — กดเข้าหน้าที่กรองแล้ว
  → การ์ด "สิ่งที่ต้องทำ" (Agenda) เลือกช่วง วันนี้/7วัน/30วัน
    → นัดหมาย → /calendar
    → Lead ใหม่ → /leads?status=new
    → สัญญาใกล้ครบ → /contracts/[id]
```
**ดีเด่น:** dashboard เป็น *actionable* (ทุกแถวกดไปทำงานต่อได้) ไม่ใช่ dashboard โชว์เลขเฉย ๆ

### B2. Lead → Customer (conversion journey, จาก `leads/page.tsx`)
```
เปิด Lead (modal) → เห็นความต้องการ + ทรัพย์ที่สนใจ
  [new]    → "เริ่มดูแล" (btn-primary)
  [working]→ "แปลงเป็นลูกค้า" (btn-gold)  | "ปิด Lead (ไม่สำเร็จ)" + เหตุผล
  [assign] → "รับ Lead นี้มาดูแล" (ถ้ายังไม่ใช่ของตน)
  [closed] → แสดงผลสำเร็จ/ลบได้ถ้ายังไม่แปลง
```
**Decision journey ชัดเจน:** ปุ่ม action เปลี่ยนตามสถานะ — ไม่โชว์ปุ่มที่ทำไม่ได้ (state-aware)
- ✅ Empty/loading/error states ครบ (`useList` + `ListView`)
- ✅ destructive แยกชัด: "ปิด Lead" (soft) vs "ลบ Lead" (hard, เฉพาะยังไม่แปลง) + คำอธิบายเลือกอันไหน

### B3. เพิ่มทรัพย์ → เผยแพร่ (screen journey)
```
ทรัพย์ → +เพิ่มทรัพย์ → wizard 4 ขั้น (ข้อมูลหลัก→ทำเล→ราคา&ห้อง→สิ่งอำนวยฯ)
  → บันทึก → property/[id] → เพิ่มรูป → ตั้งปก → เผยแพร่
```
- ✅ wizard validate รายสเต็ป + เด้งกลับสเต็ปที่ผิดตอน submit
- ✅ มี `QuickAddProperty` (modal ลัดจาก + มุมซ้ายบนมือถือ) เป็นทางลัด
- 🟡 ขั้นตอนรวม ~9–12 คลิก (เพิ่ม→รูป→เผยแพร่ แยกหน้า) — ยอมรับได้ แต่ดู Quick Win เฟส 8

### B4. Manager — Contract journey
```
/contracts → สร้าง/เปิด → /contracts/[id] → ลงนาม → (ต่อสัญญา/ใบเสร็จ/สิ้นสุด)
```
- ✅ "สัญญาใกล้ครบ" คำนวณจาก endDate โผล่บน dashboard → ลดสัญญาหมดอายุเงียบ

---

## C. สรุป Friction Matrix (ทั้งระบบ)
| # | Journey | ปัญหา | ระดับ | เฟสที่เสนอแก้ |
|---|---|---|---|---|
| J1 | Public conversion | CTA LINE = placeholder | 🟠 High | A (Quick Win) |
| J2 | Public search | ไม่มี pagination (>24 ทรัพย์หาย) | 🟡 Med | B (Layout) |
| J3 | Public retain | ไม่มี favorite/บันทึกทรัพย์ | 🟡 Med | E/Luxury |
| J4 | Admin add property | 9–12 คลิกข้ามหลายหน้า | 🟡 Med | E |
| J5 | Admin onboarding | ไม่มี guided empty-state ครั้งแรก (ทรัพย์/lead = 0) | 🟢 Low | F |
| J6 | Public lang | description ทรัพย์อาจมีแต่ TH | 🟢 Low | — (content) |

**ภาพรวม journey:** ไม่มี *dead end ที่แท้จริง* ในฝั่ง admin (ทุก state มีทางออก/ปุ่มถัดไป) — friction ที่เหลือเป็นเรื่อง "ความลื่นไหล" และ public conversion plumbing

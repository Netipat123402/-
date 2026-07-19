# PHASE 4 — UI AUDIT
> Typography · Colors · Spacing · Grid · Buttons · Inputs · Cards · Tables · Badges · Alerts · Dialogs · Empty/Loading/Error states
> ให้คะแนน Visual Quality / Consistency / Premium / Trust · วันที่: 2026-06-24

---

## บทสรุปคะแนน

| มิติ | คะแนน | เหตุผลย่อ |
|---|---|---|
| **Visual Quality** | **A−** | palette อุ่น-หรู, gold accent ยับยั้งชั่งใจ, type คมด้วย tracking-tight |
| **Consistency** | **A** | `.card/.btn/.badge/.field` คลาสเดียว, component library บังคับใช้ |
| **Premium feel** | **B+** | minimal สะอาด; ขาด micro-interaction/transition ที่ทำให้ "แพง" ระดับ Linear |
| **Trust** | **A−** | neutral อุ่น, semantic color คุมโทน, ฟอนต์ไทยมืออาชีพ |

---

## 1. Typography
- ฟอนต์เดียว `IBM Plex Sans Thai + Inter` — เลือกดีสำหรับไทย (อ่านง่าย, น้ำหนักครบ)
- หัวหน้า: `text-xl→2xl font-semibold tracking-tight` (PageHeader) สม่ำเสมอ
- หัวข้อย่อย: `SectionLabel` (uppercase xs, tracking-wide, faint) — มาตรฐานเดียว
- ตัวเลข KPI: `text-[30px] tabular-nums` → จัดเรียงสวย
- **พบ 🟡:** ใช้ utility ดิบ ไม่มี type scale ที่ตั้งชื่อ → ความเสี่ยง drift ระยะยาว (ยังคุมดีตอนนี้)
- **พบ 🟢:** `text-[30px]`, `text-[11px]` arbitrary values กระจายเล็กน้อย — รวมเป็นโทเคนได้

## 2. Colors
- palette แคบ-อุ่น (ink + gold + warm-neutral) → premium, low-noise ✅
- gold ใช้อย่างยับยั้ง: ปุ่มหลัก public, ราคา, accent — ไม่เกร่อ
- semantic 4 สี + 5 badge tone (neutral/active/done/gold/danger) — **คุมจำนวนได้ดีมาก**
- **พบ 🟢:** admin มี `warning/info` แต่ badge tone ไม่มี `warning` (status.ts ใช้ 5 tone) — ไม่เป็นปัญหา แต่ inventory ควรรู้

## 3. Spacing & Grid
- spacing ใช้ Tailwind scale; การ์ด KPI/grid responsive (`grid-cols-2 sm:grid-cols-4`)
- public: max-width 1200px (`max-w-content`), grid 1→2→3 คอลัมน์
- **พบ 🟡:** ค่า gap/padding หลากหลายเล็กน้อยข้ามหน้า (`gap-3` / `gap-3.5` / `gap-4`) — ควรมี spacing rhythm มาตรฐาน (เฟส 5)

## 4. Buttons — ✅ ลำดับชั้นชัด
| ระดับ | คลาส | ใช้เมื่อ |
|---|---|---|
| Primary action | `.btn-gold` | สร้าง/บันทึก/เผยแพร่ (1/หน้า) |
| Promote (ดำ) | `.btn-primary` | เริ่มดูแล/รับงาน |
| Secondary | `.btn-ghost` | ยกเลิก/แก้ไข |
| Danger | `.btn-danger` / `.btn-ghost text-danger` | ลบ/ปิด |
- สูง 44px (admin) / 48px (public) — touch-friendly ✅
- **พบ 🟢:** มี 2 ทาง danger (`.btn-danger` เต็ม vs `ghost text-danger`) — ตั้งใจ (hard vs soft) แต่ควร doc ให้ชัด

## 5. Inputs — ✅
- `.field` 16px มือถือ (กัน iOS zoom) → 14px desktop, focus ring gold
- `Combobox` ค้นหา + flip ขึ้นเมื่อพื้นที่ล่างไม่พอ + cache label (กันป้ายหาย) — งานละเอียดระดับโปร
- error/hint รูปแบบเดียว (`Field`)

## 6. Cards — ✅
- `.card` เดียว (border + surface + shadow-card + radius 12px)
- hover: `hover:border-gold/40 hover:shadow-lift` สม่ำเสมอ (KPI, property card, list card)

## 7. Tables — ✅ (ดูเฟส 3)
- header uppercase faint, row border บาง, hover canvas, right-align คอลัมน์เลข

## 8. Badges / Tags
- `.badge` rounded-full + tone จาก map → ป้ายสถานะอ่านง่าย, มือถือใช้ `short`
- **ไม่พบ badge เฟ้อ** — จำกัด 5 tone

## 9. Alerts / Dialogs
- Modal กลางจอเดียว (100dvh, footer ตรึง, backdrop-blur) — พรีเมียม
- ConfirmDialog destructive แดง + เหตุผล
- Toast (`Toast.tsx`) สำหรับ success/error → feedback หลัง action ครบ
- **พบ 🟢:** ไม่มี inline "banner alert" มาตรฐาน (เช่น เตือนทั้งหน้า) — ใช้ toast แทน; โอเค

## 10. Empty / Loading / Error states — ✅ ครบ 3 สถานะ
- `EmptyState` (ไอคอน + ข้อความ + action), `ListSkeleton`, `ErrorState` (+retry)
- dashboard มี skeleton + empty ("ไม่มีงานที่ต้องทำ") + ErrorState แยก
- **ดีเด่น:** มี loading.tsx / error.tsx / not-found.tsx / global-error.tsx ระดับ route

---

## 11. Visual Noise / Clutter — สแกนแล้ว
| ข้อกังวล (SPECIAL FOCUS) | พบ? | หมายเหตุ |
|---|---|---|
| Visual noise / clutter | ❌ | minimal, whitespace ดี |
| Weak hierarchy | ⚠️ บางหน้า | ดูเฟส 6 |
| Inconsistent styles | ❌ | คลาสกลางบังคับ |
| Duplicate components | ❌ | dead exports ถูกลบ (MR-38) |
| Too many variants | ❌ | ปุ่ม/badge จำกัด |
| Poor responsiveness | ❌ | mouse/touch variant + ListView |
| Shadow/border เยอะ | ❌ | 2 shadow, 1 border color |

---

## 12. ช่องว่างสู่ "ระดับ Apple/Linear/Stripe" (premium gap)
1. 🟡 **Micro-interaction/motion น้อย** — transition มีบ้าง (`transition`) แต่ไม่มี easing/spring system, ไม่มี skeleton→content fade, ไม่มี optimistic UI ที่รู้สึกได้
2. 🟡 **Type/spacing ยังเป็น utility ดิบ** — Linear/Stripe มี scale ที่ตั้งชื่อชัด
3. 🟢 **ไม่มี dark mode** — ทีมหลังบ้านทำงานกลางคืน
4. 🟢 **Empty state ครั้งแรก (zero-data)** ยังเป็น generic — โอกาส onboarding ที่ "แพง"
5. 🟢 **ภาพ placeholder การ์ดทรัพย์** (gradient + "ROS") ดูดีแล้ว แต่ปรับเป็น brand pattern ได้

> รายละเอียด token/scale อยู่ใน `05-DESIGN-SYSTEM-AUDIT.md`; hierarchy รายหน้าใน `06-VISUAL-HIERARCHY-AUDIT.md`

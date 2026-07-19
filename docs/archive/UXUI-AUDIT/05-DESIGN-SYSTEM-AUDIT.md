# PHASE 5 — DESIGN SYSTEM AUDIT
> Tokens (type/color/spacing/radius/shadow) · Component variants · Drift · Legacy
> + ข้อเสนอ Unified Design System (Minimal · Premium · Enterprise SaaS)
> วันที่: 2026-06-24

---

## บทสรุป

ROS มี design system **โดยพฤตินัย (de-facto)** ที่ดีกว่าโปรเจกต์ส่วนใหญ่:
โทเคนอยู่ใน Tailwind config, component library กลางบังคับการใช้งาน, dead code ถูกเก็บกวาด
**ช่องว่างหลัก = ยังไม่ถูกยกระดับเป็น system ที่ "ตั้งชื่อ + แชร์ + จัดทำเอกสาร"** → ความเสี่ยง drift ระยะยาวเมื่อทีมโต

---

## 1. Token Inventory ปัจจุบัน (รวบจากโค้ด)

### 1.1 Color tokens — ✅ ครบ, ตั้งชื่อดี
(ดูตารางใน `00-CURRENT-DESIGN-INVENTORY.md §2.1`)
- **Drift เดียวที่พบ:** public config ขาด `warning`/`danger` (ตั้งใจ) + shadow `lift` ต่างค่า (`0 4px 16px` admin vs `0 8px 30px` public) → ควร doc ว่า "ตั้งใจให้ public เด่นกว่า" หรือรวม

### 1.2 Typography scale — 🟡 ยังไม่ตั้งชื่อ
- ใช้ Tailwind utility ดิบ + arbitrary (`text-[30px]`, `text-[11px]`)
- **ไม่มี** semantic role (display/h1/h2/body/caption) ที่ map เป็นคลาส
- **ข้อเสนอ:** สร้าง type role
  ```
  display (30/36 semibold tracking-tight) · h1 (24 semibold) · h2 (18 semibold)
  body (14/15) · small (13) · caption (11 uppercase faint = SectionLabel)
  ```

### 1.3 Spacing tokens — 🟡 rhythm ไม่ทางการ
- พบ gap หลากหลาย (`gap-3 / 3.5 / 4`), padding การ์ด (`p-4 / p-5`)
- **ข้อเสนอ:** กำหนด density 2 ระดับ: `comfortable` (public) / `compact` (admin list) + spacing scale 4/8/12/16/20/24

### 1.4 Radius / Shadow — ✅
- `card:12 / xl2:16` + shadow 2 ระดับ → น้อยและพอดี (รักษาไว้)

---

## 2. Component Variant Audit

| Component | Variants | ประเมิน |
|---|---|---|
| Button | admin 4 + sm · public 5 (รวม `line`) + sm | ✅ พอดี — `line` คือ brand LINE จำเป็นฝั่ง public |
| Card | 1 | ✅ |
| Badge | 1 + 5 tone | ✅ |
| Input/Field | 1 + error/hint | ✅ |
| Combobox | searchable client/server + `size sm` | ✅ ครอบคลุม |
| Modal | lg/xl | ✅ |
| ListView | desktop table / mobile card (flag-driven) | ✅ เด่น |
| FilterBar | search + filters + sort | ✅ |

**ไม่มี variant เฟ้อ** — ตรงข้ามกับปัญหาทั่วไปของโปรเจกต์ระดับนี้

---

## 3. Design Drift / Legacy — สแกนแล้ว
| รายการ | สถานะ |
|---|---|
| Dead exports (SelectField, FilterChips) | ✅ ลบแล้ว (MR-38) |
| สไตล์ปุ่ม/การ์ดเขียนเองนอกคลาสกลาง | ❌ ไม่พบ (ใช้ `.card/.btn` ทั่ว) |
| โทเคนซ้ำสองที่ (admin/public Tailwind config) | 🟡 sync ด้วยมือ — ความเสี่ยง |
| arbitrary values (`text-[30px]` ฯลฯ) | 🟡 เล็กน้อย — รวมเป็นโทเคนได้ |
| component library อยู่ใน app เดียว (`web-admin/ui.tsx`) | 🟡 public มี component ของตัวเอง → ไม่แชร์ |

---

## 4. ข้อเสนอ: Unified Design System "ROS DS"

### 4.1 โครงสร้าง 3 ชั้น (primitive → semantic → component)
```
@ros/design-tokens     ← primitive: color/space/type/radius/shadow (1 source of truth)
        ↓ (build → CSS vars + Tailwind preset)
@ros/ui                ← component: Button, Card, Field, Modal, ListView, Badge…
        ↓
apps/web-admin · apps/web-public   ← consume preset + ui
```
- ทั้งสองแอป import **Tailwind preset เดียว** → จบปัญหา sync มือ
- ย้าย `ui.tsx` ขึ้น `packages/ui` (public ใช้ subset ที่เหมาะ)

### 4.2 Token ที่ควร "ตั้งชื่อ" (semantic layer)
| กลุ่ม | โทเคน |
|---|---|
| text | `text-primary(ink)` `text-secondary(ink-soft)` `text-muted` `text-faint` |
| surface | `bg-canvas` `bg-surface` `bg-elevated` |
| accent | `accent(gold)` `accent-hover(gold-dark)` |
| feedback | `success warning danger info` (+ badge tone map) |
| type role | display/h1/h2/body/small/caption |
| space | 4/8/12/16/20/24/32 (ตั้งชื่อ density) |
| motion | `ease-standard` `ease-emphasized` + duration 150/200/300 |

### 4.3 สิ่งที่ "ห้ามแตะ" (รักษาเอกลักษณ์)
- palette gold + warm-neutral, ฟอนต์ Plex Thai, radius 12, กฎ PAGE_SIZE=8, mouse/touch shell — **คงไว้ทั้งหมด** (เป็นจุดแข็ง)

### 4.4 สิ่งที่เพิ่มเพื่อ "premium"
- **Motion system** (ตอนนี้ขาด): page/section fade-in, skeleton→content, optimistic toast, modal spring
- **Dark mode** (token-ready ถ้าใช้ CSS vars)
- **Storybook** หรือหน้า `/_design` รวม component (governance)

---

## 5. Roadmap DS (สรุป — รายละเอียดในเฟส 9/10)
| ลำดับ | งาน | Effort | Risk |
|---|---|---|---|
| 1 | สร้าง Tailwind preset ร่วม (รวมโทเคน) | M | ต่ำ (refactor config) |
| 2 | ตั้งชื่อ type/spacing/motion tokens | M | ต่ำ |
| 3 | ย้าย `ui.tsx` → `packages/ui` | L | กลาง (import paths) |
| 4 | เพิ่ม motion system | M | ต่ำ |
| 5 | Storybook / design page | M | ต่ำ |

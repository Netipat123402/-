# 🔒 ROS DESIGN SYSTEM — Locked Tokens (single source of truth)

> **Phase 0 — Design System Recovery (2026-07-09).** เป้าหมาย: **ล็อกค่า ไม่ redesign** — ทุกหน้า/component ต้องอ้าง token ชุดนี้เท่านั้น
> แหล่งจริง = `tailwind.preset.cjs` (color/font/radius/shadow/motion/fontSize) ใช้ร่วม web-admin + web-public
> **กฎเหล็ก:** ห้ามใช้ค่า arbitrary (`text-[13px]`, `p-[7px]`, `rounded-[10px]`) — ถ้าต้องใช้ค่าใหม่ ให้เพิ่ม token ที่นี่ก่อน

---

## 1) Typography Scale (ชุดเดียวทั้งระบบ)

| Role | Class | px | Weight | ใช้ที่ |
|---|---|---|---|---|
| **display** | `text-4xl lg:text-5xl` | 36→48 | 600 | hero title (หน้าแรก) |
| **h1 / section** | `text-2xl lg:text-3xl` | 24→30 | 600 | page title, section header, detail property name |
| **h2 (carousel)** | `text-2xl` / `text-xl` (sm) | 24 / 20 | 600 | หัวข้อ carousel |
| **h3** | `text-base` | 16 | 600 | หัวการ์ด/ฟอร์ม (เอกสาร) |
| **body** | `text-sm` | 14 | 400 | เนื้อหาทั่วไป, label ฟอร์ม |
| **caption** | `text-xs` | 12 | 400/500 | meta, label รอง, chip |
| **micro** | `text-2xs` | 11 | 400/500/600 | badge, unit, count, nav label |
| **price (card)** | `text-xl` | 20 | 600 | ราคาในการ์ด (gold) |
| **price (detail)** | `text-2xl lg:text-3xl` | 24→30 | 600 | ราคาหน้า detail (gold) |

- **Font family:** `font-sans` = IBM Plex Sans Thai → Inter → system-ui (**ไม่มี serif** — ถอดออกแล้ว, ขัดกฎ minimal)
- **Weight:** ใช้แค่ 400 (regular) · 500 (medium) · 600 (semibold) — โหลดครบใน font link
- ❌ **ห้าม** `text-[1.6rem]`, `text-[1.75rem]`, `text-[9px]`, `text-[10px]`, `text-[11px]` → ใช้ role ข้างบนแทน

## 2) Spacing Scale
- ใช้ **Tailwind default 4px base** เท่านั้น: `1`=4 · `2`=8 · `3`=12 · `4`=16 · `5`=20 · `6`=24 · `8`=32 · `10`=40 · `12`=48 · `14`=56 · `16`=64
- ✅ ยกเว้นที่อนุญาต: `env(safe-area-inset-*)` (bottom-nav), `pb-24` (เว้น fixed bar)
- ❌ ห้าม `p-[7px]`, `gap-[13px]` ฯลฯ

## 3) Radius
| Token | px | ใช้ |
|---|---|---|
| `rounded-lg` | 8 | input/field, chip, thumbnail |
| `rounded-xl2` | 20 | search panel, dropdown |
| `rounded-card` | 16 | card, กล่องเอกสาร |
| `rounded-full` | ∞ | **ปุ่ม (pill), badge, avatar, heart** |

## 4) Shadow
| Token | ใช้ |
|---|---|
| `shadow-card` | การ์ดนิ่ง (เบา) |
| `shadow-lift` | การ์ด hover/ลอย (public เด่น / admin เบา — ตั้งใจต่าง) |
- ❌ ห้าม box-shadow arbitrary

## 5) Icon Size (Icon component เท่านั้น — ห้ามอิโมจิ)
| ขนาด | ใช้ |
|---|---|
| `13–14` | inline ใน label/chip/spec |
| `16` | ปุ่ม, ในบรรทัด body |
| `18` | header action, heart บนการ์ด |
| `20–22` | nav ล่าง, ปุ่มลูกศร gallery |
| `26` | empty-state |

## 6) Color (semantic — light/dark ผ่าน CSS var)
`ink`/`ink-soft` (ตัวอักษร) · `gold`/`gold-dark`/`gold-light` (accent เดียว) · `surface`/`raised`/`canvas` (พื้น) · `border`/`border-strong` · `muted`/`faint` (จาง) · `success`/`warning`/`danger`/`info`
- **Accent เดียว = gold** · ❌ ห้าม hardcode hex ในคอมโพเนนต์ (ยกเว้น brand LINE #06C755, overlay ภาพ ink/xx)

---

## ✅ Definition of Done (Visual QA — ทุกการแก้)
Build → Run → เปิดหน้าจริง → **Screenshot เทียบก่อน/หลัง** (100% + 200%) → ไม่มี font/spacing/layout/align/icon/button/card/color เพี้ยน → responsive 320/375/768/1024/1280 ผ่าน → tsc เขียว → ค่อย commit
**ห้ามแก้ปิดตา · ห้ามเดา · อ้าง token/ภาพจริงเท่านั้น**

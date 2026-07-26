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

- **Font family:** `font-sans` = **Inter → IBM Plex Sans Thai** → system-ui (เจ้าของเลือก 2026-07-09) · อังกฤษ/ตัวเลข = Inter (คลีน) · ไทย = IBM Plex Sans Thai (fallback ต่อ glyph) · ใช้ชุดเดียวทั้ง **public + admin** (preset กลาง) · **ไม่มี serif** (ขัดกฎ minimal)
- **Weight:** ใช้แค่ 400 (regular) · 500 (medium) · 600 (semibold) — โหลดครบใน font link
- ❌ **ห้าม** `text-[1.6rem]`, `text-[1.75rem]`, `text-[9px]`, `text-[10px]`, `text-[11px]` → ใช้ role ข้างบนแทน

## 2) Spacing Scale
- ใช้ **Tailwind default 4px base** เท่านั้น: `1`=4 · `2`=8 · `3`=12 · `4`=16 · `5`=20 · `6`=24 · `8`=32 · `10`=40 · `12`=48 · `14`=56 · `16`=64
- ✅ ยกเว้นที่อนุญาต: `env(safe-area-inset-*)` (bottom-nav), `pb-24` (เว้น fixed bar)
- ❌ ห้าม `p-[7px]`, `gap-[13px]` ฯลฯ

## 3) Radius — [v3 2026-07-18: A refined · พรีเมียมแต่อบอุ่น (โซน Apple/Airbnb) · เลิก pill ปุ่ม]
| Token | px | ใช้ |
|---|---|---|
| `rounded-lg` | 8 | **ปุ่ม (.btn)**, input/field, chip/tab, thumbnail |
| `rounded-card` | 12 | card, กล่องเอกสาร |
| `rounded-xl2` | 14 | search panel, dropdown, floating bottom-nav |
| `rounded-full` | ∞ | **เฉพาะ** badge/tag เล็ก, avatar, heart, dot, spinner, progress bar |
- ❌ **ห้าม pill (rounded-full) กับ ปุ่ม/แท็บ/การ์ด/แผง** — ดู "consumer/เล่น" ลดความแพง · pill สงวนให้ของกลม/tag จิ๋วเท่านั้น
- ปุ่มมือถือ `.btn` = h-11 (44px, เกณฑ์ Apple) ไม่เทอะทะ · (เคยลอง B editorial 6–8px แล้วเจ้าของว่า "เหมือนเว็บไม่เสร็จ" → กลับ A)

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

## 7) วันที่ = สากล ปี 2 หลัก (inter look) · [อัปเดต 2026-07-25 เจ้าของล็อก "14 Jul 26"]
UI ทุกที่ใช้รูปแบบสากล **ปี 2 หลัก** — **ห้าม พ.ศ. / เดือนไทย / "น." / เลขล้วน DD/MM/YY (กำกวม)** · แบบ Linear/Stripe/Vercel
| ใช้ | ผล | ฟังก์ชัน (`lib/format.ts` = source เดียว) |
|---|---|---|
| วันที่ | `14 Jul 26` | `fmtDate` (DATE year=2-digit) |
| วันที่สั้น | `14 Jul` | `fmtDateShort` |
| เวลา | `09:00` (24 ชม.) | `fmtTime` |
| วันที่+เวลา | `14 Jul 26 · 09:00` (วัน→เวลา) | `fmtDateTime` |
| วัน+วันที่ | `Tue 14 Jul 26` (หัวนัด) | `fmtWeekdayDate` |
| ช่วงเวลา | `09:00–09:30` | `fmtTimeRange(iso,min)` |
| feed/urgency | `3 ชม.ที่แล้ว` / `อีก 2 วัน` | `fmtRelative` / `fmtUntil` |
- ⚠️ **ห้ามมี local `fmtDate` ปีเต็มในหน้า** (เคยแอบซ่อนใน leads/contracts บายพาสมาตรฐาน → แก้เป็น lib แล้ว)
- locale = `en-GB` (วัน-เดือน-ปี) · `hour12:false` · ❌ ห้าม `th-TH` กับ **วันที่/เวลา** (แต่ **เลข/บาท** ใช้ `Intl.NumberFormat('th-TH')` ได้ = คอมมา)
- ยกเว้น: **ใบเสร็จ PDF** คงไทย/พ.ศ. (เอกสารทางการ) · **relative words** (นาที/ชม.ที่แล้ว) ไทยได้
- ⚠️ body แจ้งเตือน/เตือนกำหนด มาจาก **backend** (`apps/api common/util/thai-datetime.ts`) → ยังเป็นไทย ต้องแก้ที่ API แยก (นอกรอบ frontend)

## 8b) ตัวหนังสือจอแคบ = ห้าม hard-cut · [ใหม่ 2026-07-18 เจ้าของสั่ง — วิธีระดับโลก]
ห้ามให้คำ "โดนตัดหาย" ดื้อๆ บนจอแคบ · แก้ตามที่ Airbnb/Google/Apple ใช้:
- ข้อความยาว (ชื่อ/ทำเล) = `truncate` + **… ellipsis** (รู้ว่ามีต่อ ไม่ใช่หายเฉยๆ) · คู่กับ `min-w-0` บน flex child
- แถวแท็บ/ชิป: **เซ็ตสั้นคงที่ (≤~6 อัน) = `flex-wrap` เห็นครบ ห้าม scroll-cut กลางคำ** (owner จับได้ — fade ตัด "อพาร์ทเม…" ดูเหมือนพัง) · เฉพาะเซ็ตยาว/เพิ่มได้ (Airbnb 20+) ถึงใช้ `overflow-x-auto` + เงาจางขอบบอกเลื่อน
- ค่าที่ต้องเห็นครบ = ย่อ label / `flex-wrap` / responsive font / "+N เพิ่มเติม" overflow menu — เลือกตามบริบท
- ⚠️ "ตัวหนังสือตกกรอบ" อาจเป็น **text ฝังในรูป** (mock SVG bake ป้ายริมขอบ → การ์ด 4:3 ครอบตัด) ไม่ใช่บั๊ก CSS — เช็ค DOM ก่อนโทษ layout ([[ros-radius-and-mock-images]])

## 8c) Search + Filter layout · [ใหม่ 2026-07-18]
- **search = เต็มความกว้าง แถวของตัวเอง · filter = แถว "ใต้" (ไม่ใช่ "ข้าง")** — โลกจริง (Zillow/Airbnb/Booking) วาง filter ใต้ search เป็น chips/dropdowns · ปุ่ม filter เบียดข้าง search = ช่องพิมพ์แคบ ดูแปลก (เจ้าของจับได้)
- **surface top filter (ราคา·ห้องนอน·ประเภท·รถไฟฟ้า) เป็น dropdown/chip กด 1 ที** · ที่เหลือ (จังหวัด ฯลฯ) ใน "ตัวกรอง" · progressive disclosure + mobile parity (§3.5)
- ⚠️ **filter popover บนมือถือ = modal กลางจอ/bottom-sheet ห้าม dropdown เล็ก** (dropdown `absolute` ของ pill ฝั่งขวา = ล้นขอบจอ) · เดสก์ท็อป = dropdown ใต้ pill · การ์ด listing = **price-first (Zillow)**: ราคานำ → specs → ชื่อ/ทำเล · amenity ไป detail

## 9) วิธีทำงาน = วิจารณ์ตรง เสนอเชิงรุก · [ใหม่ 2026-07-18 เจ้าของสั่ง]
**ติเตียนเสมอ ห้ามอวย · อย่าตามใจ ให้ความเห็นตัวเอง · เสนอเชิงรุกอิงระดับโลก · เจอหลักดีๆ = เพิ่มเป็นกฎทันที** (ราย­ละเอียด [[ros-critique-and-proactive]])

## 8) Label–Value = proximity (ราง) · [ใหม่ 2026-07-18 เจ้าของสั่ง]
หน้า detail/modal (InfoRow) — label กับ value เป็น "คู่กัน" ต้องอยู่ใกล้ (Gestalt proximity · ลด eye-travel) · **ห้ามดันแยกสุดขอบเว้นกลางบานบนจอกว้าง**
- มือถือ (<sm): `justify-between` (จอแคบ ช่องเล็ก · idiom iOS Settings)
- iPad/เดสก์ท็อป (sm+): label คอลัมน์คงที่ `w-36` + value ชิดซ้าย = **รางเดียว** (แบบ Stripe/Linear/GitHub sidebar) · chevron interactive = `sm:ml-auto`
- ค่ายาว (ที่อยู่/โน้ต) = `stack` (label บน/value ล่าง) เหมือนเดิม

---

## 10) แยกหมวดข้อมูล (data separation) · [ใหม่ 2026-07-19 เจ้าของสั่ง]
field คนละความหมายที่ยัดติดกัน = **ต้องแยก** คอลัมน์/บรรทัด/กลุ่ม (owner: นัดหมาย "วันที่+สถานที่" ติดกัน · หลายหน้ามีชุดข้อความควรแยกแต่ไม่แยก)
- ไล่สแกน **ทุกหน้า/การ์ด/ตาราง** หา field ที่มัดรวม 2 ความหมาย (เช่น "วันเวลา · ทรัพย์" · "เบอร์ · ช่องทาง" · "ประเภท · ทำเล") → แยกให้อ่านง่าย
- ทำแล้ว (อ้างอิงเป็นแม่แบบ): appointments (วันที่ \| ทรัพย์) · leads (เบอร์ \| ช่องทาง chip) · properties (ทำเล \| ประเภท·นอน) · InfoRow rail
- **กลไก:** ใช้ 2nd `sub` column + `hidden sm:inline` (มือถือซ่อน field รอง · iPad+ โผล่) — ดู [[tailwind-mouse-variant-order]]
- ⚠️ **งานต่อเนื่อง (ยังไม่จบ):** ไล่สแกน detail/modal ที่เหลือ (นัดหมาย detail วันที่+สถานที่, ฯลฯ) → เสนอแก้ + widget 3 จอ + เหตุผล ก่อนแก้ · ดูรายการใน `docs/ADMIN-DESIGN-PHASES.md` (Phase 1–2)
- **กรอบชุดข้อมูลต้องชัด** (เจ้าของสั่ง): แต่ละชุด (InfoGroup) มีกรอบ/เส้นแบ่งชัด แยกกันเพื่อค้นหาง่าย · ข้อมูล **"ของใครของมัน"** (customer≠lead≠เจ้าของ≠สัญญา โชว์ชุดที่เกี่ยวกับตัวเอง เรียงตามความสำคัญ ไม่ generic/ไม่ซ้ำ)

## 11) จัด field ตามความสำคัญ per-device (field prioritization) · [ใหม่ 2026-07-19 เจ้าของสั่ง]
แต่ละ device/orientation โชว์ field **"ตามความสำคัญของหน้านั้น" ไม่ต้องครบทุก field** (สุดท้ายคลิกเข้า detail ดูเชิงลึกอยู่ดี) → ค้นหา/สแกนง่ายสุดต่อ device
- **มือถือ:** field สำคัญสุด N ตัว (เช่น การ์ดทรัพย์ = รูป+ราคา+ทำเล) · **iPad-ตั้ง/นอน:** เพิ่มตามพื้นที่ · **คอม:** มากสุด (แต่ก็ไม่ต้องครบ)
- **ต้องเสนอชุด field ที่เหมาะต่อแต่ละ device (ยกตัวอย่างมือถือโชว์อะไร/iPad อะไร/คอมอะไร) + widget 3 จอ + ถามก่อน + เหตุผล** ตาม §2
- ใช้คู่กับ §10: แยกก่อน แล้วเลือกโชว์ต่อ device

## 12) โครง Detail + List (master · ล็อก 2026-07-25) · [[ros-detail-archetypes-and-date-standard]]
แก้ปัญหา "ระบบสะเปะสะปะ" — ทั้ง 6 sidebar (เจ้าของ/ทรัพย์/ลีด/นัด/ลูกค้า/สัญญา) ใช้แม่แบบเดียว:
- **Detail archetype:** Record page = `DetailHeader` + `SectionTabs` (มือถือ accordion · iPad/คอม แท็บ) + `InfoGroup` แยกกล่องหัวชัด (xl 2 คอลัมน์) · ทุกหน้าแปลงเป็นหน้า `[id]` เต็ม (ลีด/นัดแปลงจาก modal แล้ว · list กด→navigate) · ออกแบบชุดข้อมูล **เหมาะ entity** (เน้นอะไรก่อน-หลัง · ห้ามซ้ำ) · ✅ ครบ 6
- **รหัส record = mono ทอง บนหัว** (DetailHeader `code`) ทุกหน้า · รหัสอ้างอิงในกล่อง = จาง (รอง)
- **List master:** primary 2 บรรทัด (ระบุหลัก + secondary จาง) · หน้ามีชื่อคน = **เบอร์ใต้ชื่อ** (muted กดโทรได้ PhoneLink) · สถานะ = pill outline · **ช่องไฟเฉลี่ยเท่ากันเต็มกว้าง** (ListView เลิก grow-column → primary cap · ไม่มีคอลัมน์ยืดกินที่) · คอลัมน์ขวา (สถานะ/นับ) **ชิดซ้ายใต้หัวข้อ** (items-start · ไม่ตกขอบ)
- **shell width เดียว** = `(app)/layout.tsx` `max-w-5xl` (หน้าใหม่ห้ามตั้ง max-w เอง)
- **Quick modal เหลือ:** สร้าง/แก้ (create/edit) = modal สั้น · detail = หน้าเต็ม

## 13) วิธีทำงาน = ทีละหน้า จบแล้วหยุด · [ใหม่ 2026-07-25] · [[ros-one-page-at-a-time]]
**ทำทีละหน้า/ทีละอย่าง · จบแล้วหยุดรอสั่งทุกครั้ง · ห้ามเดินหน้า/ทำรวบเอง** — ทุกหน้าต้องแนบรูป show_widget (มือถือ/iPad ตั้ง/iPad นอน/คอม) + เจ้าของเคาะก่อน · ระวัง shared component (ListView/DetailHeader) กระทบหลายหน้า = บอกก่อน · **R2 = ปลดแล้ว** (2026-07-25 เจ้าของอนุญาตแก้ backend สำหรับ list rich cols เช่น ทรัพย์ที่สนใจในลีด)

## 🎯 หลักการหลัก (Core Principle — ทุกการตัดสินใจยึดอันนี้)
**minimal · เรียบง่าย · ไม่รก · clean · หรูดูแพง** — ตัดของไม่จำเป็นออกก่อนเสมอ · น้อยแต่ดี · 1 บรรทัด 1 ข้อมูล · gold accent เดียว · whitespace หายใจ · จบมือเดียวบนมือถือ · เพิ่ม/ลด/ไม่แตะ ได้หมด — ไม่จำเป็นต้องเพิ่ม การลบก็คือการปรับปรุง

## ✅ Definition of Done (Visual QA — ทุกการแก้)
Build → Run → เปิดหน้าจริง → **Screenshot เทียบก่อน/หลัง** (100% + 200%) → ไม่มี font/spacing/layout/align/icon/button/card/color เพี้ยน → responsive 320/375/768/1024/1280 ผ่าน → tsc เขียว → ค่อย commit
**ห้ามแก้ปิดตา · ห้ามเดา · อ้าง token/ภาพจริงเท่านั้น**

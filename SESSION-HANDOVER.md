# ROS — SESSION HANDOVER (อ่านไฟล์เดียวจบ)

> **ไฟล์ handover ถาวร — เขียนทับเสมอ ไม่สร้างใหม่ทุก session.** อ่านไฟล์นี้ไฟล์เดียว = เข้าใจโปรเจกต์ทั้งหมด: โครงสร้าง · ทำอะไรไปแล้ว · เหลือ/ขาดอะไร · กฎ · เครื่องมือ · จุดค้าง.
> คู่กับ: **`DESIGN-SYSTEM.md`** (กฎดีไซน์ locked §1–13 · อ่านก่อนแตะ UI) · auto-memory (operating rules) · `docs/reference/` (SYSTEM-KNOWLEDGE + RELATIONSHIP-MAP · เข้าใจ backend/relations).
> **git:** branch `recover/redesign-v2` · **commit local ถาวรในเครื่อง · ยังไม่ push GitHub** (ต้อง token เจ้าของ) — ค้าง ~25+ commits

---

## 0) โครงสร้างโปรเจกต์ (monorepo)
- `apps/web-admin` — Next.js 14 admin (ธีมมืด-ทอง · authed) · **โฟกัสงานตอนนี้** · sidebar: แดชบอร์ด·เจ้าของ·ทรัพย์·ลีด·นัดหมาย·ปฏิทิน·ลูกค้า·สัญญา (+ audit·users·settings ใน ProfileMenu)
- `apps/web-public` — Next.js เว็บลูกค้า (สว่าง) — redesign เสร็จแล้ว
- `apps/api` — NestJS + Prisma (Postgres) · **🔓 R2 ปลดแล้ว** (เจ้าของอนุญาตแก้ backend สำหรับ rich data เช่น property/owner ต่อสัญญา)
- `db/` — Prisma schema + seed (`db/seed/mock-bulk.ts`) · `tailwind.preset.cjs` — token ร่วม 2 แอป
- **creds admin:** `admin@ros.local` / `ChangeMe!2026` · API :4000 (192.168.1.2) · web-admin :3001 (เจ้าของรันเอง) · web-public :3000

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** · งานตอนนี้ = **design polish world-class** (ยกเครื่อง detail + list ให้เป็นระบบเดียว · ไม่ทำ feature ใหม่). ⚠️ เจ้าของทดสอบบน :3001 (dev ตัวเอง) — ค้างบ่อย hard refresh (Cmd+Shift+R).

## 2) ทำอะไรไปแล้ว (สะสมทุก session · ล่าสุด `b33ca52`)
**A · List pass ครบ 6 หน้า** — grid+subgrid ช่องไฟเท่ากันเต็มจอ · ลีด·นัด·ลูกค้า·สัญญา·เจ้าของ·ทรัพย์ (4 คอลัมน์ label-value · R2 rich cols) · คอลัมน์ขวากึ่งกลาง · รูปทรัพย์ติดรหัส/ชื่อ
**B · ⭐ Detail redesign = "main + ราง" (เลิก SectionTabs) — เสร็จ 6/6 ครบ:**
- **สัญญา** `73855a6` = **A+** (เอกสารอ่านรวดเดียว + รางสถานะ/progress/เหลือ N วัน)
- **ลูกค้า** `a48df47`+`c30b524` = **A** (โปรไฟล์ผู้เช่า + รางตัวตน สถิติ/ติดต่อ · แก้ text-layout ตามกฎใหม่)
- **นัดหมาย** `b0380f9` = **B** (รางวันเวลาพระเอก + สถานะ + ปุ่ม)
- **ลีด** `7e4e120` = **A** (ราง pipeline สถานะ+ขั้นถัดไป แนว HubSpot)
- **ทรัพย์** `b33ca52` = **A listing** (รูป gallery พระเอกเต็มบน + main label-value + รางสถานะ/ปุ่ม/ดูบนเว็บ · gallery/lightbox/อัปโหลดคงครบ)
- **เจ้าของ** `a1f678b` = **A portfolio** (occupancy-first: stat กึ่งกลาง ทรัพย์/เช่าอยู่/รายได้ rent roll + ติดต่อ label-value + แก้ไข modal · เนื้อหลัก ทรัพย์ในพอร์ต→สัญญา→ระบุตัวตน→โน้ต→เอกสาร · ไม่แตะ backend)
- ทุกหน้า: verify authed 3 จอ · ปรับตามสถานะครบ · ฟังก์ชันเดิมครบ · typecheck เขียว
**C · Backend R2** — customer.get ส่ง property+owner+endDate ต่อสัญญา · owner list ส่ง rentedCount/availableCount/latestRented · appointment/contract list ส่ง phone/rent · property list ส่ง monthlyRent
**D · 2 กฎ text-layout ใหม่** (owner เทียบรูปสัญญา vs ลูกค้า) — ดู §4

## 3) 🎯 งานถัดไป (ทีละหน้า · จบแล้วหยุด · เสนอ+รูป 3 จอ ก่อนแก้เสมอ)
### ✅ A) เจ้าของ detail — เสร็จ `a1f678b` (detail ครบ 6/6 · verify authed 3 จอ)
### ⭐ B) §10 แยกหมวด (category split) — DESIGN-SYSTEM §10 · [[ros-category-split-and-device-subset]]
ไล่สแกน **detail/create form ทั้งหมด** หาชุดข้อความที่ควรแยกแต่ยังติดกัน (เช่น **นัด create form: วันเวลา+สถานที่ ติดกัน** · ฟอร์มอื่น ๆ) → เสนอ **before/after + รูป 3 จอ + เหตุผลตามกฎ** ก่อนแก้ · เสนอรวมทีเดียวได้
### ⭐ C) §11 per-device data subset — DESIGN-SYSTEM §11
เสนอต่อ**ทุกหน้า/ทุก responsive** ว่า **หัวข้อไหนควรโชว์บนมือถือ / iPad ตั้ง / iPad นอน / คอม** (ไม่ต้องครบทุก device — สุดท้ายจิ้มเข้า detail ดูเชิงลึกอยู่ดี) + **ถามก่อน + เหตุผล + รูป 3 จอ**

## 4) กฎ (source of truth) — **อ่าน `DESIGN-SYSTEM.md` เต็มก่อนแตะ UI**
- **§8 Label-value ราง + ⭐ ระดับเดียว** — ทุกกลุ่ม detail = `InfoGroup`/`InfoRow` (label จางคอลัมน์คงที่ + value ชิดซ้ายใกล้ label sm+ / value ขวา มือถือ) · **ห้ามปนหลายระดับในการ์ดเดียว** (name หนา+rent ทอง+code mono = anti-pattern หน้าลูกค้าเดิม) · **stat cluster = กึ่งกลาง** · หน้าสัญญา = ต้นแบบ · [[ros-detail-text-layout-standard]]
- **§12 โครง Detail = main+ราง** (เลิกแท็บ) · **List = grid+subgrid** (ห้ามใส่ width ให้ Col · คอลัมน์ขวากึ่งกลาง) · [[admin-listview-single-flex-column]] · [[ros-detail-archetypes-and-date-standard]]
- **§7 วันที่ "14 Jul 26"** (2 หลัก · lib/format.ts) · **§10 แยกหมวด** · **§11 per-device subset** · **§9 วิจารณ์ตรง** · **§13 ทีละหน้า+R2 ปลด**
- **auto-memory (operating manual):** `ros-master-workflow`(⭐อ่านก่อน) · `ros-detail-text-layout-standard`(⭐label-value+กึ่งกลาง) · `ros-detail-archetypes-and-date-standard`(⭐archetype+A+/A/B) · `ros-one-page-at-a-time` · `ros-comparison-responsive-protocol`(รูป show_widget 3 จอ) · `ros-critique-and-proactive`(⭐ติตรง) · `admin-listview-single-flex-column`(grid+subgrid) · `apply-list-template-no-reasking` · `ros-category-split-and-device-subset` · `ros-clean-detail-rows` · `ros-inter-look-date-and-labelvalue` · `ros-reseed-and-contract-side-effects`

## 5) 🛠 เครื่องมือ/วิธี (สำคัญ — จำให้ครบ)
- **owner ดู preview_screenshot ไม่ได้** → รูป owner-facing = `mcp__visualize__show_widget` เสมอ (ธีมมืด: ink#ECEAE4 gold#C8A96A goldDark#D6B980 surface#1B1A18 border#302E2A muted#9C978E faint#6A655D canvas#141312 info#7BA3C9 success#6FB58A amber#D6A756 danger#E27563)
- **⚠️ node ไม่อยู่ใน PATH default** → ต้อง `export PATH="/Users/iiamtikm/.local/node/bin:$PATH"` ทุก Bash ที่ใช้ npx/npm/tsc
- **verify authed (กันชน :3001):** worktree แยกพอร์ต — `git worktree add --detach <scratch> HEAD` → `ln -s node_modules` (root+web-admin) → cp `.env.local`+ไฟล์ที่แก้ → launch.json เพิ่ม config `wt-appt` (bash -c 'export PATH=...node/bin && cd <wt>/apps/web-admin && exec npx next dev' autoPort) → `preview_start` → **บางครั้งต้อง login** (admin@ros.local / ChangeMe!2026 · fill email+password submit) → นำทาง/screenshot → เสร็จ: `preview_stop` + `git worktree remove --force` + `git checkout .claude/launch.json`
- **backend change (R2):** แก้ apps/api ใน main repo → API :4000 ของเจ้าของ **hot-reload เอง** → worktree เห็นผลทันที
- **typecheck ก่อน verify:** `cd apps/web-admin && npx tsc --noEmit` (+ apps/api ถ้าแตะ backend)
- **verify per-device:** resize มือถือ375 / iPad 768(ตั้ง)·1024(นอน) / คอม1360 · **iPad preview = pointer:fine โชว์ตาราง** (iPad จริง touch=การ์ด) — เช็ค card ผ่าน DOM (`main ul > li`)
- **หา grid list ใน DOM:** `[...document.querySelectorAll('div')].filter(d=>d.style.gridTemplateColumns?.includes('minmax'))[0]` · แถว = `grid.children` (0=header)

## 6) 🗂 MD files — สแกน+ทำความสะอาดแล้ว (2026-07-30)
**เหลือ 10 ไฟล์ · ใช้จริงทั้งหมด:** root(DESIGN-SYSTEM·SESSION-HANDOVER·README) · docs/reference(SYSTEM-KNOWLEDGE·RELATIONSHIP-MAP) · component README(apps/api·db·infra/×3).
**ลบไป 2 (tracker เก่าซ้ำ handover/memory):** `PAGE-QA-SWEEP.md` · `docs/ADMIN-DESIGN-PHASES.md`.
**กฎ MD:** handover = ไฟล์เดียวนี้ เขียนทับเสมอ · **ห้ามสร้าง MD/tracker ใหม่ทุก session** (ใส่ลง handover หรือ memory แทน) · reference docs (SYSTEM-KNOWLEDGE/RELATIONSHIP-MAP) เก็บไว้ (เข้าใจระบบ) · component README เก็บ.

## 7) เหลือฝั่งเจ้าของ (ไม่บล็อก)
- 🔑 **push commit ค้างทั้งหมด (~25+ · ต้อง token)** · 🖼 วาง `apps/web-public/public/hero.jpg` (ถ้ายัง)

---
**เริ่ม session ใหม่:** อ่านไฟล์นี้ + `DESIGN-SYSTEM.md` → ทำงานต่อ §3 (A เจ้าของ detail / B แยกหมวด / C per-device) · **ทีละหน้า จบแล้วหยุด · เสนอ+รูป 3 จอ ก่อนแก้ · ติตรง · verify authed**

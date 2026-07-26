# ROS — SESSION HANDOVER (อ่านไฟล์เดียวจบ)

> **ไฟล์ handover ถาวร (ไม่มีวันที่ · เขียนทับทุกครั้ง ไม่สะสมไฟล์ใหม่).**
> สรุปทุกอย่าง: โครงสร้าง · ทำอะไรไปแล้ว · เหลือ/ขาดอะไร · กฎ · เครื่องมือ · จุดค้าง.
> คู่กับ: `DESIGN-SYSTEM.md` (กฎดีไซน์ locked §1–13) · `docs/ADMIN-DESIGN-PHASES.md` · `PAGE-QA-SWEEP.md` · auto-memory (operating rules) · `docs/reference/` (SYSTEM-KNOWLEDGE + RELATIONSHIP-MAP).
> **git:** branch `recover/redesign-v2` · **commit local ถาวรในเครื่อง · ยังไม่ push GitHub** (ต้อง token เจ้าของ) — commit ค้างเยอะ (~50+)

---

## 0) โครงสร้างโปรเจกต์ (monorepo)
- `apps/web-admin` — Next.js 14 admin (ธีมมืด-ทอง · authed) · **โฟกัสงาน** · sidebar: dashboard·เจ้าของ·ทรัพย์·ลีด·นัดหมาย·ปฏิทิน·ลูกค้า·สัญญา (+ audit·users·settings ใน ProfileMenu)
- `apps/web-public` — Next.js เว็บลูกค้า (สว่าง) — เสร็จ redesign แล้ว
- `apps/api` — NestJS + Prisma (Postgres) · **🔓 R2 ปลดแล้ว** (เจ้าของอนุญาตแก้ backend สำหรับ list rich cols)
- `db/` — Prisma schema + seed · `tailwind.preset.cjs` — token ร่วม 2 แอป
- **creds admin:** `admin@ros.local` / `ChangeMe!2026` · API :4000 (192.168.1.2) · web-admin :3001 (เจ้าของรันเอง) · web-public :3000

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** · งานตอนนี้ = **design polish world-class per-device** (ไม่ทำ feature ใหม่). ⚠️ เจ้าของทดสอบบน :3001 (dev ตัวเอง) — ค้างบ่อย hard refresh (Cmd+Shift+R).

## 2) ทำอะไรไปแล้ว session นี้ (เยอะมาก · ล่าสุด `cf747c5`)
**A · List minimal (variant C) ครบทุก list** (`661a450`) — outline pill · ตัด clutter
**B · Detail = 2 แม่แบบ + วันที่มาตรฐาน** (`8c31859`) — Record page (tabs/accordion) vs Quick modal · วันที่ "14 Jul 26" (2 หลัก · sweep)
**C · Shell width เดียว** (`58b2817`) — `(app)/layout.tsx` max-w-5xl · แก้ "สลับ sidebar แล้วขอบเต้น"
**D · ครบ 6 sidebar detail = Record master (เหมือนหน้าทรัพย์):**
- เจ้าของ (`6d8422a`) · ลูกค้า (`a05deae`) · **ลีด modal→หน้า [id]** (`54220d1`) · **นัด modal→หน้า [id] 3 แท็บ** (`4d78fb1`) · สัญญา (`471c895`) · ทรัพย์ = แม่แบบเดิม
- ทุกหน้า: DetailHeader + SectionTabs (มือถือ accordion/iPad·คอม แท็บ) + InfoGroup แยกกล่อง · เอา avatar ออก · ชุดข้อมูลเหมาะ entity
**E · Code pass** (`2522593`) — รหัส record บนหัว = **mono ทอง** ทุกหน้า · รหัสในกล่อง = จาง · สัญญาเรียง ลงนาม→เริ่ม→สิ้นสุด
**F · List pass (หน้า sidebar) — เริ่มแล้ว:**
- person list เบอร์ใต้ชื่อ (`5389b97`) · **เฉลี่ยช่องไฟเต็มกว้าง** (`4609148` · ListView shared) · **ลีด list ชุดคอลัมน์ใหม่ + 🔓 R2** (`edd7d14`) · ลีด สถานะ·ช่องทาง ชิดซ้าย (`cf747c5`)
- **ลีด list = จบ:** ลูกค้า(ชื่อ/เบอร์) · ทรัพย์ที่สนใจ(ล่าสุด · R2 backend) · อยากเข้าชม(วัน·เวลา 1 บรรทัด) · สถานะ·ช่องทาง(stacked ชิดซ้าย)
**bug ที่เจอ+แก้:** local `fmtDate` ปีเต็มแอบซ่อนใน leads/contracts → แก้เป็น lib

## 3) 🎯 งานถัดไป (ทีละหน้า · จบแล้วหยุด — [[ros-one-page-at-a-time]])
### ⭐ A) List pass ที่เหลือ (ทีละหน้า + รูป 4 จอ + ถาม)
- **นัดหมาย list** — นัดกับ → 2 บรรทัด (ชื่อ + วันเวลา) · เช็คคอลัมน์ขวาชิดซ้าย
- **เจ้าของ list** — เพิ่ม "มูลค่าพอร์ต" (🔓 R2 ทำได้แล้ว · แก้ backend list ให้ส่ง sum ค่าเช่า)
- **ลูกค้า list** — เพิ่ม "ค่าเช่าปัจจุบัน" (🔓 R2 · backend list ส่ง active rent)
- **ทรัพย์/สัญญา list** — ยืนยัน/จูนชุดคอลัมน์ + คอลัมน์ขวาชิดซ้ายใต้หัว
- ทุก list: ช่องไฟเฉลี่ย (มีแล้ว) · คอลัมน์ขวา items-start (ตรวจทุกหน้า)
### ⭐ B) §10 แยกหมวด (category split) — ไล่สแกน **ทุก detail/create form** หาชุดติดกันที่ควรแยก (เช่น **นัด create form: วันเวลา+สถานที่ ติดกัน**) → เสนอ before/after + รูป 3 จอ + เหตุผล ก่อนแก้
### ⭐ C) §11 per-device subset — เสนอ field เหมาะต่อ device (มือถือแก่น/iPad กลาง/คอมมากขึ้นไม่ครบ) + ถามก่อน + เหตุผล
### D) #3 นัด create form จัดหมวด · fine-tune ทรัพย์

## 4) กฎ (source of truth)
- **`DESIGN-SYSTEM.md`** locked §1–13: type·spacing·radius A·shadow·icon·color · **§7 วันที่ "14 Jul 26" (2 หลัก)** · §8 label-value rail · §8b no hard-cut · §9 วิจารณ์ตรง · **§10 แยกหมวด** · **§11 per-device subset** · **§12 โครง detail/list master** · **§13 ทีละหน้า+R2 ปลด**
- **auto-memory (operating manual):** `ros-master-workflow`(⭐อ่านก่อน) · `ros-one-page-at-a-time`(⭐ทีละหน้า จบแล้วหยุด) · `ros-detail-archetypes-and-date-standard`(⭐2 แม่แบบ+วันที่+shell+code ทอง+เฉลี่ยช่องไฟ) · `ros-comparison-responsive-protocol`(รูป show_widget 4 จอ เสมอ) · `ros-critique-and-proactive`(⭐ติตรง) · `ros-sidebar-entity-audit` · `ros-list-minimal-template` · `ros-category-split-and-device-subset` · `ros-clean-detail-rows` · `ros-view-edit-field-parity` · `ros-inter-look-date-and-labelvalue` · `admin-listview-single-flex-column`(⚠️ล้าสมัยบางส่วน—เปลี่ยนเป็นเฉลี่ยช่องไฟแล้ว) · `tailwind-mouse-variant-order` · `ros-reseed-and-contract-side-effects` · `ros-radius-and-mock-images`

## 5) 🛠 เครื่องมือ/วิธี (สำคัญ)
- **owner ดู preview_screenshot ไม่ได้** → รูป owner-facing = `mcp__visualize__show_widget` เสมอ (ธีมมืด: ink#ECEAE4 gold#C8A96A goldDark#D6B980 surface#1B1A18 border#302E2A muted#9C978E faint#6A655D canvas#141312 · info#7BA3C9 success#6FB58A danger#E27563)
- **verify authed (กันชน :3001):** worktree แยกพอร์ต — `git worktree add --detach <scratch> HEAD` → `ln -s <repo>/node_modules` → cp `.env.local`+ไฟล์ที่แก้ → เพิ่ม launch.json `bash -c 'cd <wt>/apps/web-admin && exec npx next dev'` autoPort → `preview_start` → เสร็จ: `preview_stop` + `git worktree remove --force` + `git checkout .claude/launch.json`
- **backend change (R2):** แก้ไฟล์ใน main repo (apps/api/...) → API :4000 ของเจ้าของ **hot-reload เอง** (nest watch) → worktree web-admin เห็นผลทันที
- typecheck ก่อน verify: `cd apps/web-admin && npx tsc --noEmit` + (ถ้าแตะ backend) `cd apps/api && npx tsc --noEmit`
- verify per-device: resize มือถือ375 / iPad768(tablet) / คอม1360 · **iPad preview เป็น pointer:fine โชว์ตาราง** (iPad จริง touch=การ์ด) — eval เช็ค DOM การ์ดเสริม

## 6) 🗂 MD files — สะอาดแล้ว (สแกน session นี้)
**เก็บทั้งหมด 12 ไฟล์ · ไม่มีขยะ** (session ก่อนลบ docs/archive ~43 ไฟล์): root(SESSION-HANDOVER·DESIGN-SYSTEM·PAGE-QA-SWEEP·README) · docs(ADMIN-DESIGN-PHASES·reference/×2) · component README(apps/api·db·infra/×3). **กฎ:** handover = ไฟล์เดียวนี้ เขียนทับเสมอ ไม่สร้าง MD ใหม่ทุก session

## 7) เหลือฝั่งเจ้าของ (ไม่บล็อก)
- 🔑 push commit ค้างทั้งหมด (ต้อง token) · 🖼 วาง `apps/web-public/public/hero.jpg` (ถ้ายัง)

---
**เริ่ม session ใหม่:** อ่านไฟล์นี้ → ทำงานต่อ §3 (A List pass ทีละหน้า / B แยกหมวด / C per-device) · **ทีละหน้า จบแล้วหยุด · รูป 4 จอ · ติตรง · verify authed ก่อน commit**

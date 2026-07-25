# ROS — SESSION HANDOVER (อ่านไฟล์เดียวจบ)

> **ไฟล์ handover ถาวร (ไม่มีวันที่ · เขียนทับทุกครั้ง ไม่สะสมไฟล์ใหม่).**
> สรุปทุกอย่าง: โครงสร้าง · ทำอะไรไปแล้ว · เหลือ/ขาดอะไร · เสนออะไร · ทำอะไรต่อ · กฎ · เครื่องมือ.
> คู่กับ: `DESIGN-SYSTEM.md` (กฎดีไซน์ locked §1–11) · `docs/ADMIN-DESIGN-PHASES.md` (แผนเฟส admin) · `PAGE-QA-SWEEP.md` (QA tracker) · auto-memory (operating rules — โหลดเข้า context เอง) · `docs/reference/` (SYSTEM-KNOWLEDGE + RELATIONSHIP-MAP — ความรู้ระบบ).
> **git:** branch `recover/redesign-v2` · **commit local ถาวรในเครื่อง · ยังไม่ push GitHub** (ต้อง token เจ้าของ) — commit ค้างเยอะ

---

## 0) โครงสร้างโปรเจกต์ (monorepo)
- `apps/web-admin` — Next.js 14 admin (ธีมมืด-ทอง · authed) · **โฟกัสงานตอนนี้** · หน้า: dashboard·properties·leads·appointments·contracts·customers·owners·calendar·audit·users·community·notifications·settings·search (+detail/wizard)
- `apps/web-public` — Next.js เว็บลูกค้า (สว่าง · ไม่ล็อกอิน) · home·properties·detail·saved·privacy — **เสร็จ redesign แล้ว (session ก่อน)**
- `apps/api` — NestJS + Prisma (Postgres) · **R2 = frontend-only ห้ามแตะ backend**
- `db/` — Prisma schema + seed (`seed/mock-bulk.ts` · ระวัง FK landmine)
- `tailwind.preset.cjs` — design tokens ร่วม 2 แอป
- **creds admin:** `admin@ros.local` / `ChangeMe!2026` · API :4000 · web-admin :3001 (เจ้าของรันเอง) · web-public :3000

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** (admin 21 หน้า CRUD จริง · public เสร็จ) · งานตอนนี้ = **design polish + world-class UX per-device** (ไม่ทำ feature ใหม่). ⚠️ **owner ทดสอบบน localhost:3001 (dev server ตัวเอง) — ค้างบ่อย ต้อง hard refresh (Cmd+Shift+R) หรือรีสตาร์ท server ถึงจะเห็นโค้ดใหม่.**

## 2) ทำอะไรไปแล้ว session นี้ (`5861a2c` → `c6809e3` · 17 commit)
**Phase 1 — Detail/Modal (T1.1–T1.5):**
- `5861a2c`+`46358aa` **นัดหมาย modal = status-driven bar (C)** — glance วันเวลา + แถบสถานะพา CTA + urgency (fmtUntil) · ปุ่ม stack เต็มกว้าง · ตัด ☎/chevron
- `bf49711` T1.2/1.3/1.4 dedupe (ลูกค้า/สัญญา/เจ้าของ) · `08e62ed` Phase 1 done (T1.5 wizard = ดีอยู่แล้ว)

**Owner-review batch (per-device redesign):**
- `1b2378a` **เจ้าของ** glance header + portfolio stat + list ตัด ☎
- `2ad1438` **view/edit parity** (ลูกค้า+เจ้าของ view โชว์ทุกฟิลด์เท่า edit · ว่าง=—)
- `84fa318` **PhoneLink ตัด ☎ ทั้งระบบ** (แก้ component เดียว) + จัดรูปเบอร์
- `606add1`·`985f61b`·`9a641fe`·`37c794a` **tabs↔accordion ครบ 4 record detail** (ทรัพย์/สัญญา/ลูกค้า/เจ้าของ) — มือถือ accordion · iPad tabs 1col · คอม tabs+2col · glance header ทุกหน้า · สัญญาแก้แถวทรัพย์/รหัส (ข้อ5) · sign-flow เก็บไว้ (pattern ถูก)
- `1726282` **InfoRow stack responsive** (ที่อยู่/โน้ต/รายละเอียด align ราง คอม · stack มือถือ)
- `91e6b24` **list หัวคอลัมน์ชิดซ้ายตรงเนื้อหา** ทุกหน้า + เอา avatar (profile icon) ออก (เจ้าของ+ลูกค้า)
- `a109cdb`→`c6809e3` **สัญญา list = แม่แบบ minimal (variant C)** — primary 2 บรรทัด (Col.twoLine) · outline pill (StatusBadge outline) · วันย่อ (fmtDateCompact) · ตัด clutter · **infra พร้อมใช้ซ้ำ**

## 3) 🎯 งานถัดไป (owner สั่งไว้)
### ✅ A) ใช้แม่แบบ list minimal (variant C) — เสร็จ (commit `661a450`)
owner approved batch: ลีด (ตัดรหัส + outline pill) · ทรัพย์ (เก็บรหัส RN-xxxx = คีย์สต็อก + outline) · นัดหมาย (outline pill · คงวันเวลา fmtDateTime) · เจ้าของ/ลูกค้า minimal ตรงแม่แบบอยู่แล้วไม่แตะ. verify authed 3 จอ ผ่าน. **rich cols (เจ้าของในทรัพย์ · ทรัพย์ที่สนใจในลีด · ทรัพย์ที่เช่าในลูกค้า) ยังติด R2** (ต้องเจ้าของเคาะปลด R2). ดู [[ros-list-minimal-template]].

### 🔄 B) แยกหมวด + design language (กำลังทำ · commit `8c31859`)
สแกนครบ เจอ 3 จุดปนหมวด: #1 นัดหมาย detail (พนักงาน+สถานที่) · #2 เจ้าของ detail (ติดต่อ+ระบุตัวตน+โน้ต) · #3 นัดหมาย create form (แบน).
**owner ยกระดับเป็นกติการะบบ (lock · ดู [[ros-detail-archetypes-and-date-standard]]):**
- **2 แม่แบบ detail:** Record page = SectionTabs (ทรัพย์/ลูกค้า/เจ้าของ/สัญญา) · Quick modal = สั้น action-first ไม่มีไอคอน (นัด/ลีด) — แก้ "ระบบสะเปะสะปะ"
- **วันที่มาตรฐานเดียว "14 Jul 26"** ทั้งแอป (sweep แล้วที่ format.ts) + helper fmtWeekdayDate/fmtTimeRange
- ✅ **#1 นัดหมาย detail = แม่แบบ modal minimal** (pill สี tone จริง + วันหัว + แยกหมวดด้วยสี ไม่มีไอคอน · per-device pill บน↔ขวา) — verify authed 3 จอ ผ่าน
- ✅ **Shell width เดียว (commit `58b2817`)** — แก้ owner "สลับ sidebar แล้วงง": คุมกว้างที่ layout เดียว (max-w-5xl) · ลบ max-w ทุกหน้า list · settings/search คงแคบ · verify ทุก list = 1024px ตรงกัน. **กฎ: หน้าใหม่ห้ามตั้ง max-w เอง**
- ✅ **ลีด modal minimal (commit `ced6483`)** — แล้ว owner **กลับลำ**: ไม่เอา modal สีล้วน → สั่งใหม่ (ด้านล่าง)
- 🔑 **owner mandate ใหม่ (ทับของเดิม):** ทุก 6 sidebar detail ใช้ **layout เดียวกับหน้าทรัพย์** (DetailHeader + SectionTabs accordion/แท็บ + InfoGroup แยกกล่องหัวชัด) · ทำทีละ sidebar · ขั้น1 layout ตามทรัพย์ ขั้น2 redesign ชุดข้อมูลเหมาะ entity · ถามก่อน · แนบรูป 4 จอ ทุก sidebar (ดู [[ros-detail-archetypes-and-date-standard]] §0)
  - ✅ **เจ้าของ (`6d8422a`)** — DetailHeader · เอา avatar ออก · แท็บ ทรัพย์ในพอร์ต(หลัก)/ข้อมูลเจ้าของ(กล่องแยก ติดต่อ·ระบุตัวตน·โน้ต)/สัญญา/เอกสาร · verify 4 จอ
  - ✅ **ลูกค้า (`a05deae`)** — DetailHeader · เอา avatar · ⋯ลบเข้าหัว · แท็บ สัญญา(แก่น)/ข้อมูลติดต่อ(กล่อง)/เอกสาร · verify 4 จอ
  - ✅ **ลีด (`54220d1`)** — แปลง modal→หน้า [id] เต็ม · DetailHeader + ปุ่ม status-driven · แท็บ ภาพรวม(กล่อง ความต้องการ/ติดต่อ/การดูแล)/ทรัพย์ที่สนใจ · ย้าย logic ครบ + dialog · list navigate · แก้ deep-link focus= · verify 4 จอ
  - ⏳ **เหลือ:** **นัดหมาย (modal → แปลงเป็นหน้า [id] เหมือนลีด — pattern พร้อมแล้ว)** · สัญญา (มี DetailHeader+Tabs · redesign data) · ทรัพย์ = แม่แบบ (อาจ tune data)
- ⏳ อื่น: #3 นัด create form · สแกน fmtDate local ปีเต็มหน้าอื่น

### ⭐ C) per-device data subset (กฎใหม่ owner)
หัวข้อ/คอลัมน์ **ไม่ต้องโชว์ครบทุก device** — เลือกตามความสำคัญ (มือถือแก่น · iPad ตั้ง/นอน กลาง · คอมมากขึ้นแต่ไม่ครบ) เพราะคลิกเข้า detail ดูเชิงลึกอยู่ดี. เสนอ subset ต่ออุปกรณ์ + ถามก่อน + เหตุผล. (กฎ B ในไฟล์เดียวกัน)

## 4) กฎ (source of truth)
- **`DESIGN-SYSTEM.md`** (locked §1–11): type · spacing · radius A · shadow · icon · color · **§7 วันสากล · §8 label-value rail · §9 วิจารณ์ตรง · §10 แยกหมวด · §11 field ต่อ device**
- **auto-memory (operating manual — โหลดเอง):** `ros-master-workflow`(⭐อ่านก่อน) · `ros-comparison-responsive-protocol`(รูปเทียบ show_widget เสมอ · per-device) · `ros-critique-and-proactive`(⭐ติตรง ห้ามอวย) · `ros-sidebar-entity-audit`(⭐per-entity · per-device distinct · **แนบรูปทุกครั้ง**) · `ros-clean-detail-rows`(plain value · no ☎ · hover-nav) · `ros-view-edit-field-parity` · `ros-list-minimal-template`(variant C) · `ros-detail-archetypes-and-date-standard`(⭐2 แม่แบบ detail + วันที่ 14 Jul 26) · `ros-category-split-and-device-subset`(⭐กฎใหม่ 2 ข้อ) · `ros-inter-look-date-and-labelvalue` · `admin-listview-single-flex-column` · `tailwind-mouse-variant-order` · `ros-reseed-and-contract-side-effects` · `ros-radius-and-mock-images`

## 5) 🛠 เครื่องมือ/วิธี (สำคัญ)
- **owner ดู preview_screenshot ไม่ได้** → รูปเทียบ owner-facing = `mcp__visualize__show_widget` เสมอ (ธีมมืด ROS · hex: ink#ECEAE4 gold#C8A96A surface#1B1A18 border#302E2A muted#9C978E faint#6A655D page#131210)
- **verify authed admin (กันชน :3001 ของเจ้าของ):** worktree แยกพอร์ต — `git worktree add --detach <scratch> HEAD` → `ln -s <repo>/node_modules` → cp `.env.local`+ไฟล์ที่แก้ → เพิ่ม launch.json config `bash -c 'cd <wt>/apps/web-admin && exec npx next dev'` autoPort → `preview_start` → เสร็จ: `preview_stop` + `git worktree remove --force` + `git checkout .claude/launch.json`
- **preview :3050 หลุดบ่อย** → เช็ค preview_list / restart · **eval นำทางแล้ว screenshot อาจได้หน้าเก่า** → `location.replace()` + screenshot ใหม่
- verify per-device: resize มือถือ375 / iPad768(tablet) / คอม1360(width) · list touch=card (iPad preview เป็น pointer:fine โชว์ตาราง แต่ iPad จริง touch=card)
- typecheck ทุกครั้งก่อน verify: `cd apps/web-admin && npx tsc --noEmit -p tsconfig.json`

## 6) 🗂 MD files — จัดระเบียบแล้ว (session นี้)
- **root ใช้จริง:** `SESSION-HANDOVER.md`(นี้ · undated เขียนทับ) · `DESIGN-SYSTEM.md` · `PAGE-QA-SWEEP.md` · `README.md`
- **docs/ ใช้จริง:** `ADMIN-DESIGN-PHASES.md` · `reference/SYSTEM-KNOWLEDGE.md` · `reference/RELATIONSHIP-MAP.md`
- **ลบแล้ว:** `docs/archive/` (~43 ไฟล์ audit/handover เก่า มิ.ย.–ก.ค. · git เก็บประวัติไว้แล้ว) + `SESSION-HANDOVER-2026-07-19.md` (แทนด้วยไฟล์ undated)
- **กฎไปข้างหน้า:** handover = ไฟล์เดียว `SESSION-HANDOVER.md` เขียนทับเสมอ **ไม่สร้าง MD ใหม่ทุก session** · อัปเดต ADMIN-DESIGN-PHASES + PAGE-QA-SWEEP เท่านั้น

## 7) เหลือฝั่งเจ้าของ (ไม่บล็อก)
- 🔑 push commit ค้างทั้งหมด (ต้อง token) · 🖼 วาง `apps/web-public/public/hero.jpg` (ถ้ายัง) · เคาะปลด R2 ถ้าอยากได้ rich list cols

---
**เริ่ม session ใหม่:** อ่าน `SESSION-HANDOVER.md` → ทำงานต่อ = §3 (A ใช้แม่แบบ list 5 หน้า / B แยกหมวด / C per-device subset) · ทุกงาน = แนบรูป 3 จอ + ติตรง + verify authed ก่อน commit

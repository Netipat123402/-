# ROS — SESSION HANDOVER (อ่านไฟล์เดียวจบ)

> **ไฟล์ handover ถาวร — เขียนทับเสมอ ไม่สร้างใหม่ทุก session.** อ่านไฟล์นี้ไฟล์เดียว = เข้าใจโปรเจกต์ทั้งหมด: โครงสร้าง · ทำอะไรไปแล้ว · เหลือ/ขาดอะไร · กฎ · เครื่องมือ · จุดค้าง.
> คู่กับ: **`DESIGN-SYSTEM.md`** (กฎดีไซน์ locked · อ่านก่อนแตะ UI) · auto-memory (operating rules) · `docs/reference/` (SYSTEM-KNOWLEDGE + RELATIONSHIP-MAP · เข้าใจ backend/relations).
> **git:** branch `recover/redesign-v2` · commit local ถาวรในเครื่อง · **ยังไม่ push GitHub (ต้อง token เจ้าของ) — ค้าง ~87 commits**

---

## 0) โครงสร้างโปรเจกต์ (monorepo)
- `apps/web-admin` — Next.js 14 admin (ธีมมืด-ทอง · authed) · **โฟกัสงานตอนนี้** · sidebar: แดชบอร์ด·เจ้าของ·ทรัพย์·ลีด·นัดหมาย·ปฏิทิน·ลูกค้า·สัญญา (+ audit·users·settings ใน ProfileMenu)
- `apps/web-public` — Next.js เว็บลูกค้า (สว่าง) — redesign เสร็จแล้ว
- `apps/api` — NestJS + Prisma (Postgres) · **🔓 R2 ปลดแล้ว** (แก้ backend ได้สำหรับ rich data / filter)
- `db/` — Prisma schema + seed (`db/seed/mock-bulk.ts`) · `tailwind.preset.cjs` — token ร่วม 2 แอป
- **creds admin:** `admin@ros.local` / `ChangeMe!2026` · API :4000 (localhost/192.168.1.2) · web-admin :3001 (เจ้าของรันเอง) · web-public :3000

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** · งานตอนนี้ = **design polish world-class** (ยกเครื่อง detail/list/form/filter ให้เป็นระบบเดียว · ไม่ทำ feature ใหม่นอกจากที่เจ้าของสั่ง). ⚠️ เจ้าของทดสอบบน :3001 (dev ตัวเอง) — ค้างบ่อย hard refresh (Cmd+Shift+R).

## 2) ⭐⭐ CYCLE การทำงาน (พื้นฐานสุด — owner ย้ำหนักมาก "สั่งตลอด เหนื่อยมาก จำไว้")
ทุกงาน UI ทำ **ทีละหน้า/ทีละชุด** วนตามนี้เป๊ะ ห้ามข้าม → [[ros-propose-first-cycle]]:
1. **วิเคราะห์ภาพรวม**หน้านั้น (ชุดข้อมูล + การใช้งานจริง)
2. **ติของเก่าตรง ๆ (ห้ามอวย)** + **เสนอของใหม่**
3. **รูปธรรม = รูปเทียบ before/after 3 อุปกรณ์** (มือถือ/iPad/คอม) — owner เข้าใจภาพง่ายกว่าคำ + ยืนยันเข้าใจตรงกัน · owner-facing = `show_widget` เสมอ (ดู preview_screenshot ไม่ได้)
4. **รอเคาะ ก่อนลงมือ — ห้ามทำโดยพลการ**
5. เคาะ → ทำ → verify authed 3 จอ → commit → **จบหน้านั้นค่อยต่อหน้าถัดไป (วน 1-5)**

## 3) ทำอะไรไปแล้ว (สะสมทุก session · ล่าสุด `78794ca`)
**A · List pass 6 หน้า** — grid+subgrid ช่องไฟเท่ากันเต็มจอ · label-value · คอลัมน์ขวากึ่งกลาง

**B · Detail redesign = "main + ราง" (เลิก SectionTabs) — ครบ 6/6:** สัญญา`73855a6`(A+) · ลูกค้า`c30b524`(A) · นัด`b0380f9`(B) · ลีด`7e4e120`(A) · ทรัพย์`b33ca52`(A listing) · เจ้าของ`a1f678b`(A portfolio occupancy-first)

**C · แยกหมวดฟอร์ม (§10) — ครบ 6/6:** เกณฑ์ สั้น≤4ช่อง=คงแบน · ยาว6+/หลายความหมาย=แยกหมวด (SectionLabel จางไม่มีไอคอน §10b · space-y-5 คั่นหมวด/space-y-3 ในหมวด) · นัด`0dc01f8` · เจ้าของ edit`e59e5f9` · สัญญา`3b973d1` · ทรัพย์ wizard`3b973d1`(แยกราคา/ห้อง+ย้ายชั้น) · ลีด`6b46840`+ลูกค้า(คงแบน)

**D · per-device list (§11) — ทบทวน 6/6:** list = 2 เลย์เอาต์ (การ์ด touch / ตาราง คอม) · การ์ด ~340px เท่ากันมือถือ→iPad → "4 ชุด/device" ไม่ตรงจริง · dev เดิมทำ per-device ไว้เกือบครบ · แก้จริงจุดเดียว = เจ้าของ C1`65b095e` (การ์ดมือถือรวม 3 สถิติเป็นบรรทัดเดียว)

**E · เว้นวรรค "ขอบเนื้อเดียว" (§8 กฎ3 · Tang A):** เนื้อเต็มกว้าง (chips/ลิสต์/desc) ชิดราง value เดียว (sm+) ผ่าน `RailBlock` (components/ui.tsx) — `fb30811`(ui+property) · `232c9a5`(ลีด) · `234a7d2`(เจ้าของ/ลูกค้า/สัญญา) · **ถอด RailBlock ออกจาก เอกสาร/ประวัติ section (ผิด — ดันขวา)** `580f7a5` + empty state กึ่งกลาง (py-6 text-center) ทุกหน้า · **ถอดไอคอนหน้า field** ทรัพย์ `ba8e0f5`

**F · ราง (rail) กึ่งกลาง+ปุ่มเต็มกว้าง** `a276788` — เหตุ `sm:ml-auto` ขัด `xl:items-stretch` → เพิ่ม `xl:ml-0` (ลีด/นัด/ทรัพย์ · contract ไม่มี ml-auto=ไม่แตะ) · นัด: date/status กึ่งกลาง xl

**G · ลิสต์ยาว (เจ้าของ 10+ ทรัพย์)** `af0ea85` — โชว์ 6 + "ดูทั้งหมด N ›" → `/properties?owner=<id>` (list กรองเจ้าของ + ชิป + ค้นหา/กรอง) · backend property query รับ `ownerId` filter

**H · ⭐ Filter redesign 6 list (ตามชุดข้อมูลเฉพาะหน้า + responsive):**
- เจ้าของ`1289050`: Segmented "มีทรัพย์ว่าง" + sort ทรัพย์มากสุด (backend relation some available)
- ทรัพย์`53eaa41`: ค้นหาพระเอก(`searchWide`) · จังหวัด(ทำเล)ก่อนประเภท · sort default "ใหม่สุด"
- ลีด`0e91b15`: "ผู้ดูแล: ของฉัน" (assignedToId=user.id · backend มีอยู่แล้ว) + ค้นหากว้าง
- นัด`a5ab1cb`: "ผู้รับผิดชอบ: ของฉัน" (agentId=user.id · backend มีอยู่แล้ว) + ค้นหากว้าง · 2 Segmented คงไว้
- ลูกค้า`e4fdd04`: Segmented "กำลังเช่าอยู่" (backend renting param → contracts some active)
- สัญญา`78794ca`: sort default "ใกล้ครบกำหนด" (endDate asc · renewal) + backend expiry_desc + ค้นหากว้าง
- หลัก: ค้นหา=พระเอก · ใช้บ่อย=แรก/ใช้น้อย=หลัง · ลูกค้า/สัญญาไม่ยัด "ของฉัน" (ไม่ผูก agent)

## 4) 🎯 งานถัดไป — **✅ polish phase ครบทั้งหมดแล้ว** · เหลือ push + งานใหม่จากเจ้าของ
สรุปสถานะกฎ owner ทั้งหมด = **ทำครบ**:
- **§10 แยกหมวด:** ฟอร์ม 6/6 ✅ · **detail ✅ (จัด InfoGroup ตามหมวดตอน redesign — เช่น นัด: วันเวลา=ราง แยกจาก สถานที่=group)**
- **§11 per-device subset:** list 6/6 ✅ (การ์ด touch ซ่อน sub รองบนมือถือ) · **detail = โชว์ครบทุกหัวข้อโดยตั้งใจ** (จิ้มเข้ามาดูเชิงลึกอยู่แล้ว — ไม่ต้อง subset)
- **§8 เว้นวรรค/ขอบเนื้อเดียว · rail กึ่งกลาง · empty state กึ่งกลาง · filter 6 หน้า:** ✅ (ดู §3 E-H)
> **ไม่มีงานค้างเชิงระบบ.** ถ้าเจ้าของเจอจุดเฉพาะ (ข้อความควรแยกแต่ยังติด / อยากปรับ subset ต่อ device) = งานทีละหน้าตาม CYCLE §2 (สแกน→ติ→เสนอ 3 จอ→รอเคาะ→ทำ)

## 5) กฎ (source of truth) — **อ่าน `DESIGN-SYSTEM.md` เต็มก่อนแตะ UI**
- **§8 Label-value ราง + ระดับเดียว** (InfoGroup/InfoRow · label จาง/value ink · ห้ามปนหลายระดับ) · **stat cluster = กึ่งกลาง** · **§8 กฎ3 = ขอบเนื้อเดียว (RailBlock)** · หน้าสัญญา=ต้นแบบ · [[ros-detail-text-layout-standard]]
- **§10 แยกหมวด** (ฟอร์ม/detail) · **§10b หัวข้อ SectionLabel ห้ามไอคอน + ฟอร์มสั้น≤4 คงแบน** · **§11 per-device subset** · [[ros-category-split-and-device-subset]]
- **§12 Detail=main+ราง · List=grid+subgrid** (ห้าม width Col · ขวากึ่งกลาง) · [[admin-listview-single-flex-column]] · [[ros-detail-archetypes-and-date-standard]]
- **§7 วันที่ "14 Jul 26"** (lib/format.ts) · **§9 วิจารณ์ตรง(ห้ามอวย)** · **§13 ทีละหน้า+R2 ปลด**
- **auto-memory (operating manual):** `ros-propose-first-cycle`(⭐⭐พื้นฐานสุด) · `ros-master-workflow` · `ros-detail-text-layout-standard`(⭐เว้นวรรค/label-value/RailBlock/กึ่งกลาง) · `ros-detail-archetypes-and-date-standard` · `ros-category-split-and-device-subset` · `ros-one-page-at-a-time` · `ros-comparison-responsive-protocol` · `ros-critique-and-proactive` · `admin-listview-single-flex-column` · `ros-clean-detail-rows` · `ros-inter-look-date-and-labelvalue` · `ros-reseed-and-contract-side-effects` · `apply-list-template-no-reasking`

## 6) 🛠 เครื่องมือ/วิธี (สำคัญ — จำให้ครบ)
- **owner ดู preview_screenshot ไม่ได้** → owner-facing = `mcp__visualize__show_widget` เสมอ (ธีมมืด: ink#ECEAE4 gold#C8A96A goldDark#D6B980 surface#1B1A18 border#302E2A muted#9C978E faint#6A655D canvas#141312 info#7BA3C9 success#6FB58A amber#D6A756 danger#E27563)
- **⚠️ node ไม่อยู่ใน PATH** → `export PATH="/Users/iiamtikm/.local/node/bin:$PATH"` ทุก Bash npx/npm/tsc
- **verify authed (กันชน :3001):** worktree แยกพอร์ต — `git worktree add --detach <WT> HEAD` → `ln -s node_modules` (root+web-admin) → cp `.env.local`+ไฟล์ที่แก้ → เพิ่ม config ใน `.claude/launch.json` (bash -c 'export PATH=…node/bin && cd <WT>/apps/web-admin && exec npx next dev' autoPort) → `preview_start` → นำทาง/eval/screenshot → เสร็จ: `preview_stop` + `git worktree remove --force <WT>` + `git checkout .claude/launch.json` + `git worktree prune` (login มักติด session อยู่แล้ว)
- **backend change (R2):** แก้ apps/api ใน main repo → API :4000 ของเจ้าของ **hot-reload เอง** → worktree เห็นผลทันที (verify filter ได้เลย)
- **typecheck ก่อน commit:** `cd apps/web-admin && npx tsc --noEmit` (+ `cd apps/api && npx tsc --noEmit` ถ้าแตะ backend)
- **verify per-device:** resize มือถือ375 / iPad 768(ตั้ง)·1024(นอน) / คอม1360 · **iPad preview=pointer:fine โชว์ตาราง** (iPad จริง touch=การ์ด) — เช็คการ์ดผ่าน DOM (`main ul > li`)
- **หา grid list ใน DOM:** `[...document.querySelectorAll('div')].filter(d=>d.style.gridTemplateColumns?.includes('minmax'))[0]` · แถว=`grid.children` (0=header)
- **API base ในหน้า:** `http://localhost:4000/api/v1` · cookie+bearer(in-memory) → ดึง API ตรงจาก eval ไม่ได้ (401) · ใช้ UI นำทางแทน
- **FilterBar:** props `search`/`sort`/`filters`(dropdown)/`range`/`searchWide`(ค้นหากว้างเต็มบนคอม) · มือถือยุบ filter เป็นปุ่ม "ตัวกรอง" · Segmented = quick-filter แถวบน (pattern ทุก list)

## 7) 🗂 MD files — สแกนล่าสุด 2026-08-01: **10 ไฟล์ ใช้จริงทั้งหมด ไม่มีขยะ**
root(**DESIGN-SYSTEM**·**SESSION-HANDOVER**·README) · docs/reference(**SYSTEM-KNOWLEDGE** 868บรรทัด·**RELATIONSHIP-MAP** 543 — เข้าใจ backend/relations เก็บไว้) · component README(apps/api·db·infra/backup·docker·monitoring — เก็บ).
**กฎ MD (สำคัญ):** handover = ไฟล์เดียวนี้ **เขียนทับเสมอ · ห้ามสร้าง MD/tracker ใหม่ทุก session** (ใส่ลง handover หรือ auto-memory แทน) · session ก่อนลบ tracker ขยะไปแล้ว 2 (`PAGE-QA-SWEEP.md`·`docs/ADMIN-DESIGN-PHASES.md`).

## 8) เหลือฝั่งเจ้าของ (ไม่บล็อก)
- 🔑 **push commit ค้างทั้งหมด (~87 · ต้อง token)** · 🖼 วาง `apps/web-public/public/hero.jpg` (ถ้ายัง)

---
**เริ่ม session ใหม่:** อ่านไฟล์นี้ + `DESIGN-SYSTEM.md` → polish phase ครบแล้ว (§4) · **รอรับงานใหม่จากเจ้าของ** · **ยึด CYCLE §2 เป๊ะ: ทีละหน้า · ติเก่า+เสนอใหม่+รูป 3 จอ · รอเคาะ · เคาะค่อยทำ · verify authed · commit · ต่อหน้า**

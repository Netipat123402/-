# 🔄 SESSION HANDOVER — 2026-07-16 · Per-Device Polish + Overflow Fixes + Rules Consolidation

> **อ่านไฟล์นี้ไฟล์เดียวแล้วทำต่อได้ทันที** · session ก่อนหน้า (07-13) = QA sweep · session นี้ = per-device polish ครบทั้งแอด + แก้ overflow ราก + รวมกฎ
> **โฟลเดอร์:** `~/Desktop/ไม่มีชื่อโฟลเดอร์ สำเนา 2` · **branch:** `recover/redesign-v2` · **working tree สะอาด**
> **กฎ (memory โหลดอัตโนมัติ 5 ไฟล์):** `ros-master-workflow` (⭐ อ่านก่อน) · `ros-comparison-responsive-protocol` · `ros-redesign-workflow` · `ros-design-system-lock` · `ros-reseed-and-contract-side-effects`
> **tracker:** `PAGE-QA-SWEEP.md` (checklist ทุกหน้า/ปุ่ม) · **design tokens:** `DESIGN-SYSTEM.md` (ล็อก)

---

## 0) สภาพโปรเจกต์ (resume ก่อน)
- **โครงสร้าง:** monorepo · `apps/web-admin` (:3001, จัดการภายใน) · `apps/web-public` (:3000, ลูกค้า) · `apps/api` (:4000, NestJS) · `db` (Prisma + seed)
- **dev server เจ้าของเปิดเอง:** web-public :3000 · web-admin :3001 · api :4000 (localhost) — **AI ห้ามฆ่า server เจ้าของ**
- **admin login (dev seed):** `admin@ros.local` / `ChangeMe!2026`
- **เทส/แคปภาพ (สำหรับ AI ตรวจเอง — client เจ้าของไม่เห็น screenshot):** git worktree + Preview MCP (ดูข้อ 6)
- **push ไม่ได้ (AI):** ต้อง token เจ้าของ · commit local ได้ · **14 commit ค้าง (session นี้) รอ push**
- **DB:** re-seed ได้ (`db/seed/mock-bulk.ts`) แต่มี FK landmine (ดู `ros-reseed-and-contract-side-effects` — สำคัญ)

---

## 1) ⭐ กฎทั้งหมด (ฉบับรวม 8 หมวด — เจ้าของ review แล้ว) — อยู่ครบใน memory `ros-master-workflow`
สรุปหัวใจ (รายละเอียดเต็มใน memory):
- **หมวด 0 กฎเหล็ก:** เสนอก่อนแก้ทุกครั้ง · **รูปเทียบ = `show_widget` เท่านั้น** (client ไม่เห็น screenshot/รูปแนบ) · มือถือ≠iPad≠คอม (3-4 ดีไซน์แยก) · เทสจริงทุกปุ่ม+เคลียร์ test data · minimal ไม่รก **ไม่ล้น ไม่ตกกรอบ**
- **หมวด 1 ลำดับ 10 ขั้น:** สแกนภาพรวม→ไล่ device→หาปัญหา+ทฤษฎี→widget เทียบ→ถาม→แก้→verify+pause-scan→functional→เคลียร์→after+commit+tracker
- **หมวด 2 รูปเทียบ:** widget (แถบต่อ device เขียว/แดง + mini-layout ตอนนี้vsเสนอ) · **หลายทาง=โชว์ครบ 3 แบบพร้อมกัน** · after ยืนยัน
- **หมวด 3 per-device (หัวใจ):** ประเมิน 4 จอแยก · iPad ใช้พื้นที่ · density monotonic · **[3.5]** mobile/iPad filter parity · **[3.6 ใหม่]** แยกหมวดข้อมูล (วันที่+สถานที่ ฯลฯ อย่ายัดติดกัน) · **[3.7 ใหม่]** per-device field prioritization (แต่ละ device โชว์ field ตามความสำคัญ ไม่ต้องครบ · เสนอ+ถาม+เหตุผล)
- **หมวด 4 functional:** กดทุกปุ่ม กรอกจริง CRUD จริง ทุก device · DB-safety
- **หมวด 5 pause-scan:** ก่อนเปลี่ยน device/งาน หยุดสแกนความเรียบร้อย — **ตัวหนังสือล้น/ตกกรอบ/wrap 2 บรรทัด** (บทเรียน: DOM scanner จับ hard-overflow อย่างเดียวไม่พอ ต้องวัด height จับ wrap + ดู screenshot จริง)
- **หมวด 6 shared-part:** แก้ทั้ง 2 แอป · ไล่ล่า inconsistency เชิงรุก · pattern per-device ตรงกัน
- **หมวด 7 design theory ระดับโลก:** ทุกข้อเสนอมีหลัก+ทฤษฎี+เหตุผลใช้จริง (Airbnb/Google/Linear/Stripe) · การ์ด touch=1 key-attr · ตารางคอม=แยกคอลัมน์
- **หมวด 8 อื่นๆ:** motion minimal · DESIGN-SYSTEM ล็อก token · commit ต่อ fix · re-seed/contract landmine

---

## 2) ✅ งานที่ทำจริง session นี้ (14 commits · ทุกตัวมี widget เทียบ+เหตุผล+verify)

### 2.1 code fixes (7 code commits)
| commit | fix | หลักการ/ทฤษฎี |
|---|---|---|
| `a05248f` | **customers/owners** email = คอลัมน์ table-only + **calendar** day-cards 2→1→2 → monotonic | การ์ด touch=1 key-attr (phone) · ตาราง=แยก col · density monotonic |
| `33ab7a0` | **responsive FilterBar** (shared 5 หน้า) — inline บนคอม/iPad-นอน (≥lg) · sheet บนมือถือ/iPad-ตั้ง | desktop≠mobile · เดิม admin เป็น modal ทุกจอ (ตัวประหลาด) → ตรงกับ public |
| `a03039e` | **users** list — การ์ด sub=บทบาท · อีเมล=table-only col · เลิกตารางโชว์บทบาทซ้ำ | การ์ด=key attr (role) · ตาราง=แยก |
| `8875606` | **contracts** list — แยก sub รวม (รหัส·ทรัพย์·วันที่) → คอลัมน์แยก | ตรง pattern customers/users |
| `05446bb` | **contracts** table — คอลัมน์ "ช่วงสัญญา" = เริ่ม–สิ้นสุด (ปีย่อ 2 หลัก · สิ้นสุดเน้นทอง) | ระยะเวลา=แก่นสัญญา |
| `809f65a` | **[both apps] `.badge` +whitespace-nowrap** — pill สถานะ (ว่าง·ลงประกาศ) ไม่ wrap 2 บรรทัดตกกรอบ | badge/chip=atomic 1 บรรทัด (Material/Airbnb) |
| `490fcbc` | **ListView table** ไม่ตก 2 บรรทัด — คอลัมน์คงที่ nowrap · คอลัมน์ยาว(sub)=`w-full max-w-0 truncate` (greedy+ตัดได้) · ขยาย contracts/appointments เป็น max-w-5xl | data table = 1 บรรทัด/แถวเสมอ (Linear/Airtable/Notion) |

### 2.2 pattern ที่ตั้งไว้ (ยึดทุก list ต่อไป)
**การ์ด touch = โชว์ 1 key-attr** (customers=phone · users=role · contracts=property) · **ตารางคอม = แยกคอลัมน์เต็ม** · filter **inline-desktop / sheet-mobile** · **grid/columns monotonic** · **badge nowrap** · **table cell ไม่ wrap** — ทั้งหมดนี้ consistent แล้วใน customers·owners·users·contracts·properties·leads

### 2.3 อุบัติเหตุ + กู้คืน (บันทึกไว้กันซ้ำ)
- **re-seed FK landmine:** mock-bulk `clean()` ล้มที่ owner.deleteMany (FK) เพราะ junk property (CD-2026-1009) อ้าง mock owner → clean ลบ contracts/appointments ไปแล้วก่อนล้ม = demo ว่างชั่วคราว · **กู้:** ลบ junk → re-run mock-bulk (ดู `ros-reseed-and-contract-side-effects`)
- **mark-all-read เผลอกด:** selector "ทั้งหมด" แมตช์ "อ่านทั้งหมด" → กู้โดย revert notification ที่ readAt≈now กลับ unread · **บทเรียน: selector อย่าแมตช์กว้าง**

---

## 3) 📊 สถานะ QA sweep (ดู `PAGE-QA-SWEEP.md` ละเอียด) — **admin 100% + public verified**
**web-public ✅ 5/5:** home · listings · detail · saved · privacy — verified + overflow-clean + pattern ตรง admin
**web-admin ✅ 21/21:** login · dashboard · properties(list+[id]+new) · leads · appointments · calendar · contracts(list+[id]) · customers(+[id]) · owners(+[id]) · community · notifications · audit · users · search · settings — **functional จริงทุกปุ่ม** (CRUD/PATCH/upload/moderation/create+auto-fill) + verify 4 device + เคลียร์ test data
**บั๊กแอปที่เจอ:** 0 (ทุก fix = per-device/consistency/overflow improvements)

---

## 4) ⏭ ทำต่อ (เรียงความสำคัญ) — **งานหลักถัดไป = หมวด 3.6 + 3.7 (กฎใหม่)**

### 4.1 🎯 แยกหมวดข้อมูล + per-device field priority (กฎ 3.6 + 3.7 — เจ้าของสั่งเน้น)
เจ้าของชี้: **หลายหน้ามีชุดข้อมูลควรแยกแต่ยัดติดกัน** เช่น:
- **appointments:** "วันเวลา · ทรัพย์" (วันที่+สถานที่ติดกัน) → ควรแยก · และ combined sub อื่นๆ
- ไล่สแกน**ทุกหน้า/ทุก card/ทุกตาราง** หา field ที่ควรแยก (วันที่ | สถานที่ | สถานะ ฯลฯ)
- **+ per-device field priority:** แต่ละ device โชว์ field ตามความสำคัญของหน้านั้น (ไม่ต้องครบ — สุดท้ายคลิก detail อยู่ดี) · **ยกตัวอย่าง:** มือถือหน้านัดควรโชว์อะไร (ชื่อ+เวลา?) · iPad-ตั้ง/นอน เพิ่มอะไร · คอมโชว์อะไร
- **วิธีทำ (ตามกฎ):** สแกน→เสนอ widget **3 แบบ (มือถือ/iPad/คอม) พร้อมกัน** + before/after + เหตุผล → **ถามก่อน** → แก้ → verify 4 จอ → after

### 4.2 🔍 pause-scan overflow/wrap ต่อให้ครบ (หมวด 5)
- วิธีใหม่ (จับ wrap ด้วย height ไม่ใช่แค่ scrollWidth) — ไล่หน้าที่เหลือ: detail pages, forms, **iPad-นอน 1024, มือถือ-นอน (landscape)** — อาจมีจุด wrap ที่ scanner เก่าพลาด
- root fix 2 ตัวทำแล้ว (badge nowrap · table nowrap) แต่ยังมี non-ListView layouts (forms/modals/detail) ที่ยังไม่สแกน wrap ครบ

### 4.3 ⏸ dashboard / calendar (ค้างจากรอบก่อน — เจ้าของเคาะแล้ว)
- **dashboard:** แนะนำคง 1-col (agenda=peer list · consistent) — เจ้าของยังไม่สั่งแก้
- **calendar day-cards:** แก้ 2→1→2 แล้ว (a05248f)

### 4.4 P-ship
- before/after gallery รวม + push 14 commit (token เจ้าของ) + รีวิวบนเครื่องเจ้าของ

---

## 5) 🗂 MD files cleanup (เจ้าของขอ — จัดระเบียบแล้วในไฟล์นี้)
**ปัญหา:** root มี 28 MD (สร้างใหม่ทุกครั้งที่ย้าย session) รกมาก · **จัดใหม่:**

### เก็บไว้ root (active — ใช้จริงตลอด):
- `SESSION-HANDOVER-2026-07-16.md` ⭐ (ไฟล์นี้ — อ่านไฟล์เดียวจบ)
- `PAGE-QA-SWEEP.md` (tracker ทุกหน้า — อัปเดตต่อเนื่อง)
- `DESIGN-SYSTEM.md` (design tokens ล็อก)
- `README.md`

### ย้ายเข้า `docs/archive/` (ประวัติ/เสร็จแล้ว/superseded — ไม่ลบ กันอ้างอิง แต่ไม่รกหน้าหลัก):
- SESSION-HANDOVER เก่า 5 ไฟล์ (07-03 ×2, 07-09, 07-13, ตัวไม่มีวันที่)
- audits/backlogs จาก มิ.ย.: ARCHITECTURE-AUDIT · BUG-HUNT · DATABASE-AUDIT · SECURITY-AUDIT · PRODUCTION-READINESS · FINAL-PRODUCTION-AUDIT · DATABASE-REMEDIATION-BACKLOG · MASTER-REMEDIATION-BACKLOG · PHASE-12-IMPLEMENTATION-ROADMAP · FINAL-PREDEPLOY-EXPERIENCE-AUDIT · PREDEPLOY-CHANGELOG-AND-DEVICE-QA · UX-UI-AUDIT · FIX-LOG · RECOVERY-NOTES · RECOVERY-TEST-CHECKLIST · PROJECT-HANDOVER

### ย้ายเข้า `docs/reference/` (ยังใช้อ้างอิงเป็นครั้งคราว):
- SYSTEM-KNOWLEDGE.md (66KB · knowledge base) · RELATIONSHIP-MAP.md (data relations) · DESIGN-REFERENCE-ANALYSIS.md · PHASE2-UXUI-REDESIGN-PLAN.md

> **หลักไปข้างหน้า:** 1 handover ล่าสุดที่ root เท่านั้น · handover เก่า→archive ทันทีเมื่อขึ้นตัวใหม่ · อย่าสร้าง MD ใหม่พร่ำเพรื่อ — อัปเดต PAGE-QA-SWEEP + handover ตัวเดียว

---

## 6) 🛠 วิธี/เครื่องมือ (จำให้ได้)
**แคปภาพ (AI ตรวจเอง) = git worktree + Preview MCP** (กัน .next ชนเจ้าของ):
```
git worktree add --detach <scratchpad>/ros-admin-preview HEAD
ln -s <repo>/node_modules <worktree>/node_modules
# launch.json เพิ่ม config: bash -c 'cd <wt>/apps/<app> && exec npx next dev' · port autoPort:true
# แก้ไฟล์ real → cp เข้า worktree ก่อน reload
preview_start → resize → screenshot/eval → เสร็จ: preview_stop + git worktree remove --force + git checkout .claude/launch.json
```
- **admin login (authed):** ไป `/login` · set #email/#password ผ่าน native setter+input event · `document.querySelector('form').requestSubmit()` (preview_click submit ไม่ทริก React) · session persist ข้าม preview
- **⚠️ pointer emulation:** preview รายงาน pointer=fine เสมอ → `mouse:` variant (table/card switch) โชว์ table ที่ 768 · **iPad จริง (coarse) = การ์ด** · ตรวจ card จริงต้อง inject CSS force touch: `.overflow-x-auto{display:none!important} ul.grid{display:grid!important}`
- **breakpoints:** `mouse:`=`min-width:768 and not(coarse)` · `lg:`=1024 · `xl:`=1280 · **filter inline/2-col detail = xl หรือ lg** (iPad คงเดิม)
- **overflow scan:** วัด `getBoundingClientRect().height` เทียบ line-height (>1.6×=wrap) + ดู screenshot จริง (DOM scrollWidth อย่างเดียวไม่จับ wrap)
- **DB probe/fix:** `cd db && DATABASE_URL="postgresql://iiamtikm@localhost:5432/ros?schema=public&host=/tmp" node_modules/.bin/tsx seed/_probe.ts` · re-seed = `tsx seed/mock-bulk.ts` (ระวัง FK landmine)

---

## 7) ไฟล์สำคัญ (code ที่แตะบ่อย)
- **shared components:** `apps/web-admin/src/components/ui.tsx` (ListView · FilterBar · StatusBadge · DetailHeader · Combobox) · `globals.css` (.badge · .card · .btn)
- **web-public equivalents:** `apps/web-public/src/components/` (FilterBar · SearchBar · PropertyCard · Lightbox · PropertyGallery — คนละ impl แต่ pattern ต้องตรง)
- **admin pages:** `apps/web-admin/src/app/(app)/<page>/page.tsx`
- **design:** `DESIGN-SYSTEM.md` · `tailwind.preset.cjs` (token กลาง 2 แอป) · `apps/*/tailwind.config.ts` (mouse/touch variant)

---

**ทุกครั้ง:** ยึด `ros-master-workflow` · เสนอ+widget เทียบก่อนแก้ · เทสจริงทุกปุ่ม/จอ · pause-scan overflow+wrap · เคลียร์ test data · ห้ามอวย · minimal ไม่รก ไม่ตกกรอบ

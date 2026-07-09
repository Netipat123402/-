# FIX-LOG — แก้รอบใหญ่ UX/UI + Flow (อ้างอิง PROMPT-แก้รอบใหญ่-UXUI-FLOW_1.md)

> เริ่ม 2026-07-03 · ทำทีละเฟส · typecheck ทุกครั้ง · เจ้าของเปิด/เทส dev server เอง
> รูปแบบ: เฟส · ทำอะไร · ไฟล์ที่แตะ · ผลเทส · หมายเหตุ

---

## WAVE A — รากฐานกฎใหม่ (เฟส 1–6)

### ✅ เฟส 1 — InfoRow + InfoGroup (กฎ 1 บรรทัด 1 ข้อมูล)
- **ทำ:** สร้าง `InfoRow` (label ซ้าย/value ขวา, รองรับ href+chevron, action, hideEmpty, stack, strong, mono) + `InfoGroup` (card + SectionLabel + divide-y) ตามกฎ R1
- **ไฟล์:** `apps/web-admin/src/components/ui.tsx` (+import next/link) — additive ล้วน
- **เทส:** `tsc --noEmit` = เขียว · ยังไม่ mount ที่ใด (เห็นภาพจริงตอน Wave B)

### ✅ เฟส 2 — DetailHeader
- **ทำ:** หัวรายละเอียดกลาง (back · code+badge+meta · title · subtitle · ฿ราคา gold tabular) — 1 ข้อมูล/บรรทัด, สไตล์ match property detail เดิม
- **ไฟล์:** `ui.tsx` — additive
- **เทส:** `tsc` เขียว

### ✅ เฟส 3 — ActionBar + MoreMenu
- **ทำ:** `ActionBar` (flex wrap) + `MoreMenu` (ปุ่ม ⋯ + เมนู fixed-position/flip/portal เหมือน Combobox, ปิดเมื่อคลิกนอก/Esc/เลื่อน=ปรับตำแหน่ง, ไม่ใช้ scroll-lock → ไม่ชน R2). เพิ่มไอคอน `more-horizontal`/`pencil`/`trash` ใน Icon.tsx
- **ไฟล์:** `ui.tsx`, `components/Icon.tsx` — additive
- **เทส:** `tsc` เขียว

### ✅ เฟส 4 — Toast dedupe (แก้รากข้อ 12: toast แดง ×3)
- **ทำ:** `show()` เช็ค type+msg เดียวกันยัง active → ไม่ push ซ้ำ (timer ตั้งเสมอ, id ที่ถูก dedupe = no-op)
- **ไฟล์:** `components/Toast.tsx` (ไม่อยู่ใน R2)
- **เทส:** `tsc` เขียว · เทสจริง: ยิง error ซ้ำ 3 ครั้งต้องเห็นใบเดียว (รอเจ้าของเทสบนเครื่อง)

### ✅ เฟส 5 — dirty-check Modal (BUG-L2)
- **ทำ:** เพิ่ม prop `confirmOnClose` ให้ `Modal` — เมื่อ true (ฟอร์มมีข้อมูลค้าง) ปิดผ่าน backdrop/Esc/× → ซ้อน `ConfirmDialog "ละทิ้งข้อมูลที่กรอก?"` ก่อน
- **R2-safe:** ไม่แตะ `useScrollLock`/`useFocusTrap` เอง · gate parent focus-trap ด้วย `!askDiscard` → ตอนถามยืนยัน ConfirmDialog เป็นเจ้าของ Esc/Tab คนเดียว (กัน keydown 2 ตัวชนกัน) · scroll-lock ref-count 1→2→1→0 ไม่ leak · โฟกัสคืนถูกต้องทุกทาง (อาศัย cleanup-before-setup ของ React)
- **ไฟล์:** `components/ui.tsx` (Modal)
- **เทส:** `tsc` web-admin+web-public เขียว · Modal callers 18 จุด default false → พฤติกรรมเดิมเป๊ะ (ไม่ regression)
- **ค้าง (ตั้งใจเลื่อน):** ยังไม่ผูก `confirmOnClose={dirty}` เข้าฟอร์มจริง 8 จุด → **เลื่อนไปทำในเวฟของแต่ละฟอร์ม** (leads=C, appt=D, contracts=E, users=F, owners=G, property=B) เพราะฟอร์มพวกนี้ถูกรื้อในเวฟอยู่แล้ว ทำตอนนี้=แก้ไฟล์ซ้ำ 2 รอบ · BUG-L2 ปิดครบเมื่อจบ Wave G

### ✅ เฟส 6 — regression scan (Wave A)
- **ทำ:** typecheck `web-admin` + `web-public` = เขียวทั้งคู่ · ไม่รัน `next build` (ชน dev server ที่เจ้าของรันพอร์ตเดียวกัน — ตาม handover) → เจ้าของเห็น runtime ผ่านเซิร์ฟเวอร์สด
- **สรุป Wave A:** สร้าง 5 component กลาง (InfoRow, InfoGroup, DetailHeader, ActionBar, MoreMenu) + 3 ไอคอน + แก้ราก toast×3 + capability dirty-check — **additive ล้วน ไม่ regress R2** · พร้อมให้ Wave B–J เอาไปใช้

---

---

## WAVE B — ทรัพย์ (ข้อ 1/2/3/14) เฟส 7–15

### ✅ เฟส 7 — header → DetailHeader
- code+badge / ชื่อ / คำโปรย / ฿ราคา gold — 1 บรรทัด 1 ข้อมูล · view count ย้ายลง meta ท้าย (ไม่รกหัว)
- ไฟล์: `properties/[id]/page.tsx` · `tsc` เขียว

### ✅ เฟส 8 — ปุ่ม → ActionBar + MoreMenu
- primary(gold) ตามสถานะ (draft=เผยแพร่/ขอเผยแพร่ · available/rented=แก้ไข) · featured ghost · ถอนประกาศ/ลบ ยุบใน ⋯
- ไฟล์เดียว · `tsc` เขียว

### ✅ เฟส 9 — แถบ available เรียบลง
- ตัดคำซ้ำ "ว่าง" (badge บอกแล้ว) → "เผยแพร่บนเว็บลูกค้าแล้ว" + ลิงก์ "ดูบนเว็บ →" · โทนเบาลง (bg-canvas)

### ✅ เฟส 10 — ข้อมูลทรัพย์ grid-3 → InfoGroup/InfoRow
- เรียงใหม่ ราคา→ห้อง→ทำเล→รายละเอียด→สิ่งอำนวยฯ · 1 บรรทัด 1 ข้อมูล · hideEmpty กัน "—" รก · ราคา strong+mono
- ไฟล์เดียว · `tsc` เขียว

### ✅ เฟส 11 — การ์ดเจ้าของ → InfoGroup
- **backend (additive):** `findOneScoped` เพิ่ม `owner.email` + `_count.properties` (กรอง deletedAt) — property.repository.ts
- **FE:** InfoGroup "เจ้าของทรัพย์" = ชื่อ(ลิงก์ owner)/เบอร์(แตะโทร)/อีเมล/จำนวนทรัพย์ที่ถือ · hideEmpty · ลบ Avatar ที่ไม่ใช้แล้ว
- `tsc` web-admin+api เขียว

### ✅ เฟส 12 — ประวัติเป็นไทย (ActivityTimeline)
- relative time + จำกัด 5 + "ดูทั้งหมด" = **มีอยู่แล้ว** · เพิ่ม `thaiifyActivity()` กลางใน status.ts แปลง enum อังกฤษที่ฝังในข้อความ ("draft → available" → "ร่าง → ว่าง") · display-only, ใช้ได้ทุก entity
- ไฟล์: `lib/status.ts`, `components/ActivityTimeline.tsx`

### ✅ เฟส 13 — สถานะทรัพย์กดได้ (ข้อ 14 — หนักสุด)
- **backend additive:** include สัญญา active (id+code) ใน findOne
- **backend guard (อนุมัติแล้ว):** `applyTransition` reject `rented→available` เมื่อมีสัญญา `active` — **ยืนยันว่าไม่บล็อก contract-end** เพราะ PropertySync.sync() อัปเดตตรง ไม่ผ่าน applyTransition
- **FE:** rented → ถ้ามีสัญญา = แถบลิงก์เข้าสัญญา (ทางไปต่อ แทนทางตัน) · ถ้า manual (ไม่มีสัญญา) = ปุ่ม "ทำเครื่องหมายว่าง" · available → ⋯ "ทำเครื่องหมายไม่ว่าง" + ConfirmDialog ขอเหตุผล
- `tsc` web-admin+api เขียว

### ◻︎ เฟส 14 — responsive property detail
- InfoRow/InfoGroup responsive by design (flex label/value + break-words + touch:py-3 hit-area ≥44px · การ์ด max-w-4xl) → **ต้องยืนยันเครื่องจริง** (ดู checklist)

### ◻︎ เฟส 15 — เทสทั้งโมดูลทรัพย์ (เจ้าของรัน flow — ดู checklist)

---

---

## WAVE C — Lead (ข้อ 4/10 · รื้อ flow) เฟส 16–23

### ✅ เฟส 16 — flow ปุ่มใหม่ (รับดูแลคลิกเดียว)
- **backend (additive-flag):** `AssignLeadDto.startWorking?` + `assign()` ทำ assign+new→working ใน UPDATE เดียว (atomic, ไม่มี half-state) · ปิดคำแนะนำ: default false → assign เดิมไม่เปลี่ยน · แจ้งเตือนเฉพาะโอนให้คนอื่น (รับเอง=ไม่เด้งหาตัวเอง)
- **FE:** new → ปุ่มเดียว "รับดูแล Lead นี้" · working → "สร้างนัดดูทรัพย์"(gold) + "แปลงเป็นลูกค้า"(ghost) + ⋯(โอน/ปิด/ลบ) · closed → ผลลัพธ์ + ⋯
- **MoreMenu hardening:** Esc = capture-phase + stopPropagation → ใช้ใน Modal ได้ (เมนูปิดก่อน ไม่ทะลุปิด Modal)

### ✅ เฟส 17 — หัว modal = ชื่อคน (รหัสเป็น meta จาง)

### ✅ เฟส 18 — เนื้อ modal → InfoGroup (ติดต่อ/ความต้องการ/ทรัพย์สนใจ/การดูแล) hideEmpty

### ✅ เฟส 19 — implement flow + optimistic + **BUG-L1 = ไม่ต้องแก้** (convert มี atomic claim MR-36 อยู่แล้ว)

### ✅ เฟส 20 — list cols: **คงเดิม** (primary=ชื่อลูกค้าอยู่แล้ว = ตรง IA Spec) — ไม่ churn

### ✅ เฟส 21 — BUG-H1 leads = **ทำแล้ว (MR-12 ส่ง sort ไป API)** · เพิ่ม **debounce 300ms** (BUG-M3) ช่องค้นหา leads

### เสริม (ทำให้สมบูรณ์)
- **โอนให้คนอื่น:** Modal + Combobox `/users/assignable`
- **สร้างนัดดูทรัพย์ (prefill เต็ม):** lead → `router.push(/appointments?newLead=id)` → appointments อ่าน param, fetch lead, seed option Combobox (ป้ายโชว์ทันที), prefill lead+ทรัพย์(ถ้าสนใจ 1 รายการ), เปิดฟอร์ม, ล้าง param
- **confirmOnClose (Phase 5):** ผูกเข้าฟอร์มสร้าง Lead + ฟอร์มสร้างนัด แล้ว

### ◻︎ เฟส 22–23 — เทส flow + responsive (เจ้าของรัน — ดู checklist)

---

---

## WAVE D — นัดหมาย (ข้อ 5/13) เฟส 24–30

### ✅ เฟส 24 — "นัดกับ" = ชื่อคน (ข้อ 5)
- `subject` = `lead.fullName || title || code` (เดิม title ก่อน → viewing appt โชว์ชื่อทรัพย์ซ้ำคอลัมน์รอง) · ใช้ทั้งลิสต์ + หัว modal + การ์ดปฏิทิน
- backend list include `lead.fullName` อยู่แล้ว → ไม่ต้องแตะ backend

### ✅ เฟส 25 — ปรับสถานะจากลิสต์ได้ (ข้อ 5)
- คอลัมน์สถานะ (upcoming) มี ⋯ = พบแล้ว/เลื่อนนัด/ยกเลิก/ไม่มาตามนัด · optimistic เดิม · stopPropagation กันเปิด detail

### ✅ เฟส 26 — modal detail → InfoGroup (ข้อ 13)
- นัดหมาย(เวลา/ระยะเวลา/ผลลัพธ์) · ลูกค้า(โทร+กดเข้า lead) · ทรัพย์(กดเข้า) · รายละเอียด(พนักงาน/สถานที่)
- นัดจบ/ยกเลิก → แสดงผลลัพธ์+เหตุผลเป็น InfoRow (ไม่ใช่ "นัดนี้ปิดแล้ว" ลอย ๆ) + ปุ่ม **"นัดใหม่อีกครั้ง"** (prefill)
- เพิ่ม **เลื่อนนัด** (modal เลือกเวลาใหม่) + **ไม่มาตามนัด** (no-show)

### ✅ เฟส 27 — server-search = **ทำแล้ว** (useSearchLookup lead/ทรัพย์ · BUG-M2 ปิด)
### ✅ เฟส 28 — BUG-H1 = **ทำแล้ว (MR-12)** · เพิ่ม **debounce** (BUG-M3) · ไม่แตะ preset วันนี้/สัปดาห์
### ✅ เฟส 29 — /calendar = **ทำแล้ว** (โหลดตามเดือน limit=300 · ErrorState+retry MR-26 · day cell ≥44px) + fix การ์ดปฏิทินให้ชื่อคนก่อน (สอดคล้องเฟส 24)
### เสริม: confirmOnClose ผูกฟอร์มเพิ่มนัดใน /calendar
### ◻︎ เฟส 30 — เทส flow นัด (เจ้าของรัน — ดู checklist)

---

---

## WAVE E — สัญญา (ข้อ 6/11/12) เฟส 31–38

### ✅ เฟส 31 — คู่สัญญา (ข้อ 6)
- InfoGroup ทุกแถวกดเข้าได้ (ลูกค้า/ทรัพย์/เจ้าของ → หน้านั้น) + **เติมฝั่งขวาครบ** (เบอร์ลูกค้า/เจ้าของ, code ทรัพย์) — เดิมว่าง

### ✅ เฟส 32 — การเงิน/ระยะเวลา → InfoGroup
- ค่าเช่า strong+mono · ป้าย "ใกล้ครบกำหนด" ในแถววันสิ้นสุด · ลงนามเมื่อ hideEmpty

### ✅ เฟส 33 — Sign flow (ข้อ 12 — หัวใจ)
- **แทน toast แดง×3** ด้วย **checklist "ขั้นตอนก่อนลงนาม"**: ① แนบ lease ✓/✗ ② verify ✓/✗
- ปุ่ม "ลงนามสัญญา" **disabled + เหตุผลใต้ปุ่ม** จนกว่า lease verified · ครบแล้ว enabled
- checklist sync สด: `DocumentSection` เพิ่ม prop `onDocsLoaded` (ref-based กัน refetch loop) → contract คำนวณ lease state จาก fetch เดียว · แนบ/verify ด้านล่างแล้ว checklist ติ๊กทันที
- **ไม่ถอด backend guard** (ตามสั่ง) — แค่ทำ UI พาไปทำให้ครบ · success toast บอก "ทรัพย์เปลี่ยนเป็นไม่ว่าง"

### ✅ เฟส 34 — dedupe toast (ทำที่รากแล้ว เฟส 4) + ปุ่ม disabled = error ไม่ยิงเลย

### ✅ เฟส 35 — modal สร้างสัญญา (ข้อ 11)
- 3 หมวด SectionLabel (คู่สัญญา→การเงิน→ระยะเวลา) · **auto-fill: เลือกทรัพย์ → เติมเจ้าของ+ค่าเช่า+มัดจำ** (seed option กันป้ายหาย) · default วันเริ่ม=วันนี้/สิ้นสุด=+12 เดือน · confirmOnClose

### ✅ เฟส 36 — BUG-L3 = **ทำแล้ว (MR-42 router.push)** ไม่ต้องแก้
### ✅ เฟส 37 — BUG-H1 = **ทำแล้ว (MR-12)** · เพิ่ม debounce · list cols คง IA (ลูกค้า+ทรัพย์)
### ◻︎ เฟส 38 — เทส flow สัญญาเต็ม (เจ้าของรัน — ดู checklist)

---

---

## WAVE F — ผู้ใช้/บัญชี (ข้อ 7) เฟส 39–42

### ✅ เฟส 39 — แก้ "สร้างบัญชีไม่สำเร็จ" (root cause จริง)
- **ต้นตอ:** FE เช็ครหัสผ่านแค่ `length ≥ 8` แต่ backend บังคับ `PASSWORD_RULE = /^(?=.*[A-Za-z])(?=.*\d).{8,128}$/` (ต้องมีตัวอักษร+ตัวเลข) → รหัสเช่น "12345678" ผ่าน FE แต่ backend ตีกลับ = "สร้างไม่สำเร็จเงียบ ๆ"
- **แก้:** FE เช็คให้ตรง rule → error โผล่ใต้ช่องทันที + hint ชัด "8 ตัว มีทั้งตัวอักษรและตัวเลข"

### ✅ เฟส 40 — dropdown บทบาทเหลือ 4 (FE เท่านั้น)
- `CREATE_ROLES = [team_lead, sales_agent, back_office, super_admin]` กรองที่ FE · **ไม่ลบ role ใน DB** (RBAC/guard/seed พึ่ง 7 role) · fallback ชุดเต็มถ้ากรองแล้วว่าง · ใช้ทั้ง dropdown สร้าง + แก้ไข
- เสริม: confirmOnClose ฟอร์มสร้างบัญชี

### ✅ เฟส 41 — สแกน mutation ที่ "กดแล้วเงียบ"
- create/delete หลัก (lead/contract/appt/property/owner/user) มี toast success/error ครบ · empty-catch ที่เหลือเป็น **read** (มี skeleton/empty state) · notification mark-read เงียบ (optimistic, low-impact) → เลื่อนไป Wave H
- **สรุป:** ระบบ "สร้างเงียบ" ที่บ่น = item 7 password (แก้แล้ว) · ไม่พบ create/delete เงียบอื่น

### ◻︎ เฟส 42 — เทส users (สร้าง/แก้ role/reset pw/suspend/ลบ — เจ้าของรัน)

---

---

## WAVE G — เจ้าของ + ลูกค้า (ข้อ 8/9) เฟส 43–48

### ✅ เฟส 43 — owners/[id] เรียง section ใหม่ (ข้อ 8)
- รวม **ติดต่อ + ส่วนตัว (บัตร/ที่อยู่/โน้ต) เป็นหมวดเดียวติดกัน** → ทรัพย์ → สัญญา → **เอกสาร (เพิ่มใหม่)** · เลิกเอาทรัพย์คั่นกลางข้อมูลส่วนตัว · view เป็น InfoRow hideEmpty

### ✅ เฟส 44 — แก้ไข owner ครบทุกฟิลด์
- เพิ่มฟิลด์ **เลขบัตรประชาชน** (PII): edit field เริ่มว่าง (ไม่ prefill ค่า mask) · hint โชว์ค่าปัจจุบัน mask · ส่ง `idCardNo` เฉพาะเมื่อกรอกใหม่ (undefined = ไม่แตะ) — กันเขียนทับด้วย mask

### ✅ เฟส 45 — customers list (ข้อ 9)
- **นับสัญญาถูกอยู่แล้ว** (groupBy นับทุกสัญญาไม่ถูกลบ รวม draft — screenshot 0 = data เก่า) · เพิ่ม sub = **อีเมล** ให้หน้าไม่โล้น

### ✅ เฟส 46 — customers/[id]
- ติดต่อ → InfoRow · สัญญาแถวกดเข้า + **฿ค่าเช่า** (backend additive: เพิ่ม monthlyRent ใน contracts select) + สถานะ · เอกสาร
- **เลื่อน: "นัดหมายที่ผ่านมา"** — appointments ผูกผ่าน lead→customer ต้อง query ซับซ้อนกว่า, value ต่ำกว่าสัญญา (สัญญาคือความสัมพันธ์หลัก)

### ✅ เฟส 47 — sort/debounce owners+customers → **ปิด BUG-H1 + BUG-M3 ครบทุกลิสต์**
- BUG-H1 (sort→API): properties/leads/customers/owners/contracts/appointments ครบ
- BUG-M3 (debounce 300ms): เพิ่ม properties(q)/owners/customers ครบ 6 ลิสต์

### ◻︎ เฟส 48 — เทส owner/customer flow (เจ้าของรัน)

---

---

## WAVE H — Dashboard/Notifications/Search/Audit (ไม่ได้สั่งแต่เช็คตาม "ทุกโมดูล") เฟส 49–53

### ✅ เฟส 49 — Dashboard = **ทำแล้ว (MR-26)**
- ErrorState+retry (M5) · KPI นับจาก server `meta.total` ไม่ใช่ client-count (L5) · KPI ทุกตัวเป็นลิงก์ไปลิสต์กรองแล้ว · agenda โหลดตามช่วงวัน limit=200 (ไม่ตัน 100)

### ✅ เฟส 50 — Notifications
- M5 (ErrorState) + relative time = ทำแล้ว · **แก้ deep-link:** เดิมไป `/leads` (หน้ารวม) → ตอนนี้ไป entity ถูกตัว (`?focus=id` / `/:id`) ตรงกับ NotificationBell ที่ทำถูกอยู่แล้ว

### ✅ เฟส 51 — GlobalSearch = เทสอย่างเดียว (ไม่รื้อ — ทำ deep-link ถูกอยู่แล้ว)

### ✅ เฟส 52 — Audit = **M4 ทำแล้ว (MR-25 ลบ endpoint DELETE feed)** · diff field-name ไทย + relative time ทำแล้ว · ค่า enum ใน audit = คงไว้ (technical trail, super_admin ดู)

### ✅ เฟส 53 — BUG-M1 timezone = **ทำแล้ว (MR-23)** — `thai-datetime.ts` pin Asia/Bangkok + spec test · appointment/scheduler ใช้ครบ

---

---

## WAVE I/J — เก็บกวาด + เทส (เฟส 54–62)

### ✅ เฟส 57 (a11y) — เพิ่ม focus-visible ring: InfoRow (ลิงก์/ปุ่ม, ring-inset) + MoreMenu button
### ✅ เฟส 59 — สแกน dead code: **ไม่มี** `window.prompt/confirm` เหลือ · ไม่มีอิโมจิจริง (เจอแค่ในคอมเมนต์อธิบาย Icon)
### ✅ เฟส 60 (unit) — `jest` API = **84/84 ผ่าน** (ยืนยัน backend guard/include/assign atomic/customer select ไม่พังของเดิม)
### ◻︎ เฟส 54–56, 58, 61 — เจ้าของเทสเครื่องจริง: web-public flow · responsive matrix (320/768/1024/1440) · dark mode · e2e (throwaway DB) · smoke flow เต็ม
### ◻︎ เฟส 62 — อัปเดต SESSION-HANDOVER ตอนจบ

---

---

## FIX ROUND 2 (หลังเจ้าของเทสเครื่องจริง — 2026-07-03)

### 🔴 [แก้+เทสแล้ว] property status "ทำเครื่องหมายไม่ว่าง/ว่าง" → error 400
- **ต้นตอ (regression ที่ผมทำหลุด):** ยิง `PATCH /:id/status` ด้วย `{ status }` แต่ DTO บังคับ `{ toStatus }` → ValidationPipe forbidNonWhitelisted → 400 "ข้อมูลไม่ถูกต้อง"
- **แก้:** `status` → `toStatus` (2 จุดใน properties/[id])
- **เทสจริงบน API:** old `{status}`→400 · fixed `{toStatus}`→200 · revert→200 (ทรัพย์กลับเดิม) ✅
- **เทสเพิ่มยืนยันไม่มีบั๊ก field-name อื่น:** property edit→200 · lead รับดูแล(assign+startWorking)→201+lead=working · appt reschedule→201 · owner edit(idCardNo)→200 ✅

### 🎨 Layout ตาม feedback (รูป 1/2/3)
- **หัวทรัพย์ (รูป1):** ตัดบรรทัด facts ที่ยัด 4 ข้อมูล (ประเภท·นอน·น้ำ·พื้นที่) ออก — ซ้ำกับกล่อง "ห้อง&พื้นที่" อยู่แล้ว · view count ย้ายเข้าแถว meta (code+badge) · เหลือ 1 บรรทัด 1 ข้อมูล

### 🎨 Layout รอบ 2 — "meeting-center" (เจ้าของ clarify: label/value มาเจอกันตรงเส้นกลาง ไม่ใช่บล็อกกลางจอ)
- **InfoRow:** เปลี่ยนจาก `flex justify-between` (ดันสุด 2 ขอบ) → **grid 2 คอลัมน์: label ชิดขวา(จบเส้นกลาง) / value ชิดซ้าย(เริ่มเส้นกลาง)** · หัวข้อ InfoGroup จัดกลาง · เอา max-w-md (บล็อกแคบ) ออก = เต็มความกว้าง
- **ใช้ครบทั้งระบบ (8 หน้า):** property/contract/appointment/lead/owner/customer/users/settings
- แปลงเพิ่มให้สอดคล้อง: contract **คู่สัญญา** (nav row → InfoRow meeting-center) · appointment **ทรัพย์** (title-as-label → label สั้น) · **users** detail modal (dl grid → InfoRow) · **settings** (dl → InfoGroup/InfoRow)
- เหลือ `<dl>` แค่ audit diff (เป็น before→after ไม่ใช่ label/value — คงไว้ถูกต้อง)

---

## บั๊กใหม่ที่เจอระหว่างทาง
- **[แก้แล้ว] property status:** `status`→`toStatus` (FIX ROUND 2) — เทส API ผ่าน
- **[แก้แล้ว] item 7:** FE/BE password rule ไม่ตรงกัน → สร้างบัญชีล้มเหลวแบบดูเหมือนเงียบ (เฟส 39)
- **[ไม่ใช่บั๊ก] item 9:** count สัญญาถูกต้องในโค้ด (นับ draft ด้วย) — screenshot 0 = ข้อมูล ณ ขณะนั้น

## บั๊ก BUG-HUNT ที่พบว่า "แก้ไปแล้ว" (MR ก่อนหน้า) — ไม่ต้องทำซ้ำ
- BUG-H1 (sort ข้ามหน้า): MR-12 ทุกลิสต์ · BUG-M1 (timezone): MR-23 · BUG-M2 (dropdown limit): MR-24 server-search · BUG-M4 (audit delete): MR-25 ลบ endpoint · BUG-M5 (error เงียบ): MR-26 ErrorState · BUG-L1 (race convert): MR-36 atomic claim · BUG-L3 (window.location): MR-42 router.push · BUG-L4 (ชื่อไฟล์ยาว): MR-42 slice(200)
- **ที่ทำรอบนี้จริง:** BUG-M3 (debounce ทุกลิสต์) · toast dedupe · BUG-L2 (dirty-check capability)

## เทสเครื่องจริงที่เจ้าของต้องยืนยัน (สะสมท้ายแต่ละ Wave)
- [ ] **Wave A / เฟส 4:** ยิง error ซ้ำ 3 ครั้ง (เช่นกดลงนามสัญญาที่ยังไม่ verify lease) → เห็น toast แดง **ใบเดียว** ไม่ซ้อน 3
- [ ] **Wave A / เฟส 5:** (จะเทสได้เต็มเมื่อผูกเข้าฟอร์มในเวฟถัดไป) — capability พร้อมแล้ว
- [ ] **Wave B ทรัพย์ (คอม + มือถือ + iPad):**
  - [ ] หัวข้อ: code+badge / ชื่อ / ราคา gold / meta(facts+ดูกี่ครั้ง) อ่านบนลงล่าง ไม่ขี่กัน
  - [ ] ปุ่ม: draft→ "เผยแพร่"(gold)+แก้ไข(ghost)+⋯(ลบ) · available→ "แก้ไข"(gold)+แนะนำ+⋯(ไม่ว่าง/ถอนประกาศ)
  - [ ] กล่องข้อมูล ราคา/ห้อง/ทำเล = แถวไล่ลง ไม่มี "—" รก · ราคาเด่น
  - [ ] เจ้าของ: ชื่อกดเข้า owner ได้ · เบอร์แตะโทร · เห็นอีเมล + จำนวนทรัพย์
  - [ ] **ข้อ 14:** เปิด The Base Rama 9 (rented+มีสัญญา) → เห็นแถบ "ดูสัญญา CT-…" กดเข้าไปหน้าสัญญาได้ (ไม่ตัน)
  - [ ] rented แบบ manual (mark ไม่ว่างเอง) → มีปุ่ม "ทำเครื่องหมายว่าง" กดกลับว่างได้
  - [ ] ลอง mark ไม่ว่าง (available→⋯) ขอเหตุผล → ทรัพย์เป็น rented + หายจากเว็บ public
  - [ ] ประวัติ: "เปลี่ยนสถานะ ร่าง → ว่าง" (ไทยล้วน ไม่มี draft/available อังกฤษ)
  - [ ] ⋯ menu: เปิด/เลื่อนจอ/หมุน iPad แล้วเมนูตามตำแหน่ง ไม่ตกกรอบ (เช็ค R2 dropdown)
- [ ] **Wave C Lead (คอม + มือถือ + iPad):**
  - [ ] เปิด Lead **ใหม่** → เห็นปุ่มเดียว "รับดูแล Lead นี้" (ไม่มี "เริ่มดูแล" ซ้ำแล้ว) → กด → กลายเป็น "กำลังดูแล" ทันที
  - [ ] Lead **working** → "สร้างนัดดูทรัพย์"(gold) + "แปลงเป็นลูกค้า" + ⋯(โอน/ปิด/ลบ)
  - [ ] กด "สร้างนัดดูทรัพย์" → เด้งไปหน้านัด **ฟอร์มเปิดพร้อมชื่อ Lead + ทรัพย์ (ถ้าสนใจ 1 รายการ) เติมให้แล้ว**
  - [ ] ⋯ "โอนให้คนอื่น" → เลือกผู้ดูแล → โอนได้
  - [ ] หัว modal เป็น **ชื่อคน** (ไม่ใช่ "Lead LD-xxxx") · เนื้ออ่านบนลงล่าง ไม่มี "—" รก
  - [ ] **Esc ตอนเปิด ⋯ ในโมดาล** → เมนูปิด (โมดาลไม่ปิดตาม)
  - [ ] พิมพ์ค้นหา Lead เร็ว ๆ → ยิง API ครั้งเดียวหลังหยุดพิมพ์ (ดู network)
  - [ ] กรอกฟอร์มสร้าง Lead แล้วคลิกนอกกล่อง/Esc → เด้งถาม "ละทิ้งข้อมูล?" (ฟอร์มว่าง = ปิดได้เลย)
- [ ] **Wave D นัดหมาย (คอม + มือถือ + iPad):**
  - [ ] ลิสต์ "นัดกับ" = **ชื่อคน** (ไม่ใช่ "นัดชม {ชื่อทรัพย์}" ซ้ำคอลัมน์รอง)
  - [ ] แถวนัด upcoming มี ⋯ → พบแล้ว/เลื่อนนัด/ยกเลิก/ไม่มา (กดแล้วสถานะเปลี่ยนทันที ไม่เปิด modal)
  - [ ] เปิดนัด → InfoGroup อ่านบนลงล่าง · ลูกค้ากดเข้า lead ได้ · ทรัพย์กดเข้าได้
  - [ ] เลื่อนนัด → เลือกเวลาใหม่ → เวลาอัปเดต (EXCLUDE กันชนเวลาต้องยังทำงาน)
  - [ ] นัดที่จบ/ยกเลิก → เห็นผลลัพธ์ + ปุ่ม "นัดใหม่อีกครั้ง" → ฟอร์มเปิด prefill lead+ทรัพย์
  - [ ] /calendar โหลดเดือนที่มีนัดเยอะ → ครบ (ไม่ตัน 100) · ปิด API → เห็น "โหลดไม่สำเร็จ + ลองใหม่"
- [ ] **Wave E สัญญา (คอม + มือถือ + iPad):**
  - [ ] **ข้อ 12:** เปิดสัญญาร่าง (ยังไม่ verify lease) → เห็น **checklist** ① แนบ lease ② verify · ปุ่มลงนาม **เทา กดไม่ได้** + เหตุผล (ไม่มี toast แดง×3)
  - [ ] แนบ lease + กด "ตรวจสอบแล้ว" ในเอกสารด้านล่าง → checklist ติ๊กเขียวทันที → ปุ่มลงนามใช้ได้ → ลงนาม → ทรัพย์เป็น "ไม่ว่าง"
  - [ ] **ข้อ 6:** คู่สัญญา — ลูกค้า/ทรัพย์/เจ้าของ กดเข้าหน้านั้นได้ + เห็นเบอร์/code ฝั่งขวา (ไม่ว่าง)
  - [ ] **ข้อ 11:** สร้างสัญญา — เลือกทรัพย์ → เจ้าของ+ค่าเช่า+มัดจำ **เติมให้อัตโนมัติ** · วันเริ่ม/สิ้นสุด มี default
  - [ ] ต่อสัญญา → ไปสัญญาใหม่ (client-nav ไม่รีโหลดทั้งหน้า) · ปิดสัญญา → ทรัพย์กลับ "ว่าง"
- [ ] **Wave F ผู้ใช้ (ข้อ 7):**
  - [ ] สร้างบัญชี รหัส "12345678" (ไม่มีตัวอักษร) → เห็น error ใต้ช่องรหัสผ่านทันที (ไม่ใช่กดแล้วเงียบ)
  - [ ] สร้างบัญชี รหัสถูก (เช่น "abcd1234") + บทบาท → **สร้างสำเร็จ**
  - [ ] dropdown บทบาทเห็น **4 ตัว** (หัวหน้าทีม/พนักงานขาย/หลังบ้าน/ผู้ดูแลสูงสุด)
- [ ] **Wave G เจ้าของ+ลูกค้า (ข้อ 8/9):**
  - [ ] owners/[id]: ติดต่อ+บัตร/ที่อยู่/โน้ต อยู่ **ติดกัน** (ทรัพย์ไม่คั่นกลาง) + มีส่วนเอกสาร
  - [ ] แก้ไข owner: กรอกเลขบัตรใหม่ → บันทึกได้ · เว้นว่าง → เลขเดิมไม่หาย (ไม่โดน mask เขียนทับ)
  - [ ] customers: เห็นอีเมลในลิสต์ · จำนวนสัญญาถูก (ลูกค้าที่มีสัญญา draft ต้อง ≥1)
  - [ ] customers/[id]: สัญญาโชว์ ฿ค่าเช่า + กดเข้าได้

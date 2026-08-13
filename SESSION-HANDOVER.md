# ROS — SESSION HANDOVER (สถานะล่าสุด)

> **ไฟล์นี้ = "สถานะ session" ล้วน** (ทำอะไรแล้ว / งานต่อไป / ค้างฝั่งเจ้าของ). เขียนทับเสมอ ไม่สร้างใหม่.
> **โครงสร้าง · กฎ · CYCLE · เครื่องมือ → อยู่ที่ [`CLAUDE.md`](CLAUDE.md)** (โหลดอัตโนมัติ) และไฟล์ที่มันชี้ไป. ที่นี่ไม่เล่าซ้ำ.
> เริ่ม session ใหม่: CLAUDE.md โหลดเอง → อ่านไฟล์นี้เพื่อรู้สถานะ → รอรับงาน.

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** · **RBAC + governance กันโกง ✅ ครบ roadmap 6/6** (Phase 1–6 + final system audit — commit `7cc7865`…`f4f3063`).
🎉 **UX แยกตามบทบาท เฟส 1–4 เสร็จครบ** + **Sidebar ขยาย-ยุบได้** · **กำลังทำ: track C = i18n 2 ภาษา (อังกฤษหลัก+ไทยรอง สลับได้ · next-intl cookie)**
✅ **สลับ EN↔TH ได้จริงแล้ว:** shell(nav/sidebar/drawer/profile) · dashboard · status badges(ทุก entity) · **Properties (ทั้ง entity: list+detail+edit+form)** · ปุ่มสลับภาษา 🌐
🔴 **แต่ยังไม่สมบูรณ์ (owner จับได้):** ยังภาษาปนมั่ว — (1) master-data ไทยเสมอ (type chips/amenity/จังหวัด/LEAD_SOURCE ไม่สลับ) (2) component ร่วมยังไม่แปล (DocumentSection/ประวัติ/GlobalSearch…) โผล่ทุกหน้า (3) เหลือ 6 entity + system pages · **และ session นี้ไม่ได้ทำตาม CYCLE/responsive — ครั้งหน้าต้องทำตามกฎ** (ดู §4 KNOWN ISSUES + แผน · [[ros-rule-discipline-big-tasks]])
📊 **DB ตอนนี้ = ข้อมูลจริงสะอาด** (ลบ mock เกลี้ยง + populate ผ่าน flow จริง: 4 ทรัพย์ CD/HS/TH/AP-2026-0001 · CD=rented มีสัญญาครบวงจร+ใบเสร็จ · AP=pending_review · owners/customers/leads/appointments ครบ) — **ไม่ใช่ mock-bulk แล้ว**
⭐ **3 บทบาท operating เท่านั้น** (super_admin/property_manager/sales_agent) · อีก 5 dormant (`isActive=false` เปิดคืนได้) · ห้ามอ้าง dormant ในตรรกะ operating → [`operating-roles.ts`](apps/api/src/common/auth/operating-roles.ts)
⚠️ เจ้าของทดสอบบน :3001 · ค้างบ่อย hard refresh (Cmd+Shift+R)

## 2) ⭐ RBAC + governance (งานหลักตอนนี้) — org จริง: **สำนักงานเดียว · คุณ=admin+เจ้าของคนเดียว · คนอื่น=ขาย/หาทรัพย์**
**บทบาท operating จริง = 3** (data-driven · อีก 5 เดิม dormant/demo คงไว้ future):
- **Owner** (`super_admin`) — ทุกสิทธิ์ + control (อนุมัติ/เงิน/ลบ/ระบบ/PII)
- **ผู้จัดการ** (`property_manager` · slug คงเดิม label="ผู้จัดการ") — operation เต็ม (ทรัพย์/lead/ลูกค้า/นัด/ร่างสัญญา) · **ไม่มี** approve/reject/sign/verify/delete/ระบบ · scope office
- **เซล** (`sales_agent`) — ไปป์ไลน์ขาย (lead/ลูกค้า/นัด/ร่างสัญญา) · **ทรัพย์+เจ้าของทรัพย์=อ่านอย่างเดียว** · หาทรัพย์ผ่าน "ขอเพิ่มทรัพย์" · scope office
- **⚠️ รหัสผ่าน (เปลี่ยนแล้ว!):** `admin@ros.local` = `ChangeMe!2026` · **`pm@ros.local` + `sale@ros.local` = `Xyz890011`** (ไม่ใช่ ChangeMe!2026 แล้ว — CLAUDE.md ยังเขียนเก่า ระวัง)

**หลักที่ locked (เจ้าของเคาะแล้ว):** money-gate (เซ็น/ใบเสร็จ=เจ้าของ) · maker-checker (เซลขอ→ผู้จัดการลง→เจ้าของอนุมัติ) · completeness gate "จำเป็น 7/7" ก่อนขอเผยแพร่ · 3-tier edit governance (log→notify→re-approve) · เซลแก้/ถอนเฉพาะคำขอตัวเอง

## 3) ทำอะไรไปแล้ว (สะสมทุก session)
**A–H · Design polish (list/detail/form/filter):** ครบ 6/6 ทุกหมวด — grid+subgrid · main+ราง · แยกหมวดฟอร์ม · per-device · RailBlock · filter 6 หน้า (commit เดิมใน git log)

**I · Detail header (Direction A "แคปชั่นเดียว") — shared `DetailHeader`:** `b458bfd`+`37860ec` — พระเอกชื่อ+ราคาเกาะหลัง / แคปชั่นจางเส้นเดียว (จุดสถานะ·คำอธิบาย·รหัสจาง) · `statusMap`/`statusValue` · กระทบ 6 หน้า

**J · Claude Code IA (Blueprint B):** `339d959` — `CLAUDE.md`(auto-load) · `.claude/rules/workflow-cycle.md` · `.claude/commands/`(verify-authed·reseed-check) · `.claude/hooks/block-dangerous.sh` · แยก settings team/local · **`51e5739` เพิ่ม Operating Agreement §0** (reasoning-first·ทีละขั้นรอเคาะ·แจ้งเชิงรุก·บอกเฟส)

**K · RBAC money-gate:** `9bdd783` — ตัด `contract:sign`+`change_status` จาก sales · ใบเสร็จผูก `contract:sign` · reconcile ใน roles seed (declarative)

**L · Phase 1 · 3 บทบาท:** `7cc7865` — เพิ่ม `property_manager` · sales ทรัพย์=read · verify: grant audit + e2e 7/7 + live API (sales create=403 · pm approve/sign=403) + sales UI read-only

**M · Phase 2 · ขอเพิ่มทรัพย์ (property request) — ครบ 2a+audit+2b:**
- `d5d99d3` **2a backend:** โมเดล `PropertyRequest` + migration 0013 + `sourcedById` ใน Property · resource `property_request` · endpoints (create/list/get/update/convert/request-info/reject/delete) · v2: dup-check·needs_info·consent·sourcing · **completeness engine** `property-completeness.ts` (พร้อมใช้ Phase 3)
- `ee1f2e6` **audit fixes:** label "ผู้จัดการ" · เซลแก้/ถอนเฉพาะของตัวเอง (own-scope) · withdraw
- `a78210a` **2b frontend:** เมนู "คำขอทรัพย์"+badge · list+ฟอร์ม · detail+รางตามบทบาท (ผู้จัดการ=convert/reject · เซล=แก้/ถอน) · verify authed จริง (convert→CD draft prefill+owner+sourcing) · มือถือ card · fix 3 บั๊ก (limit whitelist·query→number·meta ซ้อน)

**N · Phase 3 · ด่านอนุมัติเผยแพร่ + completeness gate:** `88f0eae`
- **สถานะใหม่ `pending_review` (รอตรวจสอบ):** `draft →(ขอเผยแพร่ 7/7)→ pending_review →(เจ้าของอนุมัติ)→ available` · ตีกลับ/ถอนคำขอ → draft · migration 0014 (ALTER TYPE additive · manual+resolve เหมือน 0013) · lifecycle spec 20/20 · pending_review ไม่ public
- **ต่อ engine completeness (2a) เข้า submit/approve** (`assertPublishReady` บล็อกถ้าจำเป็นไม่ครบ 7/7) · approve re-check ซ้ำ (defense-in-depth) · reject: pending_review→draft เหตุผลบังคับ+notify ผู้ส่ง / available→draft ถอนประกาศเดิม · `GET /:id/completeness` (map items→checklist เลี่ยง TransformInterceptor นึกว่าเป็น list — ⚠️ landmine)
- **UI:** completeness panel ในราง (score+checklist+missing) · gated publish button · แถบอนุมัติเจ้าของ (อนุมัติ+ตีกลับ reason บังคับ) · ผู้จัดการ=ถอนคำขอ · badge/filter "รอตรวจสอบ" (tone done) · ConfirmDialog +reasonRequired
- **verify authed 3 จอ จริง:** manager+owner pending view · gated incomplete draft (3/7·ปุ่มปิด·รายการแดง) · e2e flow ครอบ gate (409→เติมปก→available) · RBAC 7/7 เขียว

**O · Phase 4 · governance hardening + แก้ live เด้งกลับรอตรวจ:** `6830cf0` (ไม่มี migration — ใช้ enum เดิม)
- **4a ปิดช่องรั่ว maker-checker:** เจอ generic `PATCH /:id/status` (change_status) ยิง draft→available ตรงได้ = ข้ามด่านอนุมัติ+gate (manager self-publish!) → แยก **operational** (ว่าง↔ไม่ว่าง ผ่าน changeStatus) vs **governed** (publish/approval ผ่าน submit/approve/reject เท่านั้น) · `isOperationalTransition()` · changeStatus นอก operational → 409
- **4b แก้ live เด้งกลับ (Option A strict):** เพิ่ม transition available→pending_review (ระบบทริกเกอร์) · `update` แก้ material field (20 field เนื้อหาลูกค้าเห็น · value-diff กันเด้ง no-op) บน available → bounce pending_review + ซ่อนเว็บ + notify · addMedia/deleteMedia/setCover ก็ bounce · safe(ไม่เด้ง)=`isFeatured`+`assignedToId`
- **UI:** PropertyForm banner เตือน (แก้ทรัพย์เผยแพร่→รอตรวจสอบ) · detail media heads-up + toast รู้การเด้ง
- **verify:** e2e governance (draft→available ตรง=409·operational=ได้·governed ตรง=409·แก้ราคา live→pending+public 404) · lifecycle spec 28/28 · banner authed 3 จอ
- ⚠️ **edge ที่ยังเปิด (future):** แก้เนื้อหา**ตอน rented** (off-market ไม่เด้ง) แล้ว rented→available กลับขึ้นเว็บพร้อมของยังไม่ตรวจ · ทางแก้ระดับโลก = primitive `contentReviewedAt` (set ตอน approve · clear ตอนแก้ material · ทุกเส้นเข้า available เช็ค) — ยังไม่ทำ

**P · Phase 5 · 3-role hardening + sensitive-edit alerts:** `fef8515` (migration 0015: `roles.is_active` + `owner` notif category)
- **5a ปิด 5 dormant + ยึด 3 บทบาท:** `Role.isActive` (dormant=false · เปิดคืนได้) · `listRoles` กรอง active → picker เหลือ 3 · assign dormant→400 · รวม notify-roles ที่ [`operating-roles.ts`](apps/api/src/common/auth/operating-roles.ts) (เลิก magic literal อ้าง dormant) refactor property×2/request/public/community · **FE จับบั๊ก:** users picker `CREATE_ROLES` เก่าซ่อน `property_manager` → เลิก filter + เพิ่มป้าย "ผู้จัดการ" · layout `isMod` ตรง backend
- **5b alerts (แจ้งเจ้าของ · skip ถ้า super_admin แก้เอง):** owner แก้ ชื่อ/เบอร์/อีเมล/ที่อยู่ → แจ้ง+old→new · idCardNo แจ้ง "เปลี่ยน" ไม่โชว์ค่า · contract addTerm/removeTerm บน active → แจ้ง
- **verify:** unit 96/96 · e2e 12/12 (listRoles=3·dormant assign=400·ผู้จัดการแก้เบอร์เจ้าของ→แจ้ง+skip-self) · role picker authed=3
- 🔸 เก็บตก (ไม่บล็อก): seed มี test user `test.{role}@ros.local` ครบ 8 บทบาท (รวม dormant) — โชว์ในหน้า users อาจดูสับสน · ถ้าอยากสะอาดสุด trim seed เหลือ 3 (owner ตัดสิน) → **ทำแล้ว Phase 6 เก็บตก A**

**Q · Phase 6 · PII reveal lock + เก็บตก + final audit:** `27d3427` + `3f57e83` (migration 0016: `property.content_dirty`)
- **PII reveal (สมมาตร owner + customer):** สิทธิ์ `reveal_pii` (super_admin เท่านั้น ผ่าน '*') · `GET /{owners,customers}/:id/idcard` → decrypt + audit `reveal_pii` ทุกครั้ง (ไม่ลงค่าเลข) · FE owner detail ปุ่ม "แสดงเลขเต็ม" (mask→เต็ม→ซ่อน) · customer FE ยังไม่ surface idCard (endpoint พร้อม future)
- **เก็บตก A:** soft-delete 5 dormant test users (ไม่ได้มาจาก seed · สร้างมือค้าง DB)
- **เก็บตก B:** `contentDirty` — แก้เนื้อหาตอน rented → กลับ available เด้ง pending_review (manual changeStatus + **PropertySync สัญญาจบ** ครบทุกเส้นทางเข้า available) · เคลียร์ตอน approve
- **⭐ final system audit** (`3f57e83`): permission matrix 3 บทบาท = maker-checker เป๊ะ · decrypt อยู่แค่ 2 reveal methods (gated) · status writes ผ่าน applyTransition · **เจอ+ปิด PropertySync ข้าม contentDirty** (edge สุดท้าย) · idCard ไม่รั่วผ่าน relation
- **verify:** unit 96/96 · e2e 14/14 · reveal UI authed (mask→1103700123456→ซ่อน) · AI คัดรูป 18+ = เลื่อน future (คนละเรื่อง governance)

## 4) 🎯 งานถัดไป — ⭐ ออกแบบ UX แยกตามบทบาท (งานใหญ่ · owner ขยายสโคป: ไม่ใช่แค่ dashboard แต่ทั้งระบบ · แบ่งเฟส)
> owner สั่งชัด: **ทำตามทุกกฎ** (ติของเก่า → เสนอ+รูป 3 จอ show_widget → รอเคาะ → ทำ → verify authed 3จอ×3บทบาท → self-check → เทส flow ซ้ำ → commit → ทีละหน้า) · **ระดับโลก เผื่อโต** · **ห้ามทำ nav item จาง (=ดูปิดใช้งาน)** → [[ros-dim-reads-as-disabled]]
> ⚠️ RBAC backend + ปุ่ม gate เสร็จหมดแล้ว — งานที่เหลือคือ **"รูปทรง" UX แยกบทบาท** (nav/dashboard/หน้า read-only/surface เจ้าของ)
> **Roadmap เคาะแล้ว (4 เฟส + track C):** 1 Navigation · 2 Dashboard · 3 หน้าอ้างอิงเซล · 4 surface เจ้าของ · C แปลอังกฤษ

- **✅ เฟส 1 · Navigation แยกบทบาท เสร็จ (1a `6ea827d` + 1b `600d500`):** รากฐาน [`lib/nav.ts`](apps/web-admin/src/lib/nav.ts) = `roleNav`/`resolveBottomSlots` single source of truth (ราง+แถบล่าง+drawer · เพิ่มบทบาทใหม่แก้ที่เดียว) · เซล=งานขายนำ+กลุ่ม "ค้นทรัพย์"(สีปกติกดได้) · ผจก/เจ้าของ=คลังทรัพย์นำ · เจ้าของ+ระบบปักล่าง · แถบล่างช่องกลาง=signature (เซลนัด/ผจก·เจ้าของคำขอ) · verify 3จอ×3บทบาทผ่าน
- **✅ เฟส 2 · Dashboard แยก 3 บทบาท เสร็จ (2a `8b63c97` + 2b `adbca05`):** วิธี (ก) endpoint · `GET /dashboard` [`dashboard.service.ts`](apps/api/src/modules/dashboard/dashboard.service.ts) คำนวณ kpis+agenda ตาม role (scope ที่ backend · เซล=own · ผจก/เจ้าของ=office) · FE [`page.tsx`](apps/web-admin/src/app/(app)/page.tsx) = generic renderer (KPI hot=ทอง · agenda ซ่อนหมวดว่าง) · verify 3 บทบาท desktop+mobile (เจ้าของ pending_review=1 · เซล นัดของฉัน scope agentId) · payload generic → เพิ่มเมตริก/บทบาท = แก้ service เดียว · 🔸 เก็บตก future: owner agenda "แจ้งเตือนแก้ข้อมูลอ่อนไหว" (Phase 5 alerts) ยกไปทำเฟส 4
- **✅ เฟส 3 · หน้าทรัพย์ = แคตตาล็อกไว้ขายของเซล เสร็จ (`488fbdd`):** list CTA "ขอเพิ่มทรัพย์"+hint (เฉพาะไม่มี property:create) · detail ป้าย "อ่านอย่างเดียว" + ปุ่ม "นัดดูทรัพย์นี้" (available+appointment:create → deep-link `/appointments?newProperty=` prefill ทรัพย์ · guard กันชน `?newLead=`) · verify เซล(flow นัดไม่ชน)+เจ้าของ(no regression ปุ่มแก้ครบ) · หน้าเจ้าของ(ทรัพย์)=อ้างอิงสะอาดอยู่แล้ว ไม่แตะ
- **✅ เฟส 4 · surface ควบคุมเจ้าของ เสร็จ (4a `4daea91` + 4b `4bf6d85`):** เพิ่มแผง "แจ้งเตือนอ่อนไหว (กันโกง)" บน dashboard เจ้าของ (ขึ้นบนสุด · โทนเหลือง warning) จาก notification category owner (Phase 5 sensitive-edit alerts) · item แตะ→ /owners/{id} · verify เจ้าของเห็น 4 alert · เซล/ผจก ไม่เห็น (scope) · generic renderer เพิ่ม tone='alert' + per-item href (เผื่อ section เตือนอื่นอนาคต)
- **🎉 Roadmap UX แยกบทบาท เฟส 1–4 ครบแล้ว** (nav · dashboard · หน้าเซล catalog · surface เจ้าของกันโกง) — ทั้งหมด verify authed 3 บทบาท typecheck ผ่าน
- **✅ แก้ป้าย converted "สร้างประกาศแล้ว" → "แปลงเป็นทรัพย์แล้ว" (`c93e717`):** ลดความสับสน (ชนกับ "เผยแพร่") · แก้ 3 จุด (status.ts+tab+ลิงก์) · หลักที่ยืนยัน: คำขอ(convert→ทรัพย์ร่าง) กับ เผยแพร่(draft→pending_review→available) = 2 วงจรแยกกัน · ผจก=เจ้าของ ตรวจคำขอเหมือนกัน ต่างที่ขั้นอนุมัติเผยแพร่ (เจ้าของเท่านั้น)
- **✅ Sidebar ขยาย-ยุบได้ (`4de9bc6`):** owner ติราง 84px คำอังกฤษล้น → รื้อเป็น sidebar มาตรฐาน (Linear/Notion) · กาง 232px (icon+ชื่อ+ป้ายกลุ่ม Inventory/Sales/System) ↔ ยุบ 64px (ไอคอน+tooltip) · จำ localStorage · รองรับคำยาวทุกภาษา (เตรียม 2 ภาษา) · verify กาง/ยุบ/มือถือ ผ่าน
- **🟢 track C (กำลังทำ · ⚠️ owner เปลี่ยนแนว → i18n 2 ภาษา): แปล web-admin เป็น bilingual (อังกฤษหลัก + ไทยรอง สลับได้)**
  - **วิธี (เคาะใหม่):** `next-intl` **cookie-based (ไม่แตะ URL/route = flow ไม่ชน)** · default=English · toggle ไทย (ใน ProfileMenu) · **ครอบ backend ด้วย** (ส่ง locale ไป API · dashboard/แจ้งเตือน อังกฤษเต็ม) · glossary ล็อกแล้ว (ทรัพย์=Properties · เจ้าของ=Owners · คำขอทรัพย์=Property requests · ขอเพิ่มทรัพย์=Request property · ค้นทรัพย์=Browse · ระบบ=System)
  - **งานเดิมไม่เสีย:** C0 (`45aa308`) + C1 (`3384d0c`) แปล shell/ui/login/dashboard เป็นอังกฤษแล้ว → **สตริงอังกฤษเหล่านี้ = `en.json`** · ไทยเดิม (ดึงจาก git ก่อน 45aa308) = `th.json` · แค่ย้ายเข้า catalog + เรียก `t('key')`
  - ✅ **i18n foundation เสร็จ (`fd43c06`):** next-intl v4 cookie-based (`src/i18n/request.ts` + next.config plugin) · `NextIntlClientProvider` ใน root layout · `messages/{en,th}.json` (nav/navGroup/slot/shell) · **shell migrate ครบ** (nav.ts label→key · layout · ProfileMenu · ThemeToggle · `LanguageToggle` globe ใน ProfileMenu+drawer) · **verify: สลับ EN↔TH ทั้ง shell ได้ · persist cookie ข้าม restart · flow ไม่พัง · ไม่มี error**
  - **วิธี migrate ต่อ (แม่แบบ):** แต่ละไฟล์ → แทนสตริงด้วย `t('key')` + เพิ่มคีย์ใน en.json/th.json (อังกฤษจาก C0/C1 + ไทยจาก git ก่อน 45aa308) · client comp: `useTranslations()` · server comp: `getTranslations()`
  - **แม่แบบ backend-key (พิสูจน์แล้วที่ dashboard):** endpoint คืน **key** (kpi.key / agenda.titleKey) แทนข้อความ → FE แปล `t()` เอง (ไม่ต้องส่ง locale ไป API) · ใช้กับ backend display strings อื่นได้
  - ✅ **Dashboard migrate เสร็จ (`ebb883b`):** KPI + agenda title + chrome สลับ EN/TH ครบ (backend +titleKey · FE t()) · เหลือ alert notification sentences (ข้อความประกอบจาก notify — i18n ลึก · defer)
  - ✅ **Status labels เสร็จ (`4313c71`):** `lib/status.ts` *_STATUS → labelKey · StatusBadge+DetailHeader แปล t() (จุดเดียว ครอบทุก list/detail) · audit fmtVal รับ t · messages.status.* · verify badge สลับได้ · **เหลือ PROPERTY_TYPE/LEAD_SOURCE** (Record ไทย · consumer: properties/leads/property-requests/audit — migrate ตอนทำหน้านั้น)
  - ✅ **Lead→"ผู้สนใจ" + Properties list (`62e1a57`):** owner ติ "โหมดไทยโชว์ Lead อังกฤษ" → TH catalog ใช้ "ผู้สนใจ" ทุกที่ (convert→"แปลง") · **กฎใหม่: audit ทุก batch ให้ th ไทยล้วน / en อังกฤษล้วน** · Properties list migrate ครบ (namespace `common`/`propertyType`/`properties`) · verify สลับ EN↔TH เต็ม
  - ✅ **Properties entity เสร็จ 100% (`428cde7`):** detail(117สตริง · confirm ใช้ t.rich) + edit + PropertyForm(wizard) + fix DetailHeader backLabel · namespace propertyDetail/propertyForm/furnished + common(back/delete/name/phone/email/documents/history/units...) · verify EN↔TH ครบ
  - ✅ **C-shared 1/2 · master-data i18n เสร็จ (`a8aad4d`):** owner เคาะวิธี **ไฮบริด world-class** — enum คงที่ (propertyType/leadSource/furnished)=catalog t() · data-driven (province/amenity)=labelEn/labelTh จาก API (มีครบแล้ว ไม่แตะ backend) · ค่าที่เก็บใน record คงเดิม (จังหวัด=labelTh + reverse-lookup · amenity=code) · [`lib/masterData.ts`](apps/web-admin/src/lib/masterData.ts) hook `useMasterData` (options/provinceLabel/amenityLabel/label ตาม locale) · **แก้: PropertyForm(chips ประเภท+จังหวัด+สิ่งอำนวยฯ) · properties list(filter+display) · properties detail(amenity+province) · audit(propertyType diff)** · verify authed 3จอ×EN/TH (EN=Bangkok/Condo/Swimming Pool · TH กลับไทยครบ ไม่ regression · 0 error) · เลื่อน LEAD_SOURCE(leads)+property-requests propertyType ไป entity turn (ทีละ entity)
  - ✅ **C-shared 2/2 · component ร่วมเสร็จ (`c5bcad9`):** ui.tsx(FilterBar/Modal/ConfirmDialog/Combobox/ListView/ErrorState) · DocumentSection(doc_type/status→catalog) · GlobalSearch · NotificationBell · ActivityTimeline · helper `relTime(iso,t)` ร่วมใน [`lib/format.ts`](apps/web-admin/src/lib/format.ts) · +common(15)+time/docType/docStatus/documents/search/notif/activity · verify authed 3จอ×EN/TH (TH เลิกหลุด "Filters"→"ตัวกรอง" · EN "ID card/Attach document/Notifications" · 0 error ไม่ regression)
  - 🔴 **KNOWN ISSUES เหลือ:**
    1. ~~master-data ไทยเสมอ~~ ✅ เสร็จ (properties) — LEAD_SOURCE + property-requests type = ทำตอน migrate entity นั้น
    2. ~~component ยังไม่แปล~~ ✅ เสร็จ — **เหลือแค่ backend-text** (ActivityTimeline summary "เปลี่ยนสถานะ X→Y" · NotificationBell title/body · notify/audit) = **C-backend** (restructure server เป็น key+params · เฟสลึกแยก) — `DocumentSection` (บัตรประชาชน/แนบเอกสาร/ยังไม่มีเอกสาร), `ActivityTimeline`/ประวัติ (เปลี่ยนสถานะ.../แก้ไขทรัพย์...), GlobalSearch, NotificationBell, QuickAddProperty → **โผล่ในทุกหน้า detail** = ภาษาปนทุกที่
    3. **ยังไม่ทำตาม CYCLE/responsive** — session นี้ผมไล่แปล mechanical ไม่ได้ ติเก่า→เสนอ+รูป 3 จอ→รอเคาะ ต่อหน้า · ไม่ verify 3 อุปกรณ์ต่อหน้า → **ครั้งหน้าต้องทำตามกฎ** ([[ros-rule-discipline-big-tasks]])
  - **📋 แผนที่เหลือ (เสนอ · ให้ owner เคาะก่อนเริ่ม):**
    - ~~**C-shared 1/2** · master-data i18n~~ ✅ **เสร็จ** (`a8aad4d`)
    - ~~**C-shared 2/2** · component ร่วม~~ ✅ **เสร็จ** (`c5bcad9`) · QuickAddProperty = dead code ข้าม (ยังไม่ import ที่ไหน)
    - **C-entities** (ทีละ entity ตาม CYCLE): owners → leads → appointments → customers → contracts → property-requests · แต่ละ entity = list+detail+form · **ต่อ entity: ติเก่า→รูปเทียบ 3 จอ→เคาะ→ทำ→verify authed 3 จอ→audit ภาษาปน→commit**
    - **C-system:** users/settings/community/search/audit (หน้าที่เหลือ)
    - **C-backend (ลึก):** notify/audit สตริงประกอบ (เช่น "เปลี่ยนสถานะ X → Y", "มีการแก้ข้อมูลเจ้าของ…") — ต้อง restructure เป็น key+params หรือ i18n ฝั่ง server
  - **แม่แบบต่อหน้า (พิสูจน์แล้ว):** client → `const t = useTranslations()` · ย้าย option const เข้า component แปลด้วย t · confirm dialog ใช้ `t.rich` (<b>{code}</b>) · **ค่า filter/enum/route ห้ามแตะ (flow)** · ฿+ชื่อ/data=คงภาษาเดิม · shared component default param hardcode ก็ต้อง i18n (เจอที่ DetailHeader backLabel) · **audit ท้าย batch:** `grep '": *"[^"]*[A-Za-z]' th.json` (ยกเว้น placeholder) = ต้องว่าง · en.json ต้องไม่มีอักษรไทย
  - ⚠️ **ก้อนใหญ่ที่สุด · หลาย session** (~1,490 สตริง × 2 ภาษา + master-data + component + backend)
- **future (ไม่บล็อก):** AI คัดรูป 18+ · customer idCard FE surface (endpoint reveal พร้อม)

## 6) 🧪 เครื่องมือเทส/ข้อมูล (session นี้สร้าง)
- **ลบ mock + populate จริง:** ทำผ่านสคริปต์ tsx ใน `db/` (login 3 บทบาท → เดิน flow จริงด้วย fetch → :4000) · idempotent (wipe ก่อน) · อัปรูปจริง multipart (1x1 PNG base64) · **`audit_logs` = append-only** (มี trigger กัน DELETE — ดีไซน์ถูก) → reset ใช้ `TRUNCATE audit_logs` (DDL ข้าม trigger · prod ห้าม)
- **flow test 3 บทบาท:** เดินเต็มวงจร **0 error · สิทธิ์ 15/15 ผ่าน** (เซลขอ→ผจก convert+เติมทุกช่อง+อัปรูป→ผู้บริหารอนุมัติ→สัญญา verify+sign+receipt→rented) · เซลสร้าง/แก้ทรัพย์=403 · ผจกอนุมัติ/เปิดบัตร/ลบ=403 · bypass changeStatus=409 → **flow ไม่ชน ไม่เพี้ยน · backend production-ready**

## 5) เหลือฝั่งเจ้าของ / จุดค้าง (ไม่บล็อก)
- 🔑 **push commit ค้าง (~95 · ต้อง token)** · 🖼 `apps/web-public/public/hero.jpg` (ถ้ายัง)
- ⚠️ **schema drift:** DB มี trgm search index + `appointments.ends_at` ที่ไม่มีใน `schema.prisma` → **อย่ารัน `prisma migrate dev`** (มันจะเสนอ DROP) · ใช้ manual SQL + `migrate resolve --applied` (ทำแบบนี้ที่ 0013) · งานเก็บตก: sync model ให้ตรง DB
- 🔸 polish เล็ก: Segmented 5 ตัวเลือกแน่นบนมือถือ 375px (พออ่านได้)

# ROS — SESSION HANDOVER (สถานะล่าสุด)

> **ไฟล์นี้ = "สถานะ session" ล้วน** (ทำอะไรแล้ว / งานต่อไป / ค้างฝั่งเจ้าของ). เขียนทับเสมอ ไม่สร้างใหม่.
> **โครงสร้าง · กฎ · CYCLE · เครื่องมือ → อยู่ที่ [`CLAUDE.md`](CLAUDE.md)** (โหลดอัตโนมัติ) และไฟล์ที่มันชี้ไป. ที่นี่ไม่เล่าซ้ำ.
> เริ่ม session ใหม่: CLAUDE.md โหลดเอง → อ่านไฟล์นี้เพื่อรู้สถานะ → รอรับงาน.

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** · **RBAC + governance กันโกง ✅ ครบ roadmap 6/6** (Phase 1–6 + final system audit — commit `7cc7865`…`f4f3063`).
🎉 **UX แยกตามบทบาท เฟส 1–4 เสร็จครบ** + **Sidebar ขยาย-ยุบได้** · **กำลังทำ: track C = i18n 2 ภาษา (อังกฤษหลัก+ไทยรอง สลับได้ · next-intl cookie)**
✅ **สลับ EN↔TH ได้จริง — session นี้คืบเยอะ (ทำตาม CYCLE ครบทุก entity):** shell · dashboard · status badges · **master-data (province/amenity/propertyType/leadSource)** · **component ร่วมทั้งหมด (ui.tsx/DocumentSection/ActivityTimeline/GlobalSearch/NotificationBell)** · **ทั้ง 7 entity: Properties + owners + leads + appointments + customers + contracts + property-requests (list+detail+form)** · ปุ่มสลับ 🌐
🟢 **owner's "ภาษาปน" แก้แล้ว:** master-data สลับได้ · component ร่วมสลับได้ · LEAD_SOURCE/PROPERTY_TYPE carry-over เก็บครบ · glossary "Lead→ผู้สนใจ" ทั่วแอป
🎉 **track C = i18n 2 ภาษา เสร็จครบทั้งหมด** (C0/C1 · C-shared 1+2 · C-entities 6/6 · C-system 5/5 · **C-backend 2/2 — activity summary + notification title/body**) → ทั้งแอปสลับ EN↔TH ได้จริง รวมสตริงที่ server สร้าง
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

## 2.5) 🆕 Shell/UX + web-public polish (session ล่าสุด)
- ✅ **rebrand "Notify" เต็มระบบ เสร็จ** (`dfd6b38`): เจ้าของเคาะ "ทั้งระบบ = Notify" (ผมติงว่า Notify ไม่สื่ออสังหาฯ บน web-public เจ้าของยืนยันเอา) — web-admin login(box R→N·h1·footer)+layout/manifest · web-public Header/Footer(box R→N·wordmark)+layout/manifest(title+template+og)+PropertyCard/Gallery placeholder+CommunityBoard+lang.footerRights+privacy email · api receipt(companyName default+template footer) · db property-scenes ป้ายมุมรูป ROS→Notify + **regen 4 ทรัพย์ demo** · คง identity ink/gold + box treatment (sidebar=wordmark ล้วน · login/public=มี box) · **ไม่แตะ internal:** @ros/* pkg · localStorage keys · ros-api health · ros.local creds · verify authed 3 จอ (login+shell+public) typecheck 3 แอปผ่าน 0 error
- ✅ **แบรนด์ sidebar → "Notify"** (`79f714a`): เอาโลโก้กล่อง "R" ออก · wordmark "Notify" ล้วน (ยุบ="N")
- ✅ **ค้นหา role-aware** (`79f714a`): GlobalSearch "ไปยัง" ขับจาก `resolveNav` ตัวเดียวกับ sidebar → กลุ่ม/ลำดับตามบทบาท + หมวด "สร้างใหม่" (gate สิทธิ์) · leads/appointments +`?new=1` เปิด modal · verify admin(create property+lead+appt) vs sales(lead+appt) · เพิ่มบทบาทแก้ที่ nav.ts ที่เดียว
- ✅ **แจ้งเตือน role-aware** (`06546a2`): หน้า /notifications แยก "ต้องคุณทำ"(⚠️) → "อัปเดต"(FYI) · `ACTION_CAT_BY_ROLE` (เจ้าของ=owner/property/contract · ผจก=property/contract · เซล=lead/appointment) · robust กับ row เก่า (ใช้ category) · **เหลือ:** bell dropdown ยังไม่จัด action-first (มี work-items อยู่แล้ว) — follow-up ถ้าต้องการ
- ✅ **รูปทรัพย์พรีเมียม** (`43e5019`+`5f5881c`): SVG "architectural line study" (`db/scripts/property-scenes.ts`+`regen-demo-images.ts`) 6 ฉาก/ทรัพย์ แทน 1×1 · verify web-public grid+carousel สวยทุกจอ · uploads gitignored (regen ได้) · ⚠️ web-public :3000 ต้อง restart รับรูปใหม่
- ✅ **บัญชี → ล่าง sidebar** (`c99159f`+`a13481a`): SidebarAccount (Linear/Slack) · popover ขึ้นบน · ตัด System ซ้ำ · `translate="no"` กัน Google Translate ดัน DOM

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
  - ✅ **KNOWN ISSUES (owner จับได้เมื่อ 2 session ก่อน) แก้ครบแล้ว:**
    1. ~~master-data ไทยเสมอ~~ ✅ (C-shared1 + carry-over ครบทุก entity)
    2. ~~component ร่วมยังไม่แปล~~ ✅ (C-shared2) — **เหลือแค่ backend-text** (ActivityTimeline summary "เปลี่ยนสถานะ X→Y" · NotificationBell title/body · notify/audit) = **C-backend** (restructure server เป็น key+params · เฟสลึกแยก)
    3. ~~ไม่ทำตาม CYCLE/responsive~~ ✅ session นี้ทำตามกฎครบทุก entity (ติเก่า→รูปเทียบ 3 จอ→รอเคาะ→verify authed EN/TH mobile+desktop→audit→commit)
  - **📋 แผนที่เหลือ (เสนอ · ให้ owner เคาะก่อนเริ่ม):**
    - ~~**C-shared 1/2** · master-data i18n~~ ✅ **เสร็จ** (`a8aad4d`)
    - ~~**C-shared 2/2** · component ร่วม~~ ✅ **เสร็จ** (`c5bcad9`) · QuickAddProperty = dead code ข้าม (ยังไม่ import ที่ไหน)
    - 🎉 **C-entities ครบ 6/6:** ~~owners~~ (`a883f28`) → ~~leads/ผู้สนใจ~~ (`41ff852`) → ~~appointments/นัดหมาย~~ (`5645b31`) → ~~customers/ลูกค้า~~ (`06109f2`) → ~~contracts/สัญญา~~ (`121e4da`) → ~~property-requests/คำขอทรัพย์~~ (`1a35ace` · เก็บ PROPERTY_TYPE ค้างครบ) · **LEAD_SOURCE + PROPERTY_TYPE carry-over จาก C-shared1 เก็บครบแล้ว** · ทุก entity verify authed EN/TH × mobile+desktop typecheck ผ่าน 0 error
    - ✅ **C-system ครบ 5/5** (ทีละหน้าตาม CYCLE · verify authed EN/TH): ~~search~~ (`8ed1a99` · fix "Lead"→"ผู้สนใจ") → ~~settings~~ (`020f7d0`) → ~~community~~ (`09de39a` · +ลบ timeAgo ท้องถิ่น→relTime ร่วม · refactor act() i18n-safe) → ~~users~~ (`83ac659` · +common role/status/show/hide · fix var ชน `const t=active`→target) → ~~audit~~ (`8a85297` · ACTION/ENTITY/FIELD→helper · ลบ relTime ท้องถิ่น · glossary entity.lead=ผู้สนใจ) · **en.json ทั้งไฟล์ 0 อักษรไทย** · typecheck ผ่านทุกหน้า
      - 🔸 verify ที่ไม่ครบ (data constraint · ไม่บล็อก): community การ์ด/ปุ่ม (DB ไม่มีโพสต์) · audit entity/FIELD diff (DB ไม่มี entry update-with-changes) — code pattern เดียวกับที่ verify แล้ว
    - **C-backend (ลึก · ปิดท้าย) — owner เคาะ "แยก 2 เฟส" (activity ก่อน · notification ทีหลัง แยก DB risk):**
      - ✅ **C-b1 · activity summary เสร็จ (`559e9e5`):** วิธี **reuse `metadata` JSON เดิม** (ไม่ต้อง migration) — `ActivityEntry` +`i18nKey`/`i18nParams` → `ActivityService.log()` fold เข้า `metadata.i18n={key,params}` · 20 call site (property/lead/contract/appointment/property-request/receipt/property-sync) ส่ง key+params · FE `ActivityTimeline` อ่าน metadata.i18n → `t(key, localizeParams)` (enum from/to/status→`activity.status.*` · date `at`→fmtDateTime) · fallback `thaiifyActivity(summary)` สำหรับ row เก่า (metadata=null) · messages `activity.*` (19 key + 12 status enum) EN/TH glossary lead→ผู้สนใจ · คง `summary` เดิมเป็น fallback+LINE/email
        - verify: fallback live TH+EN (row เก่า render ครบ · endpoint serialize metadata ยืนยัน · **ทุก 19 i18nKey+12 enum มีครบ 2 ภาษา static cross-check**) · typecheck api+web ผ่าน · demo data ไม่ถูกแตะ
        - 🔸 live NEW-activity i18n render ไม่ได้ถ่าย (edit/create modal ไม่เปิดผ่าน automation · แต่ = t(key,params) กลไก track C + key ครบ) · ⚠️ ActivityTimeline อยู่แค่หน้า **property detail** เท่านั้น (property keys: create/update/status/statusFromContract ที่ render จริง)
      - ✅ **C-b2 · notification title/body เสร็จ (`3d017bc` · migration `0017_notification_i18n`):** เพิ่มคอลัมน์ `notifications.title_key/body_key TEXT + params JSONB` (manual SQL ADD COLUMN IF NOT EXISTS + `migrate resolve --applied` · **ไม่ได้รัน `migrate dev`** — drift ปลอดภัย) · `NotifyInput` +titleKey/bodyKey/params → notify/notifyRoles เขียน 3 คอลัมน์ · **20 notify call site** ส่ง key+params · คง title/body เป็น fallback+LINE/email
        - **nested phrase i18n (world-class):** `bounceLiveToReview`+`notifyTermChange` รับ `whatKey` → params.whatKey (+whatParams) → FE resolve ซ้อนเป็น {what} · owner sensitive-edit `changes[]` → structured `fields[]` → FE ประกอบเป็น {changes}
        - FE: **[`lib/notif.ts`](apps/web-admin/src/lib/notif.ts) helper ร่วม** (`notifTitle/notifBody` + `notifValues`: date at→fmtDateTime/date→fmtDate · whatKey→resolve · fields[]→changes) ใช้ทั้ง `NotificationBell` + `notifications/page` · fallback stored title/body (row เก่า)
        - **หน้า `/notifications` เต็ม (ตกสำรวจ C-system!) migrate เต็ม:** chrome/cat labels/CategoryBar/relTime ร่วม · **fix หมวด owner ตกหล่น** (+CAT_META.owner +notif.cat.owner=Owners/เจ้าของ)
        - messages `notif.*` (63 key: 20 event title/body · what.* · ownerField/Flag · cat.* · page chrome) EN/TH glossary lead→ผู้สนใจ
        - **verify authed live end-to-end (สมบูรณ์ทุก rendering path):**
          - simple params: POST public lead → notif render i18n สลับ EN↔TH (New lead from website ↔ ผู้สนใจใหม่จากเว็บไซต์)
          - **complex paths (synthetic notif · psql INSERT→view EN/TH→DELETE · ไม่แตะ entity จริง):** `fields[]→changes` (owner edit: "Phone: X → Y · Address · ID card (hidden)") · `whatKey→what` nested (contract: added term "…") · `date at→fmtDateTime` (appt: "20 Aug 26 · 14:30") — ครบทั้ง EN+TH
          - legacy fallback (row เก่าคงไทย) · chrome+cat+mobile responsive · API :4000 คืนคอลัมน์ใหม่ · 63 key cross-check ครบ 2 ภาษา · typecheck api+web ผ่าน
        - **cleanup ครบ:** test lead LD-2026-0004 soft-deleted · leadWeb+synthetic notif ลบหมด · DB กลับ 12 notif เดิม
        - ⚠️ `migrate status` โชว์ 0011/0012 "not applied" = drift เดิม (ไม่ใช่ของ session นี้ · อย่า `migrate dev`)
  - **⭐ แม่แบบต่อ entity/หน้า (พิสูจน์แล้ว 7 entity · ทำเร็วขึ้นเรื่อยๆ):**
    - สร้าง namespace ต่อ entity ผ่าน **สคริปต์ Python** (`scratchpad/add_*.py` — load json object_pairs_hook=OrderedDict → เพิ่ม key → dump ensure_ascii=False indent=2) แม่นกว่าแก้ JSON มือ
    - client: `const t = useTranslations()` · ย้าย option const (STATUS/SORT) เข้า component แปลด้วย t · **status options reuse `*_STATUS` labelKey** (`Object.entries(X).map(([v,m])=>({value:v,label:t(m.labelKey)}))`)
    - confirm dialog / rich text ใช้ `t.rich('key',{name,b:(c)=><b>{c}</b>})` · relative-time helper รับ t: `relTime`/`relUntil(iso,t)` ใน [`lib/format.ts`](apps/web-admin/src/lib/format.ts)
    - **reuse สูง:** common (save/saving/saved/fullName/address/note/idCard/cancel/back/delete/phone/email…) + owners (noContact/editData/namePlaceholder/addressPlaceholder/sortName) + appts.searchPlaceholder/agentSelf + leads.closeReasonPlaceholder + propertyDetail.perMonth
    - **⚠️ ค่า filter/enum/route ห้ามแตะ (flow)** · ฿+ชื่อ/data/free-text=คงภาษาเดิม · glossary "Lead→ผู้สนใจ" ในโหมด TH
    - **⚠️ ระวัง var ชน:** อย่าตั้งชื่อ map param เป็น `t` (contracts เจอ `terms.map((t)=>)` ต้องเปลี่ยนเป็น `term`)
    - **audit ท้าย batch:** en.json ต้องไม่มีอักษรไทย (`grep -cP '[฀-๿]'`=0) · th.json latin ได้เฉพาะ loanword (Walk-in/BTS/MRT) · typecheck ก่อน commit
  - **verify recipe (worktree):** worktree ที่ **`/Users/iiamtikm/ros-wt-i18n`** (นอก scratchpad — scratchpad โดนล้างข้ามวัน worktree หาย!) · symlink root node_modules · cp .env.local + ไฟล์ที่แก้ · เพิ่ม launch config wt-i18n autoPort · login keystroke · สลับ locale ผ่าน `document.cookie='NEXT_LOCALE=en/th'` + reload · teardown ครบ
- **future (ไม่บล็อก):** AI คัดรูป 18+ · customer idCard FE surface (endpoint reveal พร้อม)

## 6) 🧪 เครื่องมือเทส/ข้อมูล (session นี้สร้าง)
- **ลบ mock + populate จริง:** ทำผ่านสคริปต์ tsx ใน `db/` (login 3 บทบาท → เดิน flow จริงด้วย fetch → :4000) · idempotent (wipe ก่อน) · อัปรูปจริง multipart (1x1 PNG base64) · **`audit_logs` = append-only** (มี trigger กัน DELETE — ดีไซน์ถูก) → reset ใช้ `TRUNCATE audit_logs` (DDL ข้าม trigger · prod ห้าม)
- **flow test 3 บทบาท:** เดินเต็มวงจร **0 error · สิทธิ์ 15/15 ผ่าน** (เซลขอ→ผจก convert+เติมทุกช่อง+อัปรูป→ผู้บริหารอนุมัติ→สัญญา verify+sign+receipt→rented) · เซลสร้าง/แก้ทรัพย์=403 · ผจกอนุมัติ/เปิดบัตร/ลบ=403 · bypass changeStatus=409 → **flow ไม่ชน ไม่เพี้ยน · backend production-ready**

## 5) เหลือฝั่งเจ้าของ / จุดค้าง (ไม่บล็อก)
- ⚠️ **RESTART web-public :3000** — fix รูป (`43e5019`) แก้ next.config + .env.local → เจ้าของต้อง restart dev server :3000 ให้รับ config ใหม่ (worktree verify แล้วรูปขึ้นจริง)
- 🖼 **web-public รูปทรัพย์ (`43e5019`) — 2 เรื่อง:** (1) **fix hydration mismatch** ที่ทำรูปแตกทั้งหมด — `mediaUrl` เดิมคืน env LAN IP (SSR) ≠ window.location (client) → React เก็บค่า server (192.168.1.2) → localhost เข้าไม่ถึง · แก้เป็น relative `/uploads/*` + next.config rewrite proxy (localhost+LAN+prod ใช้ได้) (2) **รูป illustration พรีเมียม** — `db/scripts/property-scenes.ts` (11 ฉาก line-study โทนครีม/ทอง) + `regen-demo-images.ts` แนบ 6 รูป/ทรัพย์ (4 ทรัพย์ demo) · web-admin โชว์อัตโนมัติ · CD=rented ไม่ขึ้น public
  - 🔸 minor: ป้ายห้องใน SVG เป็นไทย baked (โหมด EN ก็เห็นไทย) — future ถ้าต้องการ label 2 ภาษา; รูปใหม่/regen: `cd db && DATABASE_URL=... npx tsx scripts/regen-demo-images.ts` (แตะเฉพาะ media 4 ทรัพย์) · uploads+.env.local = gitignored (บน disk แล้ว)
- 🔑 **push commit ค้าง (~174 local · ต้อง token · +21 commit จากช่วงหลัง)** · 🖼 `apps/web-public/public/hero.jpg` (ถ้ายัง)
- ⚠️ **RESTART web-public :3000 + web-admin :3001** รับ rebrand Notify (`dfd6b38`) — เจ้าของทดสอบต้อง restart dev server ให้เห็น "Notify" (worktree verify แล้วขึ้นจริง 3 จอ) · รูป SVG demo regen แล้วบน disk (uploads gitignored)
- 📌 **งานเสนอไว้ (รอเจ้าของเคาะ · session หน้า):**
  1. ~~rebrand "Notify" เต็มระบบ~~ ✅ **เสร็จ** (`dfd6b38`)
  2. **bell dropdown จัด action-first** ให้สอดคล้องหน้า /notifications (ตอนนี้มี work-items นัด/สัญญาเป็น action layer อยู่แล้ว)
  3. 🔸 polish: Segmented 5 ตัวเลือกแน่นบนมือถือ 375px (พออ่านได้)
- ⚠️ **schema drift:** DB มี trgm search index + `appointments.ends_at` ที่ไม่มีใน `schema.prisma` → **อย่ารัน `prisma migrate dev`** (มันจะเสนอ DROP) · ใช้ manual SQL + `migrate resolve --applied` (ทำแบบนี้ที่ 0013) · งานเก็บตก: sync model ให้ตรง DB
- 🔸 polish เล็ก: Segmented 5 ตัวเลือกแน่นบนมือถือ 375px (พออ่านได้)

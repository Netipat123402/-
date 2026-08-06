# ROS — SESSION HANDOVER (สถานะล่าสุด)

> **ไฟล์นี้ = "สถานะ session" ล้วน** (ทำอะไรแล้ว / งานต่อไป / ค้างฝั่งเจ้าของ). เขียนทับเสมอ ไม่สร้างใหม่.
> **โครงสร้าง · กฎ · CYCLE · เครื่องมือ → อยู่ที่ [`CLAUDE.md`](CLAUDE.md)** (โหลดอัตโนมัติ) และไฟล์ที่มันชี้ไป. ที่นี่ไม่เล่าซ้ำ.
> เริ่ม session ใหม่: CLAUDE.md โหลดเอง → อ่านไฟล์นี้เพื่อรู้สถานะ → รอรับงาน.

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** · design polish world-class **ครบแล้ว** (list/detail/form/filter/header).
งานตอนนี้ = **RBAC 3 บทบาท + governance กันโกง (world-class)** — feature ใหม่ที่เจ้าของสั่ง. อยู่ **Phase 5/6 เสร็จ · เหลือ Phase 6**.
⭐ **owner ย้ำ: ระบบปฏิบัติงานจริง = 3 บทบาทเท่านั้น** (super_admin/property_manager/sales_agent) · อีก 5 = dormant (`isActive=false` · ปิดกันสับสน · เปิดคืนได้) — **ห้ามอ้าง dormant roles ในตรรกะ operating** (notify/gate) · ผู้รับแจ้งเตือนรวมที่ [`apps/api/src/common/auth/operating-roles.ts`](apps/api/src/common/auth/operating-roles.ts)
⚠️ เจ้าของทดสอบบน :3001 (dev ตัวเอง) — ค้างบ่อย hard refresh (Cmd+Shift+R).

## 2) ⭐ RBAC + governance (งานหลักตอนนี้) — org จริง: **สำนักงานเดียว · คุณ=admin+เจ้าของคนเดียว · คนอื่น=ขาย/หาทรัพย์**
**บทบาท operating จริง = 3** (data-driven · อีก 5 เดิม dormant/demo คงไว้ future):
- **Owner** (`super_admin`) — ทุกสิทธิ์ + control (อนุมัติ/เงิน/ลบ/ระบบ/PII)
- **ผู้จัดการ** (`property_manager` · slug คงเดิม label="ผู้จัดการ") — operation เต็ม (ทรัพย์/lead/ลูกค้า/นัด/ร่างสัญญา) · **ไม่มี** approve/reject/sign/verify/delete/ระบบ · scope office
- **เซล** (`sales_agent`) — ไปป์ไลน์ขาย (lead/ลูกค้า/นัด/ร่างสัญญา) · **ทรัพย์+เจ้าของทรัพย์=อ่านอย่างเดียว** · หาทรัพย์ผ่าน "ขอเพิ่มทรัพย์" · scope office
- **test users:** `pm@ros.local` · `sale@ros.local` · รหัส `ChangeMe!2026`

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
- 🔸 เก็บตก (ไม่บล็อก): seed มี test user `test.{role}@ros.local` ครบ 8 บทบาท (รวม dormant) — โชว์ในหน้า users อาจดูสับสน · ถ้าอยากสะอาดสุด trim seed เหลือ 3 (owner ตัดสิน)

## 4) 🎯 งานถัดไป — RBAC roadmap เหลือ /1 (Phase 6)
> ทุกเฟส **reasoning-first**: เสนอดีไซน์+รูป → รอเคาะ → ทำ → verify authed → commit → หยุด (owner เคาะทีละเฟส "เคาะ N")
- **Phase 6 · PII lock (+AI คัดรูป optional):** เลขบัตร idCardNo = เจ้าของเห็นคนเดียว (แยก perm/reveal endpoint) · ⚠️ **สถานะปัจจุบัน:** idCardNo **mask ให้ทุกคนอยู่แล้ว** (`owner.service maskRow` · ไม่มีใครเห็นเลขเต็มผ่าน API) → Phase 6 = เพิ่ม **controlled reveal เฉพาะเจ้าของ** (ไม่ใช่ปะรู) · (อนาคต) AI ตรวจรูป 18+ ก่อนถึงเจ้าของ

## 5) เหลือฝั่งเจ้าของ / จุดค้าง (ไม่บล็อก)
- 🔑 **push commit ค้าง (~95 · ต้อง token)** · 🖼 `apps/web-public/public/hero.jpg` (ถ้ายัง)
- ⚠️ **schema drift:** DB มี trgm search index + `appointments.ends_at` ที่ไม่มีใน `schema.prisma` → **อย่ารัน `prisma migrate dev`** (มันจะเสนอ DROP) · ใช้ manual SQL + `migrate resolve --applied` (ทำแบบนี้ที่ 0013) · งานเก็บตก: sync model ให้ตรง DB
- 🔸 polish เล็ก: Segmented 5 ตัวเลือกแน่นบนมือถือ 375px (พออ่านได้)

# PHASE 11 — SESSION RECOVERY PROMPT (UX/UI track)
> ใช้เปิด session ใหม่ / ส่งต่อ AI หรือ developer ให้เข้าใจสถานะงาน UX/UI ได้เร็วที่สุด
> วันที่: 2026-06-24 · คู่กับ `PROJECT-HANDOVER.md` (ภาพรวมโปรเจกต์ทั้งระบบ)

---

## สถานะ track UX/UI ณ ตอนนี้ (อัปเดต 2026-06-25)
- ✅ Phase 0–11 (audit + plan + roadmap + handover) — เอกสารครบ 16 ไฟล์ใน `UXUI-AUDIT/` (00–13 + 07.5 + README)
- ✅ **ลงมือแก้โค้ดแล้ว** Sprint 0, 0.5, 1, 2, 3 + a11y contrast + page-refine + **dark mode (F3)** + public live-search — **เทสจริงในเบราว์เซอร์ทุกตัว**
- 📒 **บันทึกสิ่งที่แก้โค้ดทั้งหมด (source of truth) = `UXUI-AUDIT/12-IMPLEMENTATION-CHANGELOG.md`** — อ่านไฟล์นี้ก่อนเพื่อรู้ว่าแก้อะไรไปบ้าง (ทุกงานมี ไฟล์/เหตุผล/เทส/revert)
- ⚠️ **สิ่งที่ยังไม่ทำ (รอผู้ใช้ตัดสิน):** A1 ขั้นสมบูรณ์ (`GET /public/settings` — ดูสเปก `13`), E1/E3 (ต้อง backend), D3/F5/B4 (คุ้มน้อย), public search keyboard ↑↓

## ข้อเท็จจริงสำคัญที่ต้องรู้ก่อนทำต่อ
1. ระบบ = **ROS** — Monorepo: `apps/web-public` (Next SSR), `apps/web-admin` (Next client), `apps/api` (NestJS), `db` (Prisma/Postgres)
2. **โทเคนกลาง = `tailwind.preset.cjs` (root)** ใช้ทั้งสองแอป (CSS-variable form รองรับ dark mode) · component library กลาง `apps/web-admin/src/components/ui.tsx` · กฎ `PAGE_SIZE=8`
3. admin **mouse/touch shell** (sidebar rail vs bottom-nav) + **dark mode** (`.dark` class, toggle ใน ProfileMenu/drawer, no-flash script ใน root layout) — **ห้ามรื้อ**
4. **ห้ามแตะ:** business logic, API contract, DB schema, auth/authz, permission, security
5. วินัย: `/technique-1` — minimal, responsive, test-fix-test (mouse + touch) · เทสด้วย preview MCP: login admin@ros.local / ChangeMe!2026
6. **gotcha สำคัญ:** auto-logout 30 นาที (idle) ทำให้ดูเหมือน "ฟีเจอร์พังหมด" (ทุก API 401) — แค่ login ใหม่ · preview_fill ไม่อัปเดต React input ของ login → ใช้ native setter + form.requestSubmit()

## งานถัดไปที่แนะนำ
ดู `12-IMPLEMENTATION-CHANGELOG.md` (เสร็จอะไรแล้ว) + `10-ROADMAP.md` (เหลืออะไร). ของ UI-only เกือบครบ — ที่เหลือต้องอนุญาตแตะ backend หรือเป็น optional

---

## ▼ PROMPT สำเร็จรูป (คัดลอกไปเปิด session ใหม่)

```
คุณคือทีม Product Design ระดับโลกที่ทำงานต่อในโปรเจกต์ ROS (Real Estate Operating System)
ซึ่งเป็น monorepo: apps/web-public (Next.js SSR), apps/web-admin (Next.js), apps/api (NestJS), db (Prisma/Postgres)

โปรเจกต์นี้ผ่าน track UX/UI Phase 0–11 + ลงมือแก้โค้ด Sprint 0–3 + dark mode แล้ว เอกสารอยู่ใน UXUI-AUDIT/

ก่อนทำงาน ให้อ่านเอกสารเหล่านี้ตามลำดับ:
1. UXUI-AUDIT/12-IMPLEMENTATION-CHANGELOG.md     ★ อ่านก่อน — สิ่งที่แก้โค้ดไปแล้วทั้งหมด (ไฟล์/เหตุผล/เทส/revert)
2. UXUI-AUDIT/11-SESSION-RECOVERY-PROMPT.md      (สถานะ + gotcha)
3. UXUI-AUDIT/10-UXUI-IMPLEMENTATION-ROADMAP.md  (เหลืออะไร — Sprint/สถานะ)
4. UXUI-AUDIT/README.md + 00/05/09              (audit + design system พื้นฐาน)
5. UXUI-AUDIT/13-A1-BACKEND-SPEC...md           (งาน backend ที่ค้าง ถ้าจะทำ)
**แล้วรันยืนยันสถานะจริง:** `git -C <repo> log --oneline -20` และ `git status` (git = source of truth ที่แม่นกว่า MD) + `cd apps/web-admin && npx tsc --noEmit` (ต้องผ่าน)
อ่านโค้ดจริง: tailwind.preset.cjs (root), apps/web-admin/src/components/ui.tsx + GlobalSearch.tsx + ThemeToggle.tsx, apps/web-admin/src/app/(app)/layout.tsx + globals.css, apps/web-public/src/components/SearchBar.tsx

กติกาเด็ดขาด (ห้ามฝ่าฝืน):
- ห้ามแก้ business logic / API contract / DB schema / auth / authz / permission / security
- เปลี่ยนได้เฉพาะ UI/UX presentation layer
- ทุกงาน = PR เล็ก มี rollback ชัด ทดสอบทั้ง mouse (desktop) และ touch (มือถือ/iPad) ตาม /technique-1
- ห้ามเพิ่มสี/variant ปุ่มเกินจำเป็น ห้ามรื้อ mouse/touch shell ห้ามยัด chart เข้า dashboard

จากนั้น:
1) สรุปความเข้าใจระบบและสถานะงาน UX/UI กลับมาสั้น ๆ
2) ระบุสิ่งที่ยังไม่แน่ใจ/ต้องยืนยัน
3) เสนอเริ่มที่ Sprint 0 (A1–A5) แล้วรอคำยืนยันก่อนแก้โค้ด
```

---

## Checklist ความพร้อมก่อนเริ่มแก้โค้ด
- [ ] รัน dev ทั้งสองแอปได้ (web-admin :3001, web-public ตาม env)
- [ ] ยืนยันค่า `settings.company.contact.lineOaId` มีจริงใน DB (สำหรับ A1)
- [ ] ยืนยันว่า API `/public/properties` รองรับ `page/limit` (สำหรับ B1) — โค้ด admin ใช้ page อยู่แล้ว
- [ ] อ่าน `MASTER-REMEDIATION-BACKLOG.md` ดูว่ามี MR ใดทับซ้อนงาน UX

---

## ★ อัปเดตสถานะล่าสุด (2026-06-26) — source of truth = โค้ดจริง (ห้ามเชื่อ MD เก่า 100%)

### ทำเสร็จเพิ่ม (ดูรายละเอียด `12-IMPLEMENTATION-CHANGELOG.md` §G,H,I)
- **Modal/overlay fix (G1):** Portal ไป body + scrim เนียน (แก้ "กล่องขยับ/backdrop ไม่เต็มจอ" จาก `.animate-fade-rise` transform); Lightbox public ก็ portal
- **Mock data (G2):** `db/seed/mock-bulk.ts` — 16/โมดูล + รูป SVG 10/ทรัพย์ (รัน/`--clean`); ลบ demo เก่าไม่มีรูปแล้ว
- **ชุดมือถือ (H):** A ซ่อนชุมชน+ชื่อโครงการ · B spec strip แถวเดียว+amenity chip · C typography หัวดีเทล · D1 +→wizard · **D2 dropdown silent-catch fix (ต้นเหตุ "ใช้ได้แล้วไม่ได้"=session หลุด)** · D3 date picker · E1 notif deep-link · E4 หน้า /search แยก
- **รอบ 2 (I):** #1 ปฏิทินกดนัด→detail · #4 ลูกศร snappy (44px+active:scale, crossfade 300→200) · #5 รูป gallery vh-based (เล็กลง ทุก orientation) · **FLOW-AUDIT.md + ROUTE-MAPPING.md (ใหม่)**

### เอกสารใหม่/อัปเดตรอบนี้
- **ใหม่:** `UXUI-AUDIT/FLOW-AUDIT.md` (ปุ่ม→route→table ทุกโมดูล + วิเคราะห์ flow ซ้ำ), `UXUI-AUDIT/ROUTE-MAPPING.md`
- **มีอยู่แล้ว (ของเดิม root):** ARCHITECTURE-AUDIT, DATABASE-AUDIT, RELATIONSHIP-MAP, SYSTEM-KNOWLEDGE, SECURITY-AUDIT — ใช้เป็นฐาน อัปเดตเมื่อโค้ดเปลี่ยน

### Flow ที่ผู้ใช้ถาม (สรุป)
- **customer สร้างทางเดียว = lead convert** (`POST /leads/:id/convert`); ไม่มี endpoint/ปุ่มเพิ่ม customer ตรง → **ไม่มี flow ซ้ำเชิงโครงสร้าง**. ที่ดูซ้ำ = คน convert แล้วอยู่ทั้งลิสต์ Lead(closed)+Customer (ประวัติ). เสี่ยง: convert ไม่ dedup เบอร์

### ค้าง (ถ้าทำต่อ)
- doc เพิ่ม (optional): QA_CHECKLIST, COMPONENT_LIBRARY, อัปเดต DATABASE/RELATIONSHIP เดิม
- ข้อเสนอแตะ backend (ต้องขอ): notif real-time (E2), convert dedup เบอร์, lead→customer badge
- iPad PDF (6 ภาพ) — ผู้ใช้จะส่งต่อ

### INFRA (สำคัญ — ดับบ่อยข้าม session)
- PG: `~/Applications/Postgres.app/Contents/Versions/latest/bin/pg_ctl -D "~/Library/Application Support/Postgres/var-16" -o "-k /tmp" start`
- API: `PII_ENCRYPTION_KEY=<hex 64> nohup npm run api:dev` (ต้องการแค่ PG@5432, ไม่ใช้ Redis ใน dev)
- preview: admin :3001 / public :3000 · login admin@ros.local/ChangeMe!2026 (native-setter ใน preview)
- เทส UI: `/technique-1` (minimal/พรีเมียม, responsive ทุก device, เทส-แก้-เทส)

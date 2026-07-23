# ROS — SESSION HANDOVER (2026-07-19 → ต่อเนื่องถึง 07-23)

> **อ่านไฟล์เดียวจบ.** สรุปทุกอย่าง: โครงสร้าง · ทำอะไรไปแล้ว · เหลือ/ขาดอะไร · เสนออะไร · ทำอะไรต่อ.
> คู่กับ: `DESIGN-SYSTEM.md` (กฎดีไซน์ locked §1–11) · `PAGE-QA-SWEEP.md` (tracker ต่อหน้า) · **`docs/ADMIN-DESIGN-PHASES.md` (แผนเฟส/ทาส admin — งานถัดไป)** · auto-memory (operating rules).
> reference: `docs/reference/SYSTEM-KNOWLEDGE.md` + `RELATIONSHIP-MAP.md` (ความรู้ระบบ ยังใช้ได้).
> **MD housekeeping (07-23):** root เหลือ 4 (handover·PAGE-QA-SWEEP·DESIGN-SYSTEM·README) · handover/audit เก่า + design-plan เก่า (DESIGN-REFERENCE-ANALYSIS·PHASE2-PLAN) → `docs/archive/` (24 ไฟล์ ประวัติ) · **กฎ: อย่าสร้าง MD ใหม่ — อัปเดต handover + ADMIN-DESIGN-PHASES + PAGE-QA-SWEEP เท่านั้น**
> **git:** commit ทั้งหมด = local git (ถาวรในเครื่อง) · **ยังไม่ push GitHub** (`git push -u origin recover/redesign-v2` — ต้อง token เจ้าของ) · ~120 commit ค้าง

---

## 0) โครงสร้างโปรเจกต์ (monorepo)
- `apps/web-admin` — Next.js admin (มืด · authed) · หน้า: dashboard·properties·leads·appointments·contracts·customers·owners·calendar·audit·users·community·notifications·settings·search (+detail)
- `apps/web-public` — Next.js เว็บลูกค้า (สว่าง · ไม่มีล็อกอิน) · หน้า: home·properties(list)·properties/[code]·saved·privacy
- `apps/api` — NestJS + Prisma (Postgres) · **R2 = frontend-only ห้ามแตะ backend**
- `db/` — Prisma schema + seed (`seed/mock-bulk.ts` สร้าง mock; ระวัง FK landmine)
- `tailwind.preset.cjs` — **design tokens ร่วม 2 แอป** (สี/ฟอนต์/radius/shadow/motion)
- creds admin: `admin@ros.local` / `ChangeMe!2026` · API: localhost:4000 (LAN 192.168.1.2:4000)
- branch: `recover/redesign-v2` · **push ไม่ได้ (ต้อง token เจ้าของ)** — commit ค้างเยอะ

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** (admin 21/21 หน้า CRUD จริง · public listing/detail/filter/favorite ครบ) · งานตอนนี้ = **design polish + world-class UX** (ไม่ใช่ทำ feature ใหม่)

## 2) ทำอะไรไปแล้ว session นี้ (commit `fae8201` → `5d37e11`, ~22 commit)
**Admin — แยกหมวดข้อมูล (§10) + วันที่สากล (§7) + label-value (§8):**
- `fae8201` appointments แยก วันที่ \| ทรัพย์ ต่อ device (มือถือ minimal)
- `9ca8e68` **วันที่สากลทั้ง 2 แอป** — Latin/ค.ศ./24ชม. (`lib/format.ts` = source เดียว: fmtDate/fmtDateTime/fmtRelative) · เลิก พ.ศ./เดือนไทย/น.
- `5e49218` InfoRow proximity rail (มือถือ justify-between · sm+ label w-36 + value ราง)
- `f344908` leads แยก source เป็น channel chip · `c654b83` properties แยก ทำเล/ประเภท + ดึง bedrooms
- `beab071` calendar หัวเดือน พ.ศ.→"July 2026" (date-sweep พลาดเพราะใช้ array เอง)
- §4.2 overflow pause-scan **ทั้ง admin+public ทุก breakpoint = CLEAN** (hard-cut จริงจุดเดียว = แท็บ public แก้แล้ว)

**Public — redesign พรีเมียม:**
- `f56b0bc` **radius A refined** (card 16→12 · panel 20→14 · ปุ่ม/ชิป rounded-lg 8 ไม่ pill) + ปุ่มเล็กลง h-11 + **รูป mock สะอาด** (regen SVG "ROS" กลางภาพ — เลิก text ริมขอบที่โดนตัด)
- `c23a009` badge pill→เหลี่ยม 6px + LINE outline
- `73cb38e` search icon-in-bar (ตัดปุ่มค้นหาใหญ่) · `4e595f1` category tabs wrap (ไม่ scroll-cut)
- `7d2f8e6` spec ชั้น "6" เด่น "/9" จาง · `5c47bb4` **การ์ด price-first (Zillow)** — ราคานำ→specs→ชื่อ/ทำเล · ตัด amenity badge ไป detail
- `b289aa2` **search+filter = Zillow** (search เต็มแถว · FilterBar pills · type เป็น dropdown · ตัด CategoryTabs)
- `5d37e11` **mobile filter = bottom-sheet** (per-device: เดสก์ท็อป pills · มือถือ ปุ่มเดียว→sheet) + LINE border 2px

## 3) กฎ (source of truth)
- **`DESIGN-SYSTEM.md`** (locked) — §1 type · §2 spacing · §3 radius(A) · §4 shadow · §5 icon · §6 color · **§7 วันที่สากล · §8 label-value rail · §8b ห้าม hard-cut(เซ็ตสั้น wrap) · §8c search+filter layout · §9 วิจารณ์ตรง-เสนอเชิงรุก · §10 แยกหมวดข้อมูล · §11 field ต่อ device**
- **auto-memory** (operating manual): `ros-master-workflow`(⭐อ่านก่อน) · `ros-comparison-responsive-protocol`(รูปเทียบ=show_widget เสมอ · per-device) · `ros-critique-and-proactive`(⭐ติตรง ไม่อวย ไม่ตามใจ เสนอเชิงรุก codify ทันที) · `ros-radius-and-mock-images` · `ros-inter-look-date-and-labelvalue` · `tailwind-mouse-variant-order` · `ros-reseed-and-contract-side-effects`

## 4) ⚠️ ยังไม่ verify / เหลือ / ขาด
1. **mobile filter sheet — de-risked แล้วบางส่วน** · `5c4cda9` เห็น SearchBar bottom-sheet **เปิด+render ครบจริงบนมือถือ 375** ผ่าน worktree preview (ประเภท/จังหวัด/ราคา/รถไฟ/ห้องนอน + ล้าง/ใช้ตัวกรอง) = โค้ด path ของ sheet ทำงาน · เหลือ tap-test FilterBar sheet ของ listing (`5d37e11`) ที่ใช้ trigger คนละตัว บนเครื่องจริง ให้ชัวร์ 100%
2. **backend dates** — body แจ้งเตือน/เตือนกำหนดยังเป็นไทย/พ.ศ. (`apps/api common/util/thai-datetime.ts` → appointment.service:164, scheduler:99/132) · ติด R2 frontend-only → **task chip ตั้งไว้** (`task_fcd29015`) · ใบเสร็จ PDF คงไทยเจตนา
3. **test data ค้าง** — notification "QA test นัด (ลบได้) 15 ก.ค. 2569" + lead "QA ทดสอบระบบ" · รอเจ้าของอนุมัติลบ

## 5) 🎯 งานถัดไป (เสนอไว้ + กฎใหม่รองรับ)

### ⭐ NEXT SESSION เริ่มตรงนี้ → `docs/ADMIN-DESIGN-PHASES.md` (Phase 1)
งานถัดไปที่เจ้าของสั่ง (จากรูปที่ชี้ · แต่ละทาส = widget เทียบ 3 จอ + ถามก่อน + verify authed):
- **Phase 1 · Detail/Modal:** T1.1 นัดหมาย drawer (action-first + แยก วันที่/สถานที่ §10) · T1.2 ลูกค้า detail (dedupe เบอร์) · T1.3 สัญญา detail (dedupe ค่าเช่า) · T1.4 เจ้าของ detail · T1.5 property wizard
- **Phase 2:** "ข้อมูลของใครของมัน" + กรอบชุดข้อมูลชัด (§10) · **Phase 4:** per-device field priority ต่อหน้า (§11 — เสนอมือถือ/iPad/คอมโชว์หัวข้อไหน + ถามก่อน)
- หลักการร่วม (ใช้ทุก detail): glance identifier · dedupe · กรอบชัด · action-first · ข้อมูลของใครของมัน

### ✅ done รอบ design-polish (07-20→23) — สรุป (ดูรายละเอียดล่างต่อ)
public: home hero A→**B photo** (`49f0931` รอวาง`public/hero.jpg` รูป3) · Zillow search/filter/**sort** · empty state · **trust bar+3 steps editorial** · footer คอลัมน์+i18n · privacy 5 หัวข้อ · eyebrow "ทรัพย์คัดสรร" · lang toggle concentric · motion polish
admin: **ListView flex คอลัมน์เดียว(ชื่อ)** แก้ห่าง/ตกกรอบ/badge เยื้อง (§10 root fix) · **property detail glance identifier + dedupe** · **lead drawer action-first** · ประเภท=type ล้วน · appointments status badge ชิดซ้าย

---
- ✅ **DONE `fd5ffcf`** — dashboard agenda §10/§11 (นัด/สัญญานำด้วยคน/ทรัพย์ · โค้ดจาง desktop-only · มือถือ2/iPad3/คอม4 field · verify worktree+API จริงครบ 3 tier). customers/owners detail สแกนแล้ว = §10-clean อยู่แล้ว · **ค้าง: แถวสัญญาใน agenda ยังไม่ verify ภาพ (ไม่มีสัญญาใกล้ครบใน 30 วันใน demo)**
- ✅ **§10/§11 admin scan เสร็จ — ทุกหน้า compliant แล้ว** (list: leads channel แยก sub-col · contracts ลูกค้านำ/ทรัพย์รอง/รหัสเฉพาะตาราง · properties ทำเลแยก specs hidden sm · appointments ชื่อคนนำ · detail: InfoGroup แยกหมวดครบ, ทำเลแยกจังหวัด·เขต, 2-col xl). **ไม่มี §10 win เหลือใน admin** · ที่ยัง "ชื่อ·เบอร์ / ชื่อ·รหัส" เป็น pattern จงใจ (secondary จาง) แยกแล้วแย่ลง — ห้ามแตะ
- ✅ **public property detail — ประเมินแล้ว = ดีอยู่แล้ว ไม่ต้อง redesign** (แกลเลอรี mosaic · ราคา text-3xl gold เด่น · SpecStrip · sticky form/CTA) — ไม่ปั้นงานหลอกกับหน้าที่ดี
- ✅ **DONE `1707f8b`+`96faafa`** — listing sort control: เรียง ใหม่ล่าสุด/ราคาต่ำ→สูง/สูง→ต่ำ/ยอดนิยม บนแถวผลลัพธ์ · backend รองรับอยู่แล้ว (public.dto @IsIn) ขาดแค่ UI · Icon เพิ่ม `sort` · dict TH/EN 5 คีย์. **`96faafa`: เปลี่ยนจาก native select → custom dropdown สไตล์ FilterBar** (native เปิดเมนู OS เขียว/ไม่เข้าพวก เจ้าของจับได้ = downside ที่เตือนไว้) · verify end-to-end ทุกจอ (เรียงถูก+คง filter+มือถือพอดี+modal-in)
- ✅ **DONE `5c4cda9`+`06a71f4`** — home hero = **Editorial Dark (แบบ A)** ตรง §8c: search เต็มแถวเด่น + ลิงก์ "ตัวกรอง" เงียบ + ชิปยอดนิยม ใต้ (บนพื้นมืด) · SearchBar เพิ่ม variant `hero` · Icon เพิ่ม `sliders` · verify 3 จอจริง (375/768/1200). เจ้าของเลือก **"A ตอนนี้ → B ภายหลัง"** — โครง B-ready ไว้แล้ว (คอมเมนต์กำกับใน page hero) · **fix `06a71f4`: dropdown ตัวกรองเดสก์ท็อปตกกรอบ** — เดิม `<section>` hero มี overflow-hidden เลย clip dropdown → ย้าย overflow-hidden ไปห่อเฉพาะ bg glow/grid + anchor dropdown ใต้แถวตัวกรอง
- ✅ **DONE `4d1a6fd`** — listing empty state ยกระดับเท่า /saved (ไอคอนวง + ปุ่ม "ล้าง" พาออกจากทางตัน เมื่อค้นไม่เจอ) · /saved ประเมินแล้ว = ดีอยู่แล้ว
- ✅ **completeness pass `41223cc`** — สแกน radius/focus/Header/Footer/not-found: fix ปุ่มเดี่ยว 2 ตัว rounded-md→lg (§3) · ยืนยันส่วนอื่น**ครบและเนี้ยบแล้ว** (focus-visible a11y ✓ · not-found พรีเมียม ✓ · Header/Footer ครบ ✓ · badge/toggle 6px = จงใจ concentric). **public app = complete จริง ทุก surface**
- ✅ **owner 5-image review `7681d50`+`6074521`** — เจ้าของส่ง 5 รูป (ติละเอียด):
  - **#2/#3/#4/#5 admin table (`7681d50`)** — root เดียว: ListView ให้ทุก sub-col เป็น w-full flex → หน้าที่มี 2 sub แย่งกัน (ห่าง/ตกกรอบ/header 2 บรรทัด). **แก้: Col เพิ่ม `grow` (flex คอลัมน์เดียว=ชื่อ) · th nowrap · width→ตัด "…" · status ⋯ slot ตายตัว w-6 (badge เรียงตรง).** verify authed 1280: properties ชื่อดูดพื้นที่/ประเภทเต็ม · leads chip"แนะนำ"เต็ม+header 1บรรทัด · appointments badge 1173px ทุกแถว · มือถือการ์ดไม่พัง
  - **#1 home (`6074521`)** — trust bar กระจายห่าง→**กระชับกลาง+เส้นคั่น** · 3 steps การ์ด+badge (generic)→**D editorial เส้นทอง STEP 01–03** (เจ้าของเทียบ A/B/C/D ครบ 3 จอ เลือก D). verify 3 จอ (มือถือ trust2×2+steps เรียงลง · iPad/คอม trust แถวเดียว+steps 3คอลัมน์)
  - **learning:** ตาราง admin ควรมี flex คอลัมน์เดียว(ชื่อ) · หลาย sub-col แย่งกันเป็น root ของ ห่าง/ตกกรอบ — [[admin-listview-single-flex-column]]
- ✅ **DONE `49f0931`** — home hero = **Photo Immersive (B)** เปิดแล้ว (เจ้าของมีรูปจริง) · footer จัดคอลัมน์+i18n. **⚠️ ต้องวางไฟล์ `apps/web-public/public/hero.jpg`** (เจ้าของเคาะรูป 3 — ท้องฟ้าโล่ง) · ถ้ายังไม่วาง → degrade เป็น dark hero (bg-ink) สวยเหมือนกัน · overlay (bg-ink/55 + gradient) คุมตัวอักษรขาวบนภาพสว่างแล้ว
- ✅ **header/footer review** — header ช่องว่างกลาง = **ระดับโลกมาตรฐาน** (โลโก้ซ้าย/เมนูขวา) ไม่ต้องแก้ · footer = จัดคอลัมน์+i18n แล้ว (`49f0931`)
- ✅ **owner review batch 2 (`efc33c0`+`84be651`)** — 8 จุด:
  - `efc33c0`: LangToggle inset concentric (เลิกเหลี่ยม) · footer เอาไอคอนออก · properties ประเภท = type อย่างเดียว (เลิก "· N นอน")
  - `84be651`: eyebrow → "ทรัพย์คัดสรร/Curated rentals" · privacy 5 หัวข้อ · **#4 property detail = glance identifier** (DetailHeader เพิ่ม `actions` ขวาหัว/มือถือ stack · ราคา dedupe → กล่องล่าง "เงื่อนไขการเช่า") · **#5 lead modal = action-first** (ปุ่มหลักขึ้นบนสุด)
  - verdict: header/logo/hero-copy/footer-tagline = **ระดับโลกอยู่แล้ว** · #5 two-column(E) ข้าม (modal แคบ breakpoint viewport-based เสี่ยง)
- ✅ **DONE `072af2b`** — motion polish: filter panel entrance (มือถือ sheet สไลด์ขึ้น · เดสก์ท็อป dropdown modal-in · backdrop fade) + hero fade-rise stagger · ทุกตัว fill=backwards จบ transform:none (กัน Combobox ตกกรอบ) + reduced-motion. **การ์ด/รูป/หัวใจ มี motion ดีอยู่แล้ว ไม่แตะ** (hover lift · Ken Burns · heart-pop). keyframe `sheet-up` ใหม่ใน globals
- **motion อื่น (ถ้าอยากต่อ)** — image crossfade มีแล้ว (`duration-500`) · อาจเพิ่ม page-transition ระหว่างหน้า (ต้อง view-transition API/lib)
- (เมื่อมี token เจ้าของ) push commit ค้างทั้งหมด

## 6) 🛠 วิธี/เครื่องมือ
- **แคปเอง (กัน .next ชนเจ้าของ):** `git worktree add --detach <scratch> HEAD` → `ln -s <repo>/node_modules` → cp `.env.local` + ไฟล์ที่แก้ + `tailwind.preset.cjs` (ถ้าแก้ token ต้อง restart preview) → launch.json config `bash -c 'cd <wt>/apps/<app> && exec npx next dev'` autoPort → `preview_start` → เสร็จ: `preview_stop` + `git worktree remove --force` + `git checkout .claude/launch.json`
- **owner ดู preview_screenshot ไม่ได้** → รูปเทียบ owner-facing = `mcp__visualize__show_widget` เสมอ (ธีมมืด ROS)
- **preview_click/script เปิด dropdown/sheet ไม่ได้** (outside-close ใช้ mousedown) — verify structure/render + ให้เจ้าของ tap จริง
- overflow scan: leaf-text `scrollWidth>clientWidth` + ดู screenshot จริง · date-leak: regex พ.ศ.(25[67]\d)/เดือนไทย
- re-seed: `cd db && DATABASE_URL=... tsx seed/mock-bulk.ts` (ระวัง FK landmine — junk property อ้าง mock owner)

## 7) 🗂 MD files — จัดแล้ว
- **root (ใช้จริง):** `SESSION-HANDOVER-2026-07-19.md`(นี้) · `PAGE-QA-SWEEP.md` · `DESIGN-SYSTEM.md` · `README.md`
- **`docs/archive/`:** handover เก่าทั้งหมด + audit เก่า (มิ.ย.–ก.ค. ก่อน redesign) + `UXUI-AUDIT/` (24 ไฟล์ 3 ก.ค.) — ประวัติ ไม่ลบ กันอ้างอิง
- **หลักไปข้างหน้า:** handover ล่าสุด 1 ไฟล์ที่ root · ตัวเก่า→archive ทันทีเมื่อขึ้นตัวใหม่ · **อย่าสร้าง MD ใหม่พร่ำเพรื่อ** — อัปเดต handover + PAGE-QA-SWEEP ตัวเดียว

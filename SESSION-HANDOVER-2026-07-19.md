# ROS — SESSION HANDOVER (2026-07-19)

> **อ่านไฟล์เดียวจบ.** สรุปทุกอย่าง: โครงสร้าง · ทำอะไรไปแล้ว · เหลือ/ขาดอะไร · เสนออะไร · ทำอะไรต่อ.
> คู่กับ: `DESIGN-SYSTEM.md` (กฎดีไซน์ locked §1–11) · `PAGE-QA-SWEEP.md` (tracker ต่อหน้า) · auto-memory (operating rules).
> handover เก่า + audit เก่า ย้ายไป `docs/archive/` แล้ว (ประวัติ ไม่ลบ).

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
- ✅ **DONE `fd5ffcf`** — dashboard agenda §10/§11 (นัด/สัญญานำด้วยคน/ทรัพย์ · โค้ดจาง desktop-only · มือถือ2/iPad3/คอม4 field · verify worktree+API จริงครบ 3 tier). customers/owners detail สแกนแล้ว = §10-clean อยู่แล้ว · **ค้าง: แถวสัญญาใน agenda ยังไม่ verify ภาพ (ไม่มีสัญญาใกล้ครบใน 30 วันใน demo)**
- **§10 แยกหมวด — ไล่สแกนหน้าที่เหลือ** (ที่อื่นที่ยัด 2 ความหมาย) → เสนอ **widget 3 จอ (มือถือ/iPad/คอม) + before/after + เหตุผล + ถามก่อน**
- **§11 field ต่อ device — เสนอชุด field ที่เหมาะแต่ละ device ต่อหน้า** (มือถือโชว์ N ตัวสำคัญ · iPad เพิ่ม · คอมมากสุด · ไม่ต้องครบ) + ถามก่อน + เหตุผล
- ✅ **DONE `5c4cda9`** — home hero = **Editorial Dark (แบบ A)** ตรง §8c: search เต็มแถวเด่น + ลิงก์ "ตัวกรอง" เงียบ + ชิปยอดนิยม ใต้ (บนพื้นมืด) · SearchBar เพิ่ม variant `hero` · Icon เพิ่ม `sliders` · verify 3 จอจริง (375/768/1200). เจ้าของเลือก **"A ตอนนี้ → B ภายหลัง"** — โครง B-ready ไว้แล้ว (คอมเมนต์กำกับใน page hero)
- **home hero → B (Photo Immersive) ภายหลัง** — เมื่อมี **ภาพทรัพย์จริงสวยๆ** (ตอนนี้ mock SVG ไม่พอ): แทนพื้น `bg-ink` + 2 บล็อก glow/grid ด้วย `<Image>` ทรัพย์ + overlay มืด (gradient bottom-dark) · headline/search/ชิป โครงเดิม
- **motion/transition polish** (card hover · sheet slide · image crossfade) = ยกระดับพรีเมียม
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

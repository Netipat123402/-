# IMPLEMENTATION CHANGELOG — UX/UI Transformation (Sprint 0 → 3 + a11y)
> บันทึกการแก้โค้ดจริงทั้งหมดในรอบนี้ · ทุกข้อ **UI layer เท่านั้น** — ไม่แตะ business logic / API contract / DB schema / auth / RBAC / security
> วันที่: 2026-06-24 → 2026-06-25 · เทสกับสแตกจริง (API:4000 · web-admin:3001 · web-public:3000)

> วิธีอ่าน: แต่ละงานมี **[ทำอะไร] · [ไฟล์] · [ทำไม] · [เทส] · [revert]**

---

## หลักการที่ยึดทั้งรอบ
- เปลี่ยนเฉพาะ presentation (className / token / component markup) — ไม่แตะ data flow, handler logic, endpoint, สิทธิ์
- additive + ค่าเดิมคงเดิม (กัน regression) · ทดสอบ `tsc --noEmit` ทั้งสองแอปทุกครั้ง
- ทดสอบ mouse + touch ตาม `/technique-1`

---

## SPRINT 0 — Conversion + Feel

### A1 · ผูกปุ่ม "ติดต่อ/LINE" กับค่าตั้งได้ (ไม่ฮาร์ดโค้ด)
- **ไฟล์:** `apps/web-public/src/lib/api.ts` (เพิ่ม `LINE_URL`), `components/Header.tsx` (pill + footer), `components/StickyCTA.tsx`, `.env.local` (`NEXT_PUBLIC_LINE_URL`), `next.config.js` (คอมเมนต์)
- **ทำไม:** เดิม `https://line.me` (placeholder) = รู conversion ฝั่งลูกค้า
- **เทส:** curl home เจอ 2 ลิงก์, หน้า detail 3 ลิงก์ ชี้ URL ที่ตั้ง · typecheck ผ่าน
- **revert:** เปลี่ยน `LINE_URL` กลับเป็น literal เดิม
- **⚠️ ก่อน production:** ตั้ง `NEXT_PUBLIC_LINE_URL` เป็น URL LINE OA จริง (ตอนนี้ `@ros-demo`)
- **gotcha:** อย่าประกาศ `NEXT_PUBLIC_*` ใน `next.config.js` `env` พร้อม `|| fallback` — มัน eval ก่อน `.env.local` โหลด เลยล็อก fallback; ให้ Next inline จาก `.env.local` เอง

### A2 · Transition fade-in เนื้อหา
- **ไฟล์:** `globals.css` ทั้งสองแอป (keyframe `fade-rise` + `prefers-reduced-motion`), `web-admin/(app)/layout.tsx` (`<div key={pathname} className="animate-fade-rise">`), `web-public/app/layout.tsx`
- **ทำไม:** content เข้าจอลื่นขึ้น (พรีเมียม) · **เทส:** keyframe ใน compiled CSS · **revert:** ลบ class + keyframe

### A3 · เตือนก่อน auto-logout 60 วินาที
- **ไฟล์:** `web-admin/(app)/layout.tsx` (idle effect + Modal นับถอยหลัง + ปุ่ม "อยู่ต่อ")
- **ทำไม:** เดิมหลุด 30 นาทีเงียบ ๆ งานหาย · **ไม่เปลี่ยนนโยบาย 30 นาที** แค่เตือนก่อน
- **เทส:** typecheck + render 200 (ตัวจับเวลา 30 นาทีไม่รันจริง) · **revert:** คืน effect เดิม + ลบ Modal/state

### A4 · ปุ่มยุบเล็กตอนกด (tactile)
- **ไฟล์:** `globals.css` ทั้งสองแอป (`.btn { ... active:scale-[0.98] disabled:active:scale-100 }`)
- **เทส:** 25 rule `--tw-scale-x:.98` ใน CSS · **revert:** ลบ active:scale

> **A5 (optimistic toast) — ไม่ทำ:** ต้องคู่กับ undo ไม่งั้นโชว์สำเร็จลวง = เปลี่ยน behavior → ยกไป E3

---

## SPRINT 0.5 — Responsive Quick Wins (a11y)

### Touch targets ≥40px (เดสก์ท็อปเมาส์คง 36px)
- **ไฟล์:** `web-admin/globals.css` (`@media (any-pointer:coarse){ .btn-sm{height:2.5rem} }`), `ui.tsx` Pagination (`touch:h-10 touch:w-10`), `NotificationBell.tsx`, `GlobalSearch.tsx` (ปุ่มค้นหามือถือ), `(app)/layout.tsx` (ปุ่ม +)
- **เทส:** rule อยู่ใน `@media (any-pointer:coarse)` ใน compiled CSS · **revert:** ลบ media/variant

### aria-current + skip-to-content
- **ไฟล์:** `(app)/layout.tsx` (`aria-current="page"` rail/drawer/bottom-nav + skip link + `<main id="main-content" tabIndex={-1}>`), `web-public/app/layout.tsx` (skip link + id)
- **เทส:** public curl เจอ "ข้ามไปเนื้อหาหลัก" + `id="main-content"` · live: render เป็น element แรก

---

## SPRINT 1 — Token & Motion Foundation

### D1 · รวมโทเคนเป็น preset เดียว (เลิก sync มือ)
- **ไฟล์:** **NEW** `tailwind.preset.cjs` (root) · `web-admin/tailwind.config.ts` + `web-public/tailwind.config.ts` ใช้ `presets:[require('../../tailwind.preset.cjs')]` เก็บเฉพาะส่วนเฉพาะแอป (admin: shadow.lift เบา + mouse/touch plugin · public: shadow.lift เด่น + maxWidth.content)
- **ทำไม:** สีแบรนด์เคยซ้ำ 2 ไฟล์ sync มือ → drift risk · **เทส:** admin CSS **byte-identical** ก่อน/หลัง (sorted diff ว่าง = zero regression); public tokens/lift/maxWidth ครบ · typecheck ผ่าน (jiti โหลด require ได้)
- **revert:** คืนโทเคนเข้า config แต่ละไฟล์ + ลบ preset

### D2 · ตั้งชื่อ motion tokens
- **ไฟล์:** `tailwind.preset.cjs` (`transitionTimingFunction: standard/emphasized`, `transitionDuration: fast/base/slow`)
- *(type/spacing naming = เสนอ ยังไม่บังคับ — กัน visual shift)*

### F1 · Modal entrance motion
- **ไฟล์:** `tailwind.preset.cjs` (keyframes/animation `fade-in`, `modal-in`), `ui.tsx` Modal (backdrop `animate-fade-in` + panel `animate-modal-in`), `web-admin/globals.css` (reduced-motion ครอบ 3 anim)
- **เทส:** keyframe `modal-in` + `.animate-modal-in{animation:modal-in 240ms ...}` ใน CSS · **revert:** ลบ class + keyframe

---

## SPRINT 2 — Layout & Navigation

### B1 · Public `/properties` pagination (SSR ผ่าน URL)
- **ไฟล์:** `web-public/app/properties/page.tsx` (numbered prev · `x/y` · next, รักษา FILTER_KEYS, `PAGE_SIZE=24`)
- **ทำไม:** เดิมดึง 24 ใบเดียว ทรัพย์เกิน 24 หาย · API รองรับ page/limit/totalPages อยู่แล้ว (ไม่แตะ backend)
- **เทส:** ลด PAGE_SIZE=2 ชั่วคราว → nav/indicator/prev-next boundary ถูก, filter ขนต่อ `?type=condo&page=2` → **revert PAGE_SIZE=24**
- **revert:** คืนไฟล์เป็นเวอร์ชันดึง limit=24

### C2 · Header ลิงก์ "ค้นหาทรัพย์"
- **ไฟล์:** `web-public/components/Header.tsx` (Link → /properties, `hidden sm:inline`) · **เทส:** render บน home

### B3 · Home: เน้น "ทรัพย์แนะนำ" เหนือหมวดรอง
- **ไฟล์:** `components/FeaturedCarousel.tsx` (prop `size: 'lg'|'sm'` → heading text-2xl/text-xl), `app/page.tsx` (หมวด BTS/MRT/pet ส่ง `size="sm"`)
- **เทส:** home HTML — featured h2 text-2xl, หมวดรอง text-xl

> **C1 (back link หน้า detail) — มีอยู่แล้ว** ทั้ง 4 หน้า detail มี `← กลับ` (แก้ข้อมูล audit เดิมที่ระบุผิด)

---

## SPRINT 3 — Admin Power-User

### E2 · Keyboard shortcuts
- **ไฟล์:** `web-admin/components/GlobalSearch.tsx` (`⌘K`/`Ctrl+K` ทุกที่, `/` เมื่อไม่ได้พิมพ์ในช่องอื่น, `Esc` ปิด, ใบ้คีย์ `/`, `matchMedia` แยก desktop focus inline / touch overlay)
- **เทส (live, authed browser):** `/`+⌘K เปิด+โฟกัส, Esc ปิด, typing-guard (พิมพ์ "/" ในช่องไม่ถูก hijack), kbd hint render

### F2 · Command Palette
- **ไฟล์:** `web-admin/components/GlobalSearch.tsx` (`ALL_ACTIONS` 11 ทางลัด กรอง `can()`, รวมกับผลค้นหา entity เป็น sections, `↑↓` เลือก + `Enter` ไป, เปิด dropdown ตอน focus)
- **เทส (live):** เปิด=11 actions, ↑↓ ไฮไลต์, Enter→/settings+ปิด, พิมพ์ "ผู้ใช้"→เหลือผู้ใช้งาน, entity search เดิมคงอยู่
- **nit เล็ก:** `sel` ไม่รีเซ็ตตอนเปิดใหม่ (รีเซ็ตเมื่อเปลี่ยนคำค้น) — ไม่กระทบใช้งาน

> **E1/E3 — ไม่ทำ:** E1 (อัปรูปในขั้น wizard) ต้องมี propertyId ก่อน = แตะ flow · E3 (optimistic+undo) ต้องมี backend "กู้คืน" → ต้องคุยฝั่ง API

---

## A11Y · Contrast fix (faint → muted) — ตัวเลือก (ก)
- **ไฟล์:** `ui.tsx` (targeted: SectionLabel, PageHeader count, Field/Combobox hint, Combobox status, ListView table header) + **29 ไฟล์** (sed เฉพาะบรรทัดไม่มี `Icon`)
- **ทำไม:** `faint #A8A29E` = 2.40:1 (ตก WCAG AA). ข้อความที่สื่อความหมาย → `muted #78716C` = **4.57:1 ผ่าน AA** · คง `faint` เฉพาะไอคอน + placeholder
- **เทส:** 0 non-icon faint เหลือ, computed color rgb(120,113,108)=muted บน /settings จริง, typecheck ผ่าน, screenshot อ่านง่ายขึ้น
- **revert:** `sed 's/text-muted/text-faint/'` เฉพาะจุดที่เปลี่ยน (ดู git diff)

---

## PAGE REFINEMENT PASS (2026-06-25) — เปิดหน้าจริงในเบราว์เซอร์ดู → แก้จุดที่เป็น blemish จริง
> วิธี: login preview (admin+public) แล้วสำรวจ dashboard/list/detail (admin) + home/carousel/detail (public). UI ส่วนใหญ่ premium อยู่แล้ว — เจอ 2 จุดที่ควรปรับจริง:

### R1 · รูป placeholder ทรัพย์ไม่มีภาพ (admin list) ให้ดูตั้งใจขึ้น
- **ไฟล์:** `web-admin/(app)/properties/page.tsx` (`thumb`) — เดิม `bg-canvas text-faint` + ไอคอน building เสมอ (ดูโล่ง/ยังไม่เสร็จ)
- **แก้:** `bg-gradient-to-br from-canvas to-border/50 ring-1 ring-border/60` + **ไอคอนตามประเภท** (building/home ผ่าน `TYPE_ICON`)
- **เทส:** screenshot list — placeholder มีมิติขึ้น, ไอคอนตรงประเภท · typecheck ผ่าน

### R2 · Spec grid หน้า detail (public) มีช่องว่างค้าง — แก้ให้สมดุล
- **ไฟล์:** `web-public/components/T.tsx` (`SpecStrip`) — เดิม mobile `grid-cols-2`; ทรัพย์ที่มี 3 สเปก (นอน/น้ำ/พื้นที่) → ช่องที่ 4 ว่างเป็นบล็อกเทา (bg-border) = blemish บนหน้า conversion สำคัญสุด
- **แก้:** คอลัมน์ปรับตามจำนวน — `colsClass = len===1?cols-1 : len===3?cols-3 : cols-2` (desktop ยัง `sm:flex` แถวเดียว)
- **เทส (live):** DOM ยืนยัน `grid-cols-3`, 3 cells, `anyEmptyCell:false` + screenshot 3 คอลัมน์สมดุล · typecheck ผ่าน
- **revert:** คืน `grid-cols-2` คงที่

> ข้อสรุปจากการสำรวจ: admin (dashboard/list/detail) + public (home/hero/cards) **เป็น minimal/premium/ไม่รก อยู่แล้ว** — ไม่ฝืนแก้เพิ่มเพื่อกัน regression (กฎ "ต้องสมบูรณ์ขึ้นเท่านั้น")

## SPRINT 4 · F3 — DARK MODE (admin) 2026-06-25
> เฟส UI ใหญ่ที่เหลือ · ทำเป็น increment ปลอดภัย เทสทุกขั้น (light theme ยืนยัน byte-identical ก่อนเพิ่ม dark)

### โครงสร้าง
- **token → CSS variable:** `tailwind.preset.cjs` colors เปลี่ยนเป็น `rgb(var(--c-x) / <alpha-value>)` + `darkMode: 'class'`
- **ค่าจริง:** `:root` (light = ค่าเดิมเป๊ะ) + `.dark` (warm dark) อยู่ **top-level** ใน `web-admin/globals.css` (นอก `@layer` — กัน Tailwind purge `.dark` เพราะ class ไม่อยู่ใน content)
- **public:** เพิ่ม `:root` light เท่านั้น (ไม่มี `.dark` — public สว่างเสมอ) + แก้ `theme('colors.gold.DEFAULT')`→`rgb(var(--c-gold))` ใน range-dual (กัน `<alpha-value>` หลุดมาเป็น CSS ดิบ)

### แก้ ink dual-use (สำคัญ)
- `ink` ถูกใช้ทั้งสีตัวอักษร + สีพื้น inverse (`bg-ink text-white`). ในมืด ink พลิกเป็นสว่าง → ปุ่ม/avatar/nav active จะ "ขาวบนสว่าง" = พัง
- แก้: `bg-ink text-white` (solid) → `bg-ink text-canvas` (sed เฉพาะบรรทัดไม่มี `Icon`; overlay `bg-ink/XX text-white` คงไว้). Light: canvas≈white (มองไม่ออกว่าเปลี่ยน) · Dark: pill สว่าง+ตัวอักษรเข้ม = ถูกต้อง
- ปุ่ม +/avatar/brand/skip-link/active nav/segmented/chip/toast ครบ

### Toggle + no-flash
- `ThemeToggle.tsx` (🌙 โหมดมืด / ☀️ โหมดสว่าง) — เก็บ `localStorage 'ros-theme'` · วางใน ProfileMenu (desktop) + drawer มือถือ
- no-flash: inline script ใน `app/layout.tsx <head>` ใส่ class `.dark` ก่อนเพนต์ · **ค่าเริ่มต้น = สว่าง** (opt-in, ไม่เซอร์ไพรส์)
- ไอคอน `moon`/`sun` เพิ่มใน Icon.tsx

### เทส (live, authed browser)
- light byte-identical (body rgb 250,250,249 / 26,26,26) · dark (rgb 23,22,20 / 244,242,238)
- toggle → .dark + localStorage='dark' · reload → **no-flash** (dark ก่อนเพนต์) · default ไม่มี pref = light
- ดู dashboard + properties list ในมืด = พรีเมียม (gold pop, badge อ่านได้, active = light pill) · **public ไม่กระทบ** (ยังสว่าง ปกติ) · typecheck ผ่านทั้งคู่
- **revert:** คืน preset colors เป็น hex + ลบ :root/.dark/toggle/script

## BUGFIX/PARITY · R3 — Public search ขึ้นผลสด (ให้เท่า admin) 2026-06-25
- **อาการ (ผู้ใช้แจ้ง):** admin ช่องค้นหาขึ้นผลทันทีตอนพิมพ์ แต่ public พิมพ์แล้วไม่ขึ้นอะไร (ต้องกด "ค้นหา" ก่อน)
- **ไฟล์:** `web-public/components/SearchBar.tsx` — เพิ่ม **live suggestions dropdown**: พิมพ์ ≥2 ตัว → debounce 250ms → fetch `/public/properties?q=&limit=6` (client, LAN-aware host) → โชว์ทรัพย์ที่ตรง (ชื่อ/ประเภท·ทำเล/ราคาทอง) → คลิกไป `/properties/[code]` เลย
- **หลักการที่ยึด:** ปุ่ม "ค้นหา" ยังพาไปหน้า `/properties?...` (SSR/SEO/แชร์ลิงก์ได้) **เหมือนเดิม** — suggestions เป็นส่วนเสริม ไม่แทนที่; ปิดเมื่อคลิกนอก/เปิดตัวกรอง
- **เทส (live):** พิมพ์ "Ashton" → 1 ผล, "คอนโด" → 3 ผล (Noble/The Base/Ashton) · คลิก → ไป `/properties/CD-2026-0001` · typecheck ผ่าน · ดูพรีเมียม/มินิมอล
- **เสนอ (optional, ยังไม่ทำ):** keyboard ↑↓/Enter เลือกผล (เท่า admin) — public เน้น click/touch จึงไม่บังคับ
- **revert:** ลบ state/effect suggestions + คืน input เป็นเวอร์ชันเดิม

## ปฏิบัติการ (operational notes)
- **Login (dev):** `admin@ros.local` / `ChangeMe!2026` (seed default; form อีเมล/รหัสผ่าน — ไม่มี quick-role)
- **API ไม่ใช้ Redis ใน dev** (startup log ไม่มี Redis/Bull · Storage=local) → ต้องการแค่ Postgres@5432
- **รันสแตก:** API `npm run api:dev` · web-admin/public `npm run dev` (3001/3000)
- **ทดสอบ multi-file edit:** path มี `(app)` และ `[id]` → ใช้ `while IFS= read -r f` + quote `"$f"` (อย่าใช้ `for f in $files`)

## ไฟล์เอกสารที่อัปเดต
`UXUI-AUDIT/07-NAVIGATION-AUDIT.md` (แก้ C1), `07.5-RESPONSIVE-AUDIT.md` (สถานะ), `10-UXUI-IMPLEMENTATION-ROADMAP.md` (สถานะทุก Sprint), `README.md`

---

## G1 · แก้ "ช่องเทาๆ รอบ modal ไม่สวย" + "กล่องขยับซ้าย-ขวาบนมือถือ/iPad" (2026-06-25)
ผู้ใช้รายงาน: backdrop เทาของ modal (ตัวกรอง/เพิ่ม) ดูไม่เนียน + บนมือถือ/iPad กล่องเลื่อนขยับซ้าย-ขวาได้
- **Root cause (วินิจฉัยด้วย preview MCP):** wrapper `.animate-fade-rise` (ครอบ `{children}` ใน layout) มี `animation: ... both` → fill-mode `forwards` ทำให้ค่า `transform` ของ keyframe `to` (`none`) **ค้างเป็น identity matrix** `matrix(1,0,0,1,0,0)` หลังอนิเมชันจบ. transform ที่ค้าง (แม้ identity) สร้าง **containing block** ให้ `position:fixed` → overlay ของ Modal ไปยึดกับ wrapper แทน viewport: backdrop ไม่เต็มจอ (วัดได้ l:16,t:88,w:343 บน 375) + กล่องถูกขัง/แพนตามได้
- **ไฟล์ + ทำอะไร:**
  - `apps/web-admin/src/components/ui.tsx` `Modal`:
    1) **Portal → `document.body`** (`createPortal` + mount guard กัน SSR) = หนีทุก ancestor transform ถาวร (deterministic — ไม่พึ่งว่า animation จบหรือยัง)
    2) **body scroll-lock** ตอนเปิด (`overflow:hidden` + ชดเชย scrollbar) = กันพื้นหลังเลื่อน/แพน
    3) backdrop `bg-ink/40` → **`bg-ink/55` + `dark:bg-black/55`** + `overscroll-contain` = scrim เทาเนียนสม่ำเสมอ ทั้ง light/dark (เดิม dark mode `ink` พลิกสว่าง → scrim สว่างผิด = latent bug แก้ด้วย)
  - `apps/web-admin/src/app/globals.css` + `apps/web-public/src/app/globals.css`: `.animate-fade-rise` fill `both` → **`backwards`** = กันจอกระพริบตอนเข้าเหมือนเดิม แต่ไม่ค้าง transform (แก้ต้นเหตุ containing block ให้ overlay อื่นด้วย เช่น public `Lightbox`/`SearchBar`)
- **ทำไม Portal + keyframe ทั้งคู่:** keyframe `backwards` แก้ต้นเหตุ (ใช้ได้กับ fixed/sticky ทุกตัว) แต่ไม่ deterministic 100% (ถ้าเปิด modal ระหว่าง 0.28s ที่ animation กำลังเล่น/tab ถูก throttle จะยัง trap) → Portal เป็นหลักประกันเด็ดขาดสำหรับ Modal
- **เทส (preview MCP, จริง):** admin filter modal + form modal "เพิ่มเจ้าของ" → `parentElement===document.body`, overlay เต็ม viewport ทั้ง **มือถือ 375 + เดสก์ท็อป 1280**, ทั้ง **light (scrim rgba(26,26,26,.55)) + dark (rgba(0,0,0,.55))**, พื้นหลังแพนไม่ได้ (`bgPanLocked:true`), ปิดด้วย backdrop-click/Esc/ปุ่ม X ได้ + body ปลดล็อก. public: หลัง fix `.animate-fade-rise` computed transform = `none`, แทรก `fixed inset-0` ใน wrapper ครอบ viewport เต็ม (375×812). ทั้งสองแอป `tsc --noEmit` ผ่าน
- **revert:** ui.tsx เอา portal/scroll-lock ออก กลับ `return (<div bg-ink/40 ...>)`; globals กลับ `both`
- **ภาพเหมือนเดิม?** light mode scrim เข้มขึ้นเล็กน้อย (40%→55%) ตามที่ผู้ใช้ขอ (option B เทาเนียน); keyframe `backwards` ภาพเหมือนเดิมเป๊ะ (to-state == base-state)
- **ค้าง/optional:** public `Lightbox`/`SearchBar` แก้ที่ root (keyframe) พอสำหรับเคสจริง (เปิดหลังโหลด); ถ้าอยากเด็ดขาดเท่า admin ค่อย portal สองตัวนั้นเพิ่ม

### G1.1 · Portal public Lightbox (2026-06-26)
ยืนยันแล้วว่า keyframe `backwards` **ไม่ deterministic จริง** บน public: เปิด Lightbox แล้ว wrapper `.animate-fade-rise` ยังค้าง `matrix(1,0,0,1,0,4)` (จาก headless preview ที่ animation ไม่ progress) → Lightbox โดน trap (t:69, h:2271 ไม่เต็มจอ). แก้ด้วยวิธีเดียวกับ admin:
- **ไฟล์:** `apps/web-public/src/components/Lightbox.tsx` → `createPortal(...,document.body)` + mount guard (มี scroll-lock อยู่แล้ว)
- **เทส (preview MCP, มือถือ 375):** เปิด Lightbox → `parentElement===document.body`, เต็ม viewport (l:0,t:0,375×812), `parentTransformCulprit:null`, รูป mock เรนเดอร์, ลูกศร+counter "x/10" ครบ · typecheck public ผ่าน
- **revert:** เอา createPortal/mount-guard ออก
- **ยังค้าง optional:** `SearchBar.tsx` (`fixed inset-0` overlay มือถือ) ยังไม่ portal — pattern เดียวกัน ถ้าต้องการค่อยทำ

## G2 · Mock-bulk seed (ข้อมูลทดสอบชุดใหญ่) 2026-06-26
ผู้ใช้ขอข้อมูลจำลองเยอะ ๆ เพื่อเทส pagination (ปุ่มซ้าย-ขวา ≤8/หน้า) ทุกลิสต์ + แกลเลอรีรูป (10 รูป/ทรัพย์)
- **ไฟล์ใหม่:** `db/seed/mock-bulk.ts` (ไม่แตะ schema/seed เดิม — เพิ่ม "ข้อมูล" อย่างเดียว · idempotent · มี `--clean`)
- **ใส่:** ทรัพย์ 16 (ครบทุก field + amenities + floor + lat/lng) × รูป 10 ใบ (รวม 160) · เจ้าของ 16 · ลูกค้า 16 · ลีด 16 (+interests) · นัด 16 (กระจายในปฏิทิน) · สัญญา 8 — code ช่วง `-1xxx` กันชนของเดิม
- **รูป = SVG** สร้างเองใน `apps/api/uploads/properties/mock-<code>-<n>.svg` (สีต่างกันทุกใบ + ป้าย `n/10`·code·ชื่อห้อง → เห็นการเลื่อนชัด) · เสิร์ฟ `/uploads/properties/` (`<img>` ธรรมดา + nosniff → content-type `image/svg+xml` ใช้ได้)
- **idCardNo:** plaintext 13 หลัก (CryptoService.decrypt รองรับ legacy plaintext = ไม่ error)
- **เทส (preview MCP):** admin `/properties` = "22 รายการ" 8 แถว/หน้า ปุ่มถัดไป→หน้า2 ทรัพย์ชุดใหม่ ✅ · detail แกลเลอรี 10 รูปโหลดครบ counter 1/10→2/10 ✅ · `/customers`(16) `/leads`(17) `/appointments`(16) ทุกหน้า 8 แถว+ปุ่มถัดไป ✅ · `/calendar` มีนัดกระจาย ✅ · public Lightbox เต็มจอ+รูป mock ✅
- **รัน:** `cd db && DATABASE_URL="postgresql://iiamtikm@localhost:5432/ros?schema=public&host=/tmp" npx tsx seed/mock-bulk.ts` · **ลบ:** เติม `--clean`
- **ลบของเก่า (ผู้ใช้ขอเหลือแต่ 16 ชุดใหม่):** soft-delete demo เดิมที่ไม่มีรูป (6 ทรัพย์ CD/AP/TH/HS-2026-0xxx + 3 เจ้าของ email null + ลีด LD-2026-0001) ผ่าน psql `UPDATE ... deleted_at=now()` — `--clean` ของสคริปต์ไม่ลบให้ (ตั้งใจแตะเฉพาะของที่สร้างเอง). ผลสุดท้าย: props 16(ว่าง 12)·owners 16·customers 16·leads 16·appts 16·contracts 8 ทั้งหมดมีรูป+ครบ. ยืนยัน UI: `/properties` = "16 รายการ", หน้า 1 รหัส -1xxx ล้วน ไม่มี -0xxx

## H · มือถือ Fix (จาก PDF "มือถือครับ" 10 ภาพ + แผนผู้ใช้) 2026-06-26
แผนรวม: A→B→C→D→E (E1 deep-link อนุมัติ, E2 real-time ข้าม). กฎ: UI-only เว้นที่ขออนุญาตแล้ว. เทสจริงทุก breakpoint + tsc.
### Phase A — Public quick wins (เสร็จ+เทส มือถือ/เดสก์ท็อป)
- **A1 ซ่อนชุมชน ROS:** `web-public/app/page.tsx` → `const SHOW_COMMUNITY=false` + `{SHOW_COMMUNITY && <CommunityBoard/>}` (ไม่ลบ backend/คอมโพเนนต์ — ผู้ใช้ขอซ่อนชั่วคราว). เทส: หาย, หน้าแรกไม่พัง (18 ทรัพย์/4 หมวด), ไม่ล้น
- **A2 ชื่อ = ชื่อโครงการ:** `web-public/app/properties/[code]/page.tsx` H1 เดิม=`title.th` (ยาว/ล้นจอ) → ถ้ามี `projectName` ใช้เป็น H1 (สั้น ตรงกับการ์ด `projectName||title`) + คำบรรยายยาวลงเป็นบรรทัดรอง `text-sm text-muted`; ตัด projectName ซ้ำออกจาก section ทำเล. เทส: "Pattaya Beach Residence" 1 บรรทัด ไม่ล้น (มือถือ375+เดสก์ท็อป1024)
### Phase B — ดีเทล public มือถือ (เสร็จ+เทส)
- **B1 spec strip:** `web-public/components/T.tsx SpecStrip` เดิมมือถือ 2×2 (สายตาแตก 4 มุม) → **flex แถวเดียวทุกขนาด** (กวาดซ้าย→ขวาครั้งเดียว, flex-1 เท่ากัน, `whitespace-nowrap` label, px-2 มือถือ). เทส: 4 ช่อง×85px พอดี 375 ไม่ตัดคำแม้ EN, เดสก์ท็อปคงเดิม
- **B2 amenity chips:** `AmenityBadges` เดิม `badge bg-canvas` (กลืนพื้นขาว=คำลอยๆ) → `badge border border-border bg-surface` (pill มีขอบ อ่านเป็นกลุ่ม). เทส: chip มีขอบ 1px ชัด
### เหลือ: C (typography admin+public #9,#5) · D (ฟอร์ม/dropdown/+wizard/time #6,#8) · E1 (notif deep-link #7) · E4 (search เป็นหน้า #10)
### Phase C — Typography/หัวข้อ (เสร็จ+เทส)
- **C1 หัวดีเทลทรัพย์ (admin) #p9:** `web-admin/(app)/properties/[id]/page.tsx` เดิม H1=`titleTh` ยาว + ราคา/facts `flex items-baseline flex-wrap` (wrap เป็น "คลื่น") → ลำดับชั้นตั้งเดียว: meta(code·status·views, flex-wrap) → **H1=`projectName||titleTh`** → คำบรรยาย `text-sm text-muted` → ราคา (บรรทัดเดี่ยว) → facts (บรรทัดเดี่ยว). เทส: "Kaset Residence" 1 บรรทัด, ไม่ล้น, ไม่มี wave (มือถือ375)
- **C2 สแกนทั้งระบบ:** เช็ค owner/customer/contract detail — **ใช้ pattern คลีนอยู่แล้ว** (hero avatar+`truncate` h1 / SectionLabel / คอลัมน์เดียว). ยืนยัน owner detail สด (มือถือ) = เนียน, idCard masked `••••0111`. property detail = ตัวเดียวที่กระจัดกระจาย (แก้ C1). normalize เดียว: contract h1 `text-2xl`→`text-xl sm:text-2xl` ให้ responsive เท่าหน้าอื่น
- **สแกนเจอ (ไม่ใช่บั๊ก):** AP-2026-1001 counter "1/11" — มีรูปอัปโหลดจริง 1 ใบ (uuid.jpeg) + ตั้งใบ 4 เป็นปก จากการเทสอัปโหลดของผู้ใช้ = ทำงานถูก
### Phase D — ฟอร์มแอดมิน (เสร็จ+เทส D1·D2 · D3 ต่อ)
- **D2 ไล่เทส dropdown ทั้งระบบ + แก้ silent-catch (ต้นตอ "ตอนแรกใช้ได้ ตอนหลังไม่ได้"):**
  - **ต้นเหตุ:** `useLookup`/`useSearchLookup` ([lib/lookups.ts](apps/web-admin/src/lib/lookups.ts)) + QuickAddProperty + PropertyForm มี `catch { ignore }` เงียบ → โหลด /owners,/leads,/properties ล้ม (session หมด) = dropdown ว่างเงียบ = ดูเหมือน "กดไม่ได้"
  - **แก้:** hook ทั้งคู่เพิ่ม `error`+`reload` (backward-compat) · `Combobox` เพิ่ม prop `loadError`+`onRetry` → โชว์แถว "โหลดไม่สำเร็จ · ลองใหม่" แทน "ไม่พบรายการ" · wire ฟอร์มนัด(Lead/ทรัพย์/agent) + สัญญา(ทรัพย์/เจ้าของ/ลูกค้า/agent) ผ่าน Sel · QuickAddProperty + PropertyForm เพิ่ม banner+ปุ่มลองใหม่
  - **เทส (live, 3 เส้นทาง):** happy = owner/lead/property 16 ตัวเลือก · error (patch fetch ล้ม /owners) → banner "โหลดไม่สำเร็จ/ลองใหม่" โผล่ · retry (unpatch+กดลองใหม่) → banner หาย + 16 ตัวกลับมา. tsc ผ่าน
- **D1 ปุ่ม + (มือถือ) → wizard มีสเต็ป:** `(app)/layout.tsx` เดิมเปิด `QuickAddProperty` (จอเดียว ไม่มีสเต็ป) → เปลี่ยนเป็น `<Modal size=xl><PropertyForm mode=create onSaved={id=>push(/properties/id)}/></Modal>` (ตัวเดียวกับเดสก์ท็อป/หน้าทรัพย์). เทส: + เปิด "เพิ่มทรัพย์ใหม่" stepper 1·2·3·4 + owner combo + "ขั้นที่ 1/4". **`QuickAddProperty.tsx` ตอนนี้ไม่ถูกใช้แล้ว** (เก็บไฟล์ไว้ — ลบ/รีไซเคิลภายหลังได้)
  - **gotcha:** หลังแก้ import คอมโพเนนต์ใน layout → HMR ค้าง (`ReferenceError: QuickAddProperty is not defined` ทั้งที่ tsc ผ่าน) → **hard reload** หาย (ไม่ใช่บั๊กโค้ด)
- **D3 (ตัวกรองช่วงวันนัด → เลือกวันได้) — ต่อ**
- **D3 ตัวกรองช่วงวันนัด → date picker (p8):** `ui.tsx FilterBar`/`FilterDef` เพิ่ม `type?: 'date'` → render `<input type=date class=field>` แทน Combobox (ใช้ซ้ำได้ทั้งระบบ); `defOf` รองรับ options optional. `appointments/page.tsx` เปลี่ยน filter `date` เดิม 4 preset (ทุกวัน/วันนี้/พรุ่งนี้/มะรืน) → `type:'date'` label "วันนัด" (เลือกวันเจาะจงได้); ลบ DATE_PRESETS/dISO ที่ไม่ใช้แล้ว. เทส: filter มี date picker, เลือก 2026-06-26 → list กรองเหลือ 1 นัด (26 มิ.ย.) ✅. tsc ผ่าน (แก้ `f.options[0]`→`f.options?.[0]`)
### Phase D สรุป: D1·D2·D3 เสร็จ+เทสครบ. เหลือ E1 (notif deep-link, อนุมัติ) + E4 (search หน้าแยก)
### Phase E1 — แจ้งเตือน deep-link (p7) เสร็จ+เทส · **frontend-only (ไม่แตะ backend)**
- **พบ:** Notification model + API มี `entityType`+`entityId` ครบอยู่แล้ว (DB: ทุก noti มี eid) แต่ `NotificationBell.openEvent` push ไป `/appointments` (หน้ารวม) เฉยๆ โยน entityId ทิ้ง = ต้นเหตุ p7 "กดแล้วไม่รู้คือนัดไหน"
- **แก้ (ไฟล์):**
  - `NotificationBell.tsx`: `entityHref(type,id)` → property/owner/customer/contract = `/{route}/{id}` (มีหน้า detail) · appointment/lead = `/{route}?focus={id}` (row→Modal); openEvent + งานตามเวลา(appt) ใช้ลิงก์นี้
  - `appointments/page.tsx` + `leads/page.tsx`: อ่าน `?focus={id}` (useSearchParams) → fetch `/{entity}/{id}` → เปิด modal นั้นทันที (focusedRef กันเปิดซ้ำ; toast ถ้าไม่พบ)
- **เทส (live):** direct `/appointments?focus={id}` → modal "นัด APT-2026-1001" รายละเอียดครบ · **end-to-end:** คลิก "เอกชัย ก้องเกียรติ" ในระฆัง → URL `?focus=...` → modal "นัด APT-2026-1004" โชว์ชื่อเอกชัย (แก้ p7 เป๊ะ ไม่ต้องเดา) · `/leads?focus={id}` → modal "Lead LD-2026-1004". tsc ผ่าน
- **เหลือ:** E4 (search ไอคอนแว่น → หน้า /search แยก + ช่องค้นหากลางบน, p10)
### Phase E4 — ค้นหาแยกเป็นหน้า /search (p10) เสร็จ+เทส
- **อาการ:** ไอคอนแว่น (bottom nav) เปิด overlay (`fixed inset-0 z-50` ใน stacking ของ header z-30) → bottom nav z-40 ลอยทับ → ไอคอนทรัพย์+แว่น active พร้อมกัน (สับสน) + ช่องค้นหาชิดบนสุด
- **แก้ (ไฟล์):**
  - **NEW** `(app)/search/page.tsx`: หน้าค้นหาจริง (h1 "ค้นหา" + คำอธิบาย + `<GlobalSearch variant="page">`, `pt-8 sm:pt-14` → ช่องอยู่กลางค่อนบน)
  - `GlobalSearch.tsx`: เพิ่ม prop `variant?:'page'` → เรนเดอร์ input+ผลลัพธ์ inline (ไม่ overlay); keyboard effect ข้ามใน page mode; touch branch ของคีย์ลัด `setMobileOpen(true)`→`router.push('/search')`
  - `(app)/layout.tsx`: bottom-nav slot แว่น `action:'search'`→`href:'/search'` (เป็นลิงก์จริง active แยกเหมือนไอคอนอื่น)
  - **completeness:** ผลค้นหา เจ้าของ/Lead เดิม push หน้ารวม → deep-link `/owners/{id}` · `/leads?focus={id}` (เหมือน E1)
- **เทส (live, มือถือ):** กดแว่น→`/search` (เฉพาะแว่น active, ทรัพย์ไม่ active แล้ว) · ช่องค้นหาที่ 27% จากบน · quick actions 11 · พิมพ์ "ภาณุ"→ผล Lead/ลูกค้า/เจ้าของ · คลิกเจ้าของ→`/owners/{id}` (h1 "ภาณุ รุ่งโรจน์"). tsc ผ่าน
### ✅ ชุดมือถือครบ: A·B·C·D(1·2·3)·E1·E4 เสร็จ+เทสจริงทุกตัว — รอ PDF ไอแพดต่อ

## I · UI/UX Fix รอบ 2 (จากผู้ใช้ + เอกสาร Flow Audit) 2026-06-26
### #1 ปฏิทิน → กดนัดเปิด detail (เสร็จ+เทส)
- **ไฟล์:** `(app)/calendar/page.tsx` — agenda card เดิมเป็น `<li>` แสดงผลเฉย ๆ (ไม่มี onClick) → ครอบด้วย `<button onClick={router.push('/appointments?focus={a.id}')}>` (deep-link เดียวกับ E1) + `active:scale-[0.99]`
- **ตรวจ Event types:** ปฏิทินมี event ชนิดเดียว = appointment (ไม่มี Lead/Customer/Contract event แยกในระบบนี้) → ทุก event ไป appointment detail ถูกต้อง · ลบแล้ว: focus effect fetch `/appointments/{id}` ไม่เจอ → toast "ไม่พบนัดหมายนี้" (ไม่ค้าง) · แก้ไขแล้ว: calendar fetch สดทุกครั้ง = sync
- **เทส (live, มือถือ):** กดการ์ด "นัดชม เดอะ เบส" → `/appointments?focus=...` → modal "นัด APT-2026-1004". tsc ผ่าน
### #4 ลูกศรเลื่อน snappy + #5 รูปเล็กลง (เสร็จ+เทสทุก orientation)
- **#4 (ลูกศร "หน่วง"):** ต้นเหตุ = crossfade `duration-300` + ลูกศรไม่มี press feedback. แก้:
  - `web-public/PropertyGallery.tsx` + `web-admin/(app)/properties/[id]/page.tsx`: arrows → `h-11 w-11` (44px hit area), `backdrop-blur-sm`, `transition duration-150`, **`active:scale-90 active:bg-ink/80`** (กดยุบทันที = ไว) · crossfade `duration-300`→`duration-200`
  - `ui.tsx Pagination`: ปุ่มก่อนหน้า/ถัดไป เพิ่ม `duration-150 enabled:active:scale-90`
- **#5 (รูปใหญ่ไป เลื่อนเยอะ):** เปลี่ยน cap จาก fixed px (`sm:380 lg:440`) → **vh-based `max-h-[40vh] sm:max-h-[34vh]`** (ปรับตามแนวตั้ง/นอนอัตโนมัติ แก้ปัญหาแนวนอนเดิมที่ = 49% ของจอเตี้ย) ทั้ง 2 gallery
- **เทส (live, ทุก orientation):** มือถือ 375 = **193px (24%)** · iPad แนวตั้ง 768 = 348px (34%) · iPad แนวนอน 1024×768 = 261px (34%) — สม่ำเสมอ, ราคา+spec เห็นได้โดยไม่เลื่อนมาก · ลูกศร 44px, transition 0.15s ทั้ง public+admin. tsc ผ่านทั้งคู่
### #2 (ส่วน flow) — FLOW AUDIT (เสร็จ — เอกสาร)
- **NEW `UXUI-AUDIT/FLOW-AUDIT.md`** (อิงโค้ดจริง): map ทุกปุ่ม Lead/Customer/Contract/Appointment/Calendar/Property → route/API/table/permission + diagram
- **ตอบ "flow ซ้ำ Lead/ลูกค้า":** โครงสร้างไม่ซ้ำ — `customer.create` มีที่เดียว = `POST /leads/:id/convert` (customer.controller ไม่มี @Post, หน้า customers ไม่มีปุ่มเพิ่ม). ที่ "รู้สึกซ้ำ" = คน convert แล้วอยู่ทั้งลิสต์ Lead(closed)+Customer (ประวัติ ตั้งใจ). ความเสี่ยงจริง: convert ไม่มี dedup เบอร์ → เสนอ (ก) เตือนเบอร์ซ้ำตอน convert [แตะ backend] (ข) badge "→เป็นลูกค้าแล้ว" ในลิสต์ Lead [UI]
- **ค้าง (ส่วน UI ของ #2):** จัดปุ่มหน้าสัญญาให้เรียบ (ยังไม่ทำ)
### #7 ลูกศรเปลี่ยนหน้า "ขยับ/ต้องเลื่อนหาใหม่" → ล็อกตำแหน่ง (เสร็จ+เทส 2 เว็บ)
- **อาการ:** กดถัดไป → list หด/เด้งบนสุด → ลูกศรเลื่อนตำแหน่ง ต้องเลื่อนหาใหม่
- **admin (ทุกลิสต์ — ผ่าน `ui.tsx ListView`):** ต้นเหตุ = `useList` เปลี่ยนหน้า→`loading=true`→ListView โชว์ `ListSkeleton` (5 แถวสั้น) ทั้งที่ rows เดิมยังอยู่ → หด→ยืด = กระโดด. แก้ **stale-while-revalidate**: skeleton เฉพาะโหลดแรก (items ว่าง, rows=PAGE_SIZE) · เปลี่ยนหน้าคงแถวเดิมไว้ (`opacity-50 pointer-events-none` จางๆ) จนข้อมูลใหม่มา → ความสูงคงที่
- **public (`/properties`):** ต้นเหตุ = `<Link>` ทำ Next scroll-to-top. แก้ `scroll={false}` ทั้ง prev/next + ลูกศร active:scale-90
- **เทส (มือถือ):** admin หน้า1→2 ลูกศร Y=**684 เป๊ะ** ทั้ง immediate+settled (เดิมกระโดด) · public หน้า1→2 scrollY=**2393 คงที่** (ไม่เด้งบน) · ลด PAGE_SIZE public=6 เทสแล้ว **revert=24** · tsc ผ่านทั้งคู่. ใช้ ListView = ครบทุกลิสต์ admin
### Docs — เพิ่มเอกสารระบบจากโค้ดจริง (2026-06-26)
- **ใหม่:** `FLOW-AUDIT.md` (ปุ่ม→route→table ทุกโมดูล + flow ซ้ำ) · `ROUTE-MAPPING.md` (ทุก route→API/table/permission) · `COMPONENT-LIBRARY.md` (ui.tsx + เฉพาะทาง) · `QA-CHECKLIST.md` (CRUD/cross-cutting Pass-Review + tech debt)
- **อัปเดต:** `README.md` (สถานะ "ลงมือแก้แล้ว" + ดัชนี 4 doc ใหม่ + ชี้ audit เดิมที่ root) · `11-SESSION-RECOVERY-PROMPT.md` (สถานะล่าสุด+infra)
- **ของ 22 docs ที่ผู้ใช้ขอ:** ส่วนใหญ่มีอยู่แล้วชื่ออื่นที่ root (ARCHITECTURE/DATABASE/RELATIONSHIP/SECURITY/BUG-HUNT/PRODUCTION-READINESS/SYSTEM-KNOWLEDGE) → ใช้เป็นฐาน ไม่สร้างซ้ำ; ที่ขาดจริง (COMPONENT_LIBRARY/QA) = สร้างแล้ว

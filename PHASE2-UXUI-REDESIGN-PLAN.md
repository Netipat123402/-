# 🎨 PHASE 2 — UX/UI REDESIGN PLAN + HANDOVER (ROS)

> **ขั้นตอนต่อจาก** `DESIGN-REFERENCE-ANALYSIS.md` (reverse-engineering 16 ภาพ เสร็จแล้ว)
> **นี่คือแผน — ยังไม่ลงมือแก้ UI** · session หน้าอ่านไฟล์นี้ไฟล์เดียวแล้วทำต่อได้ทันที
> **Reference หลัก:** Desktop = **d-02 "Reome"** (landing) · Mobile = **m-01 "Hommie"** (RE app)
> **กฎเหล็ก:** ไม่ลอก(เรียนหลักการ) · คง gold+warm+minimal ของ ROS · **ห้ามระบบพัง** · ทำทีละเฟส เทสทุกเฟส

---

## 0) 🔧 ESSENTIALS สำหรับ resume (อ่านก่อน)

### สภาพโปรเจกต์ตอนนี้
- **โฟลเดอร์จริง = `~/Desktop/ไม่มีชื่อโฟลเดอร์ สำเนา 2`** (ต้นฉบับถูกลบ · กู้+ทำต่อในสำเนานี้ · ดู `RECOVERY-NOTES.md`)
- **dev server เจ้าของเปิดเอง:** web-admin :3001 · web-public :3000 · api :4000 (cwd = สำเนา 2 · login `admin@ros.local`/`ChangeMe!2026`)
- **เทส:** `npx tsc --noEmit` ในแอปที่แก้ + Tailwind compile + **Chrome control ดูจริง** (เจ้าของเปิดไว้) · ห้าม `next build` ทับพอร์ต dev
- **git:** branch `recover/redesign-v2` · **main มี 8 commit (merged PR#1)** · local มี ~5 commit รอ push (contract-nav · home-cards · hero · listings-hover · CI) · push ต้อง token เจ้าของ
- **backup:** iCloud Drive + `ros-backup-*.bundle` (Desktop) — งานปลอดภัย 3 ชั้น

### สถานะ UI ปัจจุบัน (ทำมาแล้วใน session ก่อน)
- **web-admin (ดาร์ก "Claude app"):** token-based · Style B document layout (InfoGroup/InfoRow หัว-เนื้อ-ท้าย) · SectionNav (property/contract) · footer สรุป · a11y AA · theme-leak 0
- **web-public (light premium):** hero (gold spotlight + กริด) · category cards (icon circle) · listings (gold hover) · property detail (2-col + sticky AppointmentForm) · SpecStrip · a11y gold #8C6E42
- **components กลาง (reuse ก่อนสร้างใหม่):** `apps/web-admin/src/components/ui.tsx` (InfoRow/InfoGroup/DetailHeader/ActionBar/MoreMenu/Modal/ConfirmDialog/Field/Combobox/Segmented/FilterBar/ListView/Pagination/SectionNav/SectionLabel/Avatar/StatusBadge/Badge/EmptyState/ErrorState/ListSkeleton) · `web-public`: PropertyCard/SearchBar/FeaturedCarousel/AppointmentForm/T(SpecStrip/AmenityBadges/PriceMonthly)/Icon

### กฎ ROS ที่ต้องยึด (ห้ามหลุด)
1 บรรทัด = 1 ข้อมูล (R1) · minimal (ตัดของไม่จำเป็น) · gold accent เดียว + warm neutral · **Icon component เท่านั้น (ห้ามอิโมจิ)** · responsive แยกตามอุปกรณ์ (ไม่ scale) · touch ≥44px · reuse component ก่อนสร้างใหม่ · เทส-แก้-เทส · **R2: backend/logic/RBAC ห้ามแตะ (ธีม/สีเปลี่ยนได้)**

---

# PHASE 01 — สรุป Reverse Engineering ของ 2 reference ที่เลือก

## 🖥️ Desktop 02 "Reome" — จุดเด่น
1. **Hero full-bleed photo** + headline ขาวกลาง + **search bar ทับรอยต่อ hero** (overlap) = จุดโฟกัสทันที
2. **Category/feature strip เป็นการ์ดลอย** ใต้ search (icon+label 4-5 อัน) = ทางลัดเข้าหมวด
3. **Section header กลาง** ("Browse the ...") + **3-col property cards** (รูป + title + ★rating + price)
4. โครงเรียบ อ่านง่าย — landing เพื่อ "เริ่มค้นหา" เป็นหลัก

## 📱 Mobile 01 "Hommie" — จุดเด่น
1. **Home:** greeting/title ("Find Your Best Real Estate") + **search เด่น** + **segmented tabs** (Home/Villa/Apartment) + "Popular" listing cards (รูป + price bold + ★ + heart) + **bottom nav 5 ไอคอน**
2. **Detail:** รูป gallery + card เนื้อหา (ราคา + specs "6×7.5m²/3 Beds/2 Baths" + owner + CTA "Rent Now")
3. **flow ครบ + สม่ำเสมอ:** splash→onboard→home→detail→payment→success · card-based · bottom nav ทุกหน้า · heart (favorite) บน card
4. **สะอาด · ปุ่ม pill · price สีแบรนด์ bold · icon specs**

## จุดที่เหมาะ/ไม่เหมาะกับ ROS (+เหตุผล)
| | เหมาะ (นำมา) | ไม่เหมาะ/ตัด (เหตุผล) |
|---|---|---|
| **Desktop 02** | hero+search overlap · category strip · section+3-col card+rating | photo-hero (ROS ใช้ CSS spotlight ดีอยู่แล้ว + ไม่มี asset) → **ปรับเป็นเสริม photo ทีหลังถ้ามีรูป** · text/ข้อมูลใน ref เบลอ (AI) → ใช้แค่โครง |
| **Mobile 01** | home(search+tabs+popular+card) · bottom nav · detail(specs icon+price+CTA) · heart favorite · flow สม่ำเสมอ | login/chat/payment/OTP (ROS public = browse+ติดต่อ ไม่มี account/จ่ายเงิน) → **ตัด** · palette ฟ้า → **แปลงเป็น gold** ของ ROS |

**จุดควรปรับ:** ROS public ตอนนี้เป็น "เว็บ" มากกว่า "แอป" บนมือถือ → ยกให้เป็น **app-like** (bottom nav? / search เด่น / card + heart) ตาม Hommie
**จุดควรออกแบบใหม่:** public listings (เพิ่ม category tabs + filter ชัด) · property card (specs-icon + heart + rating) · mobile bottom-nav สำหรับ public
**จุดควรตัด:** อย่าเพิ่ม login/chat/payment (นอก scope · R2 ห้ามแตะ backend)

---

# PHASE 02 — Current vs Recommended (ตาราง)

| พื้นที่ | Current (ROS) | Recommended (จาก ref+กฎ) | Reason (UX law/กฎ) | Expected Result |
|---|---|---|---|---|
| **public Home hero** | CSS spotlight+grid + search bar เรียบ | คง spotlight (พรีเมียม) + **ยก search เป็น panel มี label/segment** + category strip เด่น | Jakob's Law (คุ้นแบบ landing RE) · Information Scent | เริ่มค้นหาเร็ว · เข้าหมวดง่าย |
| **public category** | 4 การ์ด icon-circle | คงการ์ด + ทำเป็น **entry สู่ listings ที่ filter ไว้** + (mobile) tabs แบบ Hommie | Hick's Law (ลดตัวเลือก) · Fitts (target ใหญ่) | คลิกน้อยลงถึงผลลัพธ์ |
| **public listings** | grid card + FilterBar(modal) | **desktop: filter sidebar** (Rento) + **category tabs** (Hommie) + results-count | Progressive Disclosure · ลดกวาดสายตา | กรอง/สแกนเร็ว เห็น filter ตลอด |
| **PropertyCard** | รูป4:3 + title + meta + price gold + badge + hover-gold | +**specs icon-row** (bed/bath/area) + **heart(favorite)** + (rating ถ้ามี) + type-badge | Miller's Law (จัดกลุ่ม) · scan ด้วย icon | ตัดสินใจเร็วขึ้นต่อ card |
| **public detail gallery** | carousel เดียว | **desktop: "1 big + 2×2 thumbnail"** (allstate) + ดูรูปทั้งหมด | ลด click · เห็นภาพรวมเร็ว | เห็นรูปมากขึ้นในคลิกเดียว |
| **public detail specs** | SpecStrip (ไม่มี icon) | **specs-bar icon + label + เส้นคั่น** | icon = scan เร็ว (Gestalt) | อ่าน spec ไว |
| **public detail sidebar** | AppointmentForm sticky | +**trust/urgency** (ตอบใน 24ชม./ยืนยันฟรี) + สรุปชัด | trust → conversion | ติดต่อมากขึ้น |
| **public mobile** | เว็บ responsive | **app-like: search เด่น + (พิจารณา)bottom-nav + card+heart** | Jakob (คุ้น RE app) · thumb-reach | ใช้บนมือถือลื่น |
| **admin (dark CRM)** | Style B + SectionNav ครบ | **คงหลัก** · เสริม specs-icon · ตรวจ consistency | dense CRM ต่างจาก consumer app | ไม่รื้อ · ขัดเงา |
| **typography (public)** | sans (Plex) | **ทดลอง serif heading** (editorial luxury) | von Restorff (heading เด่น) · แบรนด์ | รู้สึกพรีเมียมขึ้น |
| **button (public)** | rounded-lg | **ทดลอง pill (rounded-full)** primary | hospitality-feel | อ่อนโยน พรีเมียม |

---

# PHASE 03 — Design Direction (ใหม่)

**ทิศ: "Warm Editorial Luxury · Minimal · Low-Cognitive-Load"**
- **Luxury/Premium:** gold accent เดียว + warm neutral + whitespace เยอะ + (ทดลอง) serif heading → รู้สึก "แพง/น่าเชื่อถือ" (สำคัญกับอสังหาฯ = ตัดสินใจเงินก้อนใหญ่)
- **Minimal/Clean:** 1 บรรทัด 1 ข้อมูล · ตัดของไม่จำเป็น · flat+border → อ่านง่าย ไม่ล้า
- **Fast reading / Low cognitive load:** icon ช่วย scan · price bold anchor · group ข้อมูล · progressive disclosure (Show More)
- **แยกบุคลิก 2 แอป:** **admin = dark, dense, efficient** (มืออาชีพทำงานเร็ว) · **public = light, editorial, inviting** (ลูกค้าเลือกบ้าน สบายตา)

**ผลต่อผู้ใช้:** ลูกค้า(public) เชื่อใจ+เลือกง่าย+ติดต่อมากขึ้น · เจ้าหน้าที่(admin) ทำงานเร็ว ตาไม่ล้า หาข้อมูลไว

---

# PHASE 04 — UX/UI AUDIT (ทุกหน้า — ทำ session หน้า)

> ตารางนี้ = checklist audit · session หน้าเติมรายละเอียดปัญหา/แก้ต่อแต่ละหน้า (ตามโครง 10 ข้อในเฟส implement)

## web-public
| หน้า | ต้อง audit |
|---|---|
| Home (`/`) | hero · search · category · featured/carousel · community(ปิดอยู่) · footer |
| Listings (`/properties`) | search · filter(modal→sidebar?) · category tabs · card · pagination · empty/loading |
| Detail (`/properties/[code]`) | gallery · header(title/price/specs) · sections(card) · amenities · sticky form · similar |
| Privacy | typography/spacing |

## web-admin (dark CRM — คงหลัก Style B, ขัดเงา)
| กลุ่ม | หน้า |
|---|---|
| Dashboard | `/` (KPI · todo · seg) |
| List pages | properties · leads · appointments · contracts · owners · customers · users · notifications · community · audit |
| Detail | properties/[id] · contracts/[id] · customers/[id] · owners/[id] · leads(modal) · appointments(modal) |
| Create/Edit | PropertyForm · QuickAddProperty · ฟอร์มสร้างในแต่ละ list |
| Special | calendar · search · settings · login |
| Components | ทุกตัวใน ui.tsx (audit consistency: card/button/form/table/modal/empty/loading/nav/badge) |

---

# PHASE 05+ — แผน Implementation (ทีละเฟส · เทสทุกเฟส · แต่ละเฟสมีโครง 10 ข้อ)

> **เรียงตาม คุ้ม→เสี่ยงต่ำ** · ทำ **public ก่อน** (ตรง reference สุด) แล้วค่อย admin · **1 เฟส = 1 PR เล็ก + regression test + browser verify**
> โครง 10 ข้อต่อเฟส: Scope · Current Problem · Root Cause · UX Problem · UI Problem · Business Impact · User Impact · Solution · Reason(UX law) · Expected Result

### ✅ P1 — Specs icon-row (public SpecStrip) `[คุ้มสุด เสี่ยงต่ำ]` — **DONE 2026-07-09**
- Scope: เพิ่ม icon (bed/bath/area/parking) ให้ specs · Current: text ล้วน สแกนช้า · Solution: SpecStrip เติม `<Icon>` ต่อช่อง · Reason: Gestalt/icon-scan, ref ทุกไฟล์ใช้ · Expected: อ่าน spec ไว
- Safety: SpecStrip เป็น presentational · reuse Icon · ไม่แตะ data · Regression: property card/detail ทั้ง 2 แอป · Test: browser ทุก breakpoint
- **ทำจริง:** เพิ่ม icon `bed/bath/area/floor` ใน `apps/web-public/src/components/Icon.tsx` · `SpecStrip` (T.tsx) วาง icon นำ label (gold-dark/70, 13px) · mobile-safe: cell `px-1` + label `text-[11px]` (<640) กัน label EN คลิป
- **เทสแล้ว:** tsc web-public เขียว · detail desktop icons คมชัด · วัด clip ทุกช่องที่ 343/360/375px = 0 (TH+EN), 320px = "Bathrooms" เกิน 1px (sub-pixel ยอมรับได้)
- **ยังไม่ทำ:** admin InfoRow icon → ย้ายไป P8 (admin ขัดเงา) เพื่อคง scope P1 เล็ก+เสี่ยงต่ำ

### ✅ P2 — PropertyCard เสริม + Favorites ระดับโลก — **DONE 2026-07-09**
- Scope: ยก PropertyCard (public) ให้ครบตาม Hommie/Houseland · Solution: เพิ่ม heart(client state/localStorage — **ไม่แตะ backend**) · type-badge(House/Condo+icon) · specs-icon-row · rating(ถ้า API มี, ไม่มี=ซ่อน) · Reason: Miller/Fitts · Expected: ตัดสินใจต่อ card เร็ว
- Safety: heart = client-only (ห้ามสร้าง API) · Regression: listings + featured carousel + similar
- **ทำจริง (core):** type-badge(icon+label ซ้ายบน) · heart(ขวาบน, pop animation) · specs-icon-row(bed/bath/area) · icon-pill badges(train/paw) · photo-count(ซ้ายล่าง) · image hover-zoom · rating **ซ่อน**(API ไม่มี)
- **ทำจริง (favorites world-class):** `lib/favorites.ts` = single store + `useSyncExternalStore` (hydration-safe, cross-tab sync ผ่าน storage event, a11y aria-pressed) · Header heart + count badge · **หน้าใหม่ `/saved`** (ดึงสดจาก detail API, states: loading/empty/populated, remove live)
- **ปรับ scope:** C (hover quick-view modal) → ลดเหลือ **image hover-zoom** (การ์ดเป็นลิงก์ไป detail อยู่แล้ว, modal = ต้อง fetch+scope ใหญ่ → เก็บเป็น option ทีหลัง)
- **ไอคอนใหม่:** `heart`(รับ fill prop) · `train` · `paw` ใน Icon.tsx · keyframe `heart-pop` ใน globals.css (เคารพ reduced-motion)
- **เทสแล้ว:** tsc web-public เขียว · listings/home carousel/similar การ์ดใหม่ครบ · toggle → header count + /saved sync สด · remove/empty state ทำงาน · card ไม่ overflow ที่ 320/360/375px
- **หมายเหตุ:** badge train/pet ไม่ขึ้นบน /saved (detail API ไม่คืน field) — cosmetic, ยอมรับได้ (R2 ห้ามแตะ backend)

### ✅ P3 — public detail gallery "1 big + 2×2 thumbnail" (desktop) + carousel(mobile) — **DONE 2026-07-09**
- Scope: PropertyGallery desktop grid · Solution: grid 1+4 + "ดูรูปทั้งหมด" → Lightbox(มีแล้ว) · mobile คง carousel · Reason: ลด click · Expected: เห็นรูปมากขึ้น
- Safety: reuse Lightbox · Regression: detail ทั้ง breakpoint
- **ทำจริง:** PropertyGallery แยก 2 layout — `<lg` = carousel เดิม (wrap `lg:hidden`, โค้ดไม่แตะ) · `lg+` = กริด `hidden lg:block` "รูปใหญ่ 1 + 2×2 thumb" (adaptive: 1รูป=เต็ม, 2–4=ใหญ่+คอลัมน์ขวา, 5+=2×2 + `+N` overlay) · ปุ่ม "ดูรูปทั้งหมด (N)" · ทุก cell คลิกเปิด Lightbox ที่รูปนั้น · hover-zoom เบา ๆ · state/Lightbox ใช้ร่วม
- **เทสแล้ว:** tsc เขียว · เดสก์ท็อป 10รูป(2×2+`+5`) & 2รูป(ใหญ่+1) ไม่มีช่องโหว่ · คลิก `+5`→Lightbox เปิดที่รูป 5 ถูกต้อง · both blocks wired · overflow-x = 0 · lang key `viewAllPhotos`
- **หมายเหตุ:** window resize ทดสอบ <1024px ไม่ได้ (ติด min-width) แต่ mobile block = โค้ด carousel เดิมที่เทสแล้ว (แค่ห่อ lg:hidden)

### ✅ P4 — public Home ยกระดับ — **DONE 2026-07-09**
- Scope: home hero search เป็น panel มี label + category strip เด่น + spacing section เพิ่ม · Reason: Information Scent/Jakob · Expected: เริ่มค้นหาไว
- Safety: SearchBar/CommunityBoard reuse · Regression: home ทุก breakpoint + i18n(TH/EN)
- **วิเคราะห์ก่อนทำ (keep/remove/add):** hero/search/type-cards(=category strip)/carousels = ดีอยู่แล้ว เก็บ · **ไม่ทำ D hero-tabs** (ซ้ำ type-cards) · ช่องว่าง = ไม่มี trust signal + ไม่มี flow guide
- **ทำจริง (เพิ่ม):** (A) ชิปยอดนิยมใต้ search — เลือกเฉพาะ filter ที่ type-cards ทำไม่ได้ (BTS/MRT/pet/ราคา) กันซ้ำ · (B) Why-ROS trust band (คัดสรร/มืออาชีพ/ตอบไว/นัดชมฟรี — copy honest) · (C) "เช่าง่ายใน 3 ขั้นตอน" (ค้นหา→นัดชม→ย้ายเข้า) · (E) rhythm
- **ไอคอน:** ใช้ของเดิมหมด (ไม่เพิ่ม) · lang keys ใหม่ TH/EN ครบ
- **เทสแล้ว:** tsc เขียว · desktop เห็นทุก section · TH/EN สลับถูก · chips มี query filter ถูก · overflow-x = 0
- **หมายเหตุ scope:** เอาชิป type (คอนโด/บ้าน) ออก เพราะซ้ำ type-cards → เหลือชิปที่ value-add ล้วน

### ✅ P5 — public Listings (desktop filter sidebar + category tabs) — **DONE 2026-07-09** · เลือกโครง **A** (sidebar+tabs)
- Scope: `/properties` desktop = sidebar filter (reuse Combobox/PriceRange/Segmented) · mobile = sheet(เดิม) · Reason: Progressive Disclosure · Expected: กรองเร็ว เห็น filter ตลอด
- Safety: **filter logic เดิมห้ามแตะ** (แค่ย้าย layout) · Regression: filter/sort/pagination/URL params
- **ทำจริง (แยก state กันชน):** `CategoryTabs` (server Links, ทุกขนาด, เลื่อนแนวนอน) · `FilterSidebar` (client, desktop sticky — จังหวัด/ราคา(debounce)/รถไฟ/นอน, auto-apply เขียน URL) · `ListingSearch` (client, desktop q) · มือถือคง `SearchBar`+sheet เดิม
- **หลักสำคัญ:** ทุกตัวเขียน **URL param ชุดเดิม** → SSR page เดิม query เดิม (ไม่แตะ backend/logic) · FilterSidebar/ListingSearch อ่าน `sp` สดทุก render (ไม่ค้าง) · **มือถือใส่ `key={query}` ให้ SearchBar remount sync จาก URL** เมื่อแท็บเปลี่ยน (กัน internal state ค้างทับ type)
- **เทสจริง (browser):** แท็บ→?type ✓ · BTS chip→?train ✓ · รวมกัน (type+train) ✓ · ล้าง→เหลือ type ✓ · ค้นหา "Noble"→type+q ✓ · results-count อัปเดตทุกครั้ง ✓ · overflow-x=0 · desktop/mobile search แยกถูก · aside hidden<lg · tsc เขียว
- **เลือกโครง:** ทำ mockup hi-fi เทียบ A/B/C ให้เจ้าของ → เลือก A

### ✅ P6 — trust/urgency + serif heading + pill button — **DONE 2026-07-09** (เจ้าของ approve แล้ว)
- Scope: AppointmentForm เสริม trust · ทดลอง serif heading + pill primary · Reason: trust→conversion, editorial luxury · Expected: ติดต่อมากขึ้น + พรีเมียม
- Safety: **ทดลองบน public ก่อน · เจ้าของ approve ก่อนล็อก** (system-level) — **ทำ mockup เรนเดอร์จริงเทียบ → เจ้าของอนุมัติทั้งคู่**
- **ทำจริง:** (1) โหลด Noto Serif Thai (layout font link) + tailwind `serif` family → ใส่ `font-serif` **เฉพาะ heading ใหญ่** (hero h1, section titles Featured/how-it-works, listings/saved h1, detail project h1) · body/specs/ปุ่ม คง sans · (2) `.btn` (globals.css) `rounded-lg`→`rounded-full` = **pill ทั้งระบบ public** (btn-gold/ink/line/outline/ghost cascade) · (3) AppointmentForm เติม trust: "ตอบใน 24 ชม." + "นัดชมฟรี ไม่มีข้อผูกมัด"
- **ไม่กระทบ admin:** serif เพิ่มใน preset ร่วมแต่ admin ไม่ใช้ `font-serif` + ไม่โหลดฟอนต์ · `.btn` pill อยู่ใน globals ของ web-public เท่านั้น
- **เทสแล้ว (computed styles):** hero/featured/detail h1 = Noto Serif Thai (loaded ✓) · .btn-gold/submit = radius 9999px · trust lines ขึ้น 2 บรรทัด · overflow-x=0 · tsc เขียว · (หมายเหตุ: Chrome screenshot ใช้ไม่ได้ session นี้ — verify ผ่าน computed style ซึ่งแม่นกว่า)

### ✅ P7 — public mobile app-like (bottom-nav) — **DONE 2026-07-09** (เจ้าของ approve แล้ว)
- Scope: มือถือ public ให้เหมือน RE app (Hommie) · Reason: Jakob/thumb-reach · Expected: ใช้บนมือถือลื่น
- Safety: ตรวจ overflow/touch · Regression: ทุกหน้า public บนมือถือจริง
- **วิเคราะห์ keep/remove/add:** เพิ่ม bottom-nav → **ย้ายออกจาก header มือถือ:** หัวใจ(→โปรด) · ลิงก์ค้นหา(→ค้นหา) · ปุ่มติดต่อ(→ติดต่อ) = header มือถือเหลือ logo+ภาษา · **StickyCTA ชนกับ nav** → แก้: **ซ่อน bottom-nav บนหน้า detail** (StickyCTA เป็น CTA เฉพาะทรัพย์แทน แบบ Airbnb)
- **ทำจริง:** `BottomNav` (client, `lg:hidden` fixed) 4 ไอคอน หน้าแรก/ค้นหา/โปรด(+badge นับ)/ติดต่อ(LINE) · active ตาม pathname · safe-area-inset · ไอคอน `message` ใหม่ · Header ซ่อน 3 อย่างบนมือถือ (`lg:` เท่านั้น) · Footer เว้นล่าง `pb-24 lg:pb-10` พ้นแถบ
- **เทสแล้ว:** home/listings/saved → nav โผล่ (4 items ถูก) · detail → nav หาย + StickyCTA อยู่ (ไม่ชน) · header มือถือ = logo+ภาษา · overflow-x=0 · tsc เขียว

### 🔵 P8 — admin ขัดเงา (specs-icon · consistency audit · empty/loading illustration)
- Scope: admin คง Style B · เสริม icon + ตรวจ consistency ทุก component · Reason: consistency (Nielsen) · Expected: ระบบสม่ำเสมอขึ้น
- Safety: **R2 — logic/RBAC ห้ามแตะ** · Regression: CRUD ทุก module + RBAC 7 บทบาท

### 🔵 P9 — Responsive re-layout ทุก breakpoint (ตรวจ+แก้ทั้ง 2 แอป)
- Breakpoints: mobile-s/mobile-l/foldable/tablet-portrait/tablet-landscape/small-laptop/laptop/desktop/large/ultrawide
- Rule: **re-layout ไม่ scale** · ห้าม overflow/wrap ผิด/grid พัง/table ใช้ไม่ได้ · Test: Chrome resize + touch emulation ทุกขนาด

### 🔵 P10 — Before/After + Regression เต็ม + Quality Gate
- ทำ before/after gallery · regression checklist เต็ม · a11y/perf review · commit+push+PR

---

# 📐 GLOBAL RULES (ยึดทุกเฟส)

**Design:** 1บรรทัด1ข้อมูล · ลดกวาดสายตา · บน→ล่าง · ลด cognitive load/click/decision · ตัดข้อมูล/ปุ่ม/flow ซ้ำ · whitespace เหมาะ · visual rhythm · group ข้อมูลที่เกี่ยว · action ใกล้ข้อมูล · gold accent เดียว · Icon component เท่านั้น

**Responsive:** แก้ desktop = ออกแบบ mobile/tablet/laptop พร้อมกัน · re-layout ไม่ scale · ห้าม overflow/wrap/grid-break/card-break/button-overflow/modal-overflow/table-broken

**Component:** reuse ก่อนสร้างใหม่ · สร้างใหม่ต้องมีเหตุผล+ผลกระทบทั้งระบบ · แก้ที่ component กลาง = cascade (ระวัง)

**System Safety (ก่อนแก้ทุกครั้ง):** ตรวจ dependency · shared component · **API/state/route/permission/DB mapping/validation/business logic ห้ามแตะ (R2)** · แก้เฉพาะ presentational/style/layout

**Regression Test (หลังทุกเฟส):** UI/UX · CRUD(create/edit/delete) · nav/search/filter/sort/pagination · responsive ทุกขนาด · permission(RBAC 7 บทบาท) · validation · loading/error/success/empty · keyboard/focus/a11y · cross-browser/device · `tsc` เขียว 3 แอป

**Quality Gate (ก่อนเฟสถัดไป):** UX/UI/Responsive/Design-consistency/Component-consistency/Business-flow/QA/Regression/a11y/Perf ผ่าน 100%

**Definition of Done:** UX ดีขึ้นชัด · UI เรียบหรูเป็นระบบ · responsive ครบ · ไม่มี regression/flow-break/component-break/data-loss/broken-button/wrong-link · เทสครบ · ตรงกฎ ROS · production-ready ไม่กระทบ module อื่น

---

# 🚦 ลำดับ + เกณฑ์ตัดสินใจ (session หน้า)

1. **เริ่ม P1 (specs icon-row)** — คุ้มสุด เสี่ยงต่ำ พิสูจน์ flow ทำงาน
2. ทำ P2→P3 (card + gallery) — public visual ยกชัด
3. P4→P5 (home + listings) — โครง public
4. **P6 หยุดขอ approve** ก่อนล็อก serif/pill (system-level design)
5. P7 (mobile) → P8 (admin) → P9 (responsive) → P10 (regression+ship)

**สิ่งที่ต้องเจ้าของตัดสินก่อน (system-level):**
- serif heading บน public? (Noto Serif Thai) · pill button primary? · bottom-nav บน public mobile? · photo hero (ต้องส่งรูป) · announcement/utility bar?

---

# 📎 อ้างอิงในโปรเจกต์
- `DESIGN-REFERENCE-ANALYSIS.md` (22 เฟส reverse-eng + design translation) · `RECOVERY-NOTES.md` · `RECOVERY-TEST-CHECKLIST.md` · `BEFORE-AFTER-D14-D16.md` · `FIX-LOG.md` · `SESSION-HANDOVER-2026-07-05.md` · `SYSTEM-FLOW-GUIDE.md`
- reference renders (ชั่วคราว): `/tmp/uxpdf/m-01..08.jpg` · `d-01..08.jpg` (render ใหม่จาก PDF ด้วย `/tmp/render2.swift` ถ้าหาย)

---

## ⚠️ กันพลาด (สำคัญที่สุด)
1. **ห้ามแตะ backend/logic/RBAC/API/DB** (R2) — แก้แค่ style/layout/presentational
2. **reuse component กลาง** — อย่าสร้างซ้ำ
3. **เทสทุกเฟส** (tsc + browser ทุก breakpoint + regression) ก่อนไปเฟสหน้า
4. **push commit ที่ค้าง** (ต้อง token เจ้าของ) — งานใหม่อย่าลืม backup bundle
5. **system-level design (serif/pill/nav) เสนอ+ขอ approve ก่อน** — ห้ามเงียบ
6. งานอยู่ใน **"สำเนา 2"** — ระวังโฟลเดอร์ผิด

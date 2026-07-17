# ROS — FINAL PRE-DEPLOY UX/UI · WORKFLOW · IA · DESIGN SYSTEM · PREMIUM EXPERIENCE AUDIT
> ทีมจำลอง: Senior Product Designer · UX Researcher · Information Architect · Enterprise Workflow Consultant · SaaS Product Auditor · Design System Architect · Accessibility Specialist · Frontend UX Engineer
> อ้างอิงวินัย `/technique-1` (Minimal · Responsive-ต่ออุปกรณ์ · Test-Fix-Test) + โค้ดจริง `apps/web-admin` / `apps/web-public`
> วันที่: 2026-06-27 · สถานะระบบ: ~95–100% พร้อม deploy — เอกสารนี้ = ยกระดับ "ใช้งานได้" → "Production พรีเมียมระดับโลก"

> **กฎที่ยึดตลอดเอกสาร:** ไม่รื้อระบบ · ไม่สร้างกฎที่ขัดของเดิม · ทุกข้อเสนออ้างอิงโค้ด/โครงสร้างจริง · เปลี่ยนเลย์เอาต์ใดต้องมี Option A/B/C + เทียบ ใช้ง่าย/เร็ว/พรีเมียม/ขยายได้/ต้นทุน

> ### ⚠️ STATUS CORRECTIONS (อัปเดตหลังตรวจโค้ดจริง 2026-06-27 — ของบางอย่าง "ทำแล้ว" ดีกว่าที่ audit รุ่นก่อนระบุ)
> - **P2 ปุ่มกดยุบ (`active:scale`) + P3 focus-visible ring** → **ทำแล้ว** ทั้ง 2 แอป (`globals.css`). ข้าม.
> - **P8 อิโมจิ/สัญลักษณ์** → **คลีนแล้ว** (`Icon.tsx` migrate ครบ; `→` ที่เหลือเป็นข้อความใน comment/label ปกติ ไม่ใช่ไอคอน). ข้าม.
> - **P13 ⌘K · P14 mobile search · P15 result grouping** → **ทำแล้วเกือบครบ** ใน `GlobalSearch.tsx` (⌘K/`/` shortcut, command palette กรองสิทธิ์, overlay เต็มจอมือถือ, ผลจัดกลุ่มตาม entity, keyboard nav, หน้า `/search`). เหลือแค่ polish เล็กน้อยถ้าต้องการ.
> - **P1/P4 (interaction+numeric) + P23 (document declutter)** → **ทำแล้วรอบนี้** (ดูท้ายเอกสาร "ความคืบหน้า").
> สรุป: Search/Command ของระบบอยู่ระดับ Linear แล้ว — โฟกัสที่เหลือ = Wave 2 (detail consistency) · Wave 3 (เอกสาร preview) · Wave 5 (optimistic) · Wave 6 (iPad).

---

## ส่วนที่ 0 — วิเคราะห์ PDF อ้างอิงทีละภาพ (16 ภาพ)

> ไฟล์: `~/Desktop/ตัวอย่าง มือถือ.pdf` (8) + `~/Desktop/ตัวอย่าง เดส.pdf` (8) — ทั้งหมดเป็นแอป/เว็บกลุ่ม **อสังหา/จอง/ท่องเที่ยว** ซึ่งตรงโดเมนกับ ROS พอดี
> วิเคราะห์: จุดดี / จุดไม่ดี / ควรนำมาใช้ / ไม่ควรใช้ / เหมาะกับ ROS แค่ไหน — **ห้าม copy ดีไซน์ เอาเฉพาะหลักการ**

### มือถือ (Mobile)

**M1 — "Never start from scratch" (Hommie kit board, 20 จอ)**
- ดี: การ์ดทรัพย์ใช้ **รูปใหญ่ + ราคาเด่น + ที่ตั้ง/ห้องเป็น meta** ; segmented chip กรองประเภท ("Popular/House…") ; bottom-nav 4–5 ช่องชัด
- ไม่ดี: บางจอยัด KPI/badge เยอะเกิน ; แผนที่+การ์ดลอยทับกันอ่านยากบนจอเล็ก
- นำมาใช้: **ลำดับการ์ด = ภาพ → ชื่อ/ราคา(primary) → meta(ทำเล·ห้อง) → สถานะ** ตรงกับ `ListView` ที่มีอยู่
- ไม่ใช้: รูปเต็มความกว้างทุกการ์ดในลิสต์หลังบ้าน (หนัก, เลื่อนนาน) — ใช้ thumbnail 44–48px พอ
- เหมาะกับ ROS: **สูง** — เป็นแม่แบบการ์ดทรัพย์ของ web-public

**M2 — Orelax "Full preview" (flow ครบจอเดียว)**
- ดี: โทน **เขียว-ครีม เรียบหรู** ; ปุ่ม primary สีเดียวทั้งแอป ; ฟอร์ม booking มี label เหนือช่อง + ปุ่มเต็มกว้างล่างจอ
- ไม่ดี: หน้า "Add Property Details" ช่องเยอะเรียงยาว ไม่มี step/progress (ผิดหลักฟอร์มยาว น.19) — ROS ทำดีกว่าด้วย wizard 4 ขั้น
- นำมาใช้: **ปุ่มยืนยันเต็มกว้างตรึงล่าง** บน bottom-sheet ; โทนสีเดียวคุมทั้งจอ (ROS = gold)
- ไม่ใช้: ฟอร์มเดียวยาวรวด — ROS คง wizard
- เหมาะ: **ปานกลาง-สูง** (ยืนยันแนวทาง gold-single-accent ของเรา)

**M3 — skylimit (booking/flight, 16 จอ)**
- ดี: **ฟิลเตอร์เป็นแผ่นเต็ม** (Filters sheet) มี slider ราคา + chip — เร็วกว่าพิมพ์ (ตรง น.66) ; การ์ดโรงแรมมีเรตติ้ง+ราคา/คืนเด่น
- ไม่ดี: น้ำเงินจัด + เงาแข็ง = ดู "แอปฟรี" ไม่พรีเมียม ; ตัวอักษรเล็กหลายระดับ
- นำมาใช้: **Filter sheet + price range slider** — ปัจจุบัน ROS ใช้ dropdown ในฟิลเตอร์; slider ช่วงราคา/ค่าเช่าจะไวขึ้น
- ไม่ใช้: palette น้ำเงินจัด/เงาแข็ง
- เหมาะ: **ปานกลาง** (หยิบเฉพาะ price-range filter)

**M4 — CARBOOK (auth + map flow)**
- ดี: **Auth flow ชัด** (Sign In/Up/Verify/Password-changed) แต่ละจอทำงานเดียว ; หน้า success มีไอคอน ✓ วงกลมใหญ่ = feedback ดี
- ไม่ดี: navy ทึบเต็มจอ + ภาพ illustration การ์ตูน = ไม่เข้ากับ enterprise พรีเมียม
- นำมาใช้: **success/confirmation state มีไอคอนวงกลมใหญ่ + ข้อความเดียว** (ใช้กับ "เผยแพร่ทรัพย์แล้ว/ลงนามแล้ว")
- ไม่ใช้: illustration การ์ตูน, navy ทึบ
- เหมาะ: **ปานกลาง** (success-state pattern)

**M5 — Royal Merit (hotel detail พื้นครีม-ทอง)**
- ดี: **โทนครีม-ทอง = ใกล้ palette ROS ที่สุด** ; detail page = ภาพปก → ชื่อ+ราคา badge → **Overview / Amenities (ไอคอน+label) / Preview** เป็นหมวด ; ปุ่ม Book Now เต็มกว้างตรึงล่าง
- ไม่ดี: amenity icon ไม่มีกรอบจัดกลุ่ม ดูลอย
- นำมาใช้: **detail = หมวด Overview/รายละเอียด(ไอคอน+label)/แกลเลอรี + sticky CTA** — ตรงกับสิ่งที่ ROS ควรทำกับ property/contract detail
- ไม่ใช้: —
- เหมาะ: **สูงมาก** (แม่แบบ detail + ยืนยัน palette)

**M6 — "Find Your Dream Home Easily" (real-estate, 10 จอ)**
- ดี: **การ์ด list = ภาพ + ชื่อ + เรตติ้ง + "House Details" + ราคา + Book Now** จัดลำดับชัด ; chip ประเภท (House/Office/Apartment) ; thumbnail แถวเล็กใน detail (gallery strip)
- ไม่ดี: ปุ่มดำล้วนทุกใบ + ราคาเล็กกว่าปุ่ม (ลำดับเพี้ยน — ราคาควรเด่นสุด)
- นำมาใช้: **gallery strip thumbnail** ใน property detail ; chip ประเภทแบบ segmented
- ไม่ใช้: ปุ่มดำเด่นกว่าราคา
- เหมาะ: **สูง**

**M7 — Before/After (real-estate redesign) — ภาพสอนที่ดีที่สุดในชุด**
- ดี (After): ตัด chip ประเภทจาก 5→ไอคอนเรียบ ; **เพิ่มแถวทักทาย "Hello, Ronald" + avatar** ; search bar เด่นขึ้น ; banner โปรย flat ขึ้น ; bottom-nav ป้ายชัด
- จุดสอน: **Before รก/เงาแข็ง/สีจัด → After เรียบ/นุ่ม/โปร่ง** = ทิศทางที่ ROS ต้องไป (decluttering)
- นำมาใช้: **header มือถือ = ทักทาย+avatar+search เด่น** ; ลด badge/เงาในการ์ด
- ไม่ใช้: ยังเหลือไอคอนแบนสีน้ำเงิน — ROS ใช้ outline ชุดเดียว
- เหมาะ: **สูงมาก** (mindset "After")

**M8 — Sotelplan (purple property dashboard)**
- ดี: **dashboard การ์ดสรุป** (Status/Rooms/Activities) + progress ; รายการห้องมี thumbnail กลม
- ไม่ดี: **ม่วงไล่เฉด + การ์ดบนการ์ด + ตัวเลขเยอะ = รก, cognitive load สูง** (สิ่งที่ ROS ต้องเลี่ยง)
- นำมาใช้: แนวคิด "การ์ดสรุปสถานะ" บน dashboard เท่านั้น
- ไม่ใช้: gradient ม่วง, การ์ดซ้อนการ์ด, ความหนาแน่นข้อมูล
- เหมาะ: **ต่ำ-ปานกลาง** (เป็นตัวอย่าง "อย่าทำ" ได้ดี)

### เดสก์ท็อป (Desktop)

**D1 — Rento "Find your dream apartment" (list + map split)**
- ดี: **layout 2 คอลัมน์ = ลิสต์การ์ด ซ้าย / แผนที่ ขวา** ; ฟิลเตอร์ rail ซ้าย (Real-estate type/Price/Rooms/Bathroom/View) เป็น chip toggle ; การ์ดราคาเด่น
- ไม่ดี: ความหนาแน่นสูงบนจอเดียว (ต้องมีวินัย whitespace)
- นำมาใช้: **filter rail แบบ chip-group** สำหรับ web-public ; รูปแบบ list+map (ทรัพย์)
- ไม่ใช้: ยัด 3 แผงพร้อมกันบนจอแคบ
- เหมาะ: **สูง** (web-public property index)

**D2 — Reome (hero + listing landing)**
- ดี: **hero ภาพเต็ม + search bar ลอยทับ + chip หมวดบริการ** ; section "การ์ดทรัพย์ 3 คอลัมน์ + เรตติ้ง"
- ไม่ดี: ฟอนต์ heading หนาเกิน + การ์ดเงาเข้ม = ดูหนัก
- นำมาใช้: **hero + floating search** สำหรับ landing web-public
- ไม่ใช้: เงาเข้ม/หนัก
- เหมาะ: **ปานกลาง-สูง** (เฉพาะ public landing)

**D3 — Apex (stays grid, ดำ-ครีม)**
- ดี: **grid 4 คอลัมน์ การ์ดเรียบ + ราคา/รีวิว** ; แถบหมวด (Apartments/Hotels/Villas…) เป็นไอคอน+label ; **section grouping ตามทำเล** ("Top-Rated in South Goa")
- ไม่ดี: ปุ่ม + กลมลอยมุมการ์ด เล็ก/แตะยากบน touch
- นำมาใช้: **grouping by ทำเล/หมวด เป็น section** ; grid 3–4 คอลัมน์เดสก์ท็อป
- ไม่ใช้: ปุ่มลอยเล็ก
- เหมาะ: **สูง**

**D4 — Vacation Property "Discover Your Perfect Holiday Home"**
- ดี: **โทนเขียวเข้ม-ครีม editorial หรู** ; hero + search ; **stepper บริการ (1-2-3-4)** ; ภาพ grid แบบ asymmetric
- ไม่ดี: ข้อความ marketing เยอะ (ไม่เกี่ยวหลังบ้าน)
- นำมาใช้: **stepper แนวนอนมีเลขกำกับ** (ใช้กับ wizard เพิ่มทรัพย์บนเดสก์ท็อป) ; โทน editorial
- ไม่ใช้: เนื้อหา marketing
- เหมาะ: **ปานกลาง** (stepper + โทน)

**D5 — Houseland "Find Your Dream Living Room"**
- ดี: **search bar แนวนอน 4 ช่อง (Type/Price/Location/Rooms) + ปุ่มดำ** ตรึงใต้ hero — เป็น search ที่อ่านง่ายมาก ; **แถบสถิติ (6,675+ / 25+ / 2,050+ / 300+)** ลำดับชัด
- ไม่ดี: heading ตัวใหญ่มากกินพื้นที่
- นำมาใช้: **search bar หลายช่องแนวนอน** (advanced search web-public) ; แถบ KPI ตัวเลขใหญ่ (ใช้กับ dashboard)
- ไม่ใช้: heading ใหญ่เกิน
- เหมาะ: **สูง** (search pattern + KPI)

**D6 — allstate (property detail + sticky booking) — แม่แบบ detail ที่ดีที่สุด**
- ดี: **gallery ใหญ่ซ้าย (1 ใหญ่ + 4 เล็ก grid) / แผง booking sticky ขวา** ; **stats row แบบไอคอน: Bedroom/Bathroom/Area/Parking/Area-safety** ; Description + "Show More" ; badge "Only 6 hours left" ; ปุ่ม Reserve ดำเต็มกว้าง
- ไม่ดี: —
- นำมาใช้: **นี่คือเทมเพลต property/contract detail ของ ROS เป๊ะ** — gallery+stats-row(ไอคอน)+section+sticky action rail ขวา
- ไม่ใช้: urgency badge ("6 hours left") = ไม่เหมาะ B2B
- เหมาะ: **สูงมาก** (อ้างอิงหลักของ Wave 2)

**D7 — Riverlle (Room Details + booking form ขวา)**
- ดี: **detail 2 คอลัมน์: เนื้อหา ซ้าย / ฟอร์มจอง sticky ขวา** ; **Room Amenities = ไอคอน+label เป็น grid** ; Booking Rules (Check-in/out) ; แผนที่ Location ล่าง
- ไม่ดี: เขียวเข้มทุกปุ่ม + ฟอร์มยาวในคอลัมน์แคบ
- นำมาใช้: **amenities/specs เป็น icon-grid** ; **map ใน detail** (ทรัพย์)
- ไม่ใช้: ฟอร์มยาวคอลัมน์แคบ
- เหมาะ: **สูง**

**D8 — Atlanta (stay list rows)**
- ดี: **list row แนวนอน: ภาพซ้าย / ชื่อ+amenities กลาง / ราคา+ปุ่ม Select ขวา** — เป็น list-row พรีเมียมสำหรับเดสก์ท็อปที่ดีมาก ; tag ประเภท (House/Apartment) ; ราคาเด่นมุมขวา
- ไม่ดี: amenity list ยาวต่อแถว (อาจล้นบนจอแคบ)
- นำมาใช้: **list-row เดสก์ท็อป = ภาพ+identifier+meta / value+action ขวา** — ทางเลือกสำหรับ property list เดสก์ท็อป (แทนตารางล้วน)
- ไม่ใช้: amenity ยาวเกินต่อแถว
- เหมาะ: **สูง** (ทางเลือก B ของ list เดสก์ท็อป)

### สรุปบทเรียนจาก PDF (หลักที่หยิบมาใช้กับ ROS)
1. **Detail page = gallery + stats-row(ไอคอน) + หมวด + sticky action rail** (D6/D7/M5) → Wave 2
2. **การ์ด/แถว list = identifier เด่น + ราคา/ค่าเช่าเด่นสุด + meta จาง** (M1/M6/D8) → Wave 1
3. **Filter = sheet + chip + price-range slider** (M3/D1) → Wave 1
4. **Palette ครีม-ทอง/เขียว-ครีม editorial = พรีเมียม** ยืนยัน gold ของ ROS (M5/D4)
5. **Mindset "After": ตัด badge/เงา/สีจัด → เรียบ-นุ่ม-โปร่ง** (M7) → Wave 0/5
6. **อย่าทำ:** gradient จัด, การ์ดซ้อนการ์ด, ปุ่มลอยเล็ก, urgency B2C, illustration การ์ตูน (M8/M3/D6)

---

## 1. Executive Summary (อ่าน 30 วินาที)

ROS **ไม่ได้พังที่รากฐาน** — design tokens (gold + warm-neutral + motion tokens), component library (`ListView` table↔card, `Modal`, `ConfirmDialog`, `Combobox`, `FilterBar`, `EmptyState/ErrorState/Skeleton`), IA (คลังทรัพย์→งานขาย) และ RBAC ดีและ minimal อยู่แล้ว และหลายข้อในรอบก่อน (prompt()→Modal, mobile zoom, filter จังหวัด) ถูกแก้แล้ว

**ช่องว่างจริงที่เหลือ = 3 กลุ่ม:**
1. **"หาใน 3 วิ" ยังไม่ครบทุกโมดูล** — บาง list ใช้ identifier ที่จำยาก, ไม่มี saved view/quick filter, search ยังไม่ใช่ ⌘K และมือถือไม่มี global search
2. **ความสม่ำเสมอระดับ composition** — detail page บางหน้า (contract/customer/owner) ยังเป็น flat grid ไม่ sectioned แบบ property ; DocumentSection มีปุ่ม text 4 ตัวต่อแถว (รก) ไม่มี preview/grouping
3. **ชั้นพรีเมียม (premium polish layer) ยังไม่ทั่ว** — press/hover/focus micro-interaction, optimistic update, skeleton parity, type ramp, iPad layout, public-site detail

**ปรัชญาที่ยึด:** ยกเป็นชั้น ๆ (polish layer) ไม่รื้อ — เหมือนภาพ "After" ใน M7: ตัดของรก, จัดลำดับ, ใส่จังหวะ-มูฟเมนต์เบา ๆ ให้รู้สึก "ไว+แพง" โดยไม่เพิ่มภาระ

## 2. Deployment Readiness Score

| มิติ | คะแนน | หมายเหตุ |
|---|---|---|
| Information Architecture | **A-** | โครงสร้าง entity/เมนูถูกต้อง; ขาด saved-view/quick-filter |
| Visual Hierarchy | **B+** | property ดี; contract/customer/owner ยัง flat |
| Search & Discovery | **B** | global search desktop-only, ยังไม่ ⌘K, ไม่มีในมือถือ |
| Attachments/Documents | **B-** | upload ดี; ขาด preview/grouping/findability 6 เดือน |
| Design System Consistency | **A-** | token/คอมโพเนนต์แน่น; เหลือ type-ramp + press/focus |
| Premium Feel / Motion | **B+** | motion token มีแล้ว; ยังไม่ทั่วทุก control + ไม่มี optimistic |
| Perceived Performance | **B+** | skeleton/empty ดี; ขาด optimistic + content-shift บางจุด |
| Responsive (มือถือ) | **A-** | แก้ critical แล้ว |
| Responsive (iPad/tablet) | **B** | iPad ยังใช้ bottom-nav จนถึง 1024 |
| Accessibility | **B** | focus-visible/contrast ยังไม่ครบ |
| Public site (web-public) | **B** | ยังไม่ถึงระดับ reference (D6/D8) |
| **รวม (พร้อม deploy)** | **B+ / A-** | **Deploy ได้** — เอกสารนี้ดันสู่ **A/A+** |

**สรุป:** ปล่อยได้เลยในเชิงฟังก์ชัน. งานที่เหลือคือ "polish ให้แพง+ไว+หาง่าย" ทำเป็นเฟสหลัง/คู่ขนาน deploy ได้

## 3. Critical Issues (ต้องดูก่อน deploy — แต่ไม่บล็อก)
> ระดับ Critical ของรอบนี้ = "ทำให้ดูไม่โปร/หาไม่เจอ" ไม่ใช่ระบบล่ม (ส่วนล่มถูกแก้แล้ว)

| # | ปัญหา | ผลกระทบ | ระดับ |
|---|---|---|---|
| C1 | **Identifier ของ list ไม่เป็นมาตรฐานเดียว** — บางหน้านำด้วยรหัส/ID ที่คนจำไม่ได้ | "หาใน 3 วิ" ล้มเหลวเมื่อข้อมูลโต | High |
| C2 | **Global search ไม่มีบนมือถือ** (`hidden sm:block`) | ทีมภาคสนาม (มือถือ) หาข้ามโมดูลไม่ได้ | High |
| C3 | **DocumentSection ไม่มี preview/grouping** + ปุ่ม text 4 ตัว/แถว | ผ่าน 6 เดือนหาไฟล์ไม่เจอ / ดูรก | High |
| C4 | **Detail page ไม่สม่ำเสมอ** (contract/customer/owner ยัง flat) | ดูเป็นคนละผลิตภัณฑ์ | Medium-High |

## 4. High Impact Improvements (ดูรายละเอียดใน "แผนเฟส")
- ⌘K command palette + มือถือ search overlay (Wave 1)
- Detail template sectioned + sticky action rail ทุกหน้า (Wave 2 — อ้างอิง D6)
- Document redesign: thumbnail + group-by-type + preview (Wave 3)
- Press/hover/focus micro-interaction + optimistic update (Wave 5)
- iPad sidebar + responsive matrix sign-off (Wave 6)

## 5. Workflow Problems (อ้างอิง flow จริงในโค้ด)
| Flow | ปัญหา | วิธีแก้ | ระดับ |
|---|---|---|---|
| ค้นหานัด/ทรัพย์/ลูกค้า ข้ามโมดูล | มือถือไม่มี global search; เดสก์ท็อปไม่ใช่ ⌘K | Wave 1 P13–P15 | High |
| เพิ่มทรัพย์→เพิ่มรูป | ต้องเปิด detail เองหลังบันทึก (เสีย 1–2 คลิก) | ต่อ "เพิ่มรูป" ทันทีหลัง wizard | Medium |
| Quick action บนการ์ด | ต้องเข้า detail ก่อนเสมอ (โทร Lead/complete นัด) | swipe/⋯ บนการ์ด + optimistic | Medium |
| เอกสาร: หา/เปิด/เทียบเวอร์ชัน | ไม่มี filter/preview ในเอกสาร entity | Wave 3 | High |
| ปิดงาน (complete/cancel/verify) | ไม่มี optimistic → รู้สึกหน่วง | Wave 5 P30 | Medium |

## 6. Information Architecture Problems
- **IA หลักถูกต้อง — คงไว้** (เจ้าของ→ทรัพย์→Lead→นัด→ลูกค้า→สัญญา)
- **ปัญหา:** ไม่มี **มาตรฐาน identifier ของ list** เขียนไว้กลาง → แต่ละหน้าทำเอง. ต้องมี "IA Identifier Spec" (ส่วนที่ 16) ระบุ primary/secondary/right ต่อโมดูล
- **ปัญหา:** ไม่มี **saved views / quick filter presets** → เมื่อ 1,000–10,000 แถว ผู้ใช้ตั้งฟิลเตอร์ซ้ำทุกครั้ง
- **ปัญหา:** เอกสารไม่มี taxonomy ที่ค้นได้ (มี `documentType` แล้ว แต่ UI ไม่ได้ group/filter ด้วยมัน)

## 7. Search & Discovery Problems
| ปัญหา | ผล | แก้ |
|---|---|---|
| ไม่มี ⌘K / quick-switcher | เดสก์ท็อปต้องคลิกเมนู | P13 |
| มือถือไม่มี global search | ภาคสนามหาไม่ได้ | P14 |
| ผลค้นหาไม่ group ตาม entity | อ่านผลรวมยาก | P15 |
| ค้นในเอกสาร/ภายใน entity ไม่มี | หาไฟล์ไม่เจอ | P25 |
| filter เป็น dropdown ล้วน (ไม่มี range slider/quick chip) | กรองช่วงราคา/ค่าเช่าช้า | P11/P12 |

## 8. Attachment & Document Problems (คำถาม: ผ่าน 6 เดือนหาเจอไหม → **ตอนนี้: ไม่)**
- ไม่มี **thumbnail/preview** — เห็นแค่ไอคอน pdf/image + ชื่อไฟล์ (ชื่อ = ชื่อไฟล์ดิบจากเครื่อง เช่น `IMG_2931.jpg`)
- ไม่ **group ตามประเภท** ทั้งที่มี `documentType` 8 หมวด (โฉนด/บัตร/ทะเบียนบ้าน/สัญญา/ใบเสร็จ/มอบอำนาจ/รูป/อื่น)
- ไม่มี **ค้นหา/กรอง** ภายในเอกสาร entity
- **ปุ่ม 4 ตัว text (เปิด/ตรวจ/เก็บถาวร/ลบ) ต่อแถว** = รก, แตะผิดง่ายบนมือถือ → ควรยุบใน `⋯` menu
- ไม่มี **rename/convention** → ชื่อไม่สื่อ
- **แก้:** Wave 3 (P23–P26)

## 9. Visual Hierarchy Problems
- **property detail = ดี** (sectioned, ราคาเด่น) → ใช้เป็นแม่แบบ
- **contract/customer/owner detail = flat grid** ทุกฟิลด์น้ำหนักเท่ากัน → ไม่รู้ว่าอะไรสำคัญ
- **type ramp ไม่ชัดเป็นโทเคน** — heading/title/body/meta ใช้ค่า ad-hoc (`text-lg`, `text-sm`, `text-xs`) → ควรมี scale ตั้งชื่อ
- **DocumentSection:** ชื่อไฟล์ = primary แต่จริง ๆ ประเภทเอกสารควรเด่นกว่าชื่อไฟล์ดิบ

## 10. Design Consistency Problems
| องค์ประกอบ | สถานะ | จุดไม่สม่ำเสมอ |
|---|---|---|
| Button | ดี (btn-gold/ghost/primary/danger) | press/hover ไม่ทั่ว (Pagination มี active:scale แต่ปุ่มอื่นไม่) |
| Input/Combobox/Field | ดีมาก (มาตรฐานเดียว) | — |
| Modal/ConfirmDialog | ดีมาก | — |
| ListView | ดีมาก | บางหน้า fetch เอง (properties) แทน `useList` → loading/empty ไม่ identical |
| Detail layout | **ไม่สม่ำเสมอ** | property sectioned / อื่น flat + max-width ต่างกัน (4xl/5xl/3xl) |
| Toast/Badge/Icon | ดี | — |
| Focus ring | ไม่ครบ | a11y |

## 11. Premium Experience Improvements (หลักจาก Apple/Linear/Notion/Stripe/Arc — เอาหลักไม่ลอก)
- **Whitespace + จังหวะ:** เพิ่ม breathing room ใน detail/section (Linear) — แต่คง minimal
- **Type ramp ชัด** (Stripe): display/title/body/meta + tabular-nums สำหรับตัวเลขเงิน
- **Press feedback 1–2px + scale 0.98** (Arc/Linear) ทุกปุ่ม/แถว/การ์ด → "รู้สึกตอบสนอง"
- **Sticky action rail** ใน detail (Notion/D6) → CTA ไม่หาย
- **Tabular numbers + alignment** ของราคา/เงิน (Stripe dashboards)
- **ลด badge/เงา** ตามภาพ After (M7)

## 12. Motion Design Improvements (เพิ่มเฉพาะที่ทำให้ "ไว+แพง+ชัด" — ห้ามฟุ่มเฟือย)
| Motion | ใช้ที่ | เหตุผล |
|---|---|---|
| press `active:scale-[.98]` 100ms | ปุ่ม/การ์ด/แถว | ตอบสนองทันมือ = รู้สึกไว |
| hover border/bg 150ms | แถว/การ์ด/ลิงก์ | ชี้เป้า |
| `animate-modal-in`/`fade-in` (มีแล้ว) | modal/รายการ | คงไว้ |
| stagger รายการ 20–30ms | list แรกโหลด | พรีเมียม (เบา) |
| optimistic + fade状态 | complete/verify/cancel | "ไว" จริง |
| skeleton→content cross-fade | ทุก list | ไม่กระตุก |
| **ห้าม:** bounce เกิน, parallax, motion >300ms, ทุกอย่างขยับพร้อมกัน | | กันรก/แลค |

## 13. Scalability Risks (โต 10 เท่า: 10→100k records)
- **Navigation:** sidebar กลุ่มคงรับได้ ✅ — แต่ต้องมี ⌘K เป็นทางลัดหลักเมื่อเมนูยาว
- **List:** PAGE_SIZE=8 + server sort/filter ✅ — เพิ่ม saved-view + virtualization ถ้าเปิด "ดูทั้งหมด"
- **Search:** ต้อง index เพิ่ม (ชื่อ/เบอร์/โฉนด/ที่อยู่/code) + debounce ✅ มีบางส่วน
- **Documents:** ต้อง group/filter/preview ไม่งั้น entity ที่มี 50+ ไฟล์ใช้ไม่ได้
- **Folder/Attachment:** ต้องมี taxonomy (documentType) ใช้งานจริงใน UI

## 14. Recommended Changes BEFORE Deploy (ขั้นต่ำให้ดูโปร)
P1–P8 (Wave 0 design-system polish) + P9 (list identifier spec) + P14 (mobile search) + P23 (document declutter) — ดู "แผนเฟส"

## 15. Nice-To-Have AFTER Deploy
⌘K, optimistic ทุกจุด, public-site detail redesign, saved views, virtualization, map ใน detail

## 16. IA Identifier Spec (มาตรฐานกลาง — "หัวข้อควรเป็นชื่อคน/เลขทรัพย์")
> นี่คือคำตอบตรงต่อสิ่งที่ผู้ใช้สั่ง: ทุก list/detail ต้องนำด้วย identifier ที่ "คนจริงจำได้"

| โมดูล | PRIMARY (เด่นสุด) | SECONDARY (meta จาง) | RIGHT (ค่า/สถานะ) |
|---|---|---|---|
| ทรัพย์ | `code` + ชื่อทรัพย์ | ประเภท · ทำเล(จังหวัด) | สถานะ · **฿ค่าเช่า (เด่น)** |
| Lead | **ชื่อลูกค้า** | ช่องทาง · ทรัพย์สนใจ · เวลา | สถานะ |
| นัดหมาย | **ชื่อคน**/หัวข้อ (ทำแล้ว ✅) | วันเวลา · ทรัพย์ | สถานะ |
| ลูกค้า | **ชื่อ** + เบอร์(แตะโทร) | ที่อยู่/อีเมล | #สัญญา/นัด |
| สัญญา | **ชื่อลูกค้า + เลขทรัพย์** | ระยะเวลา (เริ่ม–สิ้นสุด) | สถานะ · **฿ค่าเช่า** |
| เจ้าของ | **ชื่อ** + เบอร์ | จำนวนทรัพย์ | — |
| เอกสาร | **ประเภทเอกสาร** (ไม่ใช่ชื่อไฟล์ดิบ) | ชื่อไฟล์ · วันที่ · ผู้แนบ | สถานะตรวจ |
| แจ้งเตือน | เรื่อง + entity | เวลา (relative) | อ่าน/ยังไม่อ่าน |

**กฎ:** ห้ามนำ list ด้วย `Record #1244`/UUID. ตัวเลขเงินใช้ `tabular-nums` ชิดขวา. PRIMARY ตัวหนา · SECONDARY `text-muted text-xs` · RIGHT ขวา.

## 17. Risk Assessment
| ความเสี่ยง | โอกาส | ลด |
|---|---|---|
| Polish ทำ regression UI | ต่ำ-กลาง | ทำเป็นเฟสเล็ก + Test-Fix-Test ทุกเฟส + typecheck ทุกแอป |
| Motion เยอะไป = แลค/รก | ต่ำ | จำกัด ≤300ms, ใช้ token, prefers-reduced-motion |
| ⌘K/search ซับซ้อนเกินงบ | กลาง | เลื่อนเป็น after-deploy (P13/P15) |
| เปลี่ยน detail layout กระทบ flow | ต่ำ | reuse pattern property + A/B/C ก่อนเลือก |

---

# แผนรื้อใหญ่แบบเป็นเฟส (REDESIGN ROADMAP — 42 เฟส / 8 Wave)
> ทุกเฟส = หน่วยเล็ก ทำ→เทส(ทุก breakpoint + typecheck)→แก้→เทส แล้วค่อยเฟสถัดไป
> รูปแบบแต่ละเฟส: **ปัญหา · ผลกระทบ · วิธีแก้ · ข้อดี · ข้อเสีย · ระดับ** (+ A/B/C เมื่อเปลี่ยนเลย์เอาต์)
> ทำได้ทั้ง 2 แอป (web-admin + web-public) และทุกอุปกรณ์

## WAVE 0 — รากฐาน Design-System Polish (ก่อน deploy)

### P1 · Motion token finalize (press/hover/focus layer)
- ปัญหา: motion token มี (`standard/emphasized`, `fade-in/modal-in`) แต่ press/hover ไม่ถูกใช้ทั่ว
- ผล: บางปุ่ม "ตาย" ไม่ตอบสนอง → ไม่รู้สึกไว
- แก้: เพิ่ม util `.press` (`active:scale-[.98] transition-transform duration-100`) + `.row-hover` ใน globals; ใช้กับปุ่ม/การ์ด/แถวทุกที่
- ข้อดี: รู้สึกไว+แพงทันที, ต้นทุนต่ำ (CSS) · ข้อเสีย: ต้องไล่ใส่หลายจุด · ระดับ: **High**

### P2 · Button press/hover standard
- ปัญหา: `.btn-*` ไม่มี press scale สม่ำเสมอ (Pagination มี, ปุ่มหลักไม่มี)
- แก้: ใส่ `active:scale-[.98] active:brightness-95` + `hover` ที่ `.btn-gold/ghost/primary/danger` กลางที่เดียว
- ข้อดี: ทั่วถึงจุดเดียวจบ · ข้อเสีย: — · ระดับ: **High**

### P3 · Focus-visible ring system (a11y)
- ปัญหา: focus ring ไม่ครบทุก control
- แก้: เพิ่ม `:focus-visible { outline: 2px solid gold; offset 2px }` กลาง + ปุ่ม/ลิงก์/แถวคลิกได้
- ข้อดี: a11y + keyboard nav · ข้อเสีย: ต้องเทส contrast · ระดับ: **Medium-High**

### P4 · Typography ramp tokens (display/title/body/meta)
- ปัญหา: ขนาด/น้ำหนักตัวอักษร ad-hoc
- แก้: นิยาม util `.t-display/.t-title/.t-body/.t-meta` + `tabular-nums` สำหรับเงิน; map ไป heading ที่มี
- ข้อดี: hierarchy ชัดทั้งระบบ, พรีเมียม (Stripe) · ข้อเสีย: ต้องไล่แทนทีละหน้า · ระดับ: **High**

### P5 · Spacing/density rhythm audit
- ปัญหา: ระยะ section/card ไม่เป็นสเกลเดียว
- แก้: ยึดสเกล 4/8 + กำหนด gap section (`space-y-6`) มาตรฐาน detail
- ข้อดี: จังหวะนิ่ง = แพง · ข้อเสีย: งานละเอียด · ระดับ: **Medium**

### P6 · Color/contrast pass (faint text + dark saturation)
- ปัญหา: `faint #A8A29E` contrast ต่ำบางพื้น; dark mode saturation
- แก้: ยก faint ขึ้นเล็กน้อยเฉพาะข้อความสำคัญ; ตรวจ AA
- ข้อดี: อ่านง่าย + a11y · ข้อเสีย: — · ระดับ: **Medium**

### P7 · Elevation/shadow system
- ปัญหา: ใช้ shadow-card/lift ปนกัน
- แก้: นิยาม 3 ชั้น (flat/card/overlay) ใช้ตามบทบาท; ลดเงาแข็งตามภาพ After
- ข้อดี: depth สม่ำเสมอ · ข้อเสีย: — · ระดับ: **Low-Medium**

### P8 · Icon/emoji audit
- ปัญหา: ต้องไม่มีอิโมจิ/สัญลักษณ์ตัวอักษร (กฎ technique-1)
- แก้: grep หา `×▾☰✓→📄⚠️` ทั้ง 2 แอป → แทนด้วย `<Icon>`
- ข้อดี: consistency · ข้อเสีย: — · ระดับ: **Medium**

## WAVE 1 — "หาใน 3 วินาที" (List · Search · Filter)

### P9 · List Identifier Spec implementation (ส่วนที่ 16)
- ปัญหา: identifier ไม่เป็นมาตรฐาน (บางหน้านำด้วย code/ID)
- ผล: ข้อมูลโต → หาไม่เจอ (ตรงคำสั่งผู้ใช้: นัด=ชื่อคน/เลขทรัพย์)
- แก้: ใช้ตารางส่วนที่ 16 ปรับ `cols` ทุกหน้า (primary=ชื่อ/code, sub=meta, right=value/สถานะ)
- **Alternatives (เลย์เอาต์การ์ด/แถว):**
  - **A. คงโครง ListView เดิม ปรับเฉพาะ cols** — ง่ายสุด/เร็วสุด/พรีเมียม-กลาง/ขยายดี/ต้นทุนต่ำ ⭐แนะนำ
  - **B. การ์ด list-row มี thumbnail + identifier (แบบ D8 Atlanta)** — ใช้ง่ายสูง/พรีเมียมสูง/ต้นทุนกลาง/เหมาะ property
  - **C. Hybrid: ตารางเดสก์ท็อป + การ์ด-rich มือถือ** — พรีเมียมสูงสุด/ต้นทุนสูง/เรียนรู้น้อย
- ข้อดี(A): ทั่วถึงเร็ว · ข้อเสีย: ยังเป็นตาราง · ระดับ: **High**

### P10 · ListView meta/value enhancement
- ปัญหา: บาง list ขาด secondary meta ที่ช่วยสแกน (ทำเล/เวลา)
- แก้: เพิ่ม sub-line + right value ตาม spec; ราคาใช้ tabular-nums
- ข้อดี: สแกนไว · ข้อเสีย: — · ระดับ: **Medium-High**

### P11 · Quick Filter presets (segmented) ต่อโมดูล
- ปัญหา: ฟิลเตอร์ซ่อนหลังปุ่มเสมอ → งานประจำต้องเปิด sheet ทุกครั้ง
- แก้: เพิ่มแถว `Segmented` preset ("วันนี้/สัปดาห์นี้" สำหรับนัด, "ว่าง/ไม่ว่าง/ร่าง" สำหรับทรัพย์) เหนือ list
- **Alternatives:** A. Segmented presets (เร็ว, แนะนำ) · B. Saved views ผู้ใช้ตั้งเอง (ขยายดี, ต้นทุนสูง) · C. ทั้งคู่ (after-deploy)
- ข้อดี: 1 แตะถึงงานประจำ · ข้อเสีย: เพิ่ม element เหนือ list · ระดับ: **Medium-High**

### P12 · Sort visibility + price-range slider (อ้างอิง M3/D1)
- ปัญหา: sort ซ่อนใน sheet; ช่วงราคาใช้ dropdown
- แก้: โชว์ sort เป็น control ที่เห็น; เพิ่ม range slider ราคา/ค่าเช่าใน filter sheet
- ข้อดี: กรองช่วงไว · ข้อเสีย: เพิ่มคอมโพเนนต์ slider · ระดับ: **Medium**

### P13 · ⌘K Command Palette (desktop)
- ปัญหา: ไม่มี quick-switcher; ค้นข้ามโมดูลต้องคลิกเมนู
- แก้: command palette (ค้นทรัพย์/Lead/ลูกค้า/สัญญา + การกระทำ "เพิ่มทรัพย์") reuse logic `GlobalSearch`
- **Alternatives:** A. ⌘K overlay กลางจอ (Linear/Raycast, แนะนำ) · B. ขยาย GlobalSearch เดิมใน header · C. ทั้งคู่
- ข้อดี: เร็วมากเมื่อชำนาญ, พรีเมียม · ข้อเสีย: ต้นทุนกลาง · ระดับ: **Medium (after-deploy ได้)**

### P14 · Mobile Global Search overlay
- ปัญหา: `hidden sm:block` → มือถือไม่มี search รวม
- แก้: ไอคอนแว่นใน header มือถือ → overlay เต็มจอ input 16px reuse GlobalSearch
- ข้อดี: ภาคสนามหาได้ทุกที่ · ข้อเสีย: — · ระดับ: **High (ก่อน deploy)**

### P15 · Search result grouping + index/synonym
- ปัญหา: ผลรวมไม่ group ตาม entity; ค้นบางคำ/ตัวย่อไม่เจอ
- แก้: group ผลเป็นหมวด (ทรัพย์/Lead/ลูกค้า/สัญญา); index เพิ่ม เบอร์/โฉนด/ที่อยู่; เน้นคำตรง
- ข้อดี: อ่านผลไว, recall สูง · ข้อเสีย: งาน backend index · ระดับ: **Medium**

### P16 · Empty/Loading/Error parity ทุกโมดูล
- ปัญหา: properties fetch เอง(ไม่ใช้ useList) → loading/empty ไม่ identical
- แก้: ย้ายไป `useList` หรือใช้ `ListSkeleton/EmptyState/ErrorState` ให้เท่ากัน + empty มีปุ่ม action + ไอคอน
- ข้อดี: สม่ำเสมอ, perceived perf · ข้อเสีย: refactor เล็ก · ระดับ: **Medium**

## WAVE 2 — Detail Page Consistency (อ้างอิง D6 allstate / D7 / M5)

### P17 · Detail template (sectioned card) — มาตรฐานกลาง
- ปัญหา: property sectioned แล้ว แต่ template ไม่ถูกสกัดเป็น pattern กลาง
- แก้: สร้าง `DetailSection`/`DetailHeader`/`SpecGrid`(icon+label) reuse จาก property
- ข้อดี: ทุก detail หน้าตาเดียว · ข้อเสีย: — · ระดับ: **High**

### P18 · Contract detail → sectioned
- ปัญหา: flat grid (มัดจำปนระยะเวลา)
- แก้: หมวด การเงิน(฿เด่น) / ระยะเวลา / คู่สัญญา / เอกสาร / ประวัติ + sticky action
- **Alternatives:** A. 1 คอลัมน์ sectioned (มือถือ-first, แนะนำ) · B. 2 คอลัมน์ + sticky rail ขวา (เดสก์ท็อป, แบบ D6) · C. responsive: A บนมือถือ→B บนเดสก์ท็อป ⭐
- ข้อดี(C): ดีที่สุดทุกจอ · ข้อเสีย: ต้นทุนกลาง · ระดับ: **High**

### P19 · Customer detail → sectioned
- แก้: หมวด ติดต่อ(เบอร์แตะโทรเด่น) / กิจกรรม(นัด·สัญญา) / เอกสาร; เหมือน P17
- ระดับ: **Medium-High**

### P20 · Owner detail → sectioned + รายการทรัพย์
- แก้: หมวด ติดต่อ / ทรัพย์ที่ถือ(list) / เอกสาร
- ระดับ: **Medium**

### P21 · Lead detail (modal) → sectioned + quick actions
- แก้: หมวด ติดต่อ(โทร) / ความสนใจ(ทรัพย์) / timeline; ปุ่ม "สร้างนัด/ปิดเป็นลูกค้า" เด่น
- ระดับ: **Medium-High**

### P22 · Detail header identity + sticky action rail
- ปัญหา: CTA เลื่อนหายในหน้ายาว
- แก้: header = thumb/avatar + primary + status + key meta; action rail sticky (เดสก์ท็อปขวา / มือถือ bar ล่าง) — อ้างอิง D6
- **Alternatives:** A. sticky bottom bar (มือถือ) · B. sticky right rail (เดสก์ท็อป) · C. responsive A+B ⭐
- ระดับ: **High**

## WAVE 3 — Documents & Attachments (findability 6 เดือน)

### P23 · DocumentSection declutter (ปุ่ม→⋯ menu + ประเภทเด่น)
- ปัญหา: 4 ปุ่ม text/แถว, ชื่อไฟล์ดิบเป็น primary
- แก้: primary=ประเภทเอกสาร(badge), sub=ชื่อไฟล์·วันที่·ผู้แนบ; ยุบ ตรวจ/เก็บถาวร/ลบ ใน `⋯`; "เปิด" คงเด่น
- ข้อดี: เรียบ, แตะถูก · ข้อเสีย: ต้องทำ menu component · ระดับ: **High (ก่อน deploy)**

### P24 · Inline preview (image lightbox + PDF)
- ปัญหา: เปิดไฟล์ = เปิดแท็บใหม่
- แก้: รูป→`Lightbox`(มีแล้ว); PDF→viewer ในหน้า/overlay; thumbnail หน้าแรก
- **Alternatives:** A. lightbox+เปิดแท็บ PDF (เร็ว, แนะนำเฟสแรก) · B. in-app PDF viewer (พรีเมียม, ต้นทุนสูง) · C. thumbnail grid + preview
- ระดับ: **Medium-High**

### P25 · Document search/filter ภายใน entity + group by type
- ปัญหา: 50+ ไฟล์หาไม่เจอ
- แก้: ช่องค้นหา + filter `documentType`; group หัวข้อตามประเภท (โฉนด/สัญญา/รูป…)
- ข้อดี: 6 เดือนก็หาเจอ · ข้อเสีย: — · ระดับ: **High**

### P26 · Upload flow polish (drag-drop + multi + auto-name)
- แก้: drag-drop zone, หลายไฟล์, แนะชื่อจากประเภท+entity ("โฉนด-คุณสมชาย-2026")
- ระดับ: **Medium**

## WAVE 4 — Dashboard & Work Center

### P27 · Dashboard hierarchy (greeting + KPI + งานวันนี้)
- ปัญหา: KPI 4 การ์ดเคยรกตา (แก้บางส่วนแล้ว)
- แก้: greeting จริง(ชื่อผู้ใช้) + KPI ตัวเลขใหญ่ tabular-nums + "งานวันนี้" (นัด/สัญญาใกล้ครบ)
- **Alternatives:** A. KPI row + รายการงาน (แนะนำ) · B. การ์ดสรุป 2x2 (M8 แต่ลดความรก) · C. agenda-first
- ระดับ: **Medium-High**

### P28 · Work-center / notification time-grouping
- แก้: กลุ่ม วันนี้/สัปดาห์นี้/เกินกำหนด; deep-link ไป entity (มี `?focus=` แล้ว)
- ระดับ: **Medium**

### P29 · Calendar polish (hit-area + agenda มือถือ)
- ปัญหา: ตัวเลขวันแตะยาก (<44px)
- แก้: เพิ่ม hit-area; มือถือใช้ agenda list แทนกริดเดือน; today เด่น
- ระดับ: **Medium**

## WAVE 5 — Premium Feel / Motion / Perceived Performance

### P30 · Optimistic updates (complete/cancel/verify/status)
- ปัญหา: ทุก mutation รอ server → รู้สึกหน่วง
- แก้: optimistic + rollback on error (toast), เริ่มที่นัด complete/cancel, document verify, property status
- ข้อดี: "ไว" จริง · ข้อเสีย: ต้อง handle rollback · ระดับ: **High**

### P31 · Skeleton parity + content-shift เป็นศูนย์
- แก้: ทุก list/detail มี skeleton สูงเท่าจริง; reserve ภาพ (aspect-ratio) กัน layout jump
- ระดับ: **Medium-High**

### P32 · Route/page transition feedback
- แก้: top progress bar เบา ๆ ตอนเปลี่ยนหน้า + fade เนื้อหา
- ข้อดี: รู้สึกลื่น · ข้อเสีย: เลี่ยงเกิน 300ms · ระดับ: **Low-Medium**

### P33 · Toast/feedback refinement
- แก้: ตำแหน่ง/อายุ/ไอคอนสถานะ toast สม่ำเสมอ; success/destructive แยกชัด
- ระดับ: **Low**

### P34 · Card/row hover-press pass + list stagger
- แก้: hover border-gold/40 (มีบางส่วน) + press scale + stagger 20–30ms แรกโหลด
- ระดับ: **Medium**

## WAVE 6 — Responsive ลึกทุกอุปกรณ์ (เสา 2)

### P35 · iPad layout (sidebar @ md + 2-col content)
- ปัญหา: iPad ใช้ bottom-nav จนถึง 1024 → เสียพื้นที่/ดูเหมือนมือถือยืด
- แก้: sidebar เริ่ม `md` (768) แบบ icon-rail หรือเต็ม; content 2 คอลัมน์เท่าที่เหมาะ
- **Alternatives:** A. icon-rail @md→full @lg (แนะนำ, ค่อยเป็นค่อยไป) · B. full sidebar @md (พื้นที่หาย) · C. คงเดิม (ไม่แนะนำ)
- ระดับ: **Medium-High**

### P36 · Mobile landscape + foldable + ultrawide
- แก้: ทดสอบจอแนวนอน/พับ; ultrawide จำกัด max-width เนื้อหา (ไม่ยืดเต็ม 100%); ไม่มี overflow แนวนอน
- ระดับ: **Medium**

### P37 · Tablet forms 2-col + touch targets
- แก้: ฟอร์มยาวบน tablet ใช้ 2 คอลัมน์; ปุ่ม/แตะ ≥44px ทุกที่ (touch: variant)
- ระดับ: **Medium**

### P38 · Responsive QA matrix sign-off
- แก้: เช็กลิสต์ มือถือตั้ง/นอน · iPad ตั้ง/นอน · laptop · desktop · ultrawide · foldable × ทุกหน้า → เซ็นรับ
- ข้อดี: รับประกัน "ไม่กากบนอุปกรณ์ใด" · ระดับ: **High**

## WAVE 7 — Public site (web-public) ยกระดับ (อ้างอิง D2/D5/D6/D8/M1)

### P39 · Public listing card premium pass
- แก้: การ์ดทรัพย์ = ภาพ + ชื่อ/code + ราคาเด่น + ทำเล/ห้อง meta (M1/M6)
- **Alternatives:** A. grid การ์ด (แนะนำ) · B. list-row (D8) · C. grid+map split (D1)
- ระดับ: **Medium-High**

### P40 · Public property detail (gallery + sticky inquiry) — อ้างอิง D6
- แก้: gallery (1 ใหญ่+grid เล็ก) + stats-row ไอคอน + Description show-more + **sticky inquiry/contact rail** + map
- **Alternatives:** A. 2-col + sticky rail (เดสก์ท็อป D6) · B. 1-col + sticky bottom CTA (มือถือ) · C. responsive A+B ⭐
- ระดับ: **High** (หน้าขายจริง)

### P41 · Public search/filter (multi-field + range)
- แก้: search bar หลายช่อง (ประเภท/ราคา/ทำเล/ห้อง — D5) + range slider
- ระดับ: **Medium**

### P42 · Public responsive + landing hero
- แก้: hero + floating search (D2/D5); responsive ทุกจอ; perceived perf (skeleton)
- ระดับ: **Medium**

---

## ลำดับแนะนำ (Sequencing)
- **ก่อน deploy (ขั้นต่ำดูโปร):** P1–P4, P8 (Wave 0) · P9–P10, P14, P16 (Wave 1 core) · P23 (Wave 3) · P38 (QA)
- **คู่ขนาน/หลัง deploy ระยะ 1:** Wave 2 (detail) · P11–P12 · P30–P31 · P35
- **หลัง deploy ระยะ 2:** P13/P15 (⌘K), Wave 7 (public), P24–P26, ที่เหลือ

## วินัยทุกเฟส (technique-1)
1. ทำทีละเฟสเล็ก ไม่รวบ
2. เทสทุก breakpoint จริง (มือถือ→iPad→เดสก์ท็อป) + `npx tsc --noEmit` ทุกแอปที่แตะ
3. เจอบัค → อ่าน source → แก้ → เทสซ้ำทั้ง flow
4. ไม่แหกกฎ design system โดยไม่มี A/B/C + เหตุผล/ข้อดี/ข้อเสีย/ผลกระทบ
5. คง Minimal · gold single-accent · ไม่มีอิโมจิ · ไอคอน outline ชุดเดียว

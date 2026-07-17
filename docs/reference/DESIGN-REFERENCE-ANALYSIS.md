# 🔬 DESIGN REFERENCE — Reverse Engineering + Design Translation (ROS)

> วิเคราะห์ไฟล์อ้างอิง 16 ภาพ (มือถือ 8 · เดสก์ท็อป 8) แยกหลักการเป็นเฟส → แปลงเป็น "กฎ" ปรับใช้กับ ROS
> **ไม่ลอกดีไซน์ · เรียนหลักการ · คงเอกลักษณ์ ROS (ดาร์ก Claude-app admin / light premium public · gold accent)**
> อ้างอิงเรนเดอร์ที่ `/tmp/uxpdf/` (m-01..m-08, d-01..d-08)

---

## 0) แคตตาล็อกอ้างอิง (แต่ละไฟล์คืออะไร + คุณค่าต่อ ROS)

| # | ชื่อ/ธีม | ประเภท | คุณค่าต่อ ROS |
|---|---|---|---|
| m-01 | Hommie · ฟ้า | RE mobile (16 จอ) | flow ครบ (splash→detail→payment) · bottom nav |
| **m-02** | **Orelax · เขียวเข้ม+เหลือง/ทอง** | RE mobile | **palette ใกล้ ROS สุด** · pill CTA · 3D tour · calendar booking |
| m-03 | skylimit · ฟ้า | travel | filter · reviews+bar · price breakdown · stepper |
| m-04 | CARBOOK · navy | taxi | isometric illustration (empty/success) · OTP · curved header |
| m-05 | hotel · navy+cream | hotel | price badge ลอยบนรูป · amenity icon-row · center-FAB nav |
| m-06 | dream-home · ขาว-ดำ | RE mobile | full-bleed image + overlap card · category pill(ดำ=on) |
| **m-07** | **Dallal Before/After · ฟ้า** | RE redesign | **บทเรียน UX ตรง ROS: greeting/avatar · active-state · toggle group · See All** |
| m-08 | purple · เบลอ | RE mobile | palette เท่านั้น |
| **d-01** | **Rento · ขาว+blue-pin** | RE web listings | **filter sidebar · dual-slider · show-on-map · card ราคาหนา** |
| d-02 | Reome · เบลอ | RE landing | hero full-bleed + search ทับ + category strip |
| **d-03** | **Apex · serif** | Airbnb web | **dark rounded header · segmented search · category icon-row · carousel section · card ★rating** |
| d-04 | Vacation · เขียว เบลอ | RE landing | hero+search+strip · content sections สลับ |
| **d-05** | **Houseland · olive** | RE landing | **pill-nav · search panel มี label · specs+icon · stats bar** |
| **d-06** | **allstate · ขาว** | RE web detail | **2-col + sticky booking sidebar · gallery 1+2×2 · specs bar คั่นเส้น · urgency** |
| **d-07** | **Royelle · เขียว+ทอง+serif** | luxury detail | **≈ ROS: utility bar · page-hero banner · amenity 3-col icon grid · sticky form · booking rules checklist** |
| **d-08** | **Atlanta · เขียว+cream+serif** | RE editorial | **announcement bar · logo กลาง · listing แถวนอน · serif heading** |

---

# PHASE 01 — ภาพรวมแต่ละหน้า (หน้าที่ · เป้าหมาย · ลำดับสายตา)

**หลักที่พบซ้ำทุกไฟล์:**
- **Landing/Home:** เป้า = "เริ่มค้นหาให้เร็วที่สุด" → hero + **search bar เด่นสุด** (มักทับ hero) มาก่อนทุกอย่าง · ผู้ใช้เห็น: (1) headline บอกคุณค่า (2) search (3) หมวด/quick filter (4) featured listings
- **Listings/Results:** เป้า = "กรอง+เทียบเร็ว" → filter (sidebar เดสก์ท็อป / sheet มือถือ) + grid/row cards + map optional
- **Detail:** เป้า = "ตัดสินใจ+ลงมือ (จอง/ติดต่อ)" → gallery ใหญ่ → identity(ชื่อ/ราคา/rating) → specs → description → amenities → **sticky action (จอง/ติดต่อ) ค้างขวา**
- **ลำดับความสำคัญสายตา (ทุก detail):** รูป > ราคา > ชื่อ/ทำเล > specs > รายละเอียด > amenities > action(sticky)

**→ ROS:** โครงนี้ตรงกับ ROS อยู่แล้ว (public: hero+search / listings / detail 2-col+sticky form) → **ยืนยันทิศถูก** · จุดต่าง = ROS ยังไม่มี category quick-filter บน home, ยังไม่มี map, gallery ยังเป็น carousel

---

# PHASE 02 — Layout & Grid

**เดสก์ท็อป:**
- **Container:** กว้างเต็ม แต่ content มี max-width + gutter ซ้าย-ขวาเยอะ (Apex/Houseland ~1200-1280px)
- **Landing:** hero full-bleed (เต็มกว้าง) → content ใน container · **search panel/strip "ทับรอยต่อ" hero** (overlap ~ -40 to -60px) = signature move (d-02/d-04/d-05)
- **Listings:** 2 คอลัมน์ = **filter sidebar (~280-320px) + results (flex-1)** (Rento d-01) · results เป็น grid 3-col หรือ **row (Atlanta d-08)**
- **Detail:** **2 คอลัมน์ = content (~60-65%) + sticky sidebar (~35-40%)** (allstate/Royelle) · sidebar `position: sticky; top: ~20-24`
- **Gallery detail:** grid "1 รูปใหญ่ซ้าย + 2×2 thumbnail ขวา" (allstate) หรือ "thumbnail column + main" (Royelle)

**มือถือ:**
- 1 คอลัมน์เสมอ · card เต็มกว้าง · **bottom nav ลอย** (pill/แถบ) · filter/menu = **bottom sheet**
- Detail มือถือ: full-bleed image → card เนื้อหาทับล่าง (m-06) → sticky CTA bar ล่าง

**Rhythm/whitespace:** section เว้นห่างเยอะมาก (เดสก์ท็อป ~80-120px ระหว่าง section) · card ภายใน padding 16-24px · **whitespace = สัญญาณพรีเมียม**

**→ ROS translation:**
- ✅ **มีแล้ว:** public detail 2-col+sticky form · admin max-w container
- 🔧 **ปรับ:** (1) public **gallery detail → "1 big + 2×2 thumb"** แทน carousel เดียว (เดสก์ท็อป) (2) เพิ่ม **section spacing** บน public ให้หายใจขึ้น (3) listings เพิ่มทางเลือก **row layout** สำหรับเดสก์ท็อป (info เยอะกว่า grid)
- ❌ **ไม่เอา:** map view (ยังไม่จำเป็น · เพิ่มภายหลังถ้ามี lat/lng)

---

# PHASE 03 — Visual Hierarchy (Primary/Secondary/Tertiary)

**Detail page ทุกไฟล์จัดลำดับเหมือนกัน:**
- **Primary:** รูปหลัก (ใหญ่สุด) + **ราคา (ตัวหนาใหญ่สุดในข้อความ)** + ปุ่ม action (สีทึบเด่น)
- **Secondary:** ชื่อ property (serif/หนา) · rating · specs (icon+number)
- **Tertiary:** address · description · amenities (icon+label เล็ก) · policies
- **ซ่อน/ย่อ:** description ยาว → **"Show More"** (allstate/Apex) · amenities > 6 → grid/collapse

**Listing card:** ราคา = จุดเด่นสุด (bold, ใหญ่) · title รอง · specs จางสุด (muted, บรรทัดเดียว)

**→ ROS translation:**
- ✅ ROS DetailHeader ทำถูก (ราคา gold เด่น · code จาง)
- 🔧 public detail: **description ยาวใส่ "อ่านเพิ่ม/Show More"** (ReadMore มีแล้ว ✓) · admin InfoRow ราคาใช้ `strong` แล้ว ✓
- 💡 **เพิ่ม:** rating/review บน public card (ถ้ามีข้อมูล) = social proof เพิ่ม conversion

---

# PHASE 04 — Typography

**ค้นพบ 2 สำนัก:**
1. **Sans modern** (Hommie/Rento/allstate/Houseland): heading sans หนา (600-700) · tracking tight · body 400 · scale ชัด
2. **Serif editorial** (Apex/Royelle/Atlanta/Dallal-before-after title): **heading = serif** (หรูขึ้น, "อ่านแล้วรู้สึกแพง") · body = sans · = เทรนด์ premium real-estate/hospitality

**Scale ที่พบ (เดสก์ท็อป):**
- Hero H1: ~48-64px / 700 / leading tight
- Section H2: ~28-40px / 600-700 (serif ในสาย editorial)
- Card title: ~18-22px / 600
- Body: 14-16px / 400 / leading 1.5-1.6
- Label/caption/specs: 12-13px / muted
- Price: 18-28px / 700 (เด่นกว่า title)

**→ ROS translation:**
- ✅ ROS ใช้ IBM Plex Sans Thai (sans) — เหมาะ ไม่ต้องเปลี่ยน body
- 💡 **ข้อเสนอใหญ่:** พิจารณา **serif เฉพาะ heading บน public** (hero + section title) เพื่อยกความเป็น editorial-luxury (เช่น "Noto Serif Thai" / เสริมกับ Plex Sans body) — *เป็น system-level ต้องเสนอ/ทดลองก่อน* · admin คง sans (dense CRM ไม่ต้อง serif)
- 🔧 **price hierarchy:** ทำราคาบน public card ให้ **หนา+ใหญ่กว่า title** (ตอนนี้ราคา xl gold ✓ แต่ title font-medium — ปรับ title เบาลง/ราคาเด่นขึ้นได้)

---

# PHASE 05 — Spacing System

**พบระบบ 4/8-based ชัด:**
- micro: 4 · 8 (ภายใน chip, gap icon-label)
- component: 12 · 16 · 20 · 24 (card padding, gap ระหว่าง field)
- section-internal: 32 · 40 · 48
- section-gap (เดสก์ท็อป): 64 · 80 · 96 · 120 (**เยอะ = พรีเมียม**)

**กฎที่เห็น:** ยิ่ง element สำคัญ/ยิ่งจอใหญ่ → รอบข้างยิ่งเว้นเยอะ · mobile บีบ scale ลง ~50-60%

**→ ROS translation:**
- ✅ ROS มี scale Tailwind (4-based) อยู่แล้ว
- 🔧 **public section-gap เพิ่ม** (ปัจจุบัน py-10/mt-14 → เดสก์ท็อปเพิ่มเป็น py-16/py-20 ได้เพื่อหายใจ) · admin คงแน่น (CRM ข้อมูลเยอะ = แน่นถูกแล้ว)

---

# PHASE 06 — Card Analysis

**ชนิด card ที่เจอ:**
1. **Listing card (grid):** รูป rounded (aspect คงที่ 4:3/16:10) → body: title · specs(muted) · **ราคา bold** · badge(rent/sale, near-transit) · hover: **lift+shadow / border accent** · action ลอยบนรูป (heart/+/compare)
2. **Listing row (Atlanta d-08):** รูปซ้าย + info กลาง(2-col amenities) + price/CTA ขวา คั่นเส้นตั้ง — **info เยอะ เหมาะเดสก์ท็อป**
3. **Info/spec card (detail):** bordered, columns คั่นเส้นตั้ง, label บน / icon+value ล่าง (allstate/Royelle)
4. **Sticky action card (detail sidebar):** bordered/สีพื้นจาง, มี form + CTA + urgency

**Radius:** ส่วนใหญ่ 12-20px (ใหญ่ = friendly premium) · **Shadow:** นุ่มมาก/แทบไม่มี (พึ่ง border + whitespace) — ตรงกับ ROS "flat + border" มาก!
**Header/Content/Footer:** card detail มักมี header(title+action) · content · footer(price+CTA)

**→ ROS translation:**
- ✅ **ตรงมาก:** ROS card = flat + border + rounded (16/20) = โทนเดียวกับ reference! · InfoGroup หัว-เนื้อ-ท้าย = pattern เดียวกับ card detail
- 🔧 (1) public listing card เพิ่ม **hover:border-gold** ✓ (ทำแล้ว) (2) เพิ่ม **row-layout option** สำหรับ listings เดสก์ท็อป (แบบ Atlanta) (3) **specs bar แบบ columns+icon+เส้นคั่น** (allstate) → เอามาใช้แทน/เสริม SpecStrip

---

# PHASE 07 — Button Analysis

**ลำดับปุ่มที่พบ:**
- **Primary:** สีทึบเด่น (ดำ/navy/เขียว/**เหลือง-ทอง Orelax**) · **rounded pill (full/lg)** · หนา · full-width ใน form/sidebar
- **Secondary:** outline / ghost / พื้นจาง
- **Icon button:** วงกลม (share/save/more/nav-arrow) · บนรูป = scrim ดำโปร่ง
- **Segmented/toggle:** Buy/Rent, For Rent/For Sale = pill group (active ทึบ)
- **CTA บนรูป (gallery):** วงกลม scrim + ลูกศร

**สังเกต:** Orelax ใช้ **ปุ่ม pill เหลือง-ทอง** เป็น primary = ใกล้ ROS gold มาก · หลายไฟล์ปุ่ม primary = **มุมมนเต็ม (pill)** ไม่ใช่ rounded-lg

**→ ROS translation:**
- ✅ ROS btn-gold = primary ทอง (ตรง Orelax!) · btn-ghost secondary ✓
- 💡 **ทดลอง:** ปุ่ม primary บน public ใช้ **pill (rounded-full)** แทน rounded-lg เพื่อ hospitality-feel (Orelax/Royelle/Atlanta ใช้ pill) — *ทดลองก่อน, admin คง rounded-lg (dense)*
- 🔧 icon-button บนรูป = scrim ดำ (ทำแล้ว D15 ✓)

---

# PHASE 08 — Form Analysis

**Search bar (หัวใจของทุก landing):**
- **แบบ Airbnb (Apex/Atlanta):** pill ยาว แบ่ง segment (Where | Check in | Check out | Who) + ปุ่มกลมค้นหา
- **แบบ panel (Houseland):** card ขาว มี label ต่อ field (Type/Price/Location/Rooms) + ปุ่ม search
- **แบบ simple (ROS ปัจจุบัน):** input + filter + search — เรียบกว่า

**Field:** label เล็กด้านบน · input มี placeholder จาง · dropdown มี chevron · required = `*` · **date = calendar icon** · validation error ใต้ field (สีแดง)
**Booking/contact form (sidebar):** stack fields + label + primary CTA เต็มกว้าง (Royelle: Name/Phone/dates/selects → Book Now)

**→ ROS translation:**
- ✅ ROS Field/Combobox/AppointmentForm = pattern เดียวกัน (label+error+required) ✓
- 🔧 (1) public search: พิจารณายกเป็น **panel มี label** (Houseland) หรือ segmented (Airbnb) เพื่อพรีเมียม (ตอนนี้เรียบ) (2) date field ใส่ **calendar icon** ให้ชัด

---

# PHASE 09 — Information Architecture

**การจัดกลุ่มข้อมูล detail (สอดคล้องทุกไฟล์):**
1. Identity block (ชื่อ · ทำเล · rating · ราคา · action) — อยู่บนสุดใต้รูป
2. **Specs block** (bed/bath/area/parking) — เป็น "แถบ/การ์ด" แยกชัด (highlight) เพราะคือข้อมูลตัดสินใจเร็ว
3. Description (พับได้)
4. Amenities (icon grid)
5. Policies/Rules
6. Related (properties in same area / similar)
7. Action (sticky) — แยกออกมาเป็น sidebar เพื่อ "ลงมือได้ตลอด"

**เหตุผล:** ผู้ใช้ตัดสินใจจาก รูป→ราคา→specs ก่อน (3 วิแรก) → รายละเอียดคือ "ยืนยัน" → action ต้องเอื้อมถึงตลอด (sticky)

**→ ROS translation:**
- ✅ ROS admin (InfoGroup: ราคา→ห้อง→ทำเล→รายละเอียด→amenities→เจ้าของ) + public เรียงคล้ายกันแล้ว
- 💡 **เพิ่ม "Related/Similar"** ให้ครบ (public มี similar carousel แล้ว ✓ · admin ไม่ต้อง) · **specs ทำเป็น "แถบ highlight"** ชัดขึ้น (SSpecStrip ✓ · admin ใช้ InfoRow — อาจเสริม spec-strip ที่หัว)

---

# PHASE 10 — Reading Flow (Eye Tracking)

- **Landing:** Z-pattern → logo(ซ้ายบน) → nav/CTA(ขวาบน) → headline(กลาง/ซ้าย) → **search(จุดโฟกัส)** → หมวด → featured (F-pattern ไล่ลง)
- **Listing grid:** F-pattern · ตากวาดรูป→ราคา(bold ดึงตา)→specs · การ์ดซ้ายบนถูกเห็นก่อน
- **Detail:** รูปใหญ่ดึงตาก่อน → ไล่ลงซ้าย (title/price/specs/desc) → **sidebar ขวาคือ "จุดหมาย" (CTA)** → sticky ทำให้ CTA อยู่ใน viewport เสมอ = ลด cognitive load ตอนตัดสินใจ
- **Cognitive load ต่ำ** เพราะ: 1 บรรทัด 1 ข้อมูล · icon ช่วย scan · whitespace แยกกลุ่ม · ราคา bold เป็น anchor

**→ ROS translation:** ✅ ROS "1 บรรทัด 1 ข้อมูล" (R1) + gold price anchor + sticky form = ตรงหลักนี้แล้ว · 🔧 เสริม icon ใน specs (ช่วย scan) + sticky sidebar public (มีแล้ว ✓)

---

# PHASE 11 — Color System

- **แต่ละแบรนด์มี 1 accent เด่น + neutral:** Hommie(น้ำเงิน) · **Orelax/Royelle/Atlanta(เขียวเข้ม+เหลือง/ทอง)** · allstate/dream-home(ดำ-ขาว) · Houseland(olive)
- **Neutral:** ขาว/cream/เทาอุ่น เป็นพื้น · ข้อความดำ/เทา
- **Accent ใช้กับ:** ปุ่ม primary · ราคา · badge · active state · link — **ใช้น้อย เน้นจุด** (โมโนโครม+accent)
- **สาย editorial:** เขียวเข้ม + cream + ทอง = luxury/trust สำหรับ hospitality

**→ ROS translation:**
- ✅ **ROS ตรงเป๊ะ:** warm neutral + **gold accent เดียว** = ปรัชญาเดียวกับ Orelax/Royelle/Atlanta! · dark admin = โมโนโครม+gold
- 💡 gold ของ ROS = จุดขายที่ตรงเทรนด์ luxury RE พอดี → **ไม่ต้องเปลี่ยน palette · ใช้ให้ "คม" ขึ้น** (ราคา/CTA/active)

---

# PHASE 12 — Iconography
- **outline stroke สม่ำเสมอ** (1.5-2px) · ชุดเดียวทั้งแอป · ใช้กับ: specs(bed/bath/area/parking) · amenities · nav · action
- specs/amenities = **icon + label** (ไม่ใช่ icon เดี่ยว) เพื่อเข้าใจชัด
**→ ROS:** ✅ มี Icon.tsx (outline 1.75) แล้ว · 🔧 **เพิ่ม icon ให้ specs/amenities** (bed/bath/area) — ตอนนี้ ROS specs เป็น text ล้วน (admin) / SpecStrip ไม่มี icon → เติม icon = scan ง่ายขึ้น (ตรง reference ทุกไฟล์)

# PHASE 13 — Divider / Empty / Loading / Skeleton
- **Divider:** hairline จาง (border/40) หรือ whitespace แทน · Atlanta มี **wavy line ตกแต่ง** (brand element)
- **Empty state:** CARBOOK/skylimit ใช้ **isometric illustration + ข้อความ + CTA** (เป็นมิตร) · Hommie "place does not exist" มี graphic
- **Loading:** skeleton card (เทาจาง) · shimmer
**→ ROS:** ✅ มี EmptyState/ErrorState/ListSkeleton · 🔧 พิจารณา **illustration ใน empty state** (อุ่นขึ้น) — *optional, ต้อง asset*

# PHASE 14 — Navigation / Header / Footer
- **Header เดสก์ท็อป:** logo(ซ้าย) · nav แนวนอน(กลาง) · CTA pill(ขวา, "Place an ad"/"List your property"/"Book Now") · บางไฟล์ **nav อยู่ใน pill-group/dark-pill** (Houseland/allstate) · Atlanta = **logo กลาง + hamburger + cart**
- **Announcement bar** (Atlanta): แถบบนสุด promo + signup + ปิดได้
- **Utility bar** (Royelle): phone/email/address + social เหนือ header
- **Bottom nav มือถือ:** 4-5 ไอคอน+label · active ทึบ/สี · บางอันมี **center FAB** (hotel/Orelax)
- **Footer:** สีเข้ม (เขียว/ดำ) + links + social
**→ ROS:**
- ✅ admin sidebar + public header + bottom-nav มีแล้ว
- 💡 public เพิ่มได้: (1) **announcement/utility bar** (โปรฯ/ติดต่อ/social) = พรีเมียม+trust (2) header CTA เด่นขึ้น ("ลงประกาศ"/"ติดต่อเรา" ทำแล้ว) (3) footer เข้ม (มีแล้ว)

# PHASE 15 — Search / Filter / Pagination
- **Filter (Rento d-01):** sidebar · type(pill-check) · **price dual-slider + min/max input** · rooms(circle-check active=ทึบ+✓) · bathroom/view(pill toggle) · **"157 results" + "Show on map" toggle**
- มือถือ: filter = bottom sheet · category = pill row เลื่อนได้
- **Pagination:** load-more / carousel arrows / number
**→ ROS:**
- ✅ ROS มี FilterBar(modal) + Segmented + PriceRange(dual-slider!) + Pagination — **ครบและตรง reference!**
- 🔧 public: filter ปัจจุบันเรียบ → พิจารณา **sidebar filter บนเดสก์ท็อป** (Rento) แทน modal (เห็น filter ตลอด สแกนเร็ว) · เพิ่ม **results count + "ดูบนแผนที่" toggle**

# PHASE 16 — Badge / Status
- badge เล็ก rounded-full · tone: for-rent/for-sale · near-transit/pet · "1 year old" · rating (★+number) · type (House/Apartment + icon)
- **gray pill badge** (Houseland ราคา · Atlanta type) = neutral · **accent badge** = highlight
**→ ROS:** ✅ มี badge/StatusBadge (tone) · 🔧 เพิ่ม type-badge มี icon (House/Condo) บน card · rating badge (ถ้ามีข้อมูล)

# PHASE 17 — Modal / Drawer / Toast / Notification
- modal center · drawer(mobile menu/filter) จากล่าง/ข้าง · toast มุม/ล่าง · notification list (icon+title+time+unread dot)
**→ ROS:** ✅ ครบหมด (Modal/drawer/Toast/NotificationBell) — ไม่ต้องแก้

# PHASE 18 — Gallery / Media (detail)
- **เดสก์ท็อป:** "1 big + 2×2 thumbnail grid" (allstate) หรือ "thumbnail column + main + View All Photos + play(video)" (Royelle)
- **มือถือ:** carousel + dots · 360°/3D-tour (hotel/Orelax) · full-bleed + overlap card
**→ ROS:** 🔧 **public gallery detail → grid "1+2×2"** (ปัจจุบัน carousel) = ดูรูปได้เยอะ/เร็วบนเดสก์ท็อป · เพิ่ม "ดูรูปทั้งหมด" · admin คง carousel (ok)

# PHASE 19 — Property/Card ROS-specific
- **Property card ที่ดี:** รูป aspect คงที่ + type badge + (rating) + title + **specs icon-row** + **ราคา bold เด่นสุด** + hover accent + action(heart/compare) ลอยบนรูป
- **Row layout (Atlanta):** เดสก์ท็อป — รูป | ชื่อ+badge+amenities 2-col | price+CTA คั่นเส้น
**→ ROS:** public card มีเกือบครบ · 🔧 เพิ่ม specs-icon-row + (rating) + type-badge + row-option

# PHASE 20 — Sticky Action / Booking sidebar (จุดแข็งของ reference)
- allstate/Royelle: **sidebar bordered, sticky top-24** · price + form/date + options + **primary CTA เต็มกว้าง** + **urgency ("6 hours left")** + trust ("free cancellation") + report
**→ ROS:** ✅ public มี AppointmentForm sticky แล้ว · 🔧 **เสริม trust/urgency element** (เช่น "ตอบกลับใน 24 ชม." · "ยืนยันฟรี") + สรุปราคาชัด = เพิ่ม conversion

# PHASE 21 — Responsive (mobile/tablet/desktop)
- **desktop:** multi-col (sidebar+content · 3-4 col grid) · hover states · sticky
- **tablet:** 2-col grid · sidebar ยุบ/บนสุด
- **mobile:** 1-col · bottom nav · **filter/menu = bottom sheet** · sticky CTA bar ล่าง · card เต็มกว้าง · touch ≥44px
**→ ROS:** ✅ ROS มีกฎ responsive (เสา 2: มือถือ/แท็บ/พีซี ต่างกัน) + ListView(table↔card) + FilterBar(sheet) — **ตรงหลัก** · 🔧 ตรวจ public เดสก์ท็อปใช้พื้นที่เต็ม (sidebar filter · 2-col detail ✓)

# PHASE 22 — Accessibility / Contrast / Focus / Motion
- contrast สูง (ข้อความเข้มบนพื้นสว่าง) · focus ring · active state ชัด (ทึบ/สี ไม่ใช่แค่จาง)
- **motion:** micro (hover lift, image crossfade, arrow, accordion) — subtle ไม่รก
**→ ROS:** ✅ ROS ทำ a11y AA (gold #8C6E42) + focus ring + hover-direction แล้ว · motion subtle (fade-rise/modal-in) ✓

---

# 🎯 DESIGN TRANSLATION — สรุปกฎสำหรับ ROS (adopt / adapt / reject / redesign)

## ✅ ADOPT (นำมาใช้ตรง — ตรงเอกลักษณ์ ROS อยู่แล้ว)
1. **gold accent เดียว + warm neutral** = ตรงเทรนด์ luxury RE (Orelax/Royelle) → ใช้ให้คมขึ้น (price/CTA/active)
2. **flat + border + rounded-lg card** = โทนเดียวกับ reference → คงไว้
3. **detail 2-col + sticky action sidebar** (public) → มีแล้ว, เสริม trust/urgency
4. **1 บรรทัด 1 ข้อมูล + price bold anchor + icon scan** → มีแล้ว
5. **filter: dual-slider + segmented + toggle + results-count** → ROS มี component ครบ

## 🔧 ADAPT (ปรับให้เข้า ROS)
1. **Specs → icon-row/spec-bar** (bed/bath/area/parking + icon + label + เส้นคั่น) แบบ allstate — ทั้ง admin(InfoRow เสริม icon) + public(SpecStrip เติม icon)
2. **Gallery detail → "1 big + 2×2 thumbnail"** (เดสก์ท็อป) แทน carousel เดียว
3. **Listings เดสก์ท็อป → เพิ่ม row-layout option** (Atlanta) นอกจาก grid
4. **public search → panel มี label / segmented** (Houseland/Airbnb) ยกจากเรียบ
5. **public filter → sidebar บนเดสก์ท็อป** (Rento) แทน modal
6. **card: type-badge(icon) + rating + specs-icon + hover-gold** ครบ
7. **section spacing บน public เพิ่ม** (หายใจ = พรีเมียม)

## 💡 REDESIGN / เพิ่มใหม่ (ทดลอง — เป็น system-level, เสนอ/ทดลองก่อนทำจริง)
1. **Serif heading บน public** (hero + section title) = editorial-luxury (Apex/Royelle/Atlanta) — ทดลองกับ Noto Serif Thai
2. **Primary button = pill (rounded-full)** บน public (Orelax/Royelle) — ทดลอง
3. **Announcement/Utility bar** บน public (promo/ติดต่อ/social) = trust
4. **Trust/urgency element** ใน booking sidebar (ตอบใน 24 ชม. / ยืนยันฟรี)
5. **Stats/social-proof bar** (จำนวนทรัพย์/รีวิว) บน home (Houseland)

## ❌ REJECT (ไม่เอา — ไม่เข้ากับ ROS หรือเกินจำเป็น)
1. **Map view** — ยังไม่มี lat/lng · เพิ่มภายหลังถ้าคุ้ม
2. **Booking/payment/calendar in-app** (Orelax/skylimit) — ROS = ติดต่อนัดชม ไม่ใช่จองออนไลน์
3. **3D/360 tour** — เกิน scope ปัจจุบัน
4. **Isometric illustration ทุก state** — สวยแต่ต้อง asset + อาจขัด minimal · เลือกเฉพาะจุด
5. **Gradient/effect หนัก, สีจัด** — ขัดปรัชญา minimal ของ ROS

---

## 📌 ลำดับที่แนะนำ (ถ้าจะลงมือ — เรียงตามคุ้ม/เสี่ยงต่ำ)
1. **specs icon-row** (admin+public) — คุ้ม, เสี่ยงต่ำ, ตรง reference ทุกไฟล์
2. **public gallery "1+2×2"** — คุ้มบนเดสก์ท็อป
3. **card เสริม** (type-badge icon · rating · row-option)
4. **public filter sidebar (desktop)** — UX ดีขึ้นชัด
5. **trust/urgency ใน sidebar** — เพิ่ม conversion
6. **(ทดลอง) serif heading · pill button · announcement bar** — ยกระดับพรีเมียม, ต้องเห็นจริงก่อนล็อก

> ทุกข้อ = **หลักการ ไม่ใช่ลอก** · คง gold + warm + minimal + "1 บรรทัด 1 ข้อมูล" ของ ROS ไว้ · admin(dark dense CRM) กับ public(light editorial) รับหลักคนละน้ำหนัก

# 🔍 PAGE-BY-PAGE QA SWEEP — ทุกหน้า ทุกปุ่ม ทุก device/responsive

> **กฎ:** ไล่ทีละหน้า → ทีละ device → ทีละ orientation → ทีละส่วน · กด/เปิดทุกปุ่ม/เมนู/โมดัล · เทียบก่อน-หลังทุกครั้ง · เสนอก่อนแก้ (เพิ่ม/ลด/ลบได้หมด) · ห้ามอวย · minimal/clean/ไม่รก
> **Protocol:** ดู memory `ros-comparison-responsive-protocol` · **มือถือ 375 → iPad 768(ตั้ง)/1024(นอน) → Desktop 1440**
> **สถานะ:** ⬜ ยังไม่ทำ · 🟡 กำลังทำ · ✅ ผ่าน · 🐞 เจอปัญหา (ดูโน้ตท้ายไฟล์)

---

## A) WEB-PUBLIC — 5 หน้า (:3000)

| # | หน้า | มือถือ375 | iPad-ตั้ง768 | iPad-นอน1024 | Desktop1440 | ปุ่ม/interactive หลัก |
|---|---|---|---|---|---|---|
| 1 | `/` home | ✅ | ✅ | ✅ | ✅ | สะอาดทุกจอ ไม่ล้น ไม่รก · ไม่ต้องแก้ (ภาพการ์ด=seed mock) |
| 2 | `/properties` listings | ✅ | ✅ | ✅ | ✅ | สะอาดทุกจอ · filter bottom-sheet(มือถือ)+FilterBar(desktop) ok · ไม่ล้น |
| 3 | `/properties/[code]` detail | ✅ | ✅ | ✅ | ✅ | **functional ครบ:** gallery bar✓ Lightbox(X+Esc)✓ AppointmentForm→201✓ StickyCTA #appointment scroll✓ ReadMore=conditional · ไม่ล้นทุกจอ |
| 4 | `/saved` | ✅ | ✅ | ✅ | ✅ | **favorite CRUD ครบ:** add→localStorage→ขึ้น saved→count badge sync→remove→empty · grid=listings(verified) · ไม่ล้น |
| 5 | `/privacy` | ✅ | ✅ | ✅ | ✅ | content page · capped 768px · อ่านง่าย · ไม่ล้น |

## B) WEB-ADMIN — 21 หน้า (:3001, login `admin@ros.local`)

| # | หน้า | มือถือ375 | iPad-ตั้ง768 | iPad-นอน1024 | Desktop1440 | interactive (button\|onClick\|Link) |
|---|---|---|---|---|---|---|
| 1 | `/login` | ✅ | ⬜ | ⬜ | ⬜ | **functional ผ่าน:** fill+submit→authed (requestSubmit) · session persist · ไม่ล้น |
| 2 | `/` dashboard | 🟡 | ⬜ | ⬜ | ⬜ | **มือถือ:** stat cards✓ todo tabs✓ NotificationBell✓ "+"เปิด wizard✓ · เหลือ: GlobalSearch, user menu, bottom-nav + iPad/desktop |
| 3 | `/properties` | ✅ | ✅ | ✅ | ✅ | ListView (ตาราง/การ์ด) · thumb+code+title+ประเภท·ทำเล+สถานะ·ราคา · **[แก้ 2026-07-16] FilterBar responsive:** <lg=ปุ่ม→sheet · ≥lg(iPad-นอน/คอม)=ตัวกรอง inline (dropdowns+ราคา popover) กรองสดไม่บังลิสต์ · **functional:** เลือกคอนโด→propertyType=condo สด · range popover · ล้าง · ค้นหา/segmented/pagination · **shared FilterBar → customers/owners/leads inline sort ด้วย (verify sort=new)** |
| 4 | `/properties/[id]` | ✅ | ✅ | ✅ | ✅ | **verify 4 จอ (2026-07-16):** desktop xl=2-col(760+340) · iPad-นอน1024/iPad-ตั้ง/มือถือ=1-col (ตาม handover) · **gallery per-device:** มือถือ/iPad ลูกศร display:none→ปัด · desktop ลูกศร hover · progressbar ทอง · **functional:** featured toggle PATCH✓ · thumbnail→รูปเปลี่ยน✓ · lightbox 3/10✓ · แก้ไข modal prefill✓ · markRented dialog+reason+cancel(ไม่ execute)✓ · (handover: create/delete/upload/ลบรูป/edit PATCH มือถือ) |
| 5 | `/properties/[id]/edit` | ⬜ | ⬜ | ⬜ | ⬜ | PropertyForm |
| 6 | `/properties/new` | ✅ | ✅ | ✅ | ✅ | **wizard 4 ขั้น ครบทุก device:** มือถือ=CRUD เต็ม(POST 201+DELETE) · iPad ตั้ง/นอน+desktop=modal centered ฟิลด์ครบ ไม่ล้น |
| 7 | `/leads` | ✅ | ✅ | ✅ | ✅ | **responsive ดีมาก:** มือถือ=cards · iPad/desktop=table (คอลัมน์ ลูกค้า/เบอร์/รหัส/สถานะ+pagination) · sidebar↔bottom-nav · add form clean · drawer detail (ทรัพย์ที่สนใจ linked) · **delete flow (confirm guard→19→18) เคลียร์ QA lead แล้ว** · ไม่ล้น ไม่ต้องแก้ |
| 8 | `/appointments` | ✅ | ✅ | ✅ | ✅ | list=cards(มือถือ)↔table(iPad/คอม) · add form modal 512 centered · **create นัดจริง→POST 201→chip โผล่ปฏิทิน(9→10)→cancel POST 201** (ทำจริง submit ครบ) · drawer(พบแล้ว/เลื่อน/ยกเลิก) · ไม่ล้น |
| 9 | `/calendar` | ✅ | ✅ | ✅ | ✅ | **[แก้ f720d7e] iPad≠มือถือ:** จอกว้าง(iPad-นอน/คอม)เดิม 296px+ว่าง 600 → **full-width grid + chip ชื่อนัดในช่อง** (296→842/990px) · มือถือ/iPad-ตั้ง คง dots+day-detail (เหมาะจอแคบ) · tap วัน functional · **มีรูปเทียบ 4 device** · **[แก้ 2026-07-16] day-detail cards 2→1→2 (dip 1024) → `sm:grid-cols-2` monotonic (1/2/2/2)** verify DOM 4 จอ · หลัก density: จอกว้างขึ้นคอลัมน์ไม่ลด |
| 10 | `/contracts` | ✅ | ✅ | ✅ | ✅ | **[แก้ 2026-07-16] แยก sub รวม→คอลัมน์:** การ์ด sub=ทรัพย์ (แทน รหัส·ทรัพย์·สิ้นสุด ที่ตัดเละ iPad) · ตารางคอม=ลูกค้า·รหัส·ทรัพย์·สิ้นสุด·สถานะ·ค่าเช่า (แยก) · verify 4 จอ · FilterBar inline sort · **create จริง:** default วันที่+auto-fill(เลือกทรัพย์→เจ้าของ/ค่าเช่า/มัดจำ)→POST CT-2026-1009→ลบเคลียร์ · ตรง pattern customers/users |
| 11 | `/contracts/[id]` | ✅ | ✅ | ✅ | ✅ | **[แก้ 55983d5] 2-col desktop** info ซ้าย+เอกสารขวา · มือถือ/iPad คง 1-col · **ปุ่มเทสครบ (2026-07-16):** เงื่อนไข add(201)/del(200)✓ · **ออกใบเสร็จจริง POST 201→doc→ลบ doc✓** · **ต่อสัญญาจริง POST 201→CT-1010** (⚠️ renew = **ปิดสัญญาเดิม→ended** + สร้างใหม่) · **ลบร่างจริง (soft-delete)✓** · sign=guard-verified (disabled จน lease+verify · ไม่กดจริง=ต้องอัปโหลดไฟล์) · close=guard-verified (confirm+reason · ไม่กดจริง) · **re-seed คืนสภาพครบ** |
| 12 | `/customers` | ✅ | ✅ | ✅ | ✅ | **[แก้ 2026-07-16] อีเมล = คอลัมน์ table-only** — การ์ด(touch)เดิมยัดอีเมลลง sub-line → iPad ตัดเหลือ "mocl" ขยะ · แก้: การ์ด=ชื่อ+เบอร์ (ตรง owners) · ตารางคอม=ชื่อ+เบอร์+อีเมล+สัญญา (เต็ม) · verify 4 จอ+card-tap นำทาง · **functional:** ค้นหา(debounce)✓ pagination(9–16/18)✓ · widget เทียบก่อน/หลัง |
| 13 | `/customers/[id]` | ✅ | ✅ | ✅ | ✅ | 1-col max-w-3xl **ทุกจอเหมือนกัน (ไม่มี responsive branch → iPad=มือถือ/คอม)** record สั้น=เหมาะ ตรง owners · **แก้ไขจริง PATCH 200→revert✓** · ลบ gate ถูก (มีสัญญา=ลบไม่ได้) · เอกสาร section |
| 14 | `/owners` | ✅ | ✅ | ✅ | ✅ | **[แก้ 2026-07-16] เพิ่มคอลัมน์อีเมล table-only** ให้ตรง customers (consistency) · การ์ด touch เดิม phone-only ✓ · ตารางคอม=ชื่อ+เบอร์+อีเมล+ทรัพย์ · **functional:** เพิ่มเจ้าของจริง POST 201→ลบเคลียร์ · ค้นหา/pagination · card-tap · widget เทียบ |
| 15 | `/owners/[id]` | ✅ | ✅ | ✅ | ✅ | 1-col max-w-3xl **ทุกจอเหมือนกัน (ไม่มี responsive branch)** ตรง customers · richer: พอร์ตทรัพย์+idCard+note · **แก้ไขจริง note→PATCH 200→revert✓** · ไม่มีลบ (owns properties = ถูก) · props/สัญญา/เอกสาร sections |
| 16 | `/community` | ✅ | ✅ | ✅ | ✅ | **รีวิว: ออกแบบดีต่อ device แล้ว ไม่ต้องแก้** · กระดานโมเดอเรชัน text-post = 1-col max-w-3xl ทุกจอ (ถูก — ไม่มี card/table divergence แบบ list) · tabs สถานะ · **functional (สร้าง test post ผ่าน DB):** pending→**อนุมัติ** PATCH→published→**เก็บถาวร** PATCH→archived ครบวงจร · ลบ test post เคลียร์ · ไม่มีโพสต์ใน seed (มาจาก web-public) |
| 17 | `/notifications` | ✅ | ✅ | ✅ | ✅ | **รีวิว: ออกแบบดีต่อ device แล้ว ไม่ต้องแก้** · CategoryBar swipe(touch)/ลูกศร(mouse:, ซ่อนเมื่อ chip พอดี) · feed 1-col max-w-3xl (ถูกสำหรับ notification) · card 768 · **functional:** กรองหมวด(ทรัพย์→9)✓ · mark-all-read PATCH✓ (เผลอกด→กู้คืน 18 unread ครบ) · เตือนตัวเอง: selector อย่าแมตช์กว้าง ("ทั้งหมด"↔"อ่านทั้งหมด") |
| 18 | `/audit` | ✅ | ✅ | ✅ | ✅ | **รีวิว: ดีแล้ว ไม่ต้องแก้** · feed 1-col max-w-3xl (immutable log — ไม่มี action ให้ mutate ถูกต้อง) · **FilterBar inline (regression pass):** การกระทำ+ช่วงเวลา dropdown ≥lg · action=login กรองสด✓ · แถวกางดู diff/IP/เวลาเต็ม✓ |
| 19 | `/users` | ✅ | ✅ | ✅ | ✅ | **[แก้ 2026-07-16] cols:** การ์ด sub=บทบาท (แทน email·บทบาท ที่ตัด) · อีเมล=table-only col · แก้ตารางโชว์บทบาทซ้ำ 2 คอลัมน์ · **CRUD จริง:** สร้าง POST 201→แก้ role PATCH→ลบ (soft-delete deletedAt+suspended) · modal สร้าง/จัดการ/reset pw · FilterBar=ค้นหาอย่างเดียว |
| 20 | `/search` | ✅ | ✅ | ✅ | ✅ | **รีวิว: ดีแล้ว ไม่ต้องแก้** · GlobalSearch (shared: top bar คอม + หน้านี้มือถือ) 1-col max-w-2xl · **functional:** พิมพ์ "ไอดีโอ"→ผลทรัพย์ CD-2026-1001 สด✓ |
| 21 | `/settings` | ✅ | ✅ | ✅ | ✅ | **รีวิว: ดีแล้ว ไม่ต้องแก้** · ฟอร์ม 1-col max-w-2xl (โฟกัส ถูกสำหรับ settings ทุกจอ) · **functional:** แก้ชื่อบริษัท→บันทึก PATCH company.name/contact→revert✓ · ระบบ&นโยบาย read-only |

+ **shared chrome (ทุกหน้า admin):** sidebar/bottom-nav (layout), NotificationBell, GlobalSearch, Icon

---

## ลำดับที่เสนอ (มือถือก่อนทั้งหมด แล้วค่อยไต่ device)
1. **public ก่อน** (5 หน้า เล็ก customer-facing redesign เสร็จแล้ว) → มือถือ → iPad → desktop
2. **admin ต่อ** (21 หน้า) เริ่มหน้าใช้บ่อย: dashboard → properties → leads → appointments

## 🐞 ปัญหาที่เจอ (log)
- **📌 [พฤติกรรม contract 2026-07-16 · ไม่ใช่บั๊ก แต่ต้องรู้ก่อนเทส]**
  - **renew (ต่อสัญญา) = ปิดสัญญาเดิม→`ended` + สร้างสัญญาใหม่** (เดิม active→ended) · **กลับไม่ได้ผ่าน UI** → ถ้าเทสจริงต้อง re-seed คืน
  - **DELETE ผ่าน UI (เอกสาร/สัญญาร่าง) = soft-delete** (ตั้ง deletedAt · API/list ซ่อน แต่แถวยังอยู่ใน DB) · raw prisma query ต้องกรอง deletedAt เอง
  - **sign กด disabled จน lease attached+verified** (guard ถูก) · ทดสอบ enable จริงต้องอัปโหลดไฟล์ lease (preview อัปโหลดไฟล์ไม่สะดวก → เหลือ guard-verified)
- **⚠️ [DB incident + กู้คืนสำเร็จ 2026-07-16]** ตอน re-seed (mock-bulk) เพื่อเคลียร์หลังเทส heavy actions: `clean()` **ล้มที่ owner.deleteMany (FK)** เพราะ **`CD-2026-1009` (QA junk 07-12) อ้าง mock owner** · clean ลบ contracts/appointments/mock customers/leads ไปแล้วก่อนล้ม → demo ว่างชั่วคราว · **กู้:** ลบ CD-2026-1009 junk → re-run mock-bulk สำเร็จ · **สภาพสุดท้าย pristine:** contracts 1001–1008 สดใหม่ (1005=active) · non-mock data ทั้งหมดคงอยู่ (6 property เดิม, CD-2026-1008, ลูกค้า น้องเน/เนติ, LD-0001/0002, 4 owner) · เคลียร์ stray CT-2026-1009/1010 + CD-2026-1009 ที่ค้างจาก session ก่อนด้วย
- **📐 [column grammar — สรุปตอบเจ้าของ 2026-07-16]** คอลัมน์ต่างกันต่อหน้า = **ตั้งใจ ~90% ไม่ใช่บั๊ก** · เกณฑ์: (1) **โครงสร้างเนื้อหา** → 1-col (flow เดียว/record สั้น/form) · 2-col main+340px rail (primary+secondary = entity|เอกสาร → property/contract detail) · N-col symmetric (grid ธรรมชาติ = KPI/calendar 7 วัน/thumbnail) · (2) **max-w ตามความหนาแน่น** (form 2xl→overview 5xl) · (3) **กฎเหล็ก: แตกคอลัมน์ที่ `xl:1280` เท่านั้น ไม่แตกที่ `lg:1024`** (iPad คงเดิม) · **dashboard agenda = 3 หมวด peer → แนะนำคง 1-col** (ไม่มี pattern 3-equal-col ในแอป · ใส่ = สร้าง inconsistency) · **จุดตกค้างจริง:** `calendar` day-cards `sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2` = 2→1→2 (จอกว้างกว่าคอลัมน์น้อยลง) → รอเจ้าของตัดสิน
- **✅ [แก้แล้ว 6b49212] admin detail desktop เสียพื้นที่ 33% + scroll 2682px** (คิด+เสนอ+ถาม→เจ้าของเลือก 2-col) — คอลัมน์เดียว 768px กลาง · แก้: **xl+ = 2 คอลัมน์** (ซ้าย รูป+info · ขวา เอกสาร+ประวัติ) scroll→2074px · **มือถือ/iPad(ตั้ง+นอน 1024)=คอลัมน์เดียวเดิม** (ใช้ xl ไม่ใช่ lg) · verified 4 จอ · **มีรูปเทียบ**
- **✅ [ปรับแล้ว e80a307] empty state icon: admin เทา → ทองจาง** (คิด: โครง public หนัก/admin เบา = ถูกตาม context, ไม่ unify มั่ว · แก้แค่สี icon ผูกแบรนด์) — ถามเจ้าของ→เอา · verified bg gold/10 + สี gold-dark · ใช้ทุก empty list admin · **มีรูปเทียบ**
- **✅ [แก้แล้ว 5e6e5d5] Lightbox 2 แอปไม่ตรงกัน + ลูกศรบนมือถือ** — ทั้งคู่โชว์ลูกศรทุกจอ ไม่มี swipe · admin ลูกศรเปล่า+counter ชิดซ้าย, public ปุ่มกลม+counter กลาง · **แก้ (ถามเจ้าของ→ปัดล้วน):** มือถือ=ปัด ไม่มีลูกศร, desktop=ลูกศรกลม hover, counter กลาง pill ทั้งคู่ · verified: public+admin ปัด 1/11→2/11, ลูกศร display:none มือถือ/flex desktop · **มีรูปเทียบ**
- **✅ [แก้แล้ว e5e9e2e] admin gallery ใช้ chip 1/11 แทนหลอดทอง** (เจ้าของจับได้ — shared-part) — public มือถือใช้หลอดทองบอกตำแหน่ง แต่ admin ยัง chip · แก้: admin ใช้หลอดทอง (role=progressbar) แบบเดียวกับ public · verified มือถือ fill 9% · **มีรูปเทียบ**
- **✅ [แก้แล้ว d47f65c] admin gallery มีลูกศรบนมือถือ** (เจ้าของจับได้) — ลูกศร `‹ ›` render ทุกจอ + ไม่มี swipe ต่างจาก public · **หลักการ:** ลูกศร=desktop(mouse/hover), มือถือ=ปัดนิ้ว · **แก้:** มือถือ/แท็บเล็ต=ปัด(port useSwipe)+ไม่มีลูกศร, desktop=ลูกศร hover · verified: มือถือปัด 1/11→2/11, desktop display:flex · **มีรูปเทียบก่อน-หลัง**
- **[tooling ไม่ใช่บั๊กแอป]** preview_screenshot ที่ admin **1440×900** เรนเดอร์เพี้ยน (เนื้อหากระจุกมุมซ้ายบน) — DOM วัดได้ layout ถูกเต็มจอ · แก้: ใช้ **1280×800** สำหรับ admin desktop
- **ยังไม่เจอบั๊กแอป** จาก home + listings (สะอาดทุกจอ ไม่ล้น ไม่รก)
- **จุดสังเกต (ไม่ใช่บั๊ก รอเจ้าของตัดสิน):** PropertyCard mini-carousel ใช้ **dots** (เช่น 9–11 รูป) — ถ้ารูปเยอะ dots จะถี่ · อาจพิจารณาเปลี่ยนเป็น progress-bar แบบ detail เพื่อความสม่ำเสมอ (แต่เพิ่ม = อาจรก ต้องชั่ง)
- **seed mock images** (พระราม 8 = ภาพ TikTok analytics, ป้าย 1/10 ฯลฯ) = ข้อมูล seed ไม่ใช่บั๊ก (กันภาพพังด้วย onError แล้ว)
- **[created test data]** ส่งฟอร์มนัด → สร้าง lead จริงใน DB: ชื่อ "QA ทดสอบระบบ" เบอร์ 081-234-5678 (property AP-2026-1001) — ลบทีหลังตอน sweep หน้า admin/leads ได้
- **✅ [แก้แล้ว fae8201] appointments แยก วันที่/ทรัพย์ ต่อ device** — มือถือ=วันที่อย่างเดียว(minimal) · iPad=+ทรัพย์คนละบรรทัด · เดสก์ท็อป=คอลัมน์ ทรัพย์ แยก · ใช้ sub-col ตัวที่ 2 (เลี่ยงบั๊ก mouse:hidden ไม่ชนะ sm:block) · verified 375/768/1024/1280 · **มีรูปเทียบ**
- **✅ [แก้แล้ว 9ca8e68] วันที่สากลทั้ง 2 แอป** (เจ้าของสั่ง "ดูอินเตอร์") — `14 Jul 2026 · 09:00` (en-GB/ค.ศ./24ชม.) แทน พ.ศ./เดือนไทย/น. · source เดียว `lib/format.ts` (fmtDate/fmtDateTime/fmtRelative) · verified: appointments/contracts/dashboard/bell · **มีรูปเทียบ (widget)**
- **✅ [แก้แล้ว 5e49218] InfoRow proximity rail** (เจ้าของถาม "ทำไมเว้นกลาง") — sm+ = label w-36 + value รางซ้าย (แบบ Stripe/Linear) · มือถือคง justify-between · แชร์ทุกหน้า detail/modal · verified rail@768/1280 no-overflow · **มีรูปเทียบ (widget)**
- **⚠️ [ค้าง — backend/นอกรอบ frontend] body แจ้งเตือน+เตือนกำหนดยังเป็นวันที่ไทย/พ.ศ.** — มาจาก API `common/util/thai-datetime.ts` (appointment.service:164, scheduler.service:99/132) · ต้องแก้ฝั่ง backend แยก (R2 = frontend-only) · ของเก่าใน DB เป็นไทยอยู่แล้วจน regenerate
- **🧹 [test data ค้าง]** notification "QA test นัด (ลบได้) — วันที่ 15 ก.ค. 2569" ใน bell = ของเทสรอบก่อน · รอเจ้าของอนุมัติลบ
- **✅ [แก้แล้ว f344908] leads แยก source เป็น channel chip ต่อ device** — `เบอร์ · ช่องทาง` → เบอร์(sub) + chip ช่องทาง(sub-col 2) · มือถือ=ชื่อ+เบอร์+สถานะ(ซ่อน source) · iPad=+chip · เดสก์ท็อป=คอลัมน์ ช่องทาง · verified 375/768/1024/1280 · **รูป widget**
- **✅ [แก้แล้ว c654b83] properties แยก ทำเล/ประเภท + เพิ่ม bedrooms** — `ประเภท · ทำเล` → ทำเล(sub ทุกจอ) + ประเภท·นอน specs(sub-col 2, hidden มือถือ) · ดึง bedrooms ที่มีแต่ไม่โชว์มาใช้ (แบบ Zillow) · ประเภท=ข้อความล้วน (การ์ดมีรูปแล้ว) · verified 4 จอ ไม่ล้น · **รูป widget**
- **หมายเหตุ §3.6:** list หลักแยก field ครบ (appointments·leads·properties) · เหลือ dashboard agenda (peer-list สรุป — priority ต่ำ) · customers/owners แยกดีอยู่แล้ว
- **✅ [§4.2 pause-scan overflow — CLEAN]** สแกน height-based (Range line-count) + visual: dashboard·properties(list/detail/form)·contracts·users·appointments·calendar·appointment-modal ที่ 375/667(นอน)/768/1024 — **ไม่เจอ wrap/overflow/ตกกรอบ** (root fix badge-nowrap + cell-truncate ยังอยู่ · controls มี fixed-height ถูก) · scanner แบบ height เดิม false-positive กับ padded controls → ใช้ Range line-count + screenshot จริงแทน
- **✅ [แก้แล้ว beab071] calendar หัวเดือน พ.ศ./เดือนไทย** — เจอตอน pause-scan (ดู screenshot จริง — scanner จับ date-miss ไม่ได้) · `{MONTHS[month]} {year+543}` = "กรกฎาคม 2569" → "July 2026" (toLocaleDateString en-GB) + weekday Su–Sa · date-leak sweep ต่อ (audit·community·customer·owner detail) = clean · **ยืนยันกฎ "ดู screenshot จริงเสมอ"**

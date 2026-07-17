# ROS — UX/UI Audit + Redesign Specification
> Senior Product/UX/UI · HCI · PM · อ้างอิงวินัย `/technique-1` (Minimal · Responsive ต่ออุปกรณ์ · Test-Fix-Test)
> ขอบเขต: `apps/web-admin` (ระบบหลังบ้านทีมงาน) · อ้างอิงโค้ดจริง + เทสบนสแตก :3001 ทุกข้อ
> วันที่: 2026-06-15

---

## บทสรุปผู้บริหาร (อ่าน 30 วิ)

ระบบ **ไม่ได้พังที่รากฐาน** — design tokens, navigation/IA, component library, RBAC ดีและ minimal อยู่แล้ว
ปัญหาจริง = **ระดับการประกอบหน้า (composition) + พฤติกรรมบนมือถือ** ซึ่ง **ส่วน Critical/High ถูกแก้ไปแล้ว 6 เฟส** (ดู §2)
สิ่งที่ **ยังเหลือ** เป็น High 1 + Medium/Low ที่เป็นงานขัดเงาเพื่อให้ "เท่ากันทั้งระบบ" และถึงระดับ Apple/Linear/Stripe (ดู §6, §10)

**คะแนนรวมตอนนี้ (หลังเฟส 0–5):** โครงสร้าง A- · มือถือ A- · ความสม่ำเสมอ B+ · premium-feel B+

---

## ขั้นตอนที่ 1 — Audit ระบบทั้งหมด (Inventory)

### 1.1 หน้าทั้งหมด (13 เส้นทาง)
| กลุ่ม | หน้า | ชนิด |
|---|---|---|
| Auth | `/login` | ฟอร์ม + quick-role |
| ภาพรวม | `/` แดชบอร์ด | KPI 4 + งานตามเวลา |
| คลังทรัพย์ | `/owners` | list + modal สร้าง |
| | `/properties` · `/properties/new` · `/[id]` · `/[id]/edit` | list+filter / wizard 4-step / detail / edit |
| งานขาย | `/leads` | list + modal สร้าง + modal รายละเอียด |
| | `/appointments` | list + modal สร้าง(2 แบบ) + modal รายละเอียด |
| | `/calendar` | ปฏิทินเดือน + modal นัดนอกรอบ |
| | `/customers` · `/customers/[id]` | list / detail+แก้ไข inline |
| | `/contracts` · `/contracts/[id]` | list + modal / detail + ใบเสร็จ/ต่อสัญญา |
| ระบบ (ProfileMenu) | `/notifications` · `/users` · `/audit` · `/settings` | list / list+modal / activity feed / ฟอร์ม |

### 1.2 ฟีเจอร์หลัก
Property lifecycle (ร่าง→เผยแพร่→ไม่ว่าง + ถอนประกาศ) · รูปทรัพย์ (อัปโหลด/ตั้งปก/ลบ/lightbox) · Lead→Customer conversion · Appointment (ดูทรัพย์/นอกรอบ + reschedule/cancel/no-show/complete) · Contract (sign/renew/receipt/end) · Documents (แนบ/ตรวจสอบ) · Activity timeline · Global search · Notifications · RBAC (สิทธิ์ตามบทบาท)

### 1.3 ปุ่ม (ลำดับชั้นที่ใช้จริง)
- **Primary** `.btn-gold` (1 ต่อหน้า: เพิ่ม/บันทึก/เผยแพร่)
- **Secondary** `.btn-ghost` (แก้ไข/ยกเลิก)
- **Danger** `.btn-ghost text-danger` (ลบ/ถอน/ปิด)
- **Promote** `.btn-primary` (ดำ — submit-review/รับ Lead)

### 1.4 เมนู (Navigation)
- **Desktop ≥1024:** sidebar จัดกลุ่ม `ภาพรวม / คลังทรัพย์ / งานขาย` + ระบบอยู่ใน ProfileMenu
- **Mobile/Tablet <1024:** bottom-nav 5 ช่อง (หน้าหลัก·ทรัพย์·Lead·นัด·เมนู) + drawer เต็ม

### 1.5 Workflow หลัก (จำนวนคลิกตั้งต้น→สำเร็จ)
1. เพิ่มทรัพย์: ทรัพย์→+เพิ่มทรัพย์→wizard 4 ขั้น→บันทึก→(เปิด detail) เพิ่มรูป→เผยแพร่ ≈ **9–12 คลิก**
2. รับ Lead walk-in: Lead→+Lead→กรอก 2 ช่อง→สร้าง ≈ **4 คลิก**
3. สร้างนัดดูทรัพย์: นัด→+นัด→เลือก Lead+ทรัพย์+เวลา→สร้าง ≈ **6 คลิก**
4. ปิดการขาย: Lead detail→ปิดจบ(เป็นลูกค้า)→สร้างสัญญา→ลงนาม ≈ **7 คลิก**

---

## ขั้นตอนที่ 2 — ปัญหา + ความรุนแรง (สถานะ ณ วันนี้)

### 🔴 Critical — **แก้แล้วทั้งหมด (เฟส 0–1)**
| ปัญหา | สาเหตุ | ผลต่อผู้ใช้ | สถานะ |
|---|---|---|---|
| มือถือซูมเข้าเองตอนกรอก ปุ่มล้นจอ | input 14px (iOS บังคับซูม <16px) | กรอกข้อมูลแทบไม่ได้ | ✅ แก้ `.field`→16px + viewport |
| ฟอร์มเด้งล่างจอ ปุ่มโดนแป้นพิมพ์กิน | Modal เป็น bottom-sheet ปุ่มอยู่ในเนื้อเลื่อน | กดยืนยันไม่ได้ | ✅ Modal กลางจอ + body เลื่อน + max-h dvh |
| ตัวกรองจังหวัดคืน 0 เสมอ | DB เก็บชื่อไทย แต่ filter ส่ง code | กรองใช้ไม่ได้เลย | ✅ ใช้ labelTh ทั้ง form+filter |

### 🟠 High
| ปัญหา | สาเหตุ | ผล | สถานะ |
|---|---|---|---|
| ค้นหาพิมพ์ตัวย่อ/ไม่เต็มไม่เจอ (กทม/อพาท) | ไม่มี synonym, จับ substring อย่างเดียว | หาของไม่เจอ | ✅ เพิ่ม synonym/รากคำ |
| **ใช้ `prompt()`/`confirm()` รับ input** — ออกใบเสร็จ, ต่อสัญญา, ปิดสัญญา/ถอนประกาศ(เหตุผล), ลบ | กล่อง native browser | ❌ ไม่ premium, สไตล์ไม่ได้, มือถือแย่, ไม่ accessible | **OPEN** → §10-A |

### 🟡 Medium
| ปัญหา | ผล | สถานะ |
|---|---|---|
| Dashboard "สวัสดี, System" + 4 การ์ดรกตา | ไม่ minimal | ✅ เฟส 2 |
| Property detail ข้อมูลปนหมวด (มัดจำปนห้อง) + รูปยาว 4 แถว | อ่านยาก | ✅ เฟส 3 (จัดหมวด + รูป 2×2) |
| **Contract/Customer detail ยังใช้ flat grid เดิม** (ไม่จัดหมวดเหมือน property) | ไม่สม่ำเสมอ | **OPEN** → §10-B |
| กระดิ่งเป็น event log เฉย ๆ ไม่เตือนงานตามเวลา | พลาดนัด/สัญญาใกล้ครบ | ✅ เฟส 4 (work-center) |
| GlobalSearch ซ่อนบนมือถือ (`sm:block`) | มือถือไม่มีค้นหารวม | **OPEN** → §10-C |
| iPad ใช้ bottom-nav (sidebar เริ่ม 1024) | iPad แนวนอนเสียพื้นที่ | **OPEN (Low-Med)** → §10-D |

### 🟢 Low
- Calendar: ตัวเลขวันแตะยากเล็กน้อย (<44px) · max-width detail ไม่เท่ากัน (property 4xl / contract 3xl) · faint text `#A8A29E` contrast ต่ำบนบางพื้น · focus-visible ring ยังไม่ครบทุก control

---

## ขั้นตอนที่ 3 — Information Architecture

**ประเมิน: ดีอยู่แล้ว.** เมนูจัดกลุ่มตาม mental model ธุรกิจอสังหา (คลังทรัพย์ → งานขาย) และซ่อนงานระบบไว้ ProfileMenu ลด cognitive load บน sidebar ✅
**ข้อเสนอ:** คงโครงสร้างนี้ — อย่ารื้อ. ปรับเฉพาะ (a) ให้ iPad เห็น sidebar (b) มือถือมี global search. โครงสร้าง entity: เจ้าของ→ทรัพย์→(Lead→นัด→ลูกค้า→สัญญา) เป็น chain ที่ถูกต้องแล้ว

---

## ขั้นตอนที่ 4 — User Flow (ลดคลิก)
- **เพิ่มทรัพย์ (9–12 คลิก):** wizard 4 ขั้นเหมาะกับ Miller's Law (chunk) แต่ขั้น "ราคา & ห้อง" แน่น → คงไว้ได้ แต่ทำให้ "เพิ่มรูป" ทำต่อได้ทันทีหลังบันทึก (ตอนนี้ต้องเปิด detail เอง) → ลด 1–2 คลิก
- **ออกใบเสร็จ/ต่อสัญญา:** ตอนนี้ 2–3 `prompt()` ซ้อน = สับสน → รวมเป็น Modal เดียวกรอกครบจบ (§10-A) ลดเวลา + error
- **Quick actions บนการ์ด list:** ปัจจุบันต้องเข้า detail ก่อนทุกครั้ง → เพิ่ม swipe/⋯ บนการ์ด (โทร Lead / ดูทรัพย์) เป็น nice-to-have

---

## ขั้นตอนที่ 5 — Visual Hierarchy
ระบบทำถูกหลักแล้ว: 1 primary gold ต่อหน้า, danger จาง, ข้อมูลรองสีจาง. จุดที่พังคือ detail เดิม (ทุกอย่างน้ำหนักเท่ากัน) — แก้ที่ property แล้ว, เหลือ contract/customer (§10-B). ราคาควรเด่นสุดในการ์ดทรัพย์ ✅ ทำแล้ว

---

## ขั้นตอนที่ 6 — UI Simplification (Simplicity Test ต่อหน้า)
ผ่านส่วนใหญ่. รายการที่ "ลบ/รวม/ซ่อน" ได้:
- **ลบ:** `prompt()` ทั้งหมด → Modal · ข้อความ hint ยาวในแถบสถานะ (ย่อแล้วใน property)
- **รวม:** flat specs ที่กระจัดกระจาย → กลุ่มหมวด (ทำที่ property แล้ว ทำต่อ contract/customer)
- **ซ่อน:** รายละเอียดรองใน detail → ใช้หมวด/See-more (รูปทำแล้ว)

---

## ขั้นตอนที่ 7 — ตรวจตามหลัก UX
| หลัก | สถานะระบบ |
|---|---|
| **Hick's** (ลดตัวเลือก) | ✅ 1 primary/หน้า, filter รวมปุ่มเดียว |
| **Fitts's** (เป้าใหญ่/ใกล้) | ✅ ปุ่ม 44px, bottom-nav · ⚠️ ตัวเลขปฏิทินเล็ก |
| **Miller's** (chunk 7±2) | ✅ wizard, หมวด detail |
| **Jakob's** (ตามที่คุ้น) | ✅ bottom-nav, bell, การ์ด |
| **Gestalt** (proximity/similarity) | ✅ หลังจัดหมวด detail |
| **Progressive Disclosure** | ✅ filter sheet, รูป see-more · ⚠️ ใช้เพิ่มได้ที่ detail ยาว |
| **Accessibility** | ⚠️ `prompt()` ไม่ a11y, focus-ring/contrast ยังไม่ครบ |
| **Decision Fatigue** | ✅ ลดปุ่ม/หน้าแล้ว |

---

## ขั้นตอนที่ 8 — Mobile First
✅ ทำแล้ว: touch ≥44px, ไม่มี overflow แนวนอน, table→card, filter→sheet, modal กลางจอ, input 16px (ไม่ซูม), ปุ่มในระยะนิ้วโป้ง (bottom-nav).
⚠️ เหลือ: global search บนมือถือ (§10-C), one-handed quick action บนการ์ด, ปฏิทินแตะ.

---

## ขั้นตอนที่ 9 — Benchmark
| ด้าน | ROS ตอนนี้ | ระดับโลก | ช่องว่าง |
|---|---|---|---|
| Palette/Type | gold+warm-neutral, Plex+Inter | Stripe/Linear | ✅ ทัดเทียม |
| Forms | Modal กลางจอ, inline error, 16px | Stripe | ✅ ดี · ❌ ยังมี `prompt()` |
| Empty states | มีข้อความ + ปุ่ม | Notion | ✅ ดี (เพิ่มภาพ/ไอคอนได้) |
| Detail layout | property จัดหมวดแล้ว | Linear issue view | ⚠️ contract/customer ยังตาม |
| Command/Search | global (desktop only) | Linear/Raycast ⌘K | ⚠️ ไม่มีบนมือถือ, ไม่มี ⌘K |
| Motion | transition พอดี ไม่ฟุ่มเฟือย | Vercel | ✅ ตรงปรัชญา |

---

## ขั้นตอนที่ 10 — Redesign (เฉพาะรายการ OPEN, เรียงความสำคัญ)

### A) แทน `prompt()`/`confirm()` ด้วย Modal — **High**
1. **ปัญหาเดิม:** ออกใบเสร็จ/ต่อสัญญา/ปิดสัญญา/ถอนประกาศ/ลบ ใช้กล่อง native ของเบราว์เซอร์
2. **สาเหตุ:** เขียนเร็วด้วย `prompt()`/`confirm()`
3. **แก้:** ใช้ `Modal` (มี `footer` prop แล้ว) + `Field`/`Combobox` + inline validation; ปุ่มลบใช้ confirm-modal มาตรฐาน
4. **Layout ใหม่:** Modal กลางจอ — หัวข้อ + ฟิลด์ (เช่น ใบเสร็จ: จำนวนเงิน + รายการ) + footer [ยกเลิก][ยืนยัน]
5. **Nav:** เปิด/ปิดด้วย state เดียว ไม่หลุด context
6. **Component:** reuse `Modal`, `Field`; เพิ่ม `ConfirmDialog` กลาง 1 ตัวสำหรับ "ลบ/ปิด"
7. **Wireframe:** `[หัวข้อ ✕] / [label+input] / [label+textarea] / —— / [ยกเลิก] [ยืนยัน(gold)]`
8. **UX:** validate ก่อนส่ง, error ใต้ช่อง, มือถือไม่ซูม, ปุ่มตรึงล่าง
9. **UI:** สอดคล้องทั้งระบบ, premium, สไตล์ได้
10. **ผล:** เลิกกล่องเทา ๆ ของเบราว์เซอร์ → ดูเป็นผลิตภัณฑ์เดียว, มือถือใช้ได้, a11y ดีขึ้น

### B) Contract & Customer detail → จัดหมวดเหมือน Property — **Medium**
1–3. เดิม flat grid ปนหมวด → ใช้ pattern กลุ่มหัวข้อ (`card divide-y` + `<section>` + ป้ายหมวดเล็ก uppercase) แบบเดียวกับ property detail
4. **Contract:** กลุ่ม `การเงิน` (ค่าเช่า/มัดจำ/ค่านายหน้า) · `ระยะเวลา` (เริ่ม/สิ้นสุด/ลงนาม) · `คู่สัญญา` (ลูกค้า/ทรัพย์) · เอกสาร · ประวัติ
   **Customer:** `ติดต่อ` (ชื่อ/เบอร์/อีเมล/ที่อยู่) · `กิจกรรม` (นัด/สัญญาที่ผูก) · เอกสาร
7. Wireframe = section-card เดียวกับ property
10. **ผล:** detail ทุกชนิดหน้าตาเดียวกัน อ่านเป็นกลุ่ม สม่ำเสมอ + max-width เท่ากัน (เลือก `max-w-4xl`)

### C) Global Search บนมือถือ — **Medium**
- เดิม `hidden sm:block` → มือถือไม่มี. เพิ่มไอคอนแว่นบน header มือถือ → เปิด overlay ค้นหาเต็มจอ (input 16px) reuse logic GlobalSearch เดิม. ผล: หาทรัพย์/Lead/ลูกค้าได้ทุกที่

### D) iPad layout — **Low–Med**
- เดิม sidebar เริ่ม `lg` (1024) → iPad เห็น bottom-nav. ปรับ sidebar ให้เริ่ม `md` (768) แบบ icon-rail หรือ sidebar เต็มแนวนอน. ผล: iPad ใช้พื้นที่คุ้ม ไม่เหมือนมือถือยืด (ตรงเสา 2 ของ technique-1)

### E) ขัดเงา Accessibility/Polish — **Low**
- เพิ่ม `focus-visible:ring` ทุกปุ่ม/ลิงก์ · ยกระดับ contrast `faint` ในจุดข้อความสำคัญ · ปฏิทินเพิ่ม hit-area ของวัน · empty-state เติมไอคอนจาง

---

## Deliverables (ตามที่ขอ)

### UX Specification (สรุป)
ผู้ใช้ = ทีมเซลส์/แอดมินอสังหา ทำงานบนมือถือเป็นหลัก ภาคสนาม → **mobile-first, one-screen-per-task, ลดการพิมพ์, ยืนยันงานเร็ว, เห็นงานตามเวลา (วันนี้/สัปดาห์/เดือน)**

### UI Design System (มีอยู่แล้ว — คงไว้)
- สี: `ink #1A1A1A` · accent `gold #B89968/#A07F4F` · neutral `surface/canvas/border/muted/faint` · status `success/warning/danger/info`
- ตัวอักษร: IBM Plex Sans Thai + Inter · มือถือ input 16px / จอใหญ่ 14px
- รัศมี: card 12 / xl2 16 · เงา: card/lift (เบา) · ปุ่ม 44px (sm 36)
- คอมโพเนนต์มาตรฐาน: `PageHeader · FilterBar · ListView · Modal(+footer) · Field/SelectField/Combobox · Segmented · Pagination · StatusBadge · Icon (outline ชุดเดียว, ห้ามอิโมจิ)`

### Information Architecture / Navigation (คงโครงสร้าง)
`ภาพรวม` · `คลังทรัพย์(เจ้าของ·ทรัพย์)` · `งานขาย(Lead·นัด·ปฏิทิน·ลูกค้า·สัญญา)` · ระบบ→ProfileMenu — Desktop sidebar / Mobile bottom-nav+drawer (เพิ่ม sidebar ที่ iPad)

### Layout มาตรฐาน
- **Mobile:** header(brand·search·bell·profile) → เนื้อหา 1 คอลัมน์ การ์ด → bottom-nav
- **iPad:** + sidebar/rail, เนื้อหา 2 คอลัมน์เท่าที่เหมาะ
- **Desktop:** sidebar 248px + เนื้อหา max-w-4xl/5xl จัดกลาง

---

## แผนทำต่อ (ถ้าอนุมัติ — ทำเป็นเฟส เทสทุกครั้ง)
**เฟส 6:** แทน `prompt()`/`confirm()` ด้วย Modal/ConfirmDialog (A) — High
**เฟส 7:** Contract + Customer detail จัดหมวด (B) — Medium
**เฟส 8:** Global search มือถือ (C) + iPad sidebar (D) — Medium
**เฟส 9:** Accessibility/polish (E) — Low

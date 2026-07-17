# ROS — Pre-Deploy Polish Changelog + On-Device QA Checklist
> สรุปงานขัดเงา pre-deploy (session นี้) + checklist ที่ต้อง **เทสบนอุปกรณ์จริง** ก่อนปล่อย
> อ้างอิงวินัย `/technique-1` · คู่กับ [FINAL-PREDEPLOY-EXPERIENCE-AUDIT.md](FINAL-PREDEPLOY-EXPERIENCE-AUDIT.md)
> สถานะ: ทุกการเปลี่ยนแปลง typecheck + `next build`/`nest build` ผ่านทั้ง 3 แอป

---

## 1. Executive Summary
ยกระดับจาก "ใช้งานได้" → "พร้อม production พรีเมียม" โดย **ไม่รื้อระบบ** — เพิ่มเป็นชั้น (polish layer) ตามแผน 42 เฟส เน้น 4 แกน: **ไว · หาง่าย · สม่ำเสมอ · สมบูรณ์** พร้อมแก้บั๊กที่เจอระหว่างทาง 4 จุด (รวมบั๊ก dropdown ตกกรอบที่กระทบทั้งระบบ)

**Deploy readiness:** เชิงเทคนิคพร้อม (build เขียวทั้ง web-admin/web-public/api) · เหลือ **เทสสัมผัสบนอุปกรณ์จริง** (§6) ที่ preview จำลองไม่ได้

---

## 2. สิ่งที่ทำ (แยกตามแกน)

### แกน "ไว / พรีเมียม" (perceived performance + motion)
| งาน | ไฟล์ | รายละเอียด |
|---|---|---|
| ตัวเลขเงินเรียงตรง (tabular-nums) | `ui.tsx` (Pagination), properties/contracts/leads | เลขหลักพัน/หมื่นเรียงคอลัมน์ อ่านไว ดูแพง |
| Press/lift การ์ดในลิสต์ | `components/ui.tsx` (ListView card) | hover ยกเงา + กดยุบ `active:scale-[.99]` ease-standard |
| Optimistic update | ดู §3.1 | นัด (พบ/ยกเลิก) · เอกสาร (ตรวจ/เก็บ/ลบ) · ทรัพย์แนะนำ · Lead (เริ่มดูแล/รับ/ปิดจบ) — เด้งทันมือ + rollback |

### แกน "หาง่าย" (search / filter / IA)
| งาน | ไฟล์ | รายละเอียด |
|---|---|---|
| Quick-filter สถานะ (Segmented) | appointments/leads/properties/contracts | ย้ายสถานะจากแผ่นตัวกรอง → แตะเดียวเห็นชัดเหนือลิสต์ |
| ตัวกรองช่วงค่าเช่า (slider 2 หัว) | `PriceRange.tsx` (ใหม่), `ui.tsx` (FilterBar `range`), properties + `query-property.dto.ts` + `property.service.ts` | เพิ่มความสามารถที่ขาด (เดิมกรองค่าเช่าไม่ได้) + debounce 300ms กัน request storm |

### แกน "สม่ำเสมอ" (consistency)
| งาน | ไฟล์ | รายละเอียด |
|---|---|---|
| Contract identity + คู่สัญญา | `contracts/[id]/page.tsx` + `contract.service.ts` (findOne include) | หัวข้อ = ชื่อลูกค้า (แทน "สัญญาเช่า") + การ์ดคู่สัญญากดไป ลูกค้า/ทรัพย์/เจ้าของ |
| เอกสาร: จัดกลุ่ม + ยุบปุ่ม + พรีวิวรูป | `DocumentSection.tsx` | กลุ่มตามประเภท (taxonomy) · ยุบ ตรวจ/เก็บ/ลบ หลัง chevron · รูป→Lightbox ในหน้า, PDF/HTML→แท็บใหม่ |

### แกน "สมบูรณ์" (completeness) + อุปกรณ์
| งาน | ไฟล์ | รายละเอียด |
|---|---|---|
| Empty-state context-aware | `ui.tsx` (ListView `emptyAction`) + 4 ลิสต์ | กรองไม่เจอ→"ไม่พบ…" + [ล้างตัวกรอง] · ว่างจริง→"ยังไม่มี…" + [+ เพิ่ม…] |
| iPad/แท็บเล็ตโปร่งขึ้น (Option B) | `layout.tsx` (`sm:touch:px-6`) + `ui.tsx` (`lg:grid-cols-3`) | padding โปร่งบน touch ≥640 · iPad แนวนอน ≥1024 การ์ด 3 คอลัมน์ · คง bottom-nav (ไม่แตะ nav architecture) |

---

## 3. รายละเอียดเทคนิคที่ควรรู้ (สำหรับคนดูแลต่อ)

### 3.1 Optimistic pattern
- `useList` เพิ่ม `mutate((rows)=>rows)` สำหรับแก้ state ในเครื่องทันที (`lib/useList.ts`)
- แพตเทิร์น: อัปเดตแถว + ปิด modal ทันที → ยิง API เบื้องหลัง → สำเร็จ `reload()` sync · ล้มเหลว `reload()` rollback + toast error
- **ตั้งใจไม่ทำ optimistic:** เปลี่ยนสถานะ lifecycle ทรัพย์ (approve/reject), Lead convert, ลบ (side-effect หนัก/ความถี่ต่ำ) → ปล่อย reload

### 3.2 ตัวกรองช่วงค่าเช่า
- `FilterBar` มี prop `range?: RangeDef` (additive — หน้าอื่นไม่กระทบ)
- ค่าช่วง: `rentMin`/`rentMax` (live สำหรับสไลเดอร์) → debounce 300ms → query param (`dRentMin`/`dRentMax`)
- Backend: `monthlyRent { gte, lte }` — RENT_MAX=100000, RENT_STEP=1000

### 3.3 iPad = pointer-based layout (สำคัญ)
- `tailwind.preset`/config: `mouse` = `(min-width:768px) and (not (any-pointer:coarse))` · `touch` = `(any-pointer:coarse)` — **แยกขาดกัน**
- iPad (coarse) ใช้ mobile shell (bottom-nav + การ์ด) เสมอ ไม่ว่าจอกว้างแค่ไหน (ตัดสินใจ Option B: คงไว้ เพราะ ergonomics การถือ iPad)

---

## 4. บั๊กที่เจอ + แก้ (ระหว่างการเทส)
| # | บั๊ก | สาเหตุ | แก้ |
|---|---|---|---|
| B1 | **Dropdown ตกกรอบทุก modal** (กระทบทั้งระบบ) | `animate-modal-in` ใช้ `fill: both` → identity transform `matrix(1,0,0,1,0,0)` ค้างบนกล่อง modal → เป็น containing block ดักจับ `position:fixed` ของเมนู | `modal-in` → `fill: backwards` ใน `tailwind.preset.cjs` (root cause, 1 บรรทัด, แก้ทุก Combobox ทุก modal ทั้ง 2 แอป) |
| B2 | ใบเสร็จ HTML จะแตกใน image lightbox | เขียนเงื่อนไข `isPdf?แท็บ:lightbox` (ยัด HTML เข้า lightbox รูป) | เปลี่ยนเป็น `isImage?lightbox:แท็บใหม่` |
| B3 | ลากสไลเดอร์ค่าเช่า = ยิง API ทุกสเตป (renderer ค้าง) | apply live ทุก onChange | debounce 300ms (`useDebouncedValue`) |
| B4 | `sm:px-6` ทับ `mouse:px-8` เดสก์ท็อป (padding หด 32→24) | custom variant `mouse` ถูก emit ก่อน `sm` | scope เป็น `sm:touch:px-6` (mouse/touch แยกขาด ไม่ชนกัน) |

---

## 5. สถานะ Build / Verify
- `npx tsc --noEmit` — ผ่านทุกครั้งที่แก้ (web-admin + api)
- `next build` **web-admin** ✓ (20 routes, First Load 87–117kB) · **web-public** ✓ (8 routes)
- `nest build` **api** ✓
- เทส flow จริงบน preview :3001 ทุกฟีเจอร์ (optimistic timing, filter counts ตรง DB, empty-state, dropdown alignment)

---

## 6. ✅ On-Device QA Checklist (ต้องทำเองบนเครื่องจริง — preview จำลองไม่ได้)
> preview รายงาน pointer เป็น "fine" เสมอ → **เทส touch/iPad จริงไม่ได้** จุดเหล่านี้ยืนยันด้วยตรรกะ+กฎ CSS แล้ว แต่ควรสัมผัสจริง

### 6.1 iPad (สำคัญสุด — P35 verify แค่เชิงตรรกะ)
- [ ] **iPad แนวตั้ง (768):** ใช้ mobile shell (bottom-nav) · การ์ด 2 คอลัมน์ · padding โปร่ง ( px-6) ไม่ชิดขอบ
- [ ] **iPad แนวนอน (1024+):** การ์ดลิสต์ **3 คอลัมน์** · ไม่มีจอโล่ง/ยืด
- [ ] bottom-nav แตะถึงด้วยนิ้วโป้ง · ไม่มี overflow แนวนอน
- [ ] เปิด dropdown ในฟอร์ม/ตัวกรอง → **ไม่ตกกรอบ** (B1) · แตะเลือกได้
- [ ] Modal ฟอร์มยาว → เลื่อนในกล่องได้ ปุ่มล่างไม่โดนคีย์บอร์ดกิน

### 6.2 มือถือ (iOS + Android)
- [ ] กรอกฟอร์ม → **จอไม่ซูมเอง** (input 16px) · ปุ่มยืนยันเห็น/กดได้ตอนคีย์บอร์ดขึ้น
- [ ] quick-filter Segmented เลื่อนแนวนอนได้ · แตะเปลี่ยนสถานะไว
- [ ] สไลเดอร์ค่าเช่า: ลาก 2 หัวได้ลื่นด้วยนิ้ว · ปล่อยแล้วลิสต์อัปเดต
- [ ] กด "พบลูกค้าแล้ว"/"เริ่มดูแล" → modal ปิดทันที รู้สึกไว
- [ ] เปิดรูปเอกสาร → Lightbox เต็มจอ ปัดดูได้ · PDF เปิดแท็บใหม่
- [ ] จอแนวนอน (landscape) · จอพับ (ถ้ามี) → ไม่ล้น

### 6.3 เดสก์ท็อป / จอใหญ่
- [ ] ลดขนาดหน้าต่าง/พับจอ ไล่ทุก breakpoint (มือถือ→iPad→laptop→desktop→ultrawide)
- [ ] ultrawide: เนื้อหาไม่ยืดเต็ม 100% (max-width คุม)
- [ ] hover การ์ด/แถว → ยกเงานุ่ม · กดปุ่ม → ยุบเล็กน้อย
- [ ] dropdown ทุกหน้า (ตัวกรอง/ฟอร์ม/ค้นหา) → อยู่ในจอ ตรงแนว trigger

### 6.4 ทั่วไป (accessibility + edge)
- [ ] คีย์บอร์ด: Tab เห็น focus ring · Combobox ↑↓/Enter · ⌘K/"/" เปิดค้นหา
- [ ] Dark mode (admin): โทน warm dark สม่ำเสมอ ไม่มีจุดขาว/ดำโดด
- [ ] ทดสอบ optimistic ตอน **เน็ตช้า/หลุด** → rollback + toast error ทำงาน
- [ ] ข้อมูลจริงเยอะ (100–1000 แถว) → pagination/ค้นหา/กรองยังไว

---

## 7. รายการที่ตั้งใจเลื่อน (Deferred — เหตุผลชัด)
- **P22 sticky action rail:** เดสก์ท็อปต้องรื้อ detail เป็น 2 คอลัมน์ + มือถือชนกับ bottom-nav → ไม่คุ้มเสี่ยงตอน pre-deploy
- **Appointment time presets (วันนี้/สัปดาห์นี้):** ต้องเพิ่ม backend dateFrom/dateTo + ทับซ้อน date picker เดิม + เสี่ยงหัวหน้ารก → ทำภายหลังถ้าต้องการ
- **P13/P14/P15 (⌘K/mobile search/grouping):** ตรวจแล้ว **มีอยู่แล้ว** ใน `GlobalSearch.tsx` (ไม่ต้องทำ)

---

## 8. Deploy Notes
- **Seed admin (dev):** `admin@ros.local` / `ChangeMe!2026` — **prod ต้องตั้ง `SEED_ADMIN_PASSWORD` เอง** (seed บังคับแล้ว)
- ตั้ง `NEXT_PUBLIC_API_BASE` ให้ตรง API prod (default `http://localhost:4000/api/v1`)
- Build artifacts พร้อม (`.next` ทั้ง 2 แอป, `dist` ของ api)
- แนะนำรัน smoke test flow: login → เพิ่มทรัพย์ → เผยแพร่ → สร้าง Lead → นัด → แปลงลูกค้า → สร้างสัญญา → ออกใบเสร็จ

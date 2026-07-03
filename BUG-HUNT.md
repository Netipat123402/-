# ROS — Comprehensive Bug Hunt

> ตรวจจาก **source code จริงเท่านั้น** + ยืนยันด้วย grep/line-number — ไม่แก้โค้ด
> รายงานเฉพาะบั๊กที่ **มีหลักฐานชัดเจน** (ไม่เดา) · คู่กับ [`SYSTEM-KNOWLEDGE.md`](SYSTEM-KNOWLEDGE.md)
> ทุกบั๊กมี: **Severity · Evidence · Reproduction Steps · Expected · Actual · Root Cause · Affected Files**

## สรุป

| ระดับ | จำนวน |
|---|---|
| 🔴 Critical | 0 |
| 🟠 High | 2 |
| 🟡 Medium | 5 |
| 🟢 Low | 5 |

> ส่วนใหญ่เป็นบั๊กเชิง **UX/data-completeness** ที่เกิดเมื่อข้อมูลเยอะ/ข้ามหน้า ไม่ใช่ crash. การจัดการ loading/empty/permission โดยรวม **ทำได้ดี** (ทุกหน้ามี skeleton + empty state + `can()` gate)

---

## 🟠 High

### BUG-H1 — Sort ในลิสต์เรียงเฉพาะหน้าปัจจุบัน ไม่ใช่ทั้งชุดข้อมูล (paginated client-side sort)

| | |
|---|---|
| **Severity** | High (Logic / UX) — กระทบทุกหน้าลิสต์ |
| **Evidence** | ลิสต์เรียงด้วย `[...rows].sort()` ที่ฝั่ง client โดย `rows` = **หน้าเดียว** (PAGE_SIZE=8) จาก `useList` และ **ไม่ส่ง `sort` ไป API**: `leads/page.tsx:53-56`, `customers/page.tsx:24-26`, `owners/page.tsx:30-32`, `contracts/page.tsx:47-52`, `appointments/page.tsx:53` (`sort==='desc' ? [...rows].reverse()`) — ต่างจาก `properties/page.tsx` ที่ส่ง `sort` ไป API จริง |
| **Reproduction** | 1) มี lead/ลูกค้า/สัญญา >8 ราย 2) เปิด /leads 3) เลือก "ชื่อ (ก–ฮ)" 4) ดูหน้า 1 แล้วกดหน้า 2 |
| **Expected** | เรียงตามชื่อ ก→ฮ ทั้งชุด (หน้า 2 ต่อจากหน้า 1 ตามลำดับชื่อ) |
| **Actual** | แต่ละหน้าเรียงชื่อภายในตัวเอง แต่ลำดับ "ข้ามหน้า" ยังเป็น createdAt desc (server default) → หน้า 2 ไม่ต่อเนื่องจากหน้า 1; appointments "ไกล→ใกล้" แค่กลับด้านหน้าปัจจุบัน |
| **Root Cause** | sort ทำหลัง pagination ที่ฝั่ง client (เรียงเฉพาะ 8 แถวที่โหลดมา) แทนส่ง sort param ให้ DB เรียงทั้งชุดก่อน paginate |
| **Affected Files** | `apps/web-admin/src/app/(app)/{leads,customers,owners,contracts,appointments}/page.tsx` |

### BUG-H2 — `viewCount` (ทรัพย์ดูเยอะ) แทบไม่เพิ่ม เพราะหน้า detail ถูก ISR cache

| | |
|---|---|
| **Severity** | High (Data Consistency) — ฟีเจอร์ "ทรัพย์ดูเยอะ" ผิดพลาดเชิงระบบ |
| **Evidence** | `public.service.ts:65` `getByCode()` ทำ `property.update({ viewCount: { increment: 1 } })` ทุกครั้งที่ถูกเรียก · แต่ `web-public/.../properties/[code]/page.tsx:12` `export const revalidate = 300` และเรียกผ่าน `publicGet(..., 300, [tag])` (`page.tsx:16`) → fetch ถูก **cache 300 วินาที** → API (และ increment) รันเฉพาะตอน cache regenerate · sort `popular` ใช้ `orderBy viewCount desc` (`public.service.ts:46`) |
| **Reproduction** | 1) เปิด /properties/CD-2026-0001 100 ครั้งใน 5 นาที 2) เช็ค viewCount ใน DB |
| **Expected** | viewCount ≈ จำนวนการเปิดหน้าจริง (≈100) |
| **Actual** | viewCount เพิ่มแค่ ~1 ต่อรอบ cache (300s) → undercount มหาศาล → การเรียง "ทรัพย์ดูเยอะ" ไม่สะท้อนความนิยมจริง |
| **Root Cause** | side-effect (increment view) อยู่ใน endpoint ที่ผลลัพธ์ถูก cache → cache hit ข้าม side-effect (ควรนับ view ผ่าน endpoint แยกที่ไม่ถูก cache หรือ client beacon) |
| **Affected Files** | `apps/api/src/modules/public/public.service.ts`, `apps/web-public/src/app/properties/[code]/page.tsx` |

---

## 🟡 Medium

### BUG-M1 — เวลาในข้อความแจ้งเตือนใช้ timezone ของ server (เพี้ยนถ้า server ไม่ใช่ Asia/Bangkok)

| | |
|---|---|
| **Severity** | Medium (Functional) |
| **Evidence** | สร้างข้อความ notify ฝั่ง server ด้วย `Date.toLocaleString('th-TH')` **ไม่ระบุ `timeZone`** → ใช้ TZ ของ process: `appointment.service.ts:163` (สร้างนัด), `:235` (เลื่อนนัด), `scheduler.service.ts:97` (สัญญาใกล้หมด), `:130` (เตือนนัด) |
| **Reproduction** | 1) deploy API บน server TZ=UTC 2) สร้างนัดเวลา 14:00 (เวลาไทย) 3) อ่านข้อความแจ้งเตือนของ agent |
| **Expected** | "วันที่ ... 14:00" (เวลาไทย) |
| **Actual** | แสดง 07:00 (UTC) — คลาดเคลื่อน 7 ชม. (ส่วน UI ที่ render `scheduledAt` ในเบราว์เซอร์ถูกต้องเพราะใช้ TZ เครื่องผู้ใช้ — เพี้ยนเฉพาะ "ข้อความ" ที่ bake ฝั่ง server) |
| **Root Cause** | format วันเวลาฝั่ง server โดยไม่ pin `{ timeZone: 'Asia/Bangkok' }` |
| **Affected Files** | `modules/appointment/appointment.service.ts`, `modules/scheduler/scheduler.service.ts` |

### BUG-M2 — Dropdown / Calendar / Dashboard ถูก hardcode `limit=100` → ข้อมูลเกิน 100 หาย/เลือกไม่ได้

| | |
|---|---|
| **Severity** | Medium (Data Completeness) |
| **Evidence** | dropdown ใน modal โหลด `?limit=100`: เจ้าของ/ลูกค้า/lead/ทรัพย์/agent ในฟอร์มสร้างนัด/สัญญา (`appointments/page.tsx:77-79`, `contracts/page.tsx:57-60`, `PropertyForm.tsx:61`) · Calendar โหลด `/appointments?limit=100` (`calendar/page.tsx:32`) · Dashboard/NotificationBell โหลด `?limit=100` แล้วกรอง client (`page.tsx:66-68`, `NotificationBell.tsx:72-73`) |
| **Reproduction** | 1) มีเจ้าของ >100 ราย 2) เปิดฟอร์มสร้างสัญญา 3) ค้นหาเจ้าของรายที่ 101 ใน Combobox |
| **Expected** | เลือกเจ้าของได้ทุกราย |
| **Actual** | Combobox ค้นได้เฉพาะ 100 รายแรกที่โหลดมา (รายที่ 101+ ไม่ปรากฏ); Calendar/Dashboard นับไม่ครบถ้านัด/สัญญา/lead เกิน 100 |
| **Root Cause** | ใช้ค่าคงที่ 100 แทน server-side search/auto-complete (Combobox ค้นเฉพาะ option ที่โหลดมาแล้ว ไม่ query DB) |
| **Affected Files** | `apps/web-admin/src/app/(app)/{appointments,contracts,calendar}/page.tsx`, `components/PropertyForm.tsx`, `components/NotificationBell.tsx`, `app/(app)/page.tsx` |

### BUG-M3 — ค้นหาในลิสต์ยิง API ทุกตัวอักษร (ไม่มี debounce)

| | |
|---|---|
| **Severity** | Medium (Performance / UX) |
| **Evidence** | ช่องค้นหาในลิสต์ใส่ `q` ลง params โดยตรง → `useList` path เปลี่ยน → refetch ทันที ทุก keystroke: `leads/page.tsx:50,129`, `properties/page.tsx:62,109` (และลิสต์อื่น) — ต่างจาก `GlobalSearch.tsx:33` ที่มี debounce 250ms |
| **Reproduction** | 1) เปิด /leads 2) พิมพ์ "สมชาย" (6 ตัว) 3) ดู network tab |
| **Expected** | ยิง 1 request หลังหยุดพิมพ์ |
| **Actual** | ยิง ~6 request (ทุกตัวอักษร) → โหลด DB เกินจำเป็น + ผลกระพริบ |
| **Root Cause** | list search ไม่ได้ห่อด้วย debounce เหมือน GlobalSearch |
| **Affected Files** | `apps/web-admin/src/app/(app)/{leads,properties,owners,customers,appointments,contracts}/page.tsx` |

### BUG-M4 — Endpoint ล้างบันทึก (`DELETE /audit-logs/feed`) ขัดกับ DB trigger immutable → เรียกแล้ว error เสมอ

| | |
|---|---|
| **Severity** | Medium (Logic contradiction — ปัจจุบันไม่มี UI path) |
| **Evidence** | `audit.module.ts:148-156` `clearAll()` ทำ `prisma.auditLog.deleteMany({})` · แต่ migration `0006_audit_immutable` สร้าง trigger `BEFORE UPDATE OR DELETE ON audit_logs ... RAISE EXCEPTION 'audit_logs is append-only'` → DELETE ทุกแถวจะถูกบล็อกที่ DB |
| **Reproduction** | 1) login super_admin 2) เรียก `DELETE /api/v1/audit-logs/feed` (เมื่อมี audit log อย่างน้อย 1 แถว) |
| **Expected** | ลบสำเร็จ หรือ — ถ้าตั้งใจให้ immutable — ไม่ควรมี endpoint นี้ |
| **Actual** | DB trigger โยน exception → `AllExceptionsFilter` map เป็น 500 INTERNAL_ERROR (ไม่ใช่ P2025/P2002/P2003) → ล้างไม่สำเร็จเสมอ. *หมายเหตุ:* หน้า `/audit` ไม่มีปุ่มเรียก endpoint นี้ (comment ระบุ "ไม่มีปุ่มล้างทั้งหมด — immutable") → ปัจจุบันไม่มี user path แต่เป็น endpoint ที่ทำงานไม่ได้ |
| **Root Cause** | endpoint ออกแบบให้ลบ audit_logs ซึ่งขัดกับเจตนา immutable ที่บังคับด้วย trigger (สอง requirement ขัดกันในโค้ดเบสเดียว) |
| **Affected Files** | `modules/audit/audit.module.ts`, `db/prisma/migrations/0006_audit_immutable/migration.sql` |

### BUG-M5 — หน้าที่โหลดข้อมูลเองกลืน error เงียบ → แสดง empty/0 แทน "โหลดไม่สำเร็จ"

| | |
|---|---|
| **Severity** | Medium (Error Handling / UX) |
| **Evidence** | หน้าที่ไม่ใช้ `useList` กลืน error: Dashboard `total()` `catch { return 0 }` + รายการ `catch { /* */ }` (`page.tsx:57,66-68`); Calendar `catch { /* */ }` (`calendar/page.tsx:33`); Notifications `catch { /* */ }` (`notifications/page.tsx:47`); `properties/page.tsx` `load()` มีแต่ `try/finally` ไม่มี `catch` → promise rejection |
| **Reproduction** | 1) ปิด API (หรือเน็ตหลุด) 2) เปิด Dashboard/Calendar/Notifications |
| **Expected** | แสดงสถานะ "โหลดไม่สำเร็จ / ลองใหม่" |
| **Actual** | แสดง KPI=0 / ปฏิทินว่าง / ไม่มีแจ้งเตือน — ดูเหมือน "ไม่มีข้อมูล" ทั้งที่จริงคือ error (`useList`-based pages จัดการ error ถูก แต่ manual-load pages ไม่) |
| **Root Cause** | manual fetch ใน useEffect ไม่มี error state (ต่างจาก `useList` ที่มี) |
| **Affected Files** | `apps/web-admin/src/app/(app)/{page.tsx,calendar/page.tsx,notifications/page.tsx,properties/page.tsx}` |

---

## 🟢 Low

### BUG-L1 — Race: convert Lead พร้อมกัน 2 ครั้ง อาจสร้าง Customer ซ้ำ
- **Severity:** Low · **Evidence:** `lead.service.ts:163-176` เช็ค `if (lead.customerId) throw` **ก่อน** transaction; ระหว่าง 2 request ที่อ่าน lead เดิม (customerId=null) พร้อมกัน ทั้งคู่ผ่าน guard → สร้าง customer 2 ราย แล้วอัปเดต lead 2 ครั้ง
- **Reproduction:** กดปุ่ม "แปลงเป็นลูกค้า" รัว ๆ / 2 แท็บพร้อมกัน · **Expected:** customer 1 ราย · **Actual:** อาจได้ 2 (race window สั้น) · **Root Cause:** guard อ่านนอก transaction, ไม่มี unique constraint บน lead→customer · **Affected:** `modules/lead/lead.service.ts`

### BUG-L2 — กดพื้นหลัง Modal ปิดทันที ทำให้ข้อมูลในฟอร์มหายโดยไม่เตือน
- **Severity:** Low (UX) · **Evidence:** `ui.tsx:113` `<div ... onClick={onClose}>` ปิด modal เมื่อคลิก backdrop — ใช้กับฟอร์มสร้าง/แก้ทุกตัว · **Expected:** ฟอร์มที่มีข้อมูลควรยืนยันก่อนปิด · **Actual:** คลิกพลาดนอกกล่อง = สูญข้อมูลที่กรอก · **Root Cause:** ไม่มี dirty-check ก่อน onClose · **Affected:** `components/ui.tsx` (Modal) + ทุกหน้าที่ใช้ฟอร์มใน Modal

### BUG-L3 — ต่อสัญญาแล้วใช้ `window.location.href` (full reload) แทน client navigation
- **Severity:** Low (UX) · **Evidence:** `contracts/[id]/page.tsx:96` `setTimeout(() => { window.location.href = ... }, 700)` · **Expected:** `router.push` (SPA navigation) · **Actual:** หน้าโหลดใหม่ทั้งหน้า (กระพริบ, ช้า) · **Root Cause:** ใช้ hard navigation · **Affected:** `app/(app)/contracts/[id]/page.tsx`

### BUG-L4 — อัปโหลดเอกสารชื่อไฟล์ยาว >200 ตัว → 400 ไม่เป็นมิตร
- **Severity:** Low · **Evidence:** `DocumentSection.tsx:51` `fd.append('name', file.name)`; `RegisterDocumentDto.name @MaxLength(200)` → ไฟล์ชื่อยาวเกิน 200 ถูกปฏิเสธที่ ValidationPipe · **Expected:** ตัดชื่อ/แจ้งชัด · **Actual:** error 400 "ข้อมูลไม่ถูกต้อง" · **Root Cause:** ส่งชื่อไฟล์ดิบโดยไม่ truncate · **Affected:** `components/DocumentSection.tsx`

### BUG-L5 — Dashboard agenda นับงานจากแค่ 100 รายการแรก (อาจตกหล่นช่วง 30 วัน)
- **Severity:** Low (Data Completeness) · **Evidence:** `page.tsx:66-68` โหลด `?limit=100` แล้วกรองช่วงเวลา client; ถ้า lead ใหม่/นัด upcoming/สัญญา active เกิน 100 ในช่วงที่เลือก จะนับไม่ครบ · **Expected:** นับงานทั้งหมดในช่วง · **Actual:** สูงสุด 100 · **Root Cause:** จำกัด 100 + กรอง client (เหมือน BUG-M2) · **Affected:** `app/(app)/page.tsx`

---

## พื้นที่ที่ตรวจแล้วทำได้ดี (ไม่พบบั๊ก)

| พื้นที่ | สถานะ |
|---|---|
| Permission checks | ดี — `can()` gate ทุกปุ่ม/เมนู + backend `@RequirePermission` + scope ตรงกัน |
| Loading / Empty states | ดี — ListSkeleton + EmptyState ครบ (useList-based) |
| Race: refresh token | ป้องกันดี — single-flight FE + family-revoke BE |
| Race: appointment overlap | ป้องกันดี — DB EXCLUDE constraint + JS check |
| Race: code generation | ป้องกันดี — retry P2002 |
| Atomicity | ดี — `$transaction` 24 จุด (status+history, convert, renew, receipt, role update) |
| IDOR (media/customer/owner) | ป้องกันดี — ตรวจ scope+ownership ก่อนแก้/ลบ |
| Input validation | ดี (ValidationPipe whitelist) — ยกเว้น addTerm untyped (ดู Architecture M4) |
| File upload size/type | จำกัดขนาด+filter (จุดอ่อน magic-byte ดู Security H1 — ไม่ใช่บั๊ก functional) |

---

## บทสรุป (Prioritized)

1. **BUG-H1 (sort ข้ามหน้า):** ส่ง `sort` param ไป API ในทุกลิสต์ (ทำแล้วใน properties) — กระทบประสบการณ์ทุกหน้า
2. **BUG-H2 (viewCount):** ย้ายการนับ view ออกจาก endpoint ที่ถูก cache (client beacon / endpoint แยก no-store)
3. **BUG-M1 (timezone):** pin `{ timeZone: 'Asia/Bangkok' }` ในข้อความ notify ฝั่ง server
4. **BUG-M2/M5 (limit=100):** ใช้ server-side search สำหรับ dropdown ที่ข้อมูลโตได้ (เจ้าของ/ลูกค้า/ทรัพย์)
5. **BUG-M3 (debounce):** เพิ่ม debounce ช่องค้นหาลิสต์
6. **BUG-M4 (audit clear):** ตัดสินใจ — ลบ endpoint หรือ ปรับ trigger (สอง requirement ขัดกัน)

> ทั้งหมดเป็นข้อสังเกตจาก source จริง — ไม่มีการแก้โค้ดในเอกสารนี้

*จบเอกสาร — Comprehensive Bug Hunt (source-based, no code changes)*

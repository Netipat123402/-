# SESSION HANDOVER — 2026-07-03 · UX/UI + Flow Overhaul (แก้รอบใหญ่)

> ต่อจาก `SESSION-HANDOVER-2026-07-03.md` (session มือถือ/a11y) · session นี้ = แก้ 14 ข้อจาก PDF "แก้ รอบ n" + บั๊กระบบ ตามแผน `PROMPT-แก้รอบใหญ่-UXUI-FLOW_1.md` (62 เฟส / 10 Wave)
> รายละเอียดทีละเฟส + checklist เทสเครื่องจริง อยู่ใน `FIX-LOG.md`

---

## 0) TL;DR
- **แก้ครบ 14 ข้อจาก PDF + BUG-M3 (debounce) + toast dedupe + dirty-check Modal capability**
- **โค้ดเสร็จ Wave A–H · typecheck 3 แอปเขียว · jest unit 84/84 ผ่าน**
- **เหลือ = เทสเครื่องจริง (Wave I/J):** responsive matrix, dark mode, web-public flow, e2e, smoke — งานที่ต้องเปิดเบราว์เซอร์/อุปกรณ์จริง
- 24 ไฟล์โค้ดแก้ (5 backend + 19 frontend) · +1007/−447 บรรทัด · **additive/แก้เฉพาะจุด ไม่ regress R2**

## 1) แนวทางที่ยึด
- **กฎ 1 บรรทัด 1 ข้อมูล (R1):** สร้าง component กลาง `InfoRow`/`InfoGroup` แทน grid หลายคอลัมน์ในหน้า detail/modal
- **ห้ามพัง R2:** ไม่แตะ useScrollLock/useFocusTrap/Combobox/single-flight/optimistic/tokens — ยืนยันด้วย typecheck + 84 unit + Modal callers 18 จุด default พฤติกรรมเดิม
- **backend เปลี่ยนเฉพาะที่จำเป็น + ขออนุมัติ** (additive includes + guard เดียว)

## 2) Component กลางใหม่ (`components/ui.tsx` — additive)
| ชื่อ | ใช้ทำอะไร |
|---|---|
| `InfoRow` | label ซ้าย/value ขวา · href(ลิงก์+chevron)/action/hideEmpty/stack/strong/mono · focus-visible ring |
| `InfoGroup` | card + SectionLabel + divide-y ครอบ InfoRow |
| `DetailHeader` | หัว detail กลาง (code+badge / ชื่อ / คำโปรย / ฿ราคา gold) |
| `ActionBar` | แถวปุ่ม (1 primary + รอง + ⋯) |
| `MoreMenu` | ปุ่ม ⋯ + เมนู fixed-position/flip/portal เหมือน Combobox · **Esc capture-phase+stopPropagation → ใช้ในโมดาลได้** (ไม่ทะลุปิดโมดาล) |
| `Modal.confirmOnClose` | prop ใหม่: ฟอร์มมีข้อมูล → backdrop/Esc/× ถามก่อน (BUG-L2) · gate focus-trap ด้วย `!askDiscard` |
| `Icon` +3 | `more-horizontal` `pencil` `trash` |
| `status.ts` `thaiifyActivity()` | แปลง enum อังกฤษในข้อความประวัติ → ไทย |
| `DocumentSection.onDocsLoaded` | callback (ref-based) ให้ parent คำนวณ lease state สำหรับ sign checklist |

## 3) 14 ข้อจาก PDF — ปิดครบ
| # | แก้อะไร (Wave) |
|---|---|
| 1/2/3 | property detail: DetailHeader + ActionBar + InfoGroup เรียงใหม่ + ประวัติไทย (B) |
| 4/10 | lead: ปุ่มซ้ำ→ **"รับดูแล" คลิกเดียว** (assign+working atomic) · working→สร้างนัด/แปลงลูกค้า+⋯ (C) |
| 5/13 | นัด: "นัดกับ"=ชื่อคน · quick action ในลิสต์ · modal InfoGroup + เลื่อน/no-show/นัดใหม่ (D) |
| 6/11/12 | สัญญา: คู่สัญญากดได้+ครบ · create auto-fill · **sign checklist แทน toast×3** (E) |
| 7 | **root cause:** FE เช็ค password แค่ยาว≥8 แต่ BE บังคับมีตัวอักษร+ตัวเลข → แก้ให้ตรง + dropdown บทบาทเหลือ 4 (F) |
| 8/9 | owner section รวมข้อมูลส่วนตัว+แก้เลขบัตร(PII-safe) · customer เห็นอีเมล+฿สัญญา (G) |
| 14 | rented ทางตัน → แถบลิงก์เข้าสัญญา active + guard `rented→available` + ปุ่ม mark manual (B) |

## 4) Backend ที่แก้ (5 ไฟล์ — additive + 1 guard)
- `property.repository.ts` findOneScoped: include `owner.email/_count.properties` + `contracts(active) id/code` (additive)
- `property.service.ts` applyTransition: **guard reject `rented→available` เมื่อมีสัญญา active** (ยืนยัน: PropertySync.sync() อัปเดตตรง ไม่ผ่าน applyTransition → contract-end ไม่โดนบล็อก)
- `lead.dto.ts` + `lead.service.ts` assign: flag `startWorking` → assign+working ใน UPDATE เดียว (default false = เดิม) + ไม่แจ้งเตือนตัวเอง
- `customer.service.ts` get: contracts select += `monthlyRent`

## 5) บั๊ก BUG-HUNT — สถานะ
- **ทำรอบนี้จริง:** BUG-M3 (debounce 6 ลิสต์) · toast dedupe (ราก item 12) · BUG-L2 (dirty-check capability)
- **พบว่า MR ก่อนแก้ไปแล้ว (ไม่ทำซ้ำ):** H1(MR-12) M1(MR-23) M2(MR-24) M4(MR-25 ลบ endpoint) M5(MR-26) L1(MR-36) L3(MR-42) L4(MR-42)
- **ยังไม่ทำ (นอกขอบเขต 14 ข้อ):** BUG-H2 viewCount (public ISR cache — ต้อง client beacon, ทำตอน deploy)

## 6) ค้าง / ตั้งใจเลื่อน (พร้อมเหตุผล)
- **customer "นัดหมายที่ผ่านมา"** — appointments ผูกผ่าน lead→customer, query ซับซ้อน + value ต่ำกว่าสัญญา
- **confirmOnClose** ผูกฟอร์มหลักแล้ว (lead/appt/contract/user/calendar) — ฟอร์มที่เหลือทยอยได้
- **Wave I/J เทสเครื่องจริง:** responsive 320/768/1024/1440 · dark mode admin · web-public flow · e2e (throwaway `ros_e2e` เท่านั้น) · smoke flow เต็ม

## 7) วิธีเทส (สำคัญ)
- เปิด dev server: `ควบคุมระบบ/เปิดระบบ.command` · admin :3001 · เทสมือถือผ่าน LAN IP
- **checklist ต่อ Wave อยู่ท้าย `FIX-LOG.md`** — ไล่ตามนั้นทีละข้อ (คอม/มือถือ/iPad)
- จุดต้องเทสสุด: item 12 (sign checklist→ลงนาม→ทรัพย์ไม่ว่าง) · item 14 (The Base Rama 9 ลิงก์สัญญา) · item 7 (สร้างบัญชี password ถูก/ผิด)
- **ห้าม `next build`/`nest build` ตอน dev server รัน** (ชน .next/.dist) · e2e ห้ามแตะ DB `ros` จริง

## 8) ไฟล์อ้างอิง
- `PROMPT-แก้รอบใหญ่-UXUI-FLOW_1.md` (แผน 62 เฟส) · `FIX-LOG.md` (บันทึกทีละเฟส + checklist) · `แก้ รอบ n.pdf` (14 ภาพ)

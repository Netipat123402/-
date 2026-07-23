# ADMIN — Reverse-engineer + แผนแก้ดีไซน์ (เฟส/ทาส)

> สแกน sidebar ทุกหน้า/ปุ่ม · ติตรง (§9 ห้ามอวย) · ทุกทาส = before/after widget 3 จอ + verify authed ก่อน done
> อ้างอิงกฎ: `DESIGN-SYSTEM.md` §7–11 · per-device (มือถือ/iPad/เดสก์ท็อป ออกแบบคนละแบบ)

---

## 0) แผนที่ sidebar (reverse-engineered) + สถานะ

| # | เมนู | มี | สถานะดีไซน์ |
|---|------|----|-----------|
| 1 | แดชบอร์ด | KPI + agenda "สิ่งที่ต้องทำ" | ✅ §10/§11 done (นำด้วยคน/ทรัพย์) |
| 2 | เจ้าของ (owners) | list · detail | list ✅ · **detail ต้องเช็ค (identity/dedupe/frame)** |
| 3 | ทรัพย์ (properties) | list · detail · new/edit wizard | list ✅ · **detail ✅ (glance identifier done)** · wizard ต้องเช็ค |
| 4 | Lead | list · drawer | list ✅ · **drawer ✅ action-first done** |
| 5 | นัดหมาย (appointments) | list · drawer · | list ✅ (status ✅) · **drawer ต้องแก้ (Phase 1)** |
| 6 | ปฏิทิน (calendar) | month view | ✅ full-width done · เช็ค per-device |
| 7 | ลูกค้า (customers) | list · detail | list ✅ · **detail ต้องแก้ (Phase 1)** |
| 8 | สัญญา (contracts) | list · detail | list ✅ · **detail ต้องแก้ (Phase 1)** |
| 9 | ผู้ใช้/audit/community/แจ้งเตือน/ตั้งค่า/ค้นหา | list/form | เคย sweep ✅ · re-audit Phase 4 |

## หลักการร่วม (world-class · ที่จะใช้ทุก detail/modal)
1. **Glance identifier** — หัว = code·สถานะ · ชื่อ · เลขหลัก(ราคา/มูลค่า) · **action ขวา(เดสก์ท็อป)/stack(มือถือ)** → เห็นแล้วรู้ "ใช่/ไม่ใช่" แล้วเลื่อนดูเต็ม
2. **Dedupe** — ราคา/ข้อมูลหลักโผล่จุดเดียว (หัว) ไม่ซ้ำกล่องล่าง
3. **กรอบชุดข้อมูลชัด** (InfoGroup มีกรอบ/เส้นแบ่ง) — แยกชุดข้อมูลให้หาง่าย (เจ้าของสั่ง)
4. **ข้อมูลของใครของมัน** — customer/lead/owner/contract แต่ละหน้าโชว์ **ข้อมูลที่เกี่ยวกับตัวเอง** เรียงตามความสำคัญ ไม่ generic/ไม่ซ้ำ
5. **Action-first ใน modal/drawer** — ปุ่มหลักบนสุด (CRM)
6. **per-device** — มือถือ stack · iPad/เดสก์ท็อป มี layout ของตัวเอง

---

## Phase 1 — Detail/Modal consistency (จากรูปที่เจ้าของชี้ + ต่อเนื่อง)  ✅ เสร็จ (T1.1–T1.5)

- [x] **T1.1 · นัดหมาย drawer (#2)** — ✅ `5861a2c` **status-driven bar (C, owner เลือกจาก A/B/C)** · glance วันเวลาเด่นขึ้นหัว · แถบเปลี่ยนตามสถานะ (upcoming=ทอง+urgency fmtUntil+CTA · done/cancelled=neutral+สรุป+นัดใหม่) · ซ่อนกล่องว่าง · dedupe กล่องนัดหมาย · verify authed 3 จอ
- [x] **T1.2 · ลูกค้า detail (#3)** — ✅ `bf49711` เบอร์อยู่ใต้ชื่อ (hero) ที่เดียว → กล่องติดต่อเหลือ อีเมล/ที่อยู่ · verify authed
- [x] **T1.3 · สัญญา detail (#4)** — ✅ `bf49711` glance ฿/เดือน บนหัวอยู่แล้ว → **dedupe ค่าเช่า** ออกจากกล่องการเงิน (เหลือ มัดจำ/นายหน้า + กันกล่องว่าง) · verify authed
- [x] **T1.4 · เจ้าของ detail** — ✅ `bf49711` dedupe เบอร์ (เหมือน customer) → กล่องเหลือ อีเมล/เลขบัตร/ที่อยู่/โน้ต · verify authed
- [x] **T1.5 · property wizard (new/edit)** — ✅ ประเมินแล้ว = ดีอยู่แล้ว (stepper + progress "ขั้นที่ x/4" + grid per-device + label ซ่อนมือถือ) ไม่ปั้นงานหลอก · ยกไป Phase 4 เช็ค per-device พร้อมหน้าอื่น

## Phase 2 — "ข้อมูลของใครของมัน" (per-entity relevance)
- [ ] **T2.1** — นิยามชุดข้อมูลหลักของแต่ละ entity + ลำดับความสำคัญ:
  - **ลูกค้า**: ติดต่อ · สัญญาที่ถือ · เอกสาร (ไม่ต้องมี "ความต้องการ" แบบ lead)
  - **Lead**: ความต้องการ(เด่น) · ติดต่อ · ทรัพย์ที่สนใจ · การดูแล (opportunity)
  - **เจ้าของ**: ติดต่อ · ทรัพย์ที่เป็นเจ้าของ(พอร์ต) · สัญญา · เอกสาร
  - **สัญญา**: คู่สัญญา · การเงิน · ระยะเวลา · เอกสาร
- [ ] **T2.2** — ทำ InfoGroup ให้มี "กรอบ" ชัดทุกหน้า (เจ้าของสั่ง: แยกชุดข้อมูลให้หาง่าย)

## Phase 3 — List/table sweep (ต่อจากที่ทำ)
- [ ] **T3.1** — re-verify ทุก list: flex คอลัมน์เดียว(ชื่อ) · badge/action alignment (แบบ appointments) · header nowrap
- [ ] **T3.2** — users/community/audit/notifications list (ยัง sweep เก่า — re-audit per §10/§11)

## Phase 4 — Per-device pass (มือถือ/iPad/เดสก์ท็อป แยกดีไซน์)
- [ ] **T4.1** — ทุก detail/modal: มือถือ stack + action ล่าง · iPad/เดสก์ท็อป action ขวา/2-col
- [ ] **T4.2** — iPad (touch) = การ์ด · เช็ค parity กับมือถือ · overflow scan ทุก breakpoint

## Phase 5 — Flow/ปุ่ม (reverse-engineer ทุก action)
- [ ] **T5.1** — ไล่ทุกปุ่มต่อ sidebar: สร้าง/แก้/ลบ/เปลี่ยนสถานะ/แปลง → verify flow + toast + rollback
- [ ] **T5.2** — empty/loading/error state ครบทุกหน้า (แบบ public)

---

## Log (อัปเดตเมื่อ done)
- ✅ **T1.2/T1.3/T1.4 detail dedupe** (`bf49711`) · ลูกค้า/เจ้าของ เบอร์อยู่ hero ที่เดียว · สัญญา ค่าเช่าอยู่หัว การเงินเหลือมัดจำ/นายหน้า · verify authed 3 หน้า · **Phase 1 ครบ** (T1.5 wizard = ดีอยู่แล้ว ไม่แตะ)
- ✅ **T1.1 polish (owner review)** (`46358aa`) · ปุ่ม stack เต็มกว้างเรียงตรง · ตัดไอคอน ☎/chevron (PhoneLink hideIcon + InfoRow hideChevron opt-in) → [[ros-clean-detail-rows]]
- ✅ **T1.1 นัดหมาย modal — status-driven bar (C)** (`5861a2c`) · owner เทียบ A(sticky footer)/B(header actions)/C(status bar) เลือก C · +fmtUntil ใน lib/format · verify worktree authed (upcoming ทอง+"เลยกำหนดแล้ว" · done neutral+นัดใหม่ · mobile375)
- ✅ appointments list — status badge ชิดซ้ายตรงกัน (`1001148`)
- ✅ property detail — glance identifier + dedupe (`84be651`)
- ✅ lead drawer — action-first (`84be651`)

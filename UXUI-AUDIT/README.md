# ROS — UX/UI Transformation Audit (Phase 0–11)
> ทีม Product Design ระดับโลก · ขอบเขต: `apps/web-public` + `apps/web-admin`
> อ้างอิง Source Code จริงทุกข้อ · วันที่: 2026-06-24 → อัปเดตล่าสุด 2026-06-26
> **สถานะ: ลงมือแก้โค้ดแล้ว** — Sprint 0–3 + a11y/dark mode + ชุดมือถือ (A–E) + Fix รอบ 2 (#1–#7) เสร็จ+เทสจริง · ดู `12-IMPLEMENTATION-CHANGELOG.md` (source of truth ของสิ่งที่แก้)

---

## บทสรุปผู้บริหาร (อ่าน 30 วินาที)
ROS **ไม่ได้พังที่ดีไซน์** — ตรงข้าม มันคือหนึ่งในระบบที่ design discipline ดีผิดคาด:
token ชุดเดียว, component library กลางบังคับใช้, dead code ถูกเก็บกวาด, กฎ PAGE_SIZE=8,
shell แยก mouse/touch อย่างตั้งใจ, ทุก state (empty/loading/error) ครบ, actions เปลี่ยนตามสถานะ

**ช่องว่างจริง = ยกจาก "ดีและสะอาด" ขึ้นเป็น "รู้สึกแพงระดับ Linear/Stripe":**
1. 🟠 ปิดรู conversion ฝั่ง public (CTA LINE เป็น placeholder)
2. 🟡 motion/micro-interaction ยังน้อย → เพิ่ม "feel"
3. 🟡 ยกโทเคนเป็น system ทางการ (ตั้งชื่อ type/spacing/motion + preset ร่วม)
4. 🟡 public pagination, admin breadcrumb, command palette, dark mode (polish/luxury)

**คะแนนรวม:** Usability A− · Consistency A · Premium B+ · Trust A− → เป้า: ทุกมิติ A

---

## ดัชนีเอกสาร
| # | ไฟล์ | เนื้อหา |
|---|---|---|
| 0 | [00-CURRENT-DESIGN-INVENTORY.md](00-CURRENT-DESIGN-INVENTORY.md) | routes, tokens, components, นับองค์ประกอบ UI |
| 1 | [01-UX-DISCOVERY.md](01-UX-DISCOVERY.md) | IA, feature/nav architecture, per-screen spec |
| 2 | [02-USER-JOURNEY.md](02-USER-JOURNEY.md) | journeys public/admin + friction matrix |
| 3 | [03-UX-AUDIT.md](03-UX-AUDIT.md) | nav/search/filter/form/CRUD + คะแนน 4 มิติ |
| 4 | [04-UI-AUDIT.md](04-UI-AUDIT.md) | type/color/spacing/component + คะแนน visual |
| 5 | [05-DESIGN-SYSTEM-AUDIT.md](05-DESIGN-SYSTEM-AUDIT.md) | token/variant/drift + ข้อเสนอ Unified DS |
| 6 | [06-VISUAL-HIERARCHY-AUDIT.md](06-VISUAL-HIERARCHY-AUDIT.md) | hierarchy รายหน้า |
| 7 | [07-NAVIGATION-AUDIT.md](07-NAVIGATION-AUDIT.md) | sidebar/topbar/mobile/breadcrumb |
| 7.5 | [07.5-RESPONSIVE-AUDIT.md](07.5-RESPONSIVE-AUDIT.md) | cross-device จาก source จริง (breakpoints, touch/mouse/keyboard, scores) |
| 8 | [08-PREMIUM-SAAS-ANALYSIS.md](08-PREMIUM-SAAS-ANALYSIS.md) | เทียบ benchmark + จัดกลุ่มงาน |
| 9 | [09-UXUI-TRANSFORMATION-PLAN.md](09-UXUI-TRANSFORMATION-PLAN.md) | PHASE A–F (impact/effort/risk/rollback) |
| 10 | [10-UXUI-IMPLEMENTATION-ROADMAP.md](10-UXUI-IMPLEMENTATION-ROADMAP.md) | Sprint 0–4 เรียงตาม impact/risk |
| 11 | [11-SESSION-RECOVERY-PROMPT.md](11-SESSION-RECOVERY-PROMPT.md) | prompt เปิด session ใหม่ทำงานต่อ |
| 12 | [12-IMPLEMENTATION-CHANGELOG.md](12-IMPLEMENTATION-CHANGELOG.md) | บันทึกการแก้โค้ดจริง Sprint 0→3 + a11y (ไฟล์/เหตุผล/เทส/revert) |
| 13 | [13-A1-BACKEND-SPEC-public-settings.md](13-A1-BACKEND-SPEC-public-settings.md) | สเปก `GET /public/settings` (A1 ขั้นสมบูรณ์) ให้ทีม API — contract/whitelist/test/AC |

### เอกสารอ้างอิงระบบ (สร้าง 2026-06-26 จากโค้ดจริง — source of truth)
| ไฟล์ | เนื้อหา |
|---|---|
| [FLOW-AUDIT.md](FLOW-AUDIT.md) | ทุกปุ่ม (Create/Read/Update/Delete) Lead·Customer·Contract·Appointment·Calendar·Property → route/API/table/permission + **วิเคราะห์ flow ซ้ำ** (customer สร้างทางเดียว=lead convert) |
| [ROUTE-MAPPING.md](ROUTE-MAPPING.md) | ทุก route admin+public → page/API/table/permission |
| [COMPONENT-LIBRARY.md](COMPONENT-LIBRARY.md) | คอมโพเนนต์ `ui.tsx` + เฉพาะทาง + กฎใช้งาน (ใช้ซ้ำ อย่าสร้างใหม่) |
| [QA-CHECKLIST.md](QA-CHECKLIST.md) | CRUD ต่อโมดูล + cross-cutting (Pass/Review) + tech debt |

> หมายเหตุ: เอกสารระบบ/DB/security ชุดใหญ่อยู่ที่ root repo — `ARCHITECTURE-AUDIT.md` · `DATABASE-AUDIT.md` · `RELATIONSHIP-MAP.md` · `SYSTEM-KNOWLEDGE.md` · `SECURITY-AUDIT.md` · `BUG-HUNT.md` · `PRODUCTION-READINESS.md`

> เอกสาร audit ชุดเดิม (web-admin only, 2026-06-15) อยู่ที่ `../UX-UI-AUDIT.md` — ชุดนี้ครอบคลุมกว่า (สองแอป) และทันกว่า

---

## กติกาเด็ดขาด (ทุกเฟส)
- **ห้ามแตะ:** business logic · API contract · DB schema · auth/authz · permission · security
- เปลี่ยนได้เฉพาะ **UI/UX presentation layer**
- ทุกงาน = PR เล็ก, rollback ชัด, ทดสอบ **mouse + touch** (`/technique-1`: minimal · responsive · test-fix-test)

## เริ่มที่ไหน
อ่าน §บทสรุป → `09` (แผน) → `10` (Sprint 0) → ยืนยันก่อนแก้โค้ด

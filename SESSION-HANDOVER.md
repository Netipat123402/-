# ROS — SESSION HANDOVER (สถานะล่าสุด)

> **ไฟล์นี้ = "สถานะ session" ล้วน** (ทำอะไรแล้ว / งานต่อไป / ค้างฝั่งเจ้าของ). เขียนทับเสมอ ไม่สร้างใหม่.
> **โครงสร้าง · กฎ · CYCLE · เครื่องมือ → อยู่ที่ [`CLAUDE.md`](CLAUDE.md)** (โหลดอัตโนมัติ) และไฟล์ที่มันชี้ไป. ที่นี่ไม่เล่าซ้ำ.
> เริ่ม session ใหม่: CLAUDE.md โหลดเอง → อ่านไฟล์นี้เพื่อรู้สถานะ → รอรับงาน.

## 1) สถานะรวม
โปรเจกต์ **~functional 100%** · งานตอนนี้ = **design polish world-class** (ยกเครื่อง detail/list/form/filter/header ให้เป็นระบบเดียว · ไม่ทำ feature ใหม่นอกจากที่เจ้าของสั่ง).
⚠️ เจ้าของทดสอบบน :3001 (dev ตัวเอง) — ค้างบ่อย hard refresh (Cmd+Shift+R).

## 2) ทำอะไรไปแล้ว (สะสมทุก session)
**A · List pass 6 หน้า** — grid+subgrid ช่องไฟเท่ากันเต็มจอ · label-value · คอลัมน์ขวากึ่งกลาง

**B · Detail redesign "main + ราง" (เลิก SectionTabs) — ครบ 6/6:** สัญญา`73855a6` · ลูกค้า`c30b524` · นัด`b0380f9` · ลีด`7e4e120` · ทรัพย์`b33ca52` · เจ้าของ`a1f678b`

**C · แยกหมวดฟอร์ม — ครบ 6/6:** สั้น≤4ช่อง=คงแบน · ยาว6+=แยกหมวด (SectionLabel จางไม่มีไอคอน · space-y-5/-3) · นัด`0dc01f8` · เจ้าของ`e59e5f9` · สัญญา/ทรัพย์`3b973d1` · ลีด`6b46840`

**D · per-device list — ทบทวน 6/6:** การ์ด touch / ตาราง คอม · เจ้าของ C1`65b095e` (รวม 3 สถิติเป็นบรรทัดเดียวบนมือถือ)

**E · เว้นวรรค "ขอบเนื้อเดียว" (RailBlock):** `fb30811`·`232c9a5`·`234a7d2` · ถอดออกจาก เอกสาร/ประวัติ `580f7a5` · empty state กึ่งกลาง ทุกหน้า

**F · ราง (rail) กึ่งกลาง+ปุ่มเต็มกว้าง** `a276788` (เพิ่ม `xl:ml-0` แก้ ml-auto ขัด items-stretch)

**G · ลิสต์ยาว (เจ้าของ 10+ ทรัพย์)** `af0ea85` — โชว์ 6 + "ดูทั้งหมด N ›" → `/properties?owner=<id>`

**H · Filter redesign 6 list:** เจ้าของ`1289050` · ทรัพย์`53eaa41` · ลีด`0e91b15` · นัด`a5ab1cb` · ลูกค้า`e4fdd04` · สัญญา`78794ca` (ค้นหา=พระเอก · ใช้บ่อย=แรก · ลูกค้า/สัญญาไม่ยัด "ของฉัน")

**I · Detail header ยกเครื่อง (Direction A "แคปชั่นเดียว") — shared `DetailHeader`:** `b458bfd` ลด 6 พื้นผิว→2 ระดับ (พระเอกชื่อ + แคปชั่นจางเส้นเดียว: จุดสถานะ·คำอธิบาย·รหัสจาง) · ทรัพย์ 4→2 บรรทัด · ยอดวิวย้ายลงราง · `statusMap`/`statusValue` แทน badge/meta · `37860ec` ราคาเกาะหลังชื่อ (คลัสเตอร์ชิดซ้าย ไม่ปักขอบขวา = ไม่กวาดตา) · กระทบ 6 หน้า detail (ทรัพย์/ลีด/นัด/สัญญา/เจ้าของ/ลูกค้า) · verify authed 3 จอ

**K · RBAC money-gate (กันโกง · Agent ทำได้แต่เงินเข้าเจ้าของก่อน):** ตัด `contract:sign`+`change_status` ออกจาก `sales_agent` (ร่างสัญญาได้ · เปิดสัญญา/ใบเสร็จไม่ได้) · ใบเสร็จผูก `contract:sign` แทน `update` (controller) + ปุ่ม FE ตาม · เพิ่ม **reconcile** ใน roles seed (ลบสิทธิ์ที่ถอน = declarative) · apply DB แล้ว · verify: agent receipt/sign=403 read=200 · owner เห็นปุ่มออกใบเสร็จครบ · scope Agent = office (ไม่เปลี่ยน) · **บทบาท operating จริง = 2 (Owner=super_admin · Agent=sales_agent) · อีก 5 คงไว้ future/demo** (ยังไม่ purge — มี mock user ผูก)

**J · Claude Code IA restructure (Blueprint B):** เพิ่ม `CLAUDE.md` (เราเตอร์ auto-load) · `.claude/rules/workflow-cycle.md` · `.claude/commands/` (verify-authed·reseed-check) · `.claude/hooks/block-dangerous.sh` · แยก `settings.json`(team)/`settings.local.json`(personal) + ล้าง 320→~30 บรรทัด · ตัด handover เหลือ state · **ไม่ย้าย DESIGN-SYSTEM/docs** (product docs + memory graph 9 ไฟล์อ้างอยู่ → คงที่, CLAUDE.md ชี้แทน)

## 3) 🎯 งานถัดไป
- **polish phase ครบทั้งหมดแล้ว** (§8 label-value · §10 แยกหมวด · §11 per-device · §12 detail=main+ราง / list=grid+subgrid · filter 6 หน้า · header 6 หน้า) — **ไม่มีงานค้างเชิงระบบ**
- ถ้าเจ้าของเจอจุดเฉพาะ = งานทีละหน้าตาม CYCLE (สแกน→ติ→เสนอ 3 จอ→รอเคาะ→ทำ)

## 4) เหลือฝั่งเจ้าของ (ไม่บล็อก)
- 🔑 **push commit ค้างทั้งหมด (~89 · ต้อง token)** · 🖼 วาง `apps/web-public/public/hero.jpg` (ถ้ายัง)

# ROS — Claude Code Guide (โหลดอัตโนมัติทุก session)

> ไฟล์นี้เป็น **เราเตอร์บาง** — บอกว่าโปรเจกต์คืออะไร + กฎทองห้ามพลาด + ชี้ไปบ้านแต่ละหลัง.
> **ห้ามยัดเนื้อหาละเอียดที่นี่** (มีบ้านของมันแล้ว ดู §เอกสาร). แก้เนื้อที่บ้านของมัน ไม่ใช่ที่นี่.

## โปรเจกต์คืออะไร
ROS = ระบบบริหารงานนายหน้าอสังหาฯ · **monorepo**:
- `apps/web-admin` — Next.js 14 admin (ธีมมืด-ทอง · authed) — **โฟกัสงานตอนนี้**
- `apps/web-public` — Next.js เว็บลูกค้า (สว่าง) — redesign เสร็จแล้ว
- `apps/api` — NestJS + Prisma (Postgres) · **🔓 R2 ปลดแล้ว** (แก้ backend ได้)
- `db/` — Prisma schema + seed (`db/seed/mock-bulk.ts`) · `tailwind.preset.cjs` — token ร่วม 2 แอป

## กฎทอง (ห้ามพลาด)
1. **ยึด CYCLE เป๊ะ** ทุกงาน UI — ทีละหน้า · ติของเก่าตรง ๆ (ห้ามอวย) + เสนอใหม่ + **รูปเทียบ 3 จอ** (มือถือ/iPad/คอม) · รอเคาะ · เคาะแล้วทำ+verify authed+commit · จบหน้าค่อยต่อ → รายละเอียด: `.claude/rules/workflow-cycle.md`
2. **วิจารณ์ตรง ห้ามอวย ห้าม yes-man** — ให้ความเห็นตัวเอง + ดันทางที่ดีสุด + เสนอเชิงรุกพร้อมเหตุผลระดับโลก
3. **owner ดู preview_screenshot ไม่ได้** → รูปที่ให้เจ้าของดู = `mcp__visualize__show_widget` เสมอ
4. **ทำทีละอย่าง จบแล้วหยุดรอสั่ง** — ห้ามเดินหน้ารวบเอง · ระวัง shared component กระทบหลายหน้า
5. **วันที่มาตรฐานเดียว "14 Jul 26"** ทั้งแอป (`apps/web-admin/src/lib/format.ts`)
6. **UI ห้ามแตะก่อนอ่าน `DESIGN-SYSTEM.md`** (กฎดีไซน์ locked)

## เครื่องมือ/สภาพแวดล้อม (จำให้ครบ)
- **⚠️ node ไม่อยู่ใน PATH** → `export PATH="/Users/iiamtikm/.local/node/bin:$PATH"` ทุก Bash ที่ใช้ npm/npx/tsc/next
- **creds admin:** `admin@ros.local` / `ChangeMe!2026`
- **พอร์ต:** API :4000 (เจ้าของรัน, hot-reload เอง) · web-admin :3001 (เจ้าของรัน) · web-public :3000
- **typecheck ก่อน commit:** `cd apps/web-admin && npx tsc --noEmit` (+ `apps/api` ถ้าแตะ backend)
- **verify authed:** ผ่าน worktree แยกพอร์ต → `/verify-authed` (ดู `.claude/commands/verify-authed.md`)
- **git:** branch `recover/redesign-v2` · commit local ในเครื่อง · ยังไม่ push (ต้อง token เจ้าของ)

## เอกสาร — บ้านแต่ละหลัง (single source of truth)
| เรื่อง | บ้าน |
|---|---|
| **สถานะ session** (ทำอะไรแล้ว/งานต่อไป) | `SESSION-HANDOVER.md` |
| **กฎดีไซน์ UI** (locked) | `DESIGN-SYSTEM.md` |
| **backend / ความสัมพันธ์ข้อมูล** | `docs/reference/SYSTEM-KNOWLEDGE.md` · `docs/reference/RELATIONSHIP-MAP.md` |
| **วิธีทำงาน** (CYCLE + verify recipe + tooling) | `.claude/rules/workflow-cycle.md` |
| **คำสั่งงานซ้ำ** (slash commands) | `.claude/commands/` |
| **กฎพฤติกรรม** (operating rules · runtime recall) | auto-memory (`MEMORY.md` + memory/*.md) |
| **guardrail** (permission · กันคำสั่งเสี่ยง) | `.claude/settings.json` · `.claude/hooks/` |
| **dev server config** | `.claude/launch.json` |

> เริ่ม session ใหม่: ไฟล์นี้โหลดเอง → อ่าน `SESSION-HANDOVER.md` เพื่อรู้สถานะล่าสุด → รอรับงาน.

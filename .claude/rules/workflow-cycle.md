# วิธีทำงาน — CYCLE + verify + tooling (canonical)

> บ้านเดียวของ "วิธีทำงานบนโปรเจกต์นี้". CLAUDE.md ชี้มาที่นี่ · handover เก็บแค่ *สถานะ* ไม่เล่าซ้ำที่นี่.

## 1) ⭐⭐ CYCLE (พื้นฐานสุด — owner ย้ำหนักมาก "สั่งตลอด เหนื่อยมาก จำไว้")
ทุกงาน UI ทำ **ทีละหน้า/ทีละชุด** วนตามนี้เป๊ะ ห้ามข้าม:
1. **วิเคราะห์ภาพรวม** หน้านั้น (ชุดข้อมูล + การใช้งานจริง)
2. **ติของเก่าตรง ๆ (ห้ามอวย)** + **เสนอของใหม่** พร้อมเหตุผลระดับโลก
3. **รูปธรรม = รูปเทียบ before/after 3 อุปกรณ์** (มือถือ/iPad/คอม) ผ่าน `mcp__visualize__show_widget` เสมอ (owner ดู preview_screenshot ไม่ได้) — บ่อยครั้งเสนอ **หลายทางเลือก (3 แบบ)** ให้ตัดสินใจง่าย
4. **รอเคาะ ก่อนลงมือ — ห้ามทำโดยพลการ**
5. เคาะ → ทำ → **verify authed 3 จอ** → commit → **จบหน้านั้นค่อยต่อหน้าถัดไป** (วน 1–5)

## 2) verify authed — worktree แยกพอร์ต (กันชนพอร์ต :3001 ของเจ้าของ)
> โค้ดสำเร็จรูป: `/verify-authed` (ดู `.claude/commands/verify-authed.md`). สรุปขั้นตอน:
1. `export PATH="/Users/iiamtikm/.local/node/bin:$PATH"` (ทุก Bash ที่ใช้ node)
2. `git worktree add --detach <WT> HEAD`
3. symlink `node_modules` (root + `apps/web-admin`) · cp `.env.local` + **ไฟล์ที่แก้** เข้า worktree
4. เพิ่ม config ใน `.claude/launch.json` (bash -c 'export PATH=…node/bin && cd <WT>/apps/web-admin && exec npx next dev', `autoPort: true`) → `preview_start`
5. login: **ใช้ computer type (keystroke) ไม่ใช่ form_input** (form_input ไม่ trigger React state → login ไม่ยิง) · creds `admin@ros.local` / `ChangeMe!2026`
6. นำทาง → screenshot 3 จอ (resize 375 / 768 / 1360)
7. **teardown เสมอ:** `preview_stop` + `git worktree remove --force <WT>` + `git checkout .claude/launch.json` + `git worktree prune`
- **backend change (R2):** แก้ `apps/api` ใน main repo → API :4000 hot-reload เอง → worktree เห็นผลทันที

## 3) verify per-device
- resize มือถือ 375 / iPad 768(ตั้ง)·1024(นอน) / คอม 1360
- iPad preview = `pointer:fine` โชว์ตาราง (iPad จริง touch = การ์ด) — เช็คการ์ดผ่าน DOM (`main ul > li`)
- API base ในหน้า: `http://localhost:4000/api/v1` · cookie+bearer(in-memory) → ดึง API ตรงจาก eval ไม่ได้ (401) · ใช้ UI นำทางแทน

## 4) typecheck ก่อน commit
`cd apps/web-admin && npx tsc --noEmit` (+ `cd apps/api && npx tsc --noEmit` ถ้าแตะ backend)

## 5) กฎ MD (สำคัญ)
- **handover = ไฟล์เดียว เขียนทับเสมอ** · **ห้ามสร้าง MD/tracker ใหม่ทุก session** (ใส่ลง handover / รูล / auto-memory แทน)
- แต่ละข้อเท็จจริงอยู่ **บ้านเดียว** — ห้ามเล่าซ้ำข้ามไฟล์ (CLAUDE.md เป็นเราเตอร์ ไม่ใช่คลัง)

## 6) commit message
ลงท้ายด้วย:
```
Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
```

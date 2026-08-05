---
description: verify งาน web-admin แบบ authed ผ่าน worktree แยกพอร์ต + screenshot 3 จอ แล้ว teardown
---

verify การเปลี่ยนแปลง `apps/web-admin` แบบ login จริง โดยไม่ชนพอร์ต :3001 ของเจ้าของ.
ทำตามลำดับนี้เป๊ะ (ดูหลักการเต็มใน `.claude/rules/workflow-cycle.md` §2):

**ตั้งค่า worktree**
1. `export PATH="/Users/iiamtikm/.local/node/bin:$PATH"` ก่อนทุก Bash ที่ใช้ node
2. เลือกพาธ worktree ใน scratchpad (เช่น `<SCRATCH>/wt-verify`) — `rm -rf` ทิ้งของเก่าก่อน
3. `git worktree add --detach <WT> HEAD`
4. `ln -s <root>/node_modules <WT>/node_modules` และ `ln -s <root>/apps/web-admin/node_modules <WT>/apps/web-admin/node_modules`
5. `cp apps/web-admin/.env.local <WT>/apps/web-admin/.env.local`
6. **cp ทุกไฟล์ที่แก้ในรอบนี้** เข้า worktree (worktree อยู่ที่ HEAD — ไม่มีการแก้ที่ยัง uncommitted)

**รัน + login**
7. เพิ่ม config ชั่วคราวใน `.claude/launch.json`:
   ```json
   { "name": "wt-verify", "runtimeExecutable": "bash",
     "runtimeArgs": ["-c", "export PATH=\"/Users/iiamtikm/.local/node/bin:$PATH\" && cd <WT>/apps/web-admin && exec npx next dev"],
     "autoPort": true }
   ```
8. `preview_start` (name: wt-verify) → รอ ~11s ให้ compile (เช็ค `preview_logs`)
9. login: navigate `/login` → **computer type (keystroke) ทีละ field** (อย่าใช้ form_input — React state ไม่อัปเดต → login ไม่ยิง) → creds `admin@ros.local` / `ChangeMe!2026` → submit
   - ยืนยันสำเร็จ: `read_network_requests` urlPattern `auth/login` เห็น `POST … 200`
   - หมายเหตุ: session cookie มักติดข้ามการ start server ใหม่ใน session เดียวกัน (ไม่ต้อง login ซ้ำ)

**ตรวจ 3 จอ**
10. สำหรับแต่ละหน้าที่แก้ → `resize_window` 1360 → 768 → 375 → navigate → `screenshot`
11. เช็ค `read_console_messages` / `preview_logs` หา error

**teardown (ห้ามลืม)**
12. `preview_stop <serverId>`
13. `git worktree remove --force <WT>` · `git checkout .claude/launch.json` · `git worktree prune`

จบแล้วรายงานผลพร้อม screenshot 3 จอ (ถ้า owner-facing ใช้ show_widget เทียบ before/after).

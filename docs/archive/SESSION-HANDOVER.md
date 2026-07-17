# ROS — Session Handover (ส่งต่องานข้าม session)
> ใช้เอกสารนี้เปิด session ใหม่ให้ทำงานต่อได้ทันที โดยไม่ต้องเล่าใหม่หมด
> อัปเดตล่าสุด: session ขัดเงา pre-deploy (UX/UI polish 42-เฟส) + แก้บั๊ก dropdown + fix LAN IP

---

## 0. วิธีใช้เอกสารนี้ (สำหรับเปิด session ใหม่)
วางข้อความนี้ให้ผู้ช่วยใน session ใหม่:
> "อ่าน `SESSION-HANDOVER.md`, `PREDEPLOY-CHANGELOG-AND-DEVICE-QA.md`, `FINAL-PREDEPLOY-EXPERIENCE-AUDIT.md` และ memory ของโปรเจกต์ก่อน แล้วทำงานต่อจากรายการ 'ค้างอยู่/ถัดไป' โดยยึดวินัย /technique-1 (minimal · responsive ต่ออุปกรณ์ · test-fix-test) — ทำทีละเฟส เทสก่อนเสนอ เจออะไรไม่ดีให้แจ้ง"

---

## 1. โปรเจกต์คืออะไร (สรุป 30 วิ)
ROS = ระบบบริหารงานนายหน้าอสังหาฯ · **monorepo 3 แอป:**
- `apps/web-admin` (Next.js, :3001) — หลังบ้านทีมงาน (โฟกัสหลักของงานขัดเงา)
- `apps/web-public` (Next.js, :3000) — เว็บลูกค้า
- `apps/api` (NestJS, :4000) — API + Postgres (Prisma)
- Design system: gold + warm-neutral · IBM Plex Sans Thai · โทเคนกลาง `tailwind.preset.cjs` · คอมโพเนนต์กลาง `apps/web-admin/src/components/ui.tsx`

## 2. เอกสารอ้างอิง (อ่านตามลำดับ)
1. `FINAL-PREDEPLOY-EXPERIENCE-AUDIT.md` — audit 17 หัวข้อ + แผน 42 เฟส/8 Wave + วิเคราะห์ PDF อ้างอิง 16 ภาพ + IA Identifier Spec
2. `PREDEPLOY-CHANGELOG-AND-DEVICE-QA.md` — สิ่งที่ทำแล้ว + บั๊กที่แก้ + **checklist เทสบนอุปกรณ์จริง**
3. memory โปรเจกต์ (`predeploy-experience-audit.md`) — สถานะละเอียดต่อเฟส

## 3. ทำเสร็จแล้ว (session นี้ — เทส + build ผ่านหมด)
- **ไว:** tabular numerics · press/lift การ์ด · optimistic (นัด/เอกสาร/ทรัพย์แนะนำ/Lead)
- **หาง่าย:** quick-filter สถานะ (Segmented) ครบ 4 ลิสต์ · ตัวกรองช่วงค่าเช่า (slider+debounce, backend rentMin/Max)
- **สม่ำเสมอ:** contract identity+คู่สัญญา (findOne include) · เอกสารจัดกลุ่ม+ยุบปุ่ม+พรีวิวรูป
- **สมบูรณ์:** empty-state context-aware ทุกลิสต์ · iPad โปร่งขึ้น (`sm:touch:px-6`, `lg:grid-cols-3`)
- **บั๊กแก้แล้ว 4:** dropdown ตกกรอบ (root cause `modal-in` fill both→backwards) · HTML receipt routing · slider request storm (debounce) · padding regression
- **ยืนยันแล้วว่ามีอยู่แล้ว (ไม่ต้องทำ):** ⌘K / mobile search / result grouping (`GlobalSearch.tsx`) · P2 button press · P3 focus ring · P8 icon migration

## 4. ค้างอยู่ / ถัดไป (เรียงตามคุ้มค่า)
1. **เทสจริงบนอุปกรณ์ (iPad/มือถือ)** — preview emulate coarse-pointer ไม่ได้ → P35 (iPad) ยัง verify แค่เชิงตรรกะ ใช้ checklist §6 ของ changelog
2. **Appointment time presets** ("วันนี้/สัปดาห์นี้") — ต้องเพิ่ม backend `dateFrom/dateTo` + ออกแบบไม่ให้หัวรก (มี Segmented สถานะแล้ว) — **เลื่อนไว้ เพราะ trade-off**
3. **P22 sticky action rail** — เลื่อน (มือถือชน bottom-nav, เดสก์ท็อปต้องรื้อ 2 คอลัมน์)
4. web-public: ทำ apiBase/mediaUrl ใช้ `window.location` เหมือน web-admin (กัน IP เปลี่ยนแล้วรูป/API พัง) — optional robustness

## 5. Gotchas สำคัญ (อย่าพลาด)
- **Layout เป็น pointer-based:** `mouse`=`(min-width:768px) and (not any-pointer:coarse)` · `touch`=`(any-pointer:coarse)` — iPad ใช้ mobile shell เสมอ (ตัดสินใจคงไว้ = Option B)
- **Preview รายงาน pointer=fine เสมอ** → เทส `touch:` บน preview ไม่ได้; mobile shell โผล่ตอน width<768 เพราะความกว้าง ไม่ใช่ touch
- **ListView เรนเดอร์ทั้ง `<table>` (desktop) และ `<ul.grid>` (cards) พร้อมกัน** (ซ่อนด้วย CSS) → นับจำนวนให้ดู `meta.total` ที่ header ไม่ใช่ querySelector ทั้งคู่
- **transform ที่ค้าง (แม้ identity matrix) = containing block** ดักจับ position:fixed → ใช้ animation `fill: backwards` ไม่ใช่ `both` (ดู `tailwind.preset.cjs`)
- **การขับ React slider ด้วย keydown loop ในพรีวิว = renderer ค้าง** → เทส filtered API ด้วยการ patch `window.fetch` ดึง bearer token แล้วยิงตรง
- **optimistic:** ทำเฉพาะ status change เบา ๆ · เลี่ยง lifecycle หนัก/convert/delete

## 6. เข้าระบบ / รัน / เทส
- **Login (dev):** `admin@ros.local` / `ChangeMe!2026` (prod ต้องตั้ง `SEED_ADMIN_PASSWORD`)
- **เปิดจากเครื่องอื่นใน WiFi เดียวกัน:** ใช้ **IP ปัจจุบันของ Mac** ไม่ใช่ localhost/ไม่ใช่ IP เก่า
  - เช็ค IP: `ipconfig getifaddr en0` (ตอน handover = **192.168.1.2**)
  - เปิด `http://<IP>:3001` (admin) / `http://<IP>:3000` (public)
  - เซิร์ฟเวอร์ bind `*` (ทุก interface) แล้ว · CORS อนุญาต LAN ใน dev (devLanRe) · cookie secure=false (ผ่าน HTTP)
  - ⚠️ **IP เปลี่ยนตาม DHCP** — ถ้าเข้าไม่ได้ ให้เช็ค IP ใหม่ + แก้ `.env.local` (NEXT_PUBLIC_*) + CORS_ORIGINS + **restart dev servers** (NEXT_PUBLIC_* อ่านตอน start). web-admin login ใช้ window.location อยู่แล้ว (ไม่ต้อง restart) แต่ web-public media/API อ่าน env → ต้อง restart
  - macOS Firewall: อนุญาต incoming ให้ node (ถ้าถูกบล็อก)
- **DB (psql):** `psql -h /tmp -U iiamtikm -d ros` (Unix socket, peer auth — URL มี `&host=/tmp`)
- **Typecheck:** `cd apps/<app> && npx tsc --noEmit` · **Build:** `next build` (web) / `npm run build` (api) — ล่าสุดเขียวหมด
- **Preview (ผู้ช่วย):** `.claude/launch.json` → web-admin :3001 / web-public :3000. เซิร์ฟเวอร์ preview ใหม่เริ่มแบบ **ยังไม่ login** ต้อง login ผ่านฟอร์มก่อน

## 7. ไฟล์ที่แตะบ่อย (session นี้)
- `tailwind.preset.cjs` (motion + dropdown fix)
- `apps/web-admin/src/components/`: `ui.tsx` (ListView/FilterBar/Combobox/EmptyState), `DocumentSection.tsx`, `PriceRange.tsx` (ใหม่)
- `apps/web-admin/src/lib/useList.ts` (+mutate)
- `apps/web-admin/src/app/(app)/`: `layout.tsx`, `properties/page.tsx`+`[id]`, `appointments/page.tsx`, `leads/page.tsx`, `contracts/page.tsx`+`[id]`
- `apps/api/src/modules/`: `contract/contract.service.ts`, `property/property.service.ts`+`dto/query-property.dto.ts`

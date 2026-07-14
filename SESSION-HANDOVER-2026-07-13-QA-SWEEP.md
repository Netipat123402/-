# 🔄 SESSION HANDOVER — 2026-07-13 · Exhaustive UX/UI QA Sweep + Per-Device Redesign

> **อ่านไฟล์นี้ไฟล์เดียวแล้วทำต่อได้ทันที** · session ก่อนใกล้เต็มจึงส่งต่อ
> **โฟลเดอร์:** `~/Desktop/ไม่มีชื่อโฟลเดอร์ สำเนา 2` · **branch:** `recover/redesign-v2` · **working tree สะอาด**
> **คู่กับ:** `PAGE-QA-SWEEP.md` (master checklist ทุกหน้า/ปุ่ม) · memory 3 ไฟล์ (กฎ — โหลดอัตโนมัติ)
> **session นี้ = 24 commits** (ยังไม่ push — ต้อง token เจ้าของ)

---

## 0) สภาพโปรเจกต์ (resume ก่อน)
- **dev server เจ้าของเปิดเอง:** web-public :3000 · web-admin :3001 · **api :4000** (localhost)
- **admin login:** `admin@ros.local` / `ChangeMe!2026` (dev seed)
- **เทส:** `npx tsc --noEmit` ในแอปที่แก้ · แคปภาพจริงทุกครั้ง (กฎบังคับ)
- **push:** ต้อง token เจ้าของ (AI push เองไม่ได้) · **24 commit รอ push**
- **R2 (กฎเหล็ก):** ห้ามแตะ backend/logic/RBAC/API/DB — แก้แค่ presentational/style/layout

---

## 1) ⭐ กฎใหม่ทั้งหมดที่เพิ่ม session นี้ (สำคัญสุด — บันทึกใน memory `ros-comparison-responsive-protocol` แล้ว)

1. **รูปเทียบก่อน-หลัง บังคับทุกครั้งที่เสนอ/แก้ (แม้เล็ก)** — ห้ามเสนอ/แก้โดยไม่มีรูป · เจ้าโปรเจกต์ย้ำมากที่สุด (ผมพลาดบ่อย)
2. **มือถือ → iPad (ตั้ง+นอน) → desktop** · แต่ละ device = ดีไซน์เฉพาะตัว **ไม่ใช่ scale เดียว**
3. **🔑 iPad ≠ มือถือ** — คล้ายกันแต่**ต้องออกแบบต่างกันให้เหมาะพื้นที่** · ห้ามยอมรับ "iPad = มือถือยืด/desktop ย่อ" · iPad มีที่มากกว่ามือถือ ต้องใช้ (2-col, chip, density สูงขึ้น ฯลฯ) · **ประเมิน 4 ดีไซน์แยกกัน:** มือถือ / iPad-ตั้ง / iPad-นอน / desktop
4. **คิด ไม่ใช่ทำกลไก** — วิจารณ์ว่า element เหมาะกับ device นั้นจริงไหม พร้อม**หลักการ+เหตุผล** ทุกครั้ง (โปรเจกต์ 2 เดือนแล้ว "ดูผ่านเฉย ๆ" ไม่มีค่า)
5. **shared-part → ทำทั้ง 2 แอป + ไล่ล่า inconsistency เชิงรุก** (อย่ารอเจ้าของจับ) · แตะ pattern ในแอปนึง = เช็คอีกแอปทันที
6. **Functional จริงทุก device** — กด**ทุกปุ่ม** · กรอก**ทุกช่อง** · **submit จริง** (ห้าม view-and-cancel) · เพิ่ม/แก้/ลบ/อัปโหลด/ลบรูป/เลื่อนทุกทิศ เหมือน user จริง · **ทำซ้ำทุก device** (form/CRUD อาจต่าง/พังต่าง device)
7. **motion** = minimal ลื่น หรู ไม่กระตุก/ค้าง (transform/opacity, respect reduced-motion)
8. **DB:** เจ้าของอนุญาต**กดได้ทุกอย่างรวม seed** (re-seed ได้) · **เคลียร์ test data ที่สร้างเองเสมอ**
9. **ไล่ครบทุกหน้า/ทุกปุ่ม** — track ใน `PAGE-QA-SWEEP.md` · ไม่รีบ แบ่งเฟสย่อย
10. **การลด/ลบ = การปรับปรุงเท่าการเพิ่ม** · ไม่จำเป็นต้องเพิ่ม · **ห้ามอวย** · เสนอ+ถามทุกครั้งก่อนทำ
11. **โชว์ recap+plan (พร้อมภาพ) ก่อนเริ่ม batch ใหม่**
12. north star: **minimal · clean · เรียบหรู · ไม่รก**
13. **ไม่ต้องก็อปข้อความยาว ๆ มาวางทุกรอบ** — กฎอยู่ใน memory ถาวรแล้ว เจ้าของแค่พิมพ์ "ต่อ"

---

## 2) 🛠 วิธี/เครื่องมือ (จำให้ได้ — ใช้ทุกเทิร์น)
**แคปภาพจริง = git worktree + Preview MCP** (กัน .next ชนของเจ้าของ):
```
git worktree add --detach <scratchpad>/ros-admin-preview HEAD
ln -s <repo>/node_modules <worktree>/node_modules
# HEAD สะอาด = worktree = current แล้ว · ถ้ามี uncommitted ให้ cp ไฟล์ที่แก้เข้า worktree
# launch.json เพิ่ม config bash -c 'cd <wt>/apps/<app> && exec npx next dev' port autoPort:true
preview_start → preview_resize → preview_screenshot
# เสร็จ: preview_stop + git worktree remove --force + git checkout .claude/launch.json
```
- **admin login (authed pages):** `/login` → `preview_fill #email`=admin@ros.local, `#password`=ChangeMe!2026 → `preview_eval` `document.querySelector('form').requestSubmit()` **(preview_click ปุ่ม submit ไม่ทริก React onSubmit — ต้อง requestSubmit)** · session persist ข้าม preview
- **worktree ไม่มี .env.local** → admin API fallback `localhost:4000` (ของเจ้าของ) อัตโนมัติ
- **⚠️ preview_screenshot ที่ admin 1440×900 เพี้ยน** (เนื้อหากระจุกมุมซ้าย = DPR artifact ไม่ใช่บั๊ก) → **ใช้ 1280×800 หรือ 1024 สำหรับ admin desktop** · เชื่อ `getBoundingClientRect` มากกว่าภาพที่ 1440
- **React re-render async** — click แล้วเช็คใน eval เดียวกันจะเห็นค่าเก่า → เช็คใน call แยก
- **breakpoints:** `lg`=1024 (iPad นอน) · `xl`=1280 (desktop จริง) · **2-col detail ใช้ `xl:` ไม่ใช่ `lg:`** (เพราะเจ้าของสั่ง "iPad คงเดิม" รวมนอน 1024)

---

## 3) ✅ งานที่แก้จริง (7 จุด — ทุกตัวมีรูปเทียบ+เหตุผล+verified 4 device)
| # | commit | สิ่งที่แก้ | หลักการ |
|---|---|---|---|
| 1 | `0554467` | web-public: gallery มือถือ **progress-bar ทอง** แทน chip + **detail loading skeleton** ทรงตรง | ลุคพรีเมียม/ทรงตรง ลด layout-shift |
| 2 | `2aa9430` | web-admin: **text-[11px]→text-2xs** (14 จุด) ปิด design-lock ค้าง | token ไม่ arbitrary (พิกเซลเท่าเดิม) |
| 3 | `d47f65c` | web-admin gallery: **มือถือปัด, ลูกศร desktop-only+hover** | ลูกศร=mouse/desktop · มือถือ=touch/swipe |
| 4 | `e5e9e2e` | web-admin gallery: **chip→หลอดทอง** (ตรง public) | shared-part consistency |
| 5 | `5e6e5d5` | **Lightbox ×2 แอป unify:** มือถือปัด, desktop ลูกศรกลม hover, counter กลาง | shared-part + device-appropriate |
| 6 | `e80a307` | web-admin **empty-state icon เทา→ทองจาง** (โทนแบรนด์ public) | brand consistency (คงกระชับ dense tool) |
| 7 | `6b49212`+`f720d7e`+`55983d5` | **desktop 2-col / calendar full-grid** (ดูข้อ 4) | ใช้พื้นที่ desktop + per-device |

### รายละเอียด layout ที่รื้อ (ข้อ 7):
- **`6b49212` property detail:** xl+ = 2-col (รูป+info ซ้าย · เอกสาร+ประวัติ ขวา) · scroll 2682→2074px
- **`f720d7e` calendar:** lg+ (iPad-นอน/คอม) = **month grid เต็มจอ + chip เวลา/ชื่อในช่อง** (เห็นทั้งเดือน Google-style · 296→842/990px) · มือถือ/iPad-ตั้ง คง dots+day-detail
- **`55983d5` contract detail:** xl+ = 2-col (info ซ้าย · เอกสาร ขวา) · scroll 1553→1343px
- **ported** `useSwipe.ts` เข้า web-admin (จาก web-public) สำหรับ gallery/lightbox

---

## 4) 🔍 ตรวจแล้ว "เหมาะแล้ว ไม่ต้องแก้" (มีเหตุผล — ไม่ force-unify)
- **skeleton** (public bg-border/60 vs admin bg-canvas) = pulse ตรงกัน สีตาม theme เหมาะแล้ว
- **tabs** (public pill-filter vs admin SectionNav anchor) = คนละหน้าที่
- **card hover** (public ยกลอย vs admin แถวไฮไลต์) = ต่างตาม content
- **PropertyCard carousel** = มี swipe+dots+ลูกศร-desktop อยู่แล้ว
- **customers/owners detail** = record สั้น → 1-col centered เหมาะ (ไม่ 2-col = sidebar โหรงเหรง)
- **appointments/leads list** = cards(มือถือ)↔table(iPad/desktop)↔sidebar/bottom-nav = responsive ดีอยู่แล้ว

---

## 5) 📋 QA Sweep status (ดู `PAGE-QA-SWEEP.md` ละเอียด) — **26 หน้า (public 5 + admin 21)**
**public ✅ 5/5:** home · listings · detail · saved(favorite CRUD) · privacy — สะอาดทุกจอ

**admin ✅ ~10 หน้า verified:**
- login ✅ · dashboard 🟡 (มือถือ: stat/tabs/bell/+ · **เหลือ iPad/desktop + GlobalSearch/user menu**)
- **properties CRUD ครบวงจร:** create(wizard 4 ขั้น→201) · read · edit(PATCH 200) · delete(200/404) · **image upload(201)/ลบรูป(200)** · lightbox — ครบทุก device
- **leads ✅:** responsive + drawer + **delete(confirm→19→18)**
- **appointments ✅:** **create นัดจริง→POST 201→chip โผล่ปฏิทิน→cancel(POST 201)** ครบวงจร
- **calendar ✅:** per-device redesign (ดูข้อ 3)
- **contracts/[id] 🟡:** 2-col ทำแล้ว · **เหลือเทสปุ่ม** sign/ออกใบเสร็จ/ต่อสัญญา/ปิดสัญญา/ลบร่าง

**admin ⬜ ยังไม่แตะ:** customers · owners(+[id]) · community · audit · users · settings · notifications · search · properties(list) · properties/new(=wizard เทสแล้ว) · properties/[id]/edit(=form เทสแล้ว)

**บั๊กแอปที่เจอ: 0** (แก้ 7 = design/consistency/per-device improvements ทั้งหมด · seed mock images = ไม่ใช่บั๊ก)

---

## 6) 🧹 Test data
- **เคลียร์หมดแล้ว:** QA lead (ลบ), QA property CD-2026-1009 (ลบ), QA image บน AP-2026-1001 (ลบ), QA appointment (cancel), edit ชื่อ AP-2026-1001 (restore)
- **ค้าง:** ไม่มี (ทุกอย่าง clean หรือ cancel แล้ว)
- appointment = **cancel ไม่ hard-delete** (design เก็บประวัติ) · contract draft = ลบได้

---

## 7) ⏭ ทำต่อ (เรียงความคุ้ม)
1. **contracts/[id] เทสปุ่มจริง** — ออกใบเสร็จ(safe/verify) · sign/close (side-effect หนัก = ประเมิน+เสนอ ไม่พังจริง)
2. **dashboard iPad/desktop** (เทสมือถือแล้ว) + GlobalSearch/user menu — **คิด per-device** (stat cards layout จอกว้าง)
3. **หน้า admin ที่เหลือ** (customers/owners/community/audit/users/settings/notifications/search) — เทสจริงทุกปุ่ม + คิด 4 device
4. **P10 ship:** before/after gallery + push (token เจ้าของ)

**ทุกครั้ง:** เสนอ+รูปเทียบก่อน · เทสจริงทุกปุ่ม/submit · คิดแยก 4 device · เคลียร์ test data · ห้ามอวย

---

## 8) ไฟล์สำคัญ session นี้
- **กฎ (memory):** `ros-comparison-responsive-protocol` (หลัก ยาว) · `ros-redesign-workflow` · `ros-design-system-lock`
- **tracker:** `PAGE-QA-SWEEP.md` (checklist 26 หน้า + bug log)
- **แก้ code:** web-public: `components/PropertyGallery.tsx` `components/Lightbox.tsx` `app/properties/[code]/loading.tsx` · web-admin: `components/ui.tsx`(EmptyState/text-2xs) `components/Lightbox.tsx` `lib/useSwipe.ts`(ported) `app/(app)/properties/[id]/page.tsx` `app/(app)/calendar/page.tsx` `app/(app)/contracts/[id]/page.tsx` + text-2xs 8 ไฟล์
- **DESIGN-SYSTEM.md** = token ล็อก (กฎ) · `tailwind.preset.cjs` = token กลาง 2 แอป (`text-2xs`=11px, gold, radius card 16)

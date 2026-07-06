# SESSION HANDOVER — 2026-07-03 (ล่าสุด)

> ไฟล์นี้ = สรุป session ล่าสุดแบบอ่านจบเข้าใจทั้งระบบ **ไม่ต้องไล่อ่านทั้ง project**
> supersede `SESSION-HANDOVER.md` เดิม (เก่ากว่า) สำหรับความล่าสุด

---

## 0) TL;DR — สถานะตอนนี้
- **ระบบพร้อม deploy เชิงเทคนิค** (ยังไม่ deploy จริง ตามที่ผู้ใช้สั่ง)
- **Build ผ่านทั้ง 3 แอป · Test 84 unit + 8 e2e ผ่าน · a11y/responsive/perf/security ผ่าน · เทสเครื่องจริง (iOS) ผ่าน**
- **Push GitHub ครบ 337 ไฟล์แล้ว** → `github.com/Netipat123402/-` branch `main` (2 commits)
- เหลือ: revoke GitHub token (ผู้ใช้ทำ) · รัน `เปิดระบบ.command` คืน dev server · deploy ตอนพร้อม

---

## 1) โปรเจคคืออะไร (ย่อ)
**ROS (Real Estate Operating System)** — ระบบนายหน้าปล่อยเช่าอสังหาฯ · monorepo (npm workspaces):
- `apps/api` — NestJS modular monolith (:4000, `/api/v1`, 18 โมดูล, RBAC resource:action+scope, JWT rotation+reuse-detection, audit immutable)
- `apps/web-admin` — Next.js 14 back-office (:3001, CSR, RBAC 7 roles)
- `apps/web-public` — Next.js 14 SSR/ISR (:3000, ไม่มี login)
- `db` — Prisma + PostgreSQL 16 (29 models, 18 enums, 12 migrations 0001-0012)
- `infra` — Docker Compose + Caddy + backup + monitoring
- `ควบคุมระบบ/` — .command เปิด/ปิด/รีเซ็ต/สำรอง (ดับเบิลคลิก)

**Flow:** เจ้าของ→ทรัพย์(draft→available→rented)→Lead(new→working→closed)→นัด(upcoming→done/cancelled)→convert ลูกค้า→สัญญา(draft→active→ended)→ใบเสร็จ/ต่อสัญญา · soft-delete + audit ทุกที่ · on-demand revalidation (admin แก้→public เปลี่ยนทันที)

**Stack tokens:** gold #B89968 + ink · IBM Plex Sans Thai + Inter · PAGE_SIZE=8 · responsive แบบ pointer-based (`touch`=มือถือ/iPad shell, `mouse`=เดสก์ท็อป sidebar) · design tokens กลาง `tailwind.preset.cjs` · component library กลาง `apps/web-admin/src/components/ui.tsx`

**Login:** admin@ros.local / ChangeMe!2026 (dev seed; prod บังคับ SEED_ADMIN_PASSWORD)

---

## 2) สิ่งที่ทำใน session นี้ (2026-07-02→03)

### 2.1 ไฟล์ใหม่ (created) — 5 ไฟล์
| ไฟล์ | ทำหน้าที่ |
|---|---|
| `apps/web-admin/src/lib/useScrollLock.ts` | ล็อกพื้นหลัง iOS-proof (position:fixed) + **ref-count** (overlay ซ้อนได้ ไม่ leak) |
| `apps/web-admin/src/lib/useFocusTrap.ts` | a11y dialog: Esc + focus trap + คืนโฟกัส + โฟกัสเริ่มที่ container |
| `apps/web-public/src/lib/useScrollLock.ts` | เหมือน admin (คนละ workspace) |
| `apps/web-public/src/lib/useFocusTrap.ts` | เหมือน admin |
| `SESSION-HANDOVER-2026-07-03.md` | ไฟล์นี้ |

### 2.2 ไฟล์ที่แก้ (modified)
**Backend (1 จุด, additive):**
- `apps/api/src/modules/appointment/dto/appointment.dto.ts` + `appointment.service.ts` — เพิ่ม `dateFrom/dateTo` (ตัวกรองช่วงวันนัด; คง `date` เดี่ยวไว้)

**Frontend web-admin:**
- `src/app/(app)/appointments/page.tsx` — เพิ่ม Segmented แถว 2 (ทุกวัน/วันนี้/สัปดาห์นี้; สัปดาห์=อา-ส ตรง /calendar)
- `src/components/ui.tsx` — Combobox: resize/scroll→**reposition (ไม่ปิด)** + autofocus เฉพาะเดสก์ท็อป + aria-labelledby(useId) + aria-haspopup/expanded · Modal: useScrollLock + useFocusTrap + role=dialog/aria-modal/aria-labelledby + Esc + portal · ListView `<th scope="col">`
- `src/app/(app)/layout.tsx` — bottom-nav ซ่อนตอนคีย์บอร์ดเด้ง (kbOpen) · drawer: useScrollLock + useFocusTrap + role/aria · **ลบ dead code** (mobile search overlay + searchOpen state)
- `src/components/GlobalSearch.tsx` — /search input 15px→16px (กัน iOS zoom) · **ลบ dead** mobile overlay + props mobileOpen/onMobileOpenChange
- `src/components/Lightbox.tsx` — createPortal + useScrollLock + useFocusTrap + role/aria + แก้ mounted-null-ref bug
- `src/app/(app)/properties/[id]/page.tsx` — gallery trigger `<div>`→role=button + keydown (guard e.target===currentTarget)
- `src/components/Toast.tsx` — `role=status aria-live=polite` (WCAG 4.1.3)
- `src/app/(app)/contracts/page.tsx` — **ยก `Sel` (ครอบ Combobox) ออก module scope** (เดิมนิยามใน render → remount ทุก render → dropdown รีเซ็ต)
- `package.json` — **next 14.2.15 → 14.2.35** (ปิด CVE)

**Frontend web-public:**
- `src/components/StickyCTA.tsx` — ซ่อนตอนคีย์บอร์ดเด้ง
- `src/components/ProvinceCombobox.tsx` — autofocus เฉพาะเดสก์ท็อป + aria-label(field+value)/haspopup/expanded
- `src/components/Lightbox.tsx` — useScrollLock + useFocusTrap + role/aria + mounted-fix
- `src/components/PropertyGallery.tsx` — trigger role=button + keydown guard
- `package.json` — **next 14.2.15 → 14.2.35**

**Root:** `package-lock.json` (next update)

### 2.3 บั๊กจริงที่เจอ+แก้ session นี้
1. **iOS คีย์บอร์ดเด้ง → แถบ fixed bottom ลอยกลางจอ** → ซ่อนแถบตอนโฟกัสช่องกรอก (bottom-nav + StickyCTA)
2. **จอ auto-zoom ตอนแตะช่องค้นหา** → /search input 15px→16px
3. **dropdown เด้งปิดทุกอัน** (Combobox ปิดตอน resize/scroll ที่คีย์บอร์ดทำให้เกิด) → reposition แทนปิด + ไม่ autofocus บนมือถือ
4. **กล่อง/ฟอร์มลากได้บน iOS** (`overflow:hidden` iOS ไม่สน) → useScrollLock position:fixed
5. **admin Lightbox** ไม่ portal/ไม่ล็อก/ไม่ a11y → ยกเครื่องเหมือน public
6. **scroll-lock leak** ตอน overlay ซ้อน+ปิดตัวนอกก่อน → ref-count
7. **contract Sel remount** (perf) → hoist module scope
8. **Lightbox focus ไม่ลงกล่อง** (mounted-null-ref) → ส่ง mounted เป็น active flag

### 2.4 Dependency (Loop 4)
- **แก้:** next 14.2.15→14.2.35 (patch, non-breaking) → ปิด **CRITICAL Next auth-bypass CVE-2025-29927** (critical 1→0). build 3 แอปผ่าน
- **เหลือ 12 vuln (5 high+7 mod) = DEFER** — ต้องอัป major breaking (next 15 / NestJS 10→11 เพื่อ multer 2.2). **Mitigation มีแล้ว:** upload authed+size-limit+magic-byte(MR-09)+throttle · ไม่ใช้ next/image · lodash transitive(ไม่ import ตรง) · อยู่หลัง Caddy → exposure ต่ำ

---

## 3) การทดสอบที่รัน (ผลล่าสุด)
- **typecheck** 2 web + api = เขียว
- **jest unit** = 84/84 (13 suites)
- **e2e** = 8/8 (flow + auth-rbac; รันบน throwaway `ros_e2e` แล้ว dropdb — DB `ros` จริงไม่ถูกแตะ)
- **build** = api(nest) + web-admin(20 routes) + web-public(8 routes) ผ่านหมด
- **responsive** = overflow 0 ที่ 320/768 ทุกหน้า (admin+public)
- **a11y/red-team** = ผ่าน (ดู §2.3)
- **เทสเครื่องจริง iOS** = ผู้ใช้ยืนยันผ่าน (บั๊กมือถือหายจริง)

---

## 4) ยังไม่ทำ / DEFER (สำคัญ — อ่านก่อนทำต่อ)
| งาน | เหตุผล | ทำเมื่อ |
|---|---|---|
| **Deploy จริง** (VPS/MinIO/LINE/TLS wire) | รอเลือก VPS provider | ตอนพร้อม deploy (Phase 12 stage 8) |
| **Major dep upgrade** (next 15 + NestJS 11) | breaking, ปิด vuln ที่เหลือ | sprint post-launch (มี regression cycle เอง) |
| **F2: web-public img SSR hydration warning** | window vs env → mismatch | หายเองตอน deploy (โดเมนเดียว/ตั้ง NEXT_PUBLIC_MEDIA_BASE) |
| **next/image** (แทน plain img) | ต้อง loader config (MinIO dynamic host) | ตอน deploy |
| **ProfileMenu mobile sheet** ไม่ล็อกพื้นหลัง | menu เล็ก ไม่ critical | low priority |
| **`text-[11px]` → token** (~8 จุด) | design polish, ROI ต่ำ | optional |
| **eslint (Loop 3)** | ไม่ติดตั้ง (pre-existing) | ถ้าอยากได้ lint |
| **MinIO/LINE/email จริง** | ยัง stub (local disk / log) | ตอน deploy (Stage 8) |
| **MR-20/31/33/37/40/41/44** | staging/provider/post-launch scale | ตาม MASTER-REMEDIATION-BACKLOG |

---

## 5) Git / GitHub
- repo: **github.com/Netipat123402/-** · branch `main`
- 2 commits: `8676248` (initial, 336 ไฟล์) + `818eb83` (ci.yml)
- **337 ไฟล์ push ครบ · working tree สะอาด · ตรวจไม่มี secret หลุด** (.env จริง gitignore, มีแต่ .env.example placeholder `CHANGE_ME_*`)
- **🔴 ต้อง revoke GitHub token 2 อันที่อยู่ในแชต session ก่อน** (github.com/settings/tokens)
- .gitignore คลุม: .env/.env.* (เว้น .example) · node_modules · .next/dist · uploads · .run · backup.env

---

## 6) Ops / วิธี resume (สำคัญ)
- **dev server ตอนนี้:** API :4000 UP (ผมเปิดคืนหลัง build) · **web :3000/:3001 DOWN** (ผม kill ตอน build)
- **คืน environment เต็ม:** ดับเบิลคลิก `ควบคุมระบบ/เปิดระบบ.command` (start api+web×2 + sync LAN IP + เปิดเบราว์เซอร์)
- **Postgres:** Postgres.app socket /tmp:5432 user iiamtikm db `ros` (bins: `~/Applications/Postgres.app/Contents/Versions/latest/bin`)
- **Build note:** ห้าม `next build`/`nest build` ตอน dev server รันพอร์ตเดียวกัน (.next/dist ชน) → kill ก่อน build ทุกครั้ง
- **เทสมือถือ:** เข้าผ่าน LAN IP (`ipconfig getifaddr en0`) เช่น http://192.168.1.x:3001 · **ลบไอคอน PWA เก่าก่อนเทส** (iOS cache) เทส Safari ธรรมดาก่อน
- **memory (นอก repo):** `~/.claude/.../memory/session-mobile-a11y-fixes.md` = บันทึกละเอียด session นี้

---

## 7) ถ้าจะทำต่อ — เริ่มตรงไหนดี
1. **Revoke token** (ด่วน) + รัน `เปิดระบบ.command`
2. เลือกทางใดทางหนึ่ง:
   - **Deploy:** เลือก VPS provider → wire MinIO/LINE/TLS → verify docker-compose.prod + Caddyfile → deploy
   - **Major upgrade sprint:** next 15 + NestJS 11 (ปิด vuln ที่เหลือ) — ต้อง full regression
   - **UX polish ต่อ:** FINAL-PREDEPLOY-EXPERIENCE-AUDIT.md wave ที่เหลือ (subjective)
3. commit ไฟล์นี้ + งานใหม่ขึ้น GitHub (ต้อง token repo scope)

# PHASE 0 — CURRENT DESIGN INVENTORY
> ROS — Real Estate Operating System · ขอบเขต: `apps/web-admin` + `apps/web-public`
> อ้างอิงจาก Source Code จริง (อ่านครบทุกไฟล์ใน `src/`) · วันที่: 2026-06-24
> **ห้ามแก้โค้ด** — เอกสารชุดนี้เป็นการสำรวจ/วิเคราะห์เท่านั้น

---

## บทสรุป 30 วินาที

ระบบมี **design system เดียวร่วมกันสองแอป** (โทเคนชุดเดียว: gold + warm-neutral + IBM Plex Sans Thai) และ
**component library กลางที่แข็งแรง** (`ui.tsx` 491 บรรทัด — Modal/ListView/FilterBar/Combobox/StatusBadge ฯลฯ)
สถาปัตยกรรมหน้า admin ถูกบีบให้ "เขียนซ้ำน้อยที่สุด" ผ่าน `ListView` + `useList` + `FilterBar` มาตรฐานเดียว
นี่คือ **inventory ที่สะอาดผิดปกติ** สำหรับโปรเจกต์ขนาดนี้ — ความเสี่ยง design-drift ต่ำมาตั้งแต่ฐาน

---

## 1. แอปและ Routes

### 1.1 web-admin (ระบบหลังบ้านทีมงาน) — Next.js App Router, `'use client'` เป็นหลัก
| กลุ่ม | Route | ชนิดหน้า | ไฟล์ |
|---|---|---|---|
| Auth | `/login` | ฟอร์ม + quick-role login | `app/login/page.tsx` |
| ภาพรวม | `/` | Dashboard (KPI 4 + Agenda) | `app/(app)/page.tsx` |
| คลังทรัพย์ | `/owners` | list + modal สร้าง | `app/(app)/owners/page.tsx` |
| | `/owners/[id]` | detail | `app/(app)/owners/[id]/page.tsx` |
| | `/properties` | list + FilterBar | `app/(app)/properties/page.tsx` |
| | `/properties/new` | wizard 4 ขั้น | `app/(app)/properties/new/page.tsx` |
| | `/properties/[id]` | detail + รูป + lifecycle | `app/(app)/properties/[id]/page.tsx` |
| | `/properties/[id]/edit` | wizard (edit) | `app/(app)/properties/[id]/edit/page.tsx` |
| งานขาย | `/leads` | list + modal สร้าง + modal detail | `app/(app)/leads/page.tsx` |
| | `/appointments` | list + modal | `app/(app)/appointments/page.tsx` |
| | `/calendar` | ปฏิทินเดือน | `app/(app)/calendar/page.tsx` |
| | `/customers` · `/customers/[id]` | list / detail แก้ไข inline | `app/(app)/customers/…` |
| | `/contracts` · `/contracts/[id]` | list / detail + ใบเสร็จ/ต่อสัญญา | `app/(app)/contracts/…` |
| ระบบ | `/notifications` | list | `app/(app)/notifications/page.tsx` |
| (ProfileMenu) | `/users` | list + modal | `app/(app)/users/page.tsx` |
| | `/audit` | activity feed | `app/(app)/audit/page.tsx` |
| | `/settings` | ฟอร์ม | `app/(app)/settings/page.tsx` |
| | `/community` | moderation (role-gated) | `app/(app)/community/page.tsx` |
| System | `error` · `global-error` · `loading` · `not-found` · `manifest` | กรอบระบบ | `app/*` |

**รวม ~20 เส้นทางที่มองเห็นได้** + 5 ไฟล์กรอบระบบ

### 1.2 web-public (เว็บลูกค้า) — Next.js SSR/SSG, Server Components เป็นหลัก
| Route | ชนิด | revalidate | ไฟล์ |
|---|---|---|---|
| `/` | Home (hero + search + carousel หลายหมวด + community) | 300s | `app/page.tsx` |
| `/properties` | ผลค้นหา (grid) | 300s | `app/properties/page.tsx` |
| `/properties/[code]` | รายละเอียดทรัพย์ + gallery + นัด | — | `app/properties/[code]/page.tsx` |
| `/privacy` | นโยบาย | — | `app/privacy/page.tsx` |
| `/api/revalidate` | ISR webhook | — | `app/api/revalidate/route.ts` |

---

## 2. Design Tokens (แหล่งความจริง: `tailwind.config.ts` ทั้งสองแอป)

### 2.1 สี (ชุดเดียวกันทั้งสองแอป)
| Token | ค่า | ความหมาย |
|---|---|---|
| `ink` / `ink-soft` | `#1A1A1A` / `#44403C` | ตัวอักษรหลัก / รอง |
| `gold` / `gold-dark` / `gold-light` | `#B89968` / `#A07F4F` / `#C4A35A` | accent (แบรนด์/ปุ่มหลัก public) |
| `surface` / `canvas` | `#FDFDFC` / `#FAFAF9` | พื้นการ์ด / พื้นหลังหน้า |
| `border` | `#E7E5E2` | เส้นขอบเดียวทั้งระบบ |
| `muted` / `faint` | `#78716C` / `#A8A29E` | ข้อความรอง / จาง |
| `success` / `warning` / `danger` / `info` | `#2E7D5B` / `#B7791F` / `#B4413C` / `#3B6E8F` | semantic |

> หมายเหตุ: public ไม่มี `warning`/`danger` ใน config (ไม่จำเป็น — ฝั่งลูกค้าไม่มี destructive action) → ความต่างที่ "ตั้งใจ" ไม่ใช่ drift

### 2.2 Typography
- **Font เดียว:** `IBM Plex Sans Thai → Inter → system-ui` (รองรับไทย/อังกฤษในชุดเดียว)
- **Scale ที่ใช้จริง:** ผ่าน Tailwind utility (`text-xs … text-5xl`) ไม่มี custom type scale
- ไม่มีไฟล์ design-token แยก (เช่น `packages/design-tokens`) — โทเคนฝังใน Tailwind config

### 2.3 Radius / Shadow / Layout
| | admin | public |
|---|---|---|
| Radius | `card: 12px`, `xl2: 16px` | เหมือนกัน |
| Shadow | `card: 0 1px 3px`, `lift: 0 4px 16px` | `card` เหมือน · `lift: 0 8px 30px` (เด่นกว่า) |
| Max width | — | `content: 1200px` |

### 2.4 Responsive variant (กลไกพิเศษ — admin เท่านั้น)
ใน `tailwind.config.ts` admin มี custom variant:
```
mouse: @media (min-width:768px) and (not (any-pointer:coarse))  → desktop shell (sidebar)
touch: @media (any-pointer:coarse)                              → mobile shell (bottom-nav)
```
**ผลลัพธ์:** iPad/แท็บเล็ต (มี touch) ใช้ mobile shell เสมอ แม้จอกว้าง — เป็นการตัดสินใจ UX ที่ชัดเจน ไม่ใช่ bug

---

## 3. Component Inventory

### 3.1 Component library กลาง — `apps/web-admin/src/components/ui.tsx` (491 บรรทัด)
| Component | หน้าที่ | จุดเด่น |
|---|---|---|
| `PAGE_SIZE = 8` | กฎกลาง: ตารางแสดง ≤8 แถว/หน้า | ค่าคงที่เดียวทั้งระบบ |
| `SectionLabel` | หัวข้อย่อย uppercase จาง | มาตรฐานเดียว (แทนของเดิม 3 แบบ) |
| `PageHeader` | หัวหน้า + count + action | layout เดียวทุกหน้า list |
| `StatusBadge` | ป้ายสถานะจาก map | รองรับ `short` (มือถือตัดส่วนหลัง) |
| `Spinner` / `ProgressBar` | สถานะรอ (สั้น/ยาว) | แยกความหมายชัด |
| `ListSkeleton` / `EmptyState` / `ErrorState` | 3 สถานะหลักของรายการ | ErrorState มีปุ่ม retry |
| `Pagination` | เลขหน้า + ช่วง "x–y จาก N" | ซ่อนเมื่อ ≤1 หน้า |
| `Avatar` | วงกลมอักษรย่อ | fallback ไม่มีรูป |
| `Modal` | กล่องกึ่งกลางจอ (100dvh, footer ตรึง) | 2 ขนาด lg/xl |
| `ConfirmDialog` | ยืนยัน/destructive + ขอเหตุผล | แทน `window.confirm` |
| `Field` / `Combobox` | input + select ค้นหาได้ (server/client) | error/hint รูปแบบเดียว |
| `PhoneLink` | แตะโทรได้ + กัน event ชนแถว | |
| `Segmented` | filter เลือกทีละอัน | |
| `FilterBar` | ค้นหา (debounce 350ms) + filter ในป็อป/แผ่น | active count badge |
| `ListView<T>` | **ตาราง desktop / การ์ด mobile อัตโนมัติ** | flag `primary/sub/right` |

> หมายเหตุ: มี comment `MR-38: ลบ SelectField/FilterChips (dead export)` — ทีมเก็บกวาด dead code แล้ว = วินัยดี

### 3.2 Components เฉพาะทาง — admin
`ActivityTimeline` · `DocumentSection` · `GlobalSearch` (116) · `Icon` · `Lightbox` · `NotificationBell` (227) · `ProfileMenu` · `PropertyForm` (278, wizard 4 ขั้น) · `PullToRefresh` · `QuickAddProperty` (131) · `Toast`

### 3.3 Components — public
`AppointmentForm` (125) · `CommunityBoard` (142) · `FeaturedCarousel` (94) · `Header`/`Footer` · `Lightbox` · `PriceRange` (dual-thumb, 102) · `PropertyCard` (90) · `PropertyGallery` (86) · `ProvinceCombobox` (94) · `SearchBar` (161) · `StickyCTA` · `ReadMore` · `ViewTracker` · i18n (`T`, `Localized`, `LangToggle`, `lib/lang`)

---

## 4. องค์ประกอบ UI ที่นับได้ (สำหรับ SPECIAL FOCUS เฟสต่อ ๆ ไป)

| องค์ประกอบ | จำนวน/รูปแบบ | ประเมินเบื้องต้น |
|---|---|---|
| **ปุ่ม variants** | admin: `primary/gold/ghost/danger` + `sm` · public: `gold/ink/line/outline/ghost` + `sm` | จำนวนพอดี — ไม่เฟ้อ |
| **Card** | คลาสเดียว `.card` (border+surface+shadow-card) | ✅ เดียวทั้งระบบ |
| **Badge** | คลาสเดียว `.badge` + 5 tone (status.ts) | ✅ จำกัด 5 tone |
| **Icon** | line-icon เดียว (admin 46 บรรทัด / public 44) | ✅ ชุดเดียว ขนาดคุมด้วย prop |
| **Border** | สีเดียว `#E7E5E2` | ✅ |
| **Shadow** | 2 ระดับ (`card`/`lift`) | ✅ น้อย |
| **Modal/Drawer** | Modal กลางจอ 1 รูปแบบ + drawer มือถือ 1 (โปรไฟล์) | ✅ ไม่เฟ้อ |
| **Table** | `ListView` เดียว + กฎ 8 แถว | ✅ มาตรฐานเดียว |
| **Form** | `Field`/`Combobox`/`ChipGroup` + wizard แบ่งสเต็ป | ✅ ฟอร์มยาวถูกแบ่งแล้ว |
| **Filter** | `FilterBar` เดียว (ค้นหานอก, filter ซ่อนหลังปุ่ม) | ✅ pattern เดียว |

**สัญญาณเด่น:** สิ่งที่ SPECIAL FOCUS ห่วง (ปุ่มเยอะ/badge เยอะ/shadow เยอะ/modal เยอะ) **เกือบไม่พบ** — ระบบถูกบีบให้ใช้ของกลางอยู่แล้ว ปัญหาที่เหลือจะเป็นระดับ "composition" รายหน้า ไม่ใช่ระดับ token/component

---

## 5. ช่องว่างของ Inventory (สิ่งที่ "ไม่มี" และน่าสังเกต)
1. **ไม่มี Storybook / component playground** — เห็น component ได้จากการรันหน้าจริงเท่านั้น
2. **ไม่มี `packages/ui` / `packages/design-tokens` ที่แชร์จริง** — `ui.tsx` อยู่ใน web-admin, public มี component ของตัวเอง → โทเคนซ้ำสองที่ (sync ด้วยมือ)
3. **ไม่มี dark mode** (ฝั่ง admin มีคนใช้กลางคืน — ดูเฟส 8)
4. **ไม่มี type scale / spacing scale ที่ตั้งชื่อ** — พึ่ง utility ดิบ (เสี่ยง drift ระยะยาวแม้ตอนนี้ยังคุมดี)

> รายละเอียดเชิงวิเคราะห์/ข้อเสนออยู่ใน `05-DESIGN-SYSTEM-AUDIT.md`

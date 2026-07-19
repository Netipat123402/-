# COMPONENT LIBRARY — ROS (web-admin)
> อิงโค้ดจริง `apps/web-admin/src/components/` · 2026-06-26 · ใช้ซ้ำ **อย่าสร้างใหม่**
> โทเคน/สี/ฟอนต์ = `tailwind.preset.cjs` (root, ใช้ร่วม 2 แอป) · ไอคอน = `Icon.tsx` (outline ชุดเดียว ห้ามอิโมจิ)

## A) คอมโพเนนต์กลาง — `ui.tsx`
| Component | Props หลัก | ใช้ทำอะไร | หมายเหตุ |
|---|---|---|---|
| `PAGE_SIZE` | const = **8** | กฎกลาง: ลิสต์ ≤8 แถว/หน้า | ทุกลิสต์ใช้ |
| `PageHeader` | title, subtitle?, count?, action? | หัวหน้า list (+ ปุ่มขวา) | headline ซ้ายเสมอ |
| `SectionLabel` | children | หัวข้อย่อย uppercase จาง | มาตรฐานเดียว (แทน 3 แบบเดิม) |
| `StatusBadge` | map, value, short? | ป้ายสถานะ (สี tone) | map = `PROPERTY/LEAD/APPOINTMENT/CONTRACT_STATUS` |
| `Field` | label, error?, hint?, ...input | input + label + inline error | แพตเทิร์น `fe`+`setField` |
| `Combobox` | label, value, onChange, options, searchable?, onSearch?, **loadError?, onRetry?** | dropdown พิมพ์ค้นหา + server-search | เมนู `position:fixed` (ไม่โดน overflow ตัด) · **loadError → แถว "ลองใหม่"** (D2) |
| `FilterBar` + `FilterDef` | search?, sort?, filters[] | แถบค้นหา+ตัวกรอง (Modal กลางจอ) | `FilterDef.type:'date'` → date picker (D3) |
| `ListView<T>` + `Col<T>` | items, cols, keyOf, onRow?, loading, empty | ตาราง(เมาส์)↔การ์ด(สัมผัส) อัตโนมัติ | **stale-while-revalidate** (เปลี่ยนหน้าไม่กระโดด #7) |
| `Pagination` | meta, page, setPage | ปุ่มก่อนหน้า/`x/y`/ถัดไป | `active:scale-90`, touch h-10 |
| `Modal` | open, onClose, title, footer?, size? | กล่องกลางจอ | **Portal→body** + scroll-lock + scrim `bg-ink/55 dark:bg-black/55` (G1) |
| `ConfirmDialog` | open, onClose, title, tone?, withReason? | ยืนยัน/ลบ (แทน window.confirm) | tone='danger' = แดง |
| `Avatar` | name, size? | วงกลมอักษรย่อ | ไม่มีรูปจริงก็ใช้ |
| `Segmented` | options, value, onChange | tab เลือกทีละอัน | |
| `PhoneLink` | phone | แตะโทร (tel:) | |
| `ListSkeleton` | rows? | โครงโหลด (pulse) | โหลดแรก = PAGE_SIZE แถว |
| `EmptyState`/`ErrorState` | text, icon?/onRetry? | ว่าง/ผิดพลาด | |
| `Spinner`/`ProgressBar` | className/value | โหลด/อัปโหลด | |

## B) คอมโพเนนต์เฉพาะทาง
| ไฟล์ | ใช้ทำอะไร |
|---|---|
| `Icon.tsx` | ไอคอน outline ชุดเดียว (`<Icon name size/>`) — home/user(-plus)/users/calendar/clock/building/key/file-text/image/menu/x/chevron-*/arrow-*/check/plus/bell/search/alert-triangle/info/star/moon/sun |
| `PropertyForm.tsx` | ฟอร์มเพิ่ม/แก้ทรัพย์ **wizard 1-4** (mode create/edit) — ใช้ทั้ง `/properties/new`, edit, และปุ่ม + มือถือ (D1) · มี loadErr+retry (D2) |
| `GlobalSearch.tsx` | ค้นหา/command palette · `variant='page'` = หน้า `/search` (E4) · ⌘K/`/` shortcut |
| `NotificationBell.tsx` | ระฆัง + ศูนย์งาน · **deep-link entityId** (E1) · poll 30s |
| `Lightbox.tsx` | ดูรูปเต็มจอ (zoom/swipe) · **Portal→body** (G1.1) |
| `DocumentSection.tsx` | อัป/ดู/ตรวจสอบ เอกสาร (entity-based) |
| `Toast.tsx` | `useToast()` success/error |
| `ThemeToggle.tsx` | สลับ dark/light (localStorage `ros-theme`) |
| `ProfileMenu.tsx` / `PullToRefresh.tsx` / `ActivityTimeline.tsx` | เมนูโปรไฟล์ / ดึงรีเฟรชมือถือ / ฟีดกิจกรรม |
| `QuickAddProperty.tsx` | **เลิกใช้แล้ว** (D1 แทนด้วย PropertyForm) — เก็บไฟล์ไว้ |

## C) Public (`apps/web-public/src/components`)
`Header/Footer/StickyCTA` · `PropertyCard`/`PropertyGallery`(#4/#5)/`FeaturedCarousel` · `SearchBar`(live suggest) · `AppointmentForm` · `T.tsx`(SpecStrip/AmenityBadges/PriceMonthly/MetaLine) · `Lightbox`(portal) · `CommunityBoard`(ซ่อน) · `Icon`(สำเนา)

## D) กฎใช้งาน (technique-1)
- minimal/พรีเมียม · palette = gold + warm-neutral (ห้ามเพิ่มสีมั่ว) · 1 action = 1 ปุ่ม primary
- responsive แยกตาม device จริง (มือถือ/iPad/เดสก์ท็อป) · touch ≥44px · ตารางยาว→การ์ดบนมือถือ
- ไอคอน `<Icon>` เท่านั้น (ห้ามอิโมจิ/×▾☰) · ฟอร์ม = `fe`+`setField`+validate ก่อน submit
- ดู `05-DESIGN-SYSTEM-AUDIT.md` + `07.5-RESPONSIVE-AUDIT.md`

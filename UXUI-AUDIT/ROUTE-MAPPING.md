# ROUTE MAPPING — ROS
> อิงโครงสร้างจริง `apps/web-admin/src/app` + `apps/web-public/src/app` + `apps/api/src/modules` · 2026-06-26
> ทุก route admin อยู่ใต้ `(app)/layout.tsx` = ต้อง login (auth guard) + RBAC ตาม permission

## A) WEB-ADMIN (`apps/web-admin`)
| Route | ชนิดหน้า | API หลัก | Table | Permission |
|---|---|---|---|---|
| `/login` | ฟอร์ม login | `POST /auth/login`, `/auth/refresh` | users, refresh_tokens | — (public) |
| `/` | Dashboard (การ์ดสรุป + สิ่งที่ต้องทำ) | `/appointments`, `/contracts`, `/leads` (สรุป) | (อ่านหลาย) | login |
| `/properties` | List (8/หน้า, filter, +wizard) | `GET /properties` | properties | `property:read` |
| `/properties/new` | Wizard 1-4 (สเต็ป) | `POST /properties` | properties (+media) | `property:create` |
| `/properties/[id]` | Detail (gallery, lifecycle, owner card) | `GET/PATCH /properties/:id`, `/approve` `/reject` `/media` | properties, property_media | `property:read/update/approve...` |
| `/properties/[id]/edit` | Wizard แก้ไข | `PATCH /properties/:id` | properties | `property:update` |
| `/owners` | List | `GET /owners` | owners | `owner:read` |
| `/owners/[id]` | Detail (hero + ทรัพย์/สัญญา) | `GET/PATCH /owners/:id` | owners | `owner:read/update` |
| `/leads` | List → **row→Modal** (`?focus={id}`) | `GET /leads`, `/leads/:id`, `/assign` `/status` `/convert` | leads → **customers (convert)** | `lead:*` |
| `/customers` | List (ไม่มีปุ่มเพิ่ม) | `GET /customers` | customers | `customer:read` |
| `/customers/[id]` | Detail (hero + สัญญา) | `GET/PATCH /customers/:id` | customers | `customer:read/update` |
| `/appointments` | List → **row→Modal** (`?focus={id}`) | `GET /appointments`, `/:id`, `/reschedule` `/cancel` `/complete` `/no-show` | appointments | `appointment:*` |
| `/calendar` | View (month + agenda) — กดการ์ด→`/appointments?focus=` | `GET /appointments?limit=100` | appointments (อ่าน) | `appointment:read` |
| `/contracts` | List (+ สร้างสัญญา Modal) | `GET/POST /contracts` | contracts, contract_terms | `contract:*` |
| `/contracts/[id]` | Detail (sign/renew/receipt/terms) | `/sign` `/status` `/renew` `/receipt` `/terms` | contracts, contract_terms | `contract:*` |
| `/users` | List + จัดการผู้ใช้/บทบาท | `GET/POST/PATCH/DELETE /users`, `/users/roles` | users, roles, user_roles | `user:*` |
| `/settings` | ตั้งค่าบริษัท/consent | `GET/PATCH /settings` | settings | `setting:*` |
| `/audit` | บันทึกกิจกรรม (feed) | `GET /audit-logs/feed` | audit_logs, activity_logs | `activity:read` (+`audit:read` เห็น diff) |
| `/community` | ดูแลกระดานชุมชน (mod) | `GET/PATCH /community` | community_posts | role-gated (super/company/branch) |
| `/notifications` | ศูนย์แจ้งเตือน (IG-style filter) | `GET /notifications` | notifications | login |
| `/search` | **หน้าค้นหา** (E4, แยกจาก overlay) | `GET /search?q=` | (อ่านหลาย) → deep-link | login |

**Deep-link pattern:** มีหน้า detail → `/{route}/{id}` · ใช้ row→Modal (lead/appointment) → `/{route}?focus={id}` (หน้าอ่าน param เปิด modal)

## B) WEB-PUBLIC (`apps/web-public`)
| Route | ชนิด | API | Table | Auth |
|---|---|---|---|---|
| `/` | Home (hero + featured carousels) — ชุมชนซ่อน (flag) | `GET /public/properties?...` | properties | public |
| `/properties` | List + filter + pagination (SSR, 24/หน้า) | `GET /public/properties` | properties | public |
| `/properties/[code]` | Detail (gallery + spec + similar) | `GET /public/properties/:code`, `/:code/similar` | properties, property_media | public |
| `/privacy` | นโยบายความเป็นส่วนตัว | static | — | public |

**Public serializer:** strip ownerId/assignedTo/branch/audit/viewCount/isFeatured/status (กันข้อมูลรั่ว); แสดงแค่ available

## C) API MODULES (`apps/api/src/modules`)
`appointment · audit · auth · community · contract · customer · document · health · identity · lead · notification · owner · property · public · scheduler · search · settings · user`
- prefix กลาง `api/v1` · auth = JWT (cookie) + refresh · RBAC = `@RequirePermission(resource, action)`
- `customer` มีแค่ Get/Patch/Delete (**ไม่มี Post** — สร้างผ่าน lead convert เท่านั้น) — ดู [FLOW-AUDIT.md](FLOW-AUDIT.md)
- `public` = `@Public` (ไม่ต้อง login) เสิร์ฟเว็บลูกค้า · `scheduler` = cron งานเตือน

> รายละเอียด DB ดู `DATABASE-AUDIT.md` · ความสัมพันธ์ ดู `RELATIONSHIP-MAP.md` · flow ปุ่ม ดู `FLOW-AUDIT.md`

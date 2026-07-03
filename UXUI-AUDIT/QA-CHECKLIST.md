# QA CHECKLIST — ROS
> สถานะจากการเทสจริงด้วย preview MCP (login admin@ros.local) + mock-bulk data · 2026-06-26
> ✅ Pass (เทสแล้ว) · ⚠️ Needs Review (ยังไม่เทสรอบนี้/มีเงื่อนไข) · ❌ Fail

## CRUD ต่อโมดูล
| Module | Create | Read (list/detail) | Update | Delete | หมายเหตุ |
|---|---|---|---|---|---|
| **Property** | ✅ wizard 1-4 (`+`/เพิ่มทรัพย์) → draft | ✅ list 8/หน้า + detail + gallery | ✅ edit wizard · approve/reject/star | ✅ ลบร่าง | media 10/อัน (mock) |
| **Owner** | ✅ เพิ่มเจ้าของ | ✅ list + detail (hero) | ✅ inline edit | ✅ | idCard masked `••••0111` |
| **Lead** | ✅ public form / `+สร้าง Lead` | ✅ list→Modal (`?focus`) | ✅ assign/status/**convert→customer** | ⚠️ เฉพาะที่ยังไม่ convert | deep-link ✅ |
| **Customer** | ✅ **ผ่าน lead convert เท่านั้น** (ไม่มีปุ่มเพิ่ม) | ✅ list + detail | ✅ inline edit | ⚠️ | ดู FLOW-AUDIT |
| **Appointment** | ✅ `+เพิ่มนัด` (lead+ทรัพย์+agent+เวลา) | ✅ list→Modal (`?focus`) + calendar | ✅ reschedule/cancel/complete/no-show | ⚠️ | datetime-local picker |
| **Calendar** | — (view) | ✅ month+agenda · **กดการ์ด→detail** (#1) | — | — | sync สด |
| **Contract** | ✅ `+สร้างสัญญา` (ทรัพย์ว่าง+เจ้าของ+ลูกค้า+agent) | ✅ list + detail | ✅ sign/renew/receipt/terms/status | ✅ ลบร่าง | ปุ่มเรียบ |
| **User** | ⚠️ สร้าง+role (ไม่เทสรอบนี้) | ⚠️ | ⚠️ | ⚠️ | role dropdown มี fallback |
| **Notification** | (auto) | ✅ ระฆัง + ศูนย์ · **deep-link** (E1) | ✅ read/read-all | — | real-time = poll 30s (ยังไม่ true RT) |
| **Search** | — | ✅ หน้า `/search` + ผล deep-link (E4) | — | — | ⌘K/`/` |
| **Auth** | — | ✅ login | — | logout | auto-logout 30 นาที (เตือน 60 วิ) |

## Cross-cutting (เทสจริงรอบนี้)
| รายการ | สถานะ |
|---|---|
| **Pagination** กดถัดไป ลูกศรไม่กระโดด (admin stale-while-revalidate + public scroll=false) | ✅ #7 |
| **Dropdown** เลือก+กดได้, fail→"ลองใหม่" (silent-catch fix) | ✅ D2 (3 เส้นทาง) |
| **Modal/overlay** เต็มจอ + scrim เนียน + พื้นหลังล็อก (light+dark, มือถือ+เดสก์ท็อป) | ✅ G1 |
| **Gallery** ลูกศร 44px snappy + รูป vh-based (มือถือ24%/iPad34%) | ✅ #4/#5 |
| **Deep-link** แจ้งเตือน/ปฏิทิน/ค้นหา → รายการนั้นเลย | ✅ E1/#1/E4 |
| **Responsive** มือถือ375 · iPad ตั้ง768 · iPad นอน1024×768 · เดสก์ท็อป1280 | ✅ (gallery/spec/header) |
| **Dark mode** (admin) light byte-identical, dark พรีเมียม | ✅ F3 |
| **i18n** TH/EN (public) | ✅ |

## ยังไม่เทส / Needs Review (รอบหน้า)
- User module CRUD (สร้าง/แก้/ลบ ผู้ใช้+role) เต็มรูปแบบ
- Document upload/verify flow (DocumentSection) ทุก entity
- Contract sign→receipt→renew end-to-end
- Delete edge: ลบ entity ที่มี relation (FK Restrict) → error state ถูกต้องไหม
- iPad จริง (coarse pointer) — preview เป็น fine pointer (เทส shell มือถือจริงไม่ได้ ต้อง LAN device)
- Performance (รายการใหญ่ >100), Touch บนเครื่องจริง

## ความเสี่ยง/Tech debt ที่พบ
- lead→customer **convert ไม่ dedup เบอร์** → ลูกค้าซ้ำได้ (เสนอแก้ — แตะ backend)
- `QuickAddProperty.tsx` เลิกใช้ (dead) — ลบ/รีไซเคิลได้
- notif "real-time" = poll 30s (ไม่ใช่ websocket จริง)

> ดูรายละเอียดแก้ไข `12-IMPLEMENTATION-CHANGELOG.md` · flow `FLOW-AUDIT.md` · route `ROUTE-MAPPING.md`

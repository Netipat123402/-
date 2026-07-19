# PHASE 9 — UX/UI TRANSFORMATION PLAN
> แบ่งเป็น PHASE A–F · ทุกงานระบุ Impact · Effort · Risk · Dependencies · Rollback
> วันที่: 2026-06-24 · **ยังไม่แก้โค้ด — รอคำสั่ง**

> มาตรวัด: Impact (1–5) · Effort (S/M/L) · Risk (ต่ำ/กลาง/สูง)

---

## PHASE A — QUICK WINS (≤1 วัน)
| ID | งาน | Impact | Effort | Risk | Dependencies | Rollback |
|---|---|---|---|---|---|---|
| A1 | ผูก CTA LINE → `settings.company.contact.lineOaId` (Header/Footer/detail) | 5 | S | ต่ำ | setting มีอยู่แล้ว | revert คอมโพเนนต์ลิงก์ |
| A2 | transition fade-in มาตรฐาน (page/section) + skeleton→content | 4 | S | ต่ำ | — | ลบคลาส transition |
| A3 | auto-logout: modal เตือน 60 วิ + "อยู่ต่อ" (UI only, ไม่แตะ logic 30 นาที) | 3 | S | ต่ำ | timer ใน layout | ลบ modal, คง timer เดิม |
| A4 | hover/active/cursor ปุ่ม+การ์ดให้ครบทุกที่ | 3 | S | ต่ำ | — | revert คลาส |
| A5 | optimistic toast ที่จุด CRUD หลัก | 3 | S | กลาง (state) | Toast มีอยู่ | กลับเป็น await-then-toast |

## PHASE B — LAYOUT CLEANUP
| ID | งาน | Impact | Effort | Risk | Dependencies | Rollback |
|---|---|---|---|---|---|---|
| B1 | public `/properties` pagination/load-more | 4 | M | ต่ำ | API รองรับ page/limit อยู่แล้ว | คงดึง limit=24 |
| B2 | รวม spacing rhythm (gap/padding) ให้สม่ำเสมอ | 3 | M | ต่ำ | — | revert ต่อหน้า |
| B3 | public Home: เน้น "แนะนำ" เหนือ carousel อื่น + ย้าย/ลด Community | 3 | S | ต่ำ | — | คืนลำดับเดิม |
| B4 | empty-state ครั้งแรก (zero-data) ต่อโดเมน | 3 | M | ต่ำ | EmptyState | กลับ generic |

## PHASE C — NAVIGATION CLEANUP
| ID | งาน | Impact | Effort | Risk | Dependencies | Rollback |
|---|---|---|---|---|---|---|
| C1 | breadcrumb/back link หน้า detail (admin) | 3 | S | ต่ำ | route params | ลบคอมโพเนนต์ |
| C2 | public Header เพิ่มลิงก์ "ทรัพย์ทั้งหมด" | 2 | S | ต่ำ | — | ลบลิงก์ |
| C3 | admin rail: option ขยายเป็น full sidebar + ชื่อกลุ่ม | 2 | M | ต่ำ | layout | คง rail |

## PHASE D — COMPONENT STANDARDIZATION
| ID | งาน | Impact | Effort | Risk | Dependencies | Rollback |
|---|---|---|---|---|---|---|
| D1 | Tailwind preset ร่วม (รวมโทเคน admin/public) | 4 | M | กลาง | config ทั้งสองแอป | คืน config แยก |
| D2 | type/spacing/motion tokens ตั้งชื่อ (semantic) | 4 | M | ต่ำ | D1 | คง utility ดิบ |
| D3 | ย้าย `ui.tsx` → `packages/ui` + public ใช้ subset | 4 | L | กลาง | monorepo workspace | คงไว้ที่เดิม |
| D4 | doc variant ปุ่ม (hard/soft danger) + form validation helper เดียว | 2 | M | ต่ำ | — | — |

## PHASE E — ADMIN EXPERIENCE OPTIMIZATION
| ID | งาน | Impact | Effort | Risk | Dependencies | Rollback |
|---|---|---|---|---|---|---|
| E1 | รวม add-property: เพิ่มรูปในขั้นจบ wizard / inline | 4 | L | กลาง | upload API | คงแยกหน้า |
| E2 | keyboard shortcuts (n=new, /=search, j/k) | 3 | M | ต่ำ | — | ปิด handler |
| E3 | optimistic + undo (toast "เลิกทำ") สำหรับ destructive | 4 | L | กลาง | API idempotent | คง confirm-only |
| E4 | bulk actions ในตาราง (เลือกหลายแถว) | 3 | L | กลาง | API bulk? | ซ่อนปุ่ม |

## PHASE F — PREMIUM VISUAL REFRESH
| ID | งาน | Impact | Effort | Risk | Dependencies | Rollback |
|---|---|---|---|---|---|---|
| F1 | Motion system เต็ม (modal spring, list stagger, page transition) | 4 | M | ต่ำ | D2 | ลบ motion |
| F2 | Command palette ⌘K (entity + actions) | 4 | L | กลาง | GlobalSearch | คง search เดิม |
| F3 | Dark mode (CSS vars) admin | 3 | L | กลาง | D1/D2 | ปิด toggle |
| F4 | public property detail immersive gallery + sticky booking | 4 | M | ต่ำ | PropertyGallery | คงเดิม |
| F5 | Storybook / `/_design` governance | 2 | M | ต่ำ | D3 | — |

---

## กติกาความปลอดภัยของทุกเฟส
1. **ห้ามแตะ:** business logic, API contract, DB schema, auth/authz, permission, security control
2. ทุกงานเป็น **UI/UX layer เท่านั้น** — เปลี่ยน presentation ไม่เปลี่ยน data flow
3. แต่ละ ID = 1 PR เล็ก, มี rollback ชัด, ทดสอบ mouse + touch (technique-1: test-fix-test)
4. ลำดับแนะนำ: **A → B → C → D → E → F** (D เป็นฐานของ F; ทำ A ได้ทันทีแบบ parallel)

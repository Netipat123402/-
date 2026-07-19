# PHASE 10 — UX/UI IMPLEMENTATION ROADMAP
> เรียงงานตาม Impact สูงสุด · Risk ต่ำสุด · Business Risk ต่ำสุด
> วันที่: 2026-06-24 · **รอคำสั่งก่อนเริ่มแก้โค้ด**

---

## หลักการจัดลำดับ
1. **Conversion ก่อน** (อะไรที่กั้นรายได้ = ทำก่อน) → A1 LINE
2. **Feel ทั้งระบบด้วยงานเดียว** (motion/tokens ให้ผลทุกหน้า)
3. **Risk ต่ำก่อนเสมอ** — งาน presentation ล้วน นำหน้างานโครงสร้าง
4. **โครงสร้าง (packages) ทำเมื่อจำเป็นต่อ scale** ไม่ block งาน feel

---

## SPRINT 0 — Conversion + Feel (ครึ่งสัปดาห์, risk ต่ำ)
> ผลลัพธ์: ปิดรู conversion + ระบบ "รู้สึกลื่นขึ้น" ทันที
> **สถานะ 2026-06-24: A1–A4 เสร็จ + เทสกับสแตกจริงแล้ว · A5 เลื่อนไป Sprint 3 (E3)**
| ลำดับ | ID | งาน | เกณฑ์ผ่าน | สถานะ |
|---|---|---|---|---|
| 1 | A1 | ผูก CTA LINE → `NEXT_PUBLIC_LINE_URL` (Header/Footer/StickyCTA) | คลิกติดต่อ → เปิด LINE OA จริง | ✅ เทสแล้ว (home 2 ลิงก์, detail 3 ลิงก์ ชี้ URL config) |
| 2 | A2 | transition fade-in (`animate-fade-rise`) + reduced-motion | content fade เข้าตอนเปลี่ยนหน้า | ✅ เทสแล้ว (keyframe ใน CSS ทั้งสองแอป) |
| 3 | A4 | active press ปุ่ม (`scale-[0.98]`) ทั้งสองแอป | ทุกปุ่มยุบเล็กตอนกด | ✅ เทสแล้ว (25 rule `--tw-scale-x:.98` ใน CSS) |
| 4 | A3 | auto-logout เตือนล่วงหน้า 60 วิ + นับถอยหลัง + "อยู่ต่อ" | modal เตือนก่อนออก (ไม่เปลี่ยนนโยบาย 30 นาที) | ✅ typecheck + render 200 (เวลา 30 นาทีไม่ได้รันจริง) |
| 5 | A5 | optimistic toast CRUD | — | ⏸️ เลื่อน: ต้องทำคู่ undo (E3) ไม่งั้นเสี่ยงโชว์สำเร็จลวง = เปลี่ยน behavior |

### หมายเหตุ A1 (สำหรับทำให้สมบูรณ์)
ตอนนี้ผูก LINE ผ่าน env `NEXT_PUBLIC_LINE_URL` (UI layer ล้วน — ไม่แตะ API).
**ขั้นสมบูรณ์ (เสนอ):** เพิ่ม endpoint `GET /api/v1/public/settings` คืน `company.contact` (มี `lineOaId` ใน DB อยู่แล้ว) แล้วให้ public ดึงมาแสดง → แก้เบอร์/LINE จากหน้า `/settings` ได้โดยไม่ต้อง redeploy. **ต้องแก้ backend จึงอยู่นอกกติกา UI-only — ทำเป็นงานแยก**

## SPRINT 1 — Token & Motion foundation (1 สัปดาห์)
> ผลลัพธ์: ฐาน design system ที่ทำให้ทุกงาน premium ต่อไปง่าย
> **สถานะ 2026-06-24: D1 + motion-token(D2) + F1(modal) เสร็จ + เทสแล้ว**
| ลำดับ | ID | งาน | สถานะ |
|---|---|---|---|
| 1 | D1 | Tailwind preset ร่วม (`tailwind.preset.cjs` ที่ root) | ✅ เทสแล้ว — admin CSS เหมือนเดิม byte-for-byte (sorted diff ว่าง); public tokens/lift/maxWidth ครบ; ทั้งคู่ 200 |
| 2 | D2 | motion tokens ตั้งชื่อ (`ease-standard/emphasized`, `duration-fast/base/slow`) ใน preset | ✅ (ส่วน type/spacing = เสนอ ไม่บังคับ ดูล่าง) |
| 3 | F1 | motion: Modal entrance (backdrop `animate-fade-in` + panel `animate-modal-in`) + reduced-motion | ✅ เทสแล้ว — keyframe/animation ใน CSS, reduced-motion ครอบทั้ง 3 |
| 4 | B2 | spacing rhythm สม่ำเสมอ | ⏳ ยังไม่ทำ |

### หมายเหตุ D2 type/spacing (เสนอเพื่อความสมบูรณ์ — ยังไม่บังคับ เพราะเสี่ยง shift หน้าตา)
ตอนนี้รวม **color/font/radius/shadow/motion** เป็น preset แล้ว. ขั้นสมบูรณ์ของ D2:
- **type roles** (เพิ่มใน preset เป็นคลาส component): `display 30/700` · `h1 24/600` · `h2 18/600` · `body 14–15` · `small 13` · `caption 11 uppercase` (แทน arbitrary `text-[30px]`/`text-[11px]`)
- **spacing scale** ตั้งชื่อ density: `compact`(admin list) / `comfortable`(public) — ทำคู่กับ B2
- ทำแบบ **เพิ่ม token ใหม่ → ค่อย ๆ ย้าย** ไม่แก้ utility เดิมทีเดียว (กัน regression)

### F1 ที่เหลือ (เสนอ)
- list stagger (รายการเข้าทีละแถว), page transition ต่อ route ฝั่ง public (ตอนนี้ fade ตอนโหลด), optimistic+undo (= E3)

## SPRINT 2 — Layout & Navigation polish (1 สัปดาห์)
> **สถานะ 2026-06-24: B1 + C2 เสร็จ+เทส · C1 พบว่ามีอยู่แล้ว · B3/B4 ยังไม่ทำ**
| ลำดับ | ID | งาน | สถานะ |
|---|---|---|---|
| 1 | B1 | public `/properties` pagination (SSR ผ่าน URL, รักษาตัวกรอง) | ✅ เทสแล้ว — nav/indicator/prev-next boundary ถูก, filter ขนต่อ (`?type=condo&page=2`) |
| 2 | C2 | Header เพิ่มลิงก์ "ค้นหาทรัพย์" → /properties | ✅ เทสแล้ว (render บน home) |
| 3 | C1 | breadcrumb/back หน้า detail | ✅ **มีอยู่แล้ว** (back link `← กลับ` ครบ 4 หน้า) — แก้ข้อมูล audit เดิม |
| 4 | B3 | Home: เน้น "ทรัพย์แนะนำ" เหนือหมวดรอง | ✅ เทสแล้ว — featured `text-2xl` (หลัก), BTS/MRT/pet `text-xl` (รอง) ผ่าน prop `size` ใน FeaturedCarousel · ยืนยันใน HTML |
| 5 | B4 | empty-state ครั้งแรก ต่อโดเมน | ⏳ ยังไม่ทำ (seed มีข้อมูล → เทส zero-data ยาก) |

### หมายเหตุ B1 (เพื่อความสมบูรณ์)
- ตอนนี้ใช้ **numbered pagination** (prev · `x / y` · next) SSR — SEO-friendly, ไม่พึ่ง JS, รักษาตัวกรอง
- ทางเลือกอนาคต: "โหลดเพิ่ม (load-more)" แบบ progressive สำหรับ mobile (client-side) — ดีต่อ feel แต่เสีย SEO/deep-link; แนะนำคง numbered ไว้เป็นหลัก
- seed มีทรัพย์ 6 รายการ → pagination จะโผล่จริงเมื่อ >24 (เทสด้วยการลด PAGE_SIZE ชั่วคราวแล้ว revert)
- C1 optional: เปลี่ยน "กลับ" → ระบุปลายทาง ("← ทรัพย์")

## SPRINT 3 — Admin power-user (1–2 สัปดาห์)
> **สถานะ 2026-06-25: E2 (subset) เสร็จ + typecheck ผ่าน · live test ค้าง (dev stack ถูกปิดภายนอก)**
| ลำดับ | ID | งาน | สถานะ |
|---|---|---|---|
| 1 | E2 | keyboard shortcuts: `⌘K`/`Ctrl+K`/`/` เปิด/โฟกัสค้นหา + `Esc` ปิด + ใบ้คีย์ "/" | ✅ **live test ผ่าน** (เบราว์เซอร์ authenticated): `/`+⌘K เปิด+โฟกัสค้นหา, Esc ปิด, typing-guard (พิมพ์ "/" ในช่องไม่ถูก hijack), kbd hint render · desktop mouse-branch ตรวจด้วย typecheck+review (preview viewport จำกัด 529px) |
| 2 | E1 | รวม add-property flow | ⏳ เสนอ (เสี่ยง — ดูล่าง) |
| 3 | E3 | optimistic + undo destructive | ⏳ เสนอ (ต้องมี backend restore) |
| 4 | F2 | command palette ⌘K (รวม actions + ↑↓/Enter) | ✅ **live test ผ่าน** — เปิด=quick actions 11 รายการ (กรองสิทธิ์), ↑↓ ไฮไลต์, Enter ไป+ปิด (→/settings), พิมพ์กรอง action ("ผู้ใช้"→ผู้ใช้งาน), entity search เดิมคงอยู่ |

### หมายเหตุ Sprint 3 (เพื่อความสมบูรณ์ — ทำไมยังไม่ลงมือ E1/E3/F2)
- **E2 ที่ทำ** = เปิด/โฟกัส `GlobalSearch` เดิมด้วยคีย์ลัด (ไม่สร้าง surface ใหม่ = risk ต่ำ). ตรวจ shell ด้วย `matchMedia('(min-width:768px) and (not (any-pointer:coarse))')` → เดสก์ท็อปโฟกัสช่อง inline, สัมผัสเปิด overlay. มี guard ไม่ให้ `/` ทำงานตอนพิมพ์ในช่องอื่น.
- **F2 (command palette เต็ม)** = ต่อยอด E2 ให้รวม *actions* (เช่น "สร้าง Lead", "ไปตั้งค่า") + คีย์บอร์ดเลือกผล (↑↓/Enter). เป็นงานคอมโพเนนต์ใหม่พอควร → เฟสถัดไป
- **E1 (รวม add-property)** = อัปโหลดรูปในขั้นจบ wizard ต้องมี propertyId ก่อน (ตอนนี้สร้างทรัพย์ก่อนค่อยอัปรูป) → แตะ flow จริง เสี่ยงเปลี่ยน behavior · แนะนำทำตอนมีเวลาเทสเต็ม
- **E3 (optimistic + undo)** = ต้องมี backend รองรับ "เลิกทำ/กู้คืน" ไม่งั้นจะโชว์สำเร็จลวง = เปลี่ยน behavior (กติกาห้าม) → ต้องคุยกับฝั่ง API ก่อน

## SPRINT 4 — Structure & Luxury (2 สัปดาห์, ทำเมื่อทีมโต)
| ลำดับ | ID | งาน | สถานะ |
|---|---|---|---|
| 1 | D3 | ย้าย `ui.tsx` → `packages/ui` | ⏳ คุ้มน้อย |
| 2 | F3 | dark mode admin | ✅ **เสร็จ+เทส** — CSS-var tokens + .dark warm palette + แก้ ink dual-use (text-canvas) + toggle (ProfileMenu/drawer) + no-flash · light byte-identical · public ไม่กระทบ |
| 3 | F4 | public detail immersive gallery | ✅ **มีอยู่แล้ว** (crossfade+swipe+lightbox+thumb strip) |
| 4 | F5 | Storybook / `/_design` | ⏳ governance (optional) |
| 5 | E4 | bulk actions | ⏳ อาจต้อง API |

---

## Roadmap แบบภาพ (Impact × Risk)
```
Impact ▲
  5 │ A1
  4 │ A2  D1 D2 F1 B1 E1 E3 F2 F4
  3 │ A3 A4 A5 B2 B3 B4 C1 E2 F3 E4
  2 │            C2 C3 D4 F5
    └───────────────────────────────▶ Risk
        ต่ำ ───────────────► กลาง
ทำซ้ายบนก่อนเสมอ (impact สูง / risk ต่ำ)
```

## Definition of Done (ทุกงาน)
- [ ] เปลี่ยนเฉพาะ UI/UX layer — ไม่แตะ logic/API/schema/auth/RBAC
- [ ] ทดสอบทั้ง **mouse (desktop)** และ **touch (มือถือ/iPad)** ตาม technique-1
- [ ] เทียบ before/after, มี rollback ใน PR เดียว
- [ ] ไม่มี regression ที่ console/network
- [ ] ผ่านตา reviewer: minimal, clean, premium, low cognitive load

## ตัวชี้วัดความสำเร็จ (KPI ที่เสนอ)
| มิติ | ก่อน | เป้า |
|---|---|---|
| Premium feel | B+ | A |
| Consistency | A | A (รักษา) |
| Public conversion path | มีรู (LINE) | ครบ |
| Time-to-add-property (คลิก) | 9–12 | ≤7 |
| Token drift risk | sync มือ | preset เดียว |

# 🔄 SESSION HANDOVER — 2026-07-09 · UX/UI Redesign + Device QA + Font

> **อ่านไฟล์นี้ไฟล์เดียวแล้วทำต่อได้ทันที** · session ก่อนใกล้เต็มจึงส่งต่อ
> คู่กับ: `PHASE2-UXUI-REDESIGN-PLAN.md` (แผนเฟส P1–P10) · `DESIGN-SYSTEM.md` (token ล็อก = กฎ)
> **โฟลเดอร์จริง:** `~/Desktop/ไม่มีชื่อโฟลเดอร์ สำเนา 2` · **branch:** `recover/redesign-v2` · **working tree สะอาด**

---

## 0) สภาพโปรเจกต์ (resume ก่อน)
- **dev server เจ้าของเปิดเอง:** web-public :3000 · web-admin :3001 · api :4000 · login admin `admin@ros.local`/`ChangeMe!2026`
- **เทส:** `npx tsc --noEmit` ในแอปที่แก้ · **แคปภาพจริงทุกครั้ง** (กฎบังคับ ดูข้อ 6)
- **push:** ต้อง token เจ้าของ (ผม/AI push เองไม่ได้) · **15 commit รอ push** (ดูข้อ 2)
- **กฎเหล็ก R2:** ห้ามแตะ backend/logic/RBAC/API/DB — แก้แค่ presentational/style/layout

## 1) หลักการ (Core Principle — ยึดทุกการตัดสินใจ)
**minimal · เรียบง่าย · ไม่รก · clean · หรูดูแพง** · ตัดของไม่จำเป็นก่อนเสมอ · 1 บรรทัด 1 ข้อมูล · gold accent เดียว · whitespace หายใจ · จบมือเดียวบนมือถือ
**เพิ่ม/ลด/ไม่แตะ ได้หมด — การลบก็คือการปรับปรุง · ทำอะไรต้องเสนอก่อน · ห้ามอวย · ห้ามแก้ปิดตา (ต้องมีภาพจริง)**

## 2) commits ทั้งหมด session นี้ (15, ล่าสุดบนสุด)
```
1e719f5 polish: tabs scroll fade-mask + card hover micro-lift
72ffef2 font: Inter (Latin) + IBM Plex Sans Thai (Thai) system-wide
6b315f1 fix: gallery arrows subtle + graceful broken-image fallback
e37c954 filter redesign — mobile bottom-sheet + desktop filter-bar
18ad7ab home — merge BTS+MRT carousels → "Near transit"
e14ecab Phase 0 — lock tokens, remove arbitrary font sizes
aed3f34 revert serif → clean sans (minimal)
aeb6f96 P8 (partial) admin — spec icons on property detail
98e7228 P7 mobile app-like — bottom navigation
05dfd44 P6 — pill buttons + form trust (serif ถูก revert แล้ว)
9ebdff5 P5 listings — (เดิม sidebar; ถูกแทนด้วย filter-bar ใน e37c954)
0e7bb61 P4 home — popular chips, trust band, how-it-works
3e76f51 P3 detail gallery — desktop 1+2×2 grid
502a974 P2 property cards + favorites (heart/saved/count)
d049e13 P1 specs icon-row
```

## 3) สถานะเฟสตามแผน (PHASE2 plan)
- **P1–P7 = ✅ เสร็จ** (public: specs, favorites+/saved, gallery, home, listings, mobile bottom-nav)
- **P6:** pill button + form trust **เก็บไว้** · serif **ถูก revert** (เจ้าของว่าไม่คลีน) → **ห้ามใส่ serif คืน**
- **P8 (admin) = 🟡 partial** — เพิ่ม spec icons หน้า property detail เท่านั้น · ที่เหลือ (empty/loading art, consistency audit) **ยังไม่ทำ** (รอ screenshot admin ได้)
- **Phase 0 (Design System Recovery) = ✅** — `DESIGN-SYSTEM.md` ล็อก typography/spacing/radius/shadow/icon/color · arbitrary `text-[..]` = 0 · token `text-2xs`(11px)

## 4) การตัดสินใจ system-level ที่ล็อกแล้ว (เจ้าของ approve)
- **ฟอนต์ = Inter (อังกฤษ/ตัวเลข) + IBM Plex Sans Thai (ไทย)** · แก้ที่ `tailwind.preset.cjs` `fontFamily.sans = ['Inter','"IBM Plex Sans Thai"',...]` · ใช้ทั้ง **public + admin** (preset กลาง) · **ไม่มี serif**
- **ปุ่ม = pill** (`.btn` rounded-full ใน web-public globals.css)
- **ฟิลเตอร์:** มือถือ = **bottom-sheet** (สูงคงที่ ~82vh, หัว/ท้ายตรึง, เลื่อนเฉพาะกลาง) · เดสก์ท็อป = **filter-bar แนวนอน dropdown pills** (`FilterBar.tsx`) การ์ด 4 คอลัมน์ (ตัด sidebar; `FilterSidebar.tsx` ถูกลบ)
- **gallery ลูกศร:** มือถือ = ไม่มีลูกศร (ปัด+dots/counter) · เดสก์ท็อป card = ลูกศรโผล่ตอน hover
- **bottom-nav มือถือ:** หน้าแรก/ค้นหา/โปรด/ติดต่อ · **ซ่อนบนหน้า detail** (StickyCTA แทน) · header มือถือเหลือ logo+ภาษา
- **home carousels:** เหลือ 3 (Featured / Near transit=รวม BTS+MRT / Pet friendly)

## 5) ยังไม่ได้ทำ / ควรทำต่อ / ควรระวัง
**ควรทำต่อ (เรียงความคุ้ม):**
1. **admin visual QA** — ต้อง login (AI กรอกรหัสไม่ได้) · เจ้าของ login กวาดตา list/table/form/modal ว่า Inter ทำ label/cell ล้นไหม · **R2 audit จากโค้ด = ความเสี่ยงต่ำ** (ส่วนใหญ่ truncate/tabular-nums/ไทย) → **ยังไม่แก้ admin ล่วงหน้า** รอเจ้าของยืนยัน
2. **premium extras (เสนอไว้ ยังไม่ทำ):** gallery progress-bar (แทน dots), skeleton shimmer, hero full-bleed detail, sticky price bar · ทำทีละตัว แคปเทียบ · **อย่าใส่รวด เดียว (minimal)**
3. **P9 responsive** — public ผ่านแล้ว (mobile375/tablet768 verified) · **admin ยังไม่ไล่**
4. **P10 ship** — before/after gallery + push (token เจ้าของ)

**ควรระวัง / gotcha:**
- **รูป mock บางใบเป็นภาพ TikTok analytics** (เช่น พระราม 8 = CD-2026-1008) = seed data ไม่ใช่บั๊ก · fallback กันภาพพัง (`onError` ซ่อน img → gradient) ใส่แล้วใน PropertyCard/PropertyGallery
- **hydration warning** `192.168.x` vs `localhost` = mediaUrl + env เดิม ไม่ใช่ของใหม่ อย่าไปแก้ (R2)
- **ราคา `฿19,000`:** `฿`=Plex, ตัวเลข=Inter (คนละฟอนต์ในโทเคน) ตอนนี้โอเค ถ้าเจ้าของขัดตาค่อยบังคับฟอนต์เดียว

## 6) วิธีเทส/แคปภาพ (สำคัญมาก — จำให้ได้)
- **claude-in-chrome viewport ล็อก ~1440px** → ใช้ได้แค่ desktop · **แคปมือถือ/แท็บเล็ตไม่ได้ตรง ๆ**
- **แคปมือถือจริง = Preview MCP + git worktree** (กัน .next ชนของเจ้าของ :3000):
  ```
  git worktree add --detach <scratchpad>/ros-preview HEAD
  ln -s <repo>/node_modules <worktree>/node_modules
  # ถ้าโค้ดยัง uncommitted: cp ไฟล์ที่แก้เข้า worktree ด้วย
  # เพิ่ม launch config "web-public-preview" (bash -c 'cd <worktree>/apps/web-public && exec npx next dev', autoPort:true)
  preview_start web-public-preview → preview_resize mobile/tablet → preview_screenshot
  # เสร็จแล้ว: preview_stop + git worktree remove + git checkout .claude/launch.json
  ```
- **claude-in-chrome screenshot ค้าง?** → แท็บถูกใช้นานเกิน (HMR สะสม) · **เปิดแท็บใหม่** (tabs_create_mcp) แก้ได้ · `eval` ยังทำงานแม้ screenshot ค้าง

## 7) ไฟล์สำคัญ (public)
- `components/`: PropertyCard · PropertyGallery · SearchBar(มี bottom-sheet) · **FilterBar**(desktop dropdown) · CategoryTabs(+fade-mask) · ListingSearch · BottomNav · Header(+SavedLink) · Icon · T(SpecStrip/PriceMonthly) · FeaturedCarousel · AppointmentForm · StickyCTA · Lightbox
- `lib/`: favorites.ts(useSyncExternalStore) · lang.tsx(dict TH/EN) · api.ts
- `app/`: page(home) · properties/page(listings) · properties/[code]/page(detail) · saved/page · layout(font link + BottomNav)
- **tokens:** `tailwind.preset.cjs` (กลาง 2 แอป) · `DESIGN-SYSTEM.md` (กฎ)

## 8) ถัดไปทันที (เจ้าของสั่งค้างไว้)
ทำ **#1 fade-mask ✅ #2 hover-lift ✅** เสร็จแล้ว · เหลือ **#3 = handover นี้ ✅**
→ รอบหน้าเริ่มที่: ถาม premium extras ตัวไหนก่อน / admin login เช็ค / หรือ push

# 🔧 RECOVERY NOTES — กู้ redesign v2 หลังโฟลเดอร์หลักถูกลบ (6 ก.ค. 2026)

## เกิดอะไรขึ้น
- โฟลเดอร์หลัก `~/Desktop/ไม่มีชื่อโฟลเดอร์` **ถูกลบถาวร** (เผลอกด Cmd+Option+Delete · Trash ว่าง · Desktop ไม่ได้ sync iCloud · ไม่มี Time Machine เสียบ)
- งานที่หาย: **redesign v2 ดาร์กทั้งหมด (D5–D16)** + git commit `750387a`/`4e7afa5`
- **ฐานที่รอด:** โฟลเดอร์นี้ (`ไม่มีชื่อโฟลเดอร์ สำเนา 2`, 4 ก.ค.) = สถานะ **ก่อน** redesign (Wave A–J + PART 1 flow) · 3 แอปครบ · node_modules ครบ · git repo

## กู้อย่างไร
reconstruct redesign v2 กลับบนสำเนา 2 จากเนื้อไฟล์ที่ยังอยู่ใน context ของ session (อ่าน/แก้ครบในวันนั้น):
- **git safety:** snapshot สถานะ 4 ก.ค. → commit `79f7abe` + branch `backup-สำเนา2-4julyy` · reconstruct บน branch `recover/redesign-v2`

### ไฟล์แกน (พิมพ์กลับทั้งไฟล์จาก context)
| ไฟล์ | เนื้อหา |
|---|---|
| `globals.css` | token ดาร์ก v2 ครบ (canvas/surface/raised/border-strong/gold) + light gold a11y `#8C6E42` + `.dark` block + seg ring |
| `tailwind.preset.cjs` | radius card 16/xl2 20 + color `raised`/`border-strong` |
| `components/ui.tsx` | primitives D6–D16 (InfoGroup rounded-card · MoreMenu/Combobox rounded-xl2 · Avatar bg-ink-soft · Modal border) |
| `components/Toast.tsx` | การ์ดดาร์ก + กรอบสี + rounded-xl2 |

### การแก้กระจาย (re-apply จากที่รู้แน่)
- **D5:** manifest/layout themeColor → `#141312` · **dark = default** (inline script `!== 'light'`)
- **D6:** hover ผิดทิศ `hover:bg-canvas` → `hover:bg-raised` (11 ไฟล์)
- **D13:** nav active (4 จุด) `bg-ink text-canvas` → `bg-raised text-gold-dark` · logo R → gold · calendar วันเลือก → gold · chip (ประเภททรัพย์/แจ้งเตือน) → `bg-gold/15 text-gold-dark` · stepper → gold
- **D15:** `btn-primary` (คลาสถูกลบ) → `btn-gold` (3 ไฟล์) · scrim `bg-ink/*` → `bg-black/*` (drawer/Lightbox/ปุ่มบนรูป) · gold+`text-white` → `text-[#1c1b18]` (4 จุด)
- **D16:** light gold `#8C6E42` (AA) · Avatar `bg-ink-soft` · seg ring · KPI hover:bg-raised

## verify (เหมือน session เดิม)
- `tsc --noEmit` = **0** · Tailwind คอมไพล์ผ่าน (token/radius ใหม่ generate)
- สแกน leak: default-palette=**0** · bg-white/text-black=**0** · btn-primary=**0** · bg-ink-text-canvas=**0** · hover:bg-canvas=**0** · gold+text-white=**0** → **token-based 100%**

## ⚠️ ความต่างจากต้นฉบับที่หาย (fidelity ~95%)
- ไฟล์แกน (globals/preset/ui/Toast) = **ตรงเป๊ะ** (มีเต็มใน context)
- จุดกระจาย = re-apply จากความรู้ session · บางดีเทลเล็ก (เช่น stepper done-step, logo tile) เป็น **การตัดสินใจสร้างใหม่ให้สอดคล้อง D13** ไม่ใช่ค่าต้นฉบับเป๊ะ → ให้เจ้าของ refresh ตรวจจุดพวกนี้
- ไม่มี git history ของ commit เดิม (สร้าง commit ใหม่บน branch `recover/redesign-v2`)

## ทำต่อ
1. เจ้าของ refresh ดาร์กภาพรวม + จุด D13 ที่ reconstruct (logo/calendar/stepper)
2. rename โฟลเดอร์นี้เป็นตัวหลัก (ดู README/handover) · ลบโฟลเดอร์หลักที่ถูกกว้าน (เหลือแค่ .next)
3. **ตั้ง git remote auth + push** (ครั้งนี้ commit บน local อย่างเดียว) กัน loss อีก

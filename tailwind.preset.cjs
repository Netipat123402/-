/**
 * ROS Design Tokens — Tailwind preset (single source of truth)
 * ใช้ร่วมกันทั้ง web-admin และ web-public (เลิก sync โทเคนด้วยมือ)
 * ค่าทั้งหมด = ของเดิมที่เคยกระจายใน tailwind.config.ts สองไฟล์ (ไม่เปลี่ยนหน้าตา)
 *
 * Layer:
 *   - color / font / radius / shadow(card)  → primitive ที่ใช้เหมือนกันทุกแอป
 *   - motion (easing/duration/keyframes)     → ตั้งชื่อให้ใช้ซ้ำได้ (Sprint 1 D2/F1)
 * ส่วนที่ต่างกันตามแอป (public: maxWidth content, shadow.lift เด่นกว่า; admin: mouse/touch plugin)
 * ยังอยู่ใน config ของแต่ละแอป — preset ไม่ยัดมาให้
 */

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Dark mode = สลับด้วย class `.dark` (เฉพาะ web-admin) · ค่าจริงอยู่ใน CSS variable (globals.css)
  darkMode: 'class',
  theme: {
    extend: {
      // สีอ้างอิง CSS variable (channel RGB เว้นวรรค) → รองรับ opacity (bg-ink/40) + สลับ light/dark ได้
      // ค่าจริง light/dark นิยามใน :root และ .dark ของ globals.css แต่ละแอป
      colors: {
        ink: { DEFAULT: 'rgb(var(--c-ink) / <alpha-value>)', soft: 'rgb(var(--c-ink-soft) / <alpha-value>)' },
        gold: { DEFAULT: 'rgb(var(--c-gold) / <alpha-value>)', dark: 'rgb(var(--c-gold-dark) / <alpha-value>)', light: 'rgb(var(--c-gold-light) / <alpha-value>)' },
        surface: 'rgb(var(--c-surface) / <alpha-value>)',
        raised: 'rgb(var(--c-raised) / <alpha-value>)',
        canvas: 'rgb(var(--c-canvas) / <alpha-value>)',
        border: 'rgb(var(--c-border) / <alpha-value>)',
        'border-strong': 'rgb(var(--c-border-strong) / <alpha-value>)',
        muted: 'rgb(var(--c-muted) / <alpha-value>)',
        faint: 'rgb(var(--c-faint) / <alpha-value>)',
        success: 'rgb(var(--c-success) / <alpha-value>)',
        warning: 'rgb(var(--c-warning) / <alpha-value>)',
        danger: 'rgb(var(--c-danger) / <alpha-value>)',
        info: 'rgb(var(--c-info) / <alpha-value>)',
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', 'Inter', 'system-ui', 'sans-serif'],
      },
      // Redesign v2: มุมโค้งใหญ่ขึ้น (สไตล์แอพ Claude) — card 16, xl2 20
      borderRadius: { card: '16px', xl2: '20px' },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.06)',
      },

      // ── Motion tokens (D2) ── ตั้งชื่อ easing/duration ให้ทั้งระบบใช้ภาษาเดียว
      transitionTimingFunction: {
        // เข้า-ออกนุ่ม "เด้งปลายทาง" (ใช้กับ entrance/รายการ) — ค่าเดียวกับ fade-rise เดิม
        standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
        // เน้น/เร่ง (ใช้กับ interaction สำคัญ)
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
      },
      transitionDuration: {
        fast: '150ms',
        base: '200ms',
        slow: '300ms',
      },

      // ── Motion keyframes/animation (F1) ── ใช้ผ่าน class: animate-fade-in / animate-modal-in
      keyframes: {
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'modal-in': {
          from: { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          to: { opacity: '1', transform: 'none' },
        },
      },
      animation: {
        'fade-in': 'fade-in 200ms cubic-bezier(0.16, 1, 0.3, 1) both',
        // backwards (ไม่ใช่ both): กัน "identity transform" ค้างหลังจบ animation
        //   matrix(1,0,0,1,0,0) ที่ค้างจะกลายเป็น containing block ดักจับ position:fixed
        //   → dropdown (Combobox) ในกล่อง modal ตกกรอบ/เลื่อนผิดตำแหน่ง (เหมือน fade-rise)
        'modal-in': 'modal-in 240ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
      },
    },
  },
};

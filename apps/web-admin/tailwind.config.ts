import type { Config } from 'tailwindcss';
import plugin from 'tailwindcss/plugin';

// Sprint 1 D1: โทเคนกลาง (สี/ฟอนต์/radius/shadow card/motion) ดึงจาก preset เดียว — เลิก sync มือ
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rosPreset = require('../../tailwind.preset.cjs');

/**
 * Design tokens (Phase 6) — Minimal / Luxury / Premium
 * Accent = Gold/Brass · warm-neutral · IBM Plex Sans Thai + Inter
 * โทเคนร่วมอยู่ใน ../../tailwind.preset.cjs · ที่นี่เก็บเฉพาะส่วนเฉพาะ admin
 */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [rosPreset],
  theme: {
    extend: {
      // shadow.lift ของ admin เบากว่า public (เนื้อหาหนาแน่น) — override เฉพาะ key นี้
      boxShadow: {
        lift: '0 4px 16px rgba(0,0,0,0.08)',
      },
    },
  },
  plugins: [
    // สลับ shell: desktop shell (sidebar) เฉพาะ "ไม่มี touch" และ "จอกว้าง ≥768"
    //  - ไอแพด/แท็บเล็ต/มือถือ (มี touch) → mobile shell เสมอ (แม้ต่อคีย์บอร์ด/แทร็กแพด)
    //  - เดสก์ท็อปจอกว้าง (ไม่มี touch) → desktop shell (sidebar)
    //  - เดสก์ท็อปย่อจอแคบ (<768) → mobile shell (กัน sidebar+header รก/ซ้อนตอนจอแคบ)
    //  ใช้ผ่าน CSS (ไม่มี hydration flash)
    plugin(({ addVariant }) => {
      addVariant('mouse', '@media (min-width: 768px) and (not (any-pointer: coarse))');
      addVariant('touch', '@media (any-pointer: coarse)'); // มี touch = มือถือ/แท็บเล็ต
    }),
  ],
};
export default config;

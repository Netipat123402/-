import type { Config } from 'tailwindcss';

// Sprint 1 D1: โทเคนกลาง (สี/ฟอนต์/radius/shadow card/motion) ดึงจาก preset เดียวกับ web-admin
// eslint-disable-next-line @typescript-eslint/no-var-requires
const rosPreset = require('../../tailwind.preset.cjs');

/** Design tokens (Phase 6) — โทเคนร่วมอยู่ใน ../../tailwind.preset.cjs · ที่นี่เก็บเฉพาะส่วนเฉพาะ public */
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  presets: [rosPreset],
  theme: {
    extend: {
      // public: shadow.lift เด่นกว่า (การ์ดทรัพย์ลอยเด่น) + กว้างเนื้อหาสูงสุด 1200
      boxShadow: { lift: '0 8px 30px rgba(0,0,0,0.10)' },
      maxWidth: { content: '1200px' },
    },
  },
  plugins: [],
};
export default config;

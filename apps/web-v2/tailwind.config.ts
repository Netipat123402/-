import type { Config } from 'tailwindcss';

// web-v2 = Findit clone (Notify content) — standalone tokens (ไม่ใช้ ../../tailwind.preset.cjs)
// ⚠️ override DESIGN-SYSTEM lock เฉพาะ v2: Manrope + ขาว-ดำ minimal · ปุ่ม pill 50px
// ค่าจาก audit DOM สด Findit: H1 72/600 · H2 42/500 · body 18/400/#333 · btn #000 pill · bg #fff
const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Manrope', 'system-ui', 'sans-serif'],
        inter: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        ink: '#111111', // หัวข้อ/ปุ่มดำ (Findit ใช้ #000; #111 นุ่มกว่านิด กันดำสนิท)
        body: '#333333', // เนื้อความ
        muted: '#666666', // รอง
        faint: '#999999', // จาง
        line: '#e8e8e8', // เส้นขอบ/แบ่ง
        surface: '#ffffff', // พื้นหลัก
        soft: '#f6f6f6', // พื้น section สลับ
      },
      borderRadius: {
        pill: '50px', // ปุ่มหลัก Findit
        card: '20px', // การ์ด (จูนต่อ section เทียบเว็บสด)
      },
      maxWidth: {
        content: '1200px', // จูนต่อจาก audit
      },
      letterSpacing: {
        tightish: '-0.01em',
      },
    },
  },
  plugins: [],
};
export default config;

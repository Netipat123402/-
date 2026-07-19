import type { SVGProps } from 'react';

/**
 * ชุดไอคอนเดียวของระบบ — outline, stroke เท่ากันทุกตัว (1.75), currentColor
 * อิงหลัก "Consistency" (เทคนิค UX/UI น.75) + ไอคอนเรียบ-คุ้นเคย (น.42)
 * ใช้แทนสัญลักษณ์/อิโมจิที่เคยปนกัน (◧ ◔ ☰ × ▾ ✓ 📄 ⚠️ ฯลฯ)
 */
const ICONS = {
  home: (<><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V20a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9.5" /><path d="M9.5 21v-5.5h5V21" /></>),
  'user-plus': (<><circle cx="9" cy="8" r="3.5" /><path d="M4 20v-1a5 5 0 0 1 5-5h1.5" /><path d="M18 9v6" /><path d="M15 12h6" /></>),
  users: (<><circle cx="9" cy="8" r="3.5" /><path d="M3.5 20v-1.5A4.5 4.5 0 0 1 8 14h2a4.5 4.5 0 0 1 4.5 4.5V20" /><path d="M16 4.8a3.5 3.5 0 0 1 0 6.4" /><path d="M20.5 20v-1.5a4.5 4.5 0 0 0-3-4.2" /></>),
  user: (<><circle cx="12" cy="8" r="3.75" /><path d="M5 20v-1a6 6 0 0 1 14 0v1" /></>),
  calendar: (<><rect x="3.5" y="5" width="17" height="15.5" rx="2" /><path d="M3.5 9.5h17" /><path d="M8 3.5v3" /><path d="M16 3.5v3" /></>),
  clock: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>),
  building: (<><rect x="5" y="3" width="14" height="18" rx="1.5" /><path d="M3.5 21h17" /><path d="M9 7.5h1.5" /><path d="M13.5 7.5h1.5" /><path d="M9 11h1.5" /><path d="M13.5 11h1.5" /><path d="M10.5 21v-3h3v3" /></>),
  key: (<><circle cx="8" cy="15.5" r="3.5" /><path d="M10.5 13 20 3.5" /><path d="M16.5 7l2.5 2.5" /><path d="M18.5 5l2 2" /></>),
  'file-text': (<><path d="M14 3H7a1.5 1.5 0 0 0-1.5 1.5v15A1.5 1.5 0 0 0 7 21h10a1.5 1.5 0 0 0 1.5-1.5V7.5z" /><path d="M14 3v4.5h4.5" /><path d="M9 13h6" /><path d="M9 16.5h6" /><path d="M9 9.5h2" /></>),
  image: (<><rect x="3.5" y="3.5" width="17" height="17" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M20 14.5 15.5 10 5 20.5" /></>),
  menu: (<><path d="M4 7h16" /><path d="M4 12h16" /><path d="M4 17h16" /></>),
  // sliders (แนวนอน) = affordance ของ "ตัวกรอง" — 2 ราง + ปุ่มปรับ
  sliders: (<><path d="M4 8h6" /><path d="M14 8h6" /><circle cx="12" cy="8" r="2" /><path d="M4 16h10" /><path d="M18 16h2" /><circle cx="16" cy="16" r="2" /></>),
  x: (<><path d="M6 6 18 18" /><path d="M18 6 6 18" /></>),
  'chevron-down': (<path d="M6 9.5 12 15.5 18 9.5" />),
  'chevron-left': (<path d="M14.5 18 8.5 12 14.5 6" />),
  'chevron-right': (<path d="M9.5 6 15.5 12 9.5 18" />),
  'arrow-left': (<><path d="M19 12H5" /><path d="M11 6 5 12 11 18" /></>),
  'arrow-right': (<><path d="M5 12h14" /><path d="M13 6 19 12 13 18" /></>),
  check: (<path d="M5 12.5 9.5 17 19 7" />),
  plus: (<><path d="M12 5v14" /><path d="M5 12h14" /></>),
  bell: (<><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5H3.5S6 15 6 9Z" /><path d="M10.4 20a1.8 1.8 0 0 0 3.2 0" /></>),
  search: (<><circle cx="10.5" cy="10.5" r="6.5" /><path d="M20 20 15.5 15.5" /></>),
  'alert-triangle': (<><path d="M12 3.5 21.5 20H2.5L12 3.5Z" /><path d="M12 10v4" /><path d="M12 17.5h.01" /></>),
  info: (<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5" /><path d="M12 8h.01" /></>),
  // spec icons (bed/bath/area/floor) — outline, stroke 1.75 เท่าตัวอื่น ใช้ช่วย scan สเปกทรัพย์
  bed: (<><path d="M3 8v11" /><path d="M3 13h16a2 2 0 0 1 2 2v4" /><path d="M3 17h18" /><path d="M6.5 13v-2a1.5 1.5 0 0 1 1.5-1.5h6a1.5 1.5 0 0 1 1.5 1.5v2" /></>),
  bath: (<><path d="M4 12V6.5A1.5 1.5 0 0 1 5.5 5h.5" /><path d="M6 5v3" /><path d="M2.5 12h19v3a4 4 0 0 1-4 4H6.5a4 4 0 0 1-4-4z" /><path d="M7 19l-1.5 2" /><path d="M17 19l1.5 2" /></>),
  area: (<><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></>),
  floor: (<><path d="M12 3 3 7.5 12 12l9-4.5L12 3Z" /><path d="M3 12l9 4.5L21 12" /><path d="M3 16.5 12 21l9-4.5" /></>),
  // favorite / badge icons — heart รับ fill ผ่าน prop (state active) · train/paw ประกอบ badge
  heart: (<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z" />),
  train: (<><rect x="5" y="3" width="14" height="13" rx="2.5" /><path d="M5 11h14" /><path d="M8.5 7h7" /><circle cx="8.5" cy="13.5" r="0.6" /><circle cx="15.5" cy="13.5" r="0.6" /><path d="M8 16l-2.5 4" /><path d="M16 16l2.5 4" /></>),
  paw: (<><ellipse cx="7" cy="8.5" rx="1.6" ry="2.1" /><ellipse cx="12" cy="6.5" rx="1.7" ry="2.2" /><ellipse cx="17" cy="8.5" rx="1.6" ry="2.1" /><path d="M12 12c-2.4 0-4.3 2-4.3 3.9 0 1.5 1.2 2.4 2.7 2.4.8 0 1.1-.4 1.6-.4s.8.4 1.6.4c1.5 0 2.7-.9 2.7-2.4C16.3 14 14.4 12 12 12Z" /></>),
  message: (<><path d="M4 5.5h16a1.5 1.5 0 0 1 1.5 1.5v8a1.5 1.5 0 0 1-1.5 1.5H9.5L5 21.5V16.5H4A1.5 1.5 0 0 1 2.5 15V7A1.5 1.5 0 0 1 4 5.5Z" /><path d="M8 10.5h8" /><path d="M8 13.5h5" /></>),
} as const;

export type IconName = keyof typeof ICONS;

export function Icon({ name, size = 18, className, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden
      className={className} {...rest}>
      {ICONS[name]}
    </svg>
  );
}

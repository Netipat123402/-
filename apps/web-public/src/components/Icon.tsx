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

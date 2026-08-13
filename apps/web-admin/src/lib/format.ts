/** จัดรูปเบอร์โทรไทยขณะพิมพ์ → 08x-xxx-xxxx (ตัวเลขสูงสุด 10 หลัก) */
export function formatPhone(input: string): string {
  const d = input.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}-${d.slice(3)}`;
  return `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}`;
}

/** ตัวเลขล้วนของเบอร์ (สำหรับส่ง/ตรวจสอบ) */
export function phoneDigits(input: string): string {
  return input.replace(/\D/g, '');
}

// ---------------------------------------------------------------------------
// วันที่ = รูปแบบสากล (Latin, ค.ศ., 24 ชม.) — source เดียวของทั้งแอป
//   เลิกใช้ พ.ศ./เดือนไทย (ดูรก/local) → "14 Jul 2026 · 09:00" แบบ Linear/Stripe
//   locale en-GB = วัน-เดือน-ปี (ไม่ใช่ US เดือน-วัน) · hour12:false = 24 ชม.
// ---------------------------------------------------------------------------
// มาตรฐานวันที่เดียวทั้งแอป (owner lock): "14 Jul 26" — ปี 2 หลัก สากล กระชับ (Linear/Stripe) · §7
const DATE = { day: 'numeric', month: 'short', year: '2-digit' } as const;      // 14 Jul 26
const DATE_SHORT = { day: 'numeric', month: 'short' } as const;                 // 14 Jul
const TIME = { hour: '2-digit', minute: '2-digit', hour12: false } as const;    // 09:00
const LOCALE = 'en-GB';

function parse(iso?: string): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** วันที่สากล เช่น "14 Jul 2026" — รับ ISO/date-input · ว่าง = '' */
export function fmtDate(iso?: string): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString(LOCALE, DATE) : '';
}

/** วันที่สั้น เช่น "14 Jul" (ไม่มีปี) — สำหรับ agenda/แจ้งเตือนที่พื้นที่แคบ */
export function fmtDateShort(iso?: string): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString(LOCALE, DATE_SHORT) : '';
}

/** วันที่ย่อ ปี 2 หลัก เช่น "14 Jul 26" — alias ของ fmtDate หลัง lock มาตรฐาน (คงชื่อไว้ให้ list ที่อ้างถึง) */
const DATE_COMPACT = { day: 'numeric', month: 'short', year: '2-digit' } as const;
export function fmtDateCompact(iso?: string): string {
  const d = parse(iso);
  return d ? d.toLocaleDateString(LOCALE, DATE_COMPACT) : '';
}

/** วัน+วันที่ เช่น "Mon 14 Jul 26" — หัวนัดหมาย (วันในสัปดาห์สำคัญต่อการนัด) */
export function fmtWeekdayDate(iso?: string): string {
  const d = parse(iso);
  if (!d) return '';
  return `${d.toLocaleDateString(LOCALE, { weekday: 'short' })} ${d.toLocaleDateString(LOCALE, DATE_COMPACT)}`;
}

/** ช่วงเวลา เช่น "09:00–09:30" (จาก start + ระยะเวลานาที) — ถ้าไม่มี duration คืนเวลาเริ่มอย่างเดียว */
export function fmtTimeRange(iso?: string, durationMin?: number): string {
  const d = parse(iso);
  if (!d) return '';
  const start = d.toLocaleTimeString(LOCALE, TIME);
  if (!durationMin) return start;
  const end = new Date(d.getTime() + durationMin * 60000).toLocaleTimeString(LOCALE, TIME);
  return `${start}–${end}`;
}

/** เวลา 24 ชม. เช่น "09:00" */
export function fmtTime(iso?: string): string {
  const d = parse(iso);
  return d ? d.toLocaleTimeString(LOCALE, TIME) : '';
}

/** วันที่+เวลา เช่น "14 Jul 2026 · 09:00" — รับ datetime-local/ISO */
export function fmtDateTime(iso?: string): string {
  const d = parse(iso);
  return d ? `${d.toLocaleDateString(LOCALE, DATE)} · ${d.toLocaleTimeString(LOCALE, TIME)}` : '';
}

/** เวลาแบบสัมพัทธ์ เช่น "เมื่อสักครู่" / "5 นาทีที่แล้ว" / "3 ชม.ที่แล้ว" / "เมื่อวาน"
 *  เกิน ~7 วัน → คืนวันที่เต็ม (fmtDate). ใช้กับ feed/แจ้งเตือน/audit ที่ความสดสำคัญกว่าวันเป๊ะ */
export function fmtRelative(iso?: string): string {
  const d = parse(iso);
  if (!d) return '';
  const sec = Math.round((Date.now() - d.getTime()) / 1000);
  if (sec < 45) return 'เมื่อสักครู่';
  const min = Math.round(sec / 60);
  if (min < 60) return `${min} นาทีที่แล้ว`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} ชม.ที่แล้ว`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'เมื่อวาน';
  if (day < 7) return `${day} วันที่แล้ว`;
  return fmtDate(iso);
}

type TFn = (key: string, values?: Record<string, string | number>) => string;
/** เวลาสัมพัทธ์ i18n (รับ t) — "เมื่อสักครู่/X นาที/X ชม." · เกิน 24 ชม. → fallback (default fmtDate)
 *  ใช้ในคอมโพเนนต์ร่วมที่มี t (ActivityTimeline/NotificationBell) แทน timeAgo ซ้ำๆ ในแต่ละไฟล์ */
export function relTime(iso: string, t: TFn, fallback?: (d: Date) => string): string {
  const d = parse(iso);
  if (!d) return '';
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1) return t('time.justNow');
  if (m < 60) return t('time.minutesAgo', { m });
  const h = Math.floor(m / 60);
  if (h < 24) return t('time.hoursAgo', { h });
  return fallback ? fallback(d) : fmtDate(iso);
}

/** เวลานับถอยหลัง (อนาคต) เช่น "อีก 5 นาที" / "อีก 2 ชม." / "พรุ่งนี้" / "อีก 3 วัน"
 *  เกิน ~7 วัน → คืนวันที่เต็ม (fmtDate). อดีต → "เลยกำหนดแล้ว".
 *  ใช้เป็น urgency hint ของนัด/สัญญาใกล้ครบ (คู่กับ fmtRelative ที่ทำเฉพาะอดีต) */
export function fmtUntil(iso?: string): string {
  const d = parse(iso);
  if (!d) return '';
  const sec = Math.round((d.getTime() - Date.now()) / 1000);
  if (sec < -60) return 'เลยกำหนดแล้ว';
  if (sec < 60) return 'ถึงกำหนดแล้ว';
  const min = Math.round(sec / 60);
  if (min < 60) return `อีก ${min} นาที`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `อีก ${hr} ชม.`;
  const day = Math.round(hr / 24);
  if (day === 1) return 'พรุ่งนี้';
  if (day < 7) return `อีก ${day} วัน`;
  return fmtDate(iso);
}

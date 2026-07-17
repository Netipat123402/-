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
const DATE = { day: 'numeric', month: 'short', year: 'numeric' } as const;      // 14 Jul 2026
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

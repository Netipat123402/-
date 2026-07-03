/**
 * จัดรูปวันเวลาแบบไทย โดย pin โซนเวลา Asia/Bangkok เสมอ (MR-23)
 * กันปัญหาข้อความแจ้งเตือนแสดงเวลาผิดเมื่อ server รันที่ TZ=UTC
 * (เช่น นัด 14:00 ไทย ต้องแสดง "14:00" ไม่ใช่ "07:00")
 */
const TZ = 'Asia/Bangkok';

/** วัน + เวลา (เช่น "1 มิ.ย. 2569 14:00") */
export function thaiDateTime(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleString('th-TH', { timeZone: TZ, dateStyle: 'medium', timeStyle: 'short' });
}

/** เฉพาะวันที่ (เช่น "1 มิถุนายน 2569") */
export function thaiDate(d: Date | string | null | undefined): string {
  if (!d) return '-';
  const date = typeof d === 'string' ? new Date(d) : d;
  if (isNaN(date.getTime())) return '-';
  return date.toLocaleDateString('th-TH', { timeZone: TZ, dateStyle: 'long' });
}

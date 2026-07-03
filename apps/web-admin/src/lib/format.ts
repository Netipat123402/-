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

/** วันที่ไทย พ.ศ. เช่น "18 มิ.ย. 2569" — รับค่า ISO/date-input · ว่าง = '' */
export function thaiDate(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** วันที่+เวลาไทย พ.ศ. เช่น "18 มิ.ย. 2569 10:00 น." — รับค่า datetime-local/ISO */
export function thaiDateTime(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return `${d.toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })} น.`;
}

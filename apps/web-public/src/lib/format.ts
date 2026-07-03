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

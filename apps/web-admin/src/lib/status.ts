/** map สถานะ → ป้ายภาษาไทย + สี — รื้อเหลือ 3 ขั้น/อย่าง */
type Tone = 'neutral' | 'active' | 'done' | 'gold' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-border/60 text-ink-soft',
  active: 'bg-success/10 text-success',
  done: 'bg-info/10 text-info',
  gold: 'bg-gold/15 text-gold-dark',
  danger: 'bg-danger/10 text-danger',
};

export const PROPERTY_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'ฉบับร่าง', tone: 'neutral' },
  available: { label: 'ว่าง · ลงประกาศ', tone: 'active' },
  rented: { label: 'ไม่ว่าง', tone: 'gold' },
};

export const LEAD_STATUS: Record<string, { label: string; tone: Tone }> = {
  new: { label: 'ใหม่', tone: 'done' },
  working: { label: 'กำลังดูแล', tone: 'gold' },
  closed: { label: 'ปิดจบ', tone: 'neutral' },
};

export const APPOINTMENT_STATUS: Record<string, { label: string; tone: Tone }> = {
  upcoming: { label: 'รอพบ', tone: 'done' },
  done: { label: 'พบแล้ว', tone: 'active' },
  cancelled: { label: 'ยกเลิก', tone: 'neutral' },
};

export const CONTRACT_STATUS: Record<string, { label: string; tone: Tone }> = {
  draft: { label: 'ฉบับร่าง', tone: 'neutral' },
  active: { label: 'มีผลบังคับ', tone: 'active' },
  ended: { label: 'สิ้นสุด', tone: 'neutral' },
};

// ป้ายเสริม "ใกล้ครบกำหนด" (คำนวณจากวันสิ้นสุด ไม่ใช่สถานะ)
export function isExpiringSoon(endDate?: string | null, withinDays = 30): boolean {
  if (!endDate) return false;
  const ms = new Date(endDate).getTime() - Date.now();
  return ms > 0 && ms <= withinDays * 864e5;
}

export const LEAD_SOURCE: Record<string, string> = {
  public_web: 'เว็บไซต์', walk_in: 'Walk-in', phone: 'โทรศัพท์', referral: 'แนะนำ',
};

export const PROPERTY_TYPE: Record<string, string> = {
  condo: 'คอนโด', house: 'บ้านเดี่ยว', townhome: 'ทาวน์โฮม', apartment: 'อพาร์ทเมนท์',
};

/** ป้ายสถานะแบบสั้น (แทรกในประโยคประวัติ/ฟีด) — ไทยล้วน */
const ACTIVITY_STATUS_TH: Record<string, string> = {
  draft: 'ร่าง', available: 'ว่าง', rented: 'ไม่ว่าง',
  new: 'ใหม่', working: 'กำลังดูแล', closed: 'ปิดจบ',
  upcoming: 'รอพบ', done: 'พบแล้ว', cancelled: 'ยกเลิก', no_show: 'ไม่มาตามนัด',
  active: 'มีผล', ended: 'สิ้นสุด',
};

/**
 * แปลง enum อังกฤษที่ฝังในข้อความประวัติ → ไทย (Phase 12)
 * เช่น "เปลี่ยนสถานะ draft → available" → "เปลี่ยนสถานะ ร่าง → ว่าง"
 * display-only, ไม่แตะข้อมูลจริง · แทนเฉพาะ token ที่ตรงคำเต็ม (word-boundary)
 */
export function thaiifyActivity(summary: string): string {
  return summary.replace(
    /\b(draft|available|rented|new|working|closed|upcoming|done|cancelled|no_show|active|ended)\b/g,
    (m) => ACTIVITY_STATUS_TH[m] ?? m,
  );
}

export type { Tone };

export function badgeClass(tone: Tone): string {
  return `badge ${TONE_CLASS[tone]}`;
}

export function bahtFormat(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n);
}

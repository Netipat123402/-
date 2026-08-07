/** map สถานะ → ป้ายภาษาไทย + สี — รื้อเหลือ 3 ขั้น/อย่าง */
type Tone = 'neutral' | 'active' | 'done' | 'gold' | 'danger';

const TONE_CLASS: Record<Tone, string> = {
  neutral: 'bg-border/60 text-ink-soft',
  active: 'bg-success/10 text-success',
  done: 'bg-info/10 text-info',
  gold: 'bg-gold/15 text-gold-dark',
  danger: 'bg-danger/10 text-danger',
};

// label = i18n key (แปลที่ StatusBadge · lib ใช้ hook ไม่ได้) · tone คงเดิม
type StatusMeta = { labelKey: string; tone: Tone };
export const PROPERTY_STATUS: Record<string, StatusMeta> = {
  draft: { labelKey: 'status.property.draft', tone: 'neutral' },
  pending_review: { labelKey: 'status.property.pending_review', tone: 'done' },
  available: { labelKey: 'status.property.available', tone: 'active' },
  rented: { labelKey: 'status.property.rented', tone: 'gold' },
};

export const PROPERTY_REQUEST_STATUS: Record<string, StatusMeta> = {
  pending: { labelKey: 'status.request.pending', tone: 'done' },
  needs_info: { labelKey: 'status.request.needs_info', tone: 'gold' },
  converted: { labelKey: 'status.request.converted', tone: 'active' },
  rejected: { labelKey: 'status.request.rejected', tone: 'neutral' },
};

export const LEAD_STATUS: Record<string, StatusMeta> = {
  new: { labelKey: 'status.lead.new', tone: 'done' },
  working: { labelKey: 'status.lead.working', tone: 'gold' },
  closed: { labelKey: 'status.lead.closed', tone: 'neutral' },
};

export const APPOINTMENT_STATUS: Record<string, StatusMeta> = {
  upcoming: { labelKey: 'status.appointment.upcoming', tone: 'done' },
  done: { labelKey: 'status.appointment.done', tone: 'active' },
  cancelled: { labelKey: 'status.appointment.cancelled', tone: 'neutral' },
};

export const CONTRACT_STATUS: Record<string, StatusMeta> = {
  draft: { labelKey: 'status.contract.draft', tone: 'neutral' },
  active: { labelKey: 'status.contract.active', tone: 'active' },
  ended: { labelKey: 'status.contract.ended', tone: 'neutral' },
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

// outline = pill กรอบบางโปร่ง (ไม่ตัน) สำหรับ list ที่ minimal — detail คงแบบ fill (เน้น)
const TONE_OUTLINE: Record<Tone, string> = {
  neutral: 'border-border-strong text-muted',
  active: 'border-success/40 text-success',
  done: 'border-info/40 text-info',
  gold: 'border-gold/40 text-gold-dark',
  danger: 'border-danger/40 text-danger',
};

export function badgeClass(tone: Tone, outline?: boolean): string {
  return outline ? `badge border ${TONE_OUTLINE[tone]}` : `badge ${TONE_CLASS[tone]}`;
}

// จุดสถานะทึบสีเดียว (ไม่มีกรอบ/พื้น) — ใช้ในแคปชั่นหัว detail (§ header 2 ระดับ) ให้สถานะเป็นพื้นผิวเดียวกับข้อความ
const TONE_DOT: Record<Tone, string> = {
  neutral: 'bg-faint', active: 'bg-success', done: 'bg-info', gold: 'bg-gold-dark', danger: 'bg-danger',
};
export function toneDot(tone: Tone): string { return TONE_DOT[tone]; }

export function bahtFormat(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n);
}

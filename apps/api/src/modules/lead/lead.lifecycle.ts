import { LeadStatus } from '@prisma/client';

/**
 * Lead Lifecycle — 3 สถานะ
 *   new (ใหม่) → working (กำลังดูแล) → closed (ปิดจบ)
 *   ชนะ = แปลงเป็นลูกค้า (customerId) | แพ้ = ปิดพร้อม lostReason
 */
const T: Record<LeadStatus, LeadStatus[]> = {
  new: ['working', 'closed'],
  working: ['closed'],
  closed: [],
};

export function canTransitionLead(from: LeadStatus, to: LeadStatus): boolean {
  if (from === to) return false;
  return (T[from] ?? []).includes(to);
}

// MR-38: ลบ leadAllowed (dead export — ไม่มีผู้ใช้)

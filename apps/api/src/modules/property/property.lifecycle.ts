import { PropertyStatus } from '@prisma/client';

/**
 * Property Lifecycle — 3 สถานะ
 *   draft (ร่าง) → available (ว่าง/ลงประกาศ) → rented (ไม่ว่าง)
 *
 * - draft → available : เผยแพร่ขึ้นเว็บ
 * - available → draft : ถอนประกาศกลับมาแก้ไข
 * - available → rented : ปล่อยเช่าแล้ว (ปกติขับเคลื่อนจากสัญญา)
 * - rented → available : สัญญาสิ้นสุด ทรัพย์กลับมาว่าง
 */
const TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  draft: ['available'],
  available: ['draft', 'rented'],
  rented: ['available'],
};

export function allowedTransitions(from: PropertyStatus): PropertyStatus[] {
  return TRANSITIONS[from] ?? [];
}

export function canTransition(
  from: PropertyStatus,
  to: PropertyStatus,
): boolean {
  if (from === to) return false;
  return allowedTransitions(from).includes(to);
}

/** สถานะที่แสดงบน public website — เฉพาะทรัพย์ว่าง */
export const PUBLIC_VISIBLE_STATUSES: PropertyStatus[] = [
  PropertyStatus.available,
];

export function isPubliclyVisible(status: PropertyStatus): boolean {
  return PUBLIC_VISIBLE_STATUSES.includes(status);
}

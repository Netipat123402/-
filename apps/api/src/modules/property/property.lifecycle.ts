import { PropertyStatus } from '@prisma/client';

/**
 * Property Lifecycle — 4 สถานะ (Phase 3: เพิ่ม pending_review = ด่านอนุมัติ)
 *   draft (ร่าง) → pending_review (รอตรวจสอบ) → available (ว่าง/ลงประกาศ) → rented (ไม่ว่าง)
 *
 * - draft → pending_review : ผู้จัดการ "ขอเผยแพร่" (ครบจำเป็น 7/7) เข้าคิวรอเจ้าของ
 * - draft → available       : เจ้าของเผยแพร่ร่างตัวเองตรง ๆ (มีสิทธิ์ approve · ยังต้องครบ 7/7)
 * - pending_review → available : เจ้าของอนุมัติเผยแพร่
 * - pending_review → draft   : เจ้าของตีกลับให้แก้ (เหตุผลบังคับ) / ผู้ส่งถอนคำขอกลับไปแก้
 * - available → draft        : ถอนประกาศกลับมาแก้ไข
 * - available → rented       : ปล่อยเช่าแล้ว (ปกติขับเคลื่อนจากสัญญา)
 * - rented → available       : สัญญาสิ้นสุด ทรัพย์กลับมาว่าง
 */
const TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  draft: ['pending_review', 'available'],
  pending_review: ['available', 'draft'],
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

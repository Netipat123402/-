import { PropertyStatus } from '@prisma/client';

/**
 * Property Lifecycle — 4 สถานะ (Phase 3: เพิ่ม pending_review = ด่านอนุมัติ)
 *   draft (ร่าง) → pending_review (รอตรวจสอบ) → available (ว่าง/ลงประกาศ) → rented (ไม่ว่าง)
 *
 * - draft → pending_review : ผู้จัดการ "ขอเผยแพร่" (ครบจำเป็น 7/7) เข้าคิวรอเจ้าของ
 * - draft → available       : เจ้าของเผยแพร่ร่างตัวเองตรง ๆ (มีสิทธิ์ approve · ยังต้องครบ 7/7)
 * - pending_review → available : เจ้าของอนุมัติเผยแพร่
 * - pending_review → draft   : เจ้าของตีกลับให้แก้ (เหตุผลบังคับ) / ผู้ส่งถอนคำขอกลับไปแก้
 * - available → pending_review : (Phase 4) แก้เนื้อหาทรัพย์ที่เผยแพร่แล้ว → เด้งกลับรอตรวจ (ระบบทริกเกอร์)
 * - available → draft        : ถอนประกาศกลับมาแก้ไข (reject)
 * - available → rented       : ปล่อยเช่าแล้ว (ปกติขับเคลื่อนจากสัญญา)
 * - rented → available       : สัญญาสิ้นสุด ทรัพย์กลับมาว่าง
 */
const TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  draft: ['pending_review', 'available'],
  pending_review: ['available', 'draft'],
  available: ['pending_review', 'draft', 'rented'],
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

/**
 * ⭐ Phase 4a (governance hardening) — แยก transition 2 ชนิด:
 *   - operational : เปลี่ยนได้ตรงผ่าน generic endpoint (change_status) — สถานะปฏิบัติการล้วน
 *   - governed    : ต้องผ่านด่านที่มี gate เท่านั้น (ขอเผยแพร่/อนุมัติ/ตีกลับ/ถอน) — publish/approval
 *
 * เหตุผล: ไม่งั้นสิทธิ์ change_status (ผู้จัดการมี) จะยิง draft→available ตรง ๆ
 *         ข้ามด่านอนุมัติ + completeness gate ได้ (maker-checker รั่ว)
 * เพิ่มสถานะ/เส้นทางใหม่ในอนาคต → จัดหมวดที่นี่ที่เดียว
 */
const OPERATIONAL_TRANSITIONS: [PropertyStatus, PropertyStatus][] = [
  [PropertyStatus.available, PropertyStatus.rented], // ปล่อยเช่าแล้ว (ไม่ว่าง)
  [PropertyStatus.rented, PropertyStatus.available], // สัญญาสิ้นสุด กลับมาว่าง
];

export function isOperationalTransition(
  from: PropertyStatus,
  to: PropertyStatus,
): boolean {
  return OPERATIONAL_TRANSITIONS.some(([f, t]) => f === from && t === to);
}

/** สถานะที่แสดงบน public website — เฉพาะทรัพย์ว่าง */
export const PUBLIC_VISIBLE_STATUSES: PropertyStatus[] = [
  PropertyStatus.available,
];

export function isPubliclyVisible(status: PropertyStatus): boolean {
  return PUBLIC_VISIBLE_STATUSES.includes(status);
}

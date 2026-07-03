import { AppointmentStatus } from '@prisma/client';

/**
 * Appointment Lifecycle — 3 สถานะ
 *   upcoming (รอพบ) → done (พบแล้ว) | cancelled (ยกเลิก)
 *   เลื่อนนัด = เปลี่ยนเวลา สถานะคง upcoming (ไม่ใช่สถานะแยก)
 */
const T: Record<AppointmentStatus, AppointmentStatus[]> = {
  upcoming: ['done', 'cancelled'],
  done: [],
  cancelled: [],
};

export function canTransitionAppt(from: AppointmentStatus, to: AppointmentStatus): boolean {
  if (from === to) return false;
  return (T[from] ?? []).includes(to);
}

/** สถานะที่ยัง "ใช้เวลา" อยู่ (สำหรับเช็คเวลาชน) */
export const ACTIVE_APPT_STATUSES: AppointmentStatus[] = ['upcoming'];

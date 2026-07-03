/**
 * Scheduler — pure logic (แยกออกมาให้ทดสอบได้โดยไม่พึ่ง DB/เวลา)
 * Phase 1 §10/§9: สัญญาใกล้หมดอายุ → expiring_soon | เตือนนัดล่วงหน้า
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
export const HOUR_MS = 60 * 60 * 1000;

/**
 * สัญญา (status=active) เข้าเกณฑ์ "ใกล้หมดอายุ" หรือยัง
 * เกณฑ์: มี endDate และ endDate <= now + windowDays (รวมกรณีเลยกำหนดแล้ว)
 */
export function isContractExpiring(
  endDate: Date | null | undefined,
  now: Date,
  windowDays: number,
): boolean {
  if (!endDate) return false;
  const threshold = now.getTime() + windowDays * DAY_MS;
  return endDate.getTime() <= threshold;
}

/**
 * นัด (status=confirmed) ควรเตือนล่วงหน้าหรือยัง
 * เกณฑ์: scheduledAt อยู่ในช่วง (now, now + hoursAhead]
 */
export function isWithinReminderWindow(
  scheduledAt: Date,
  now: Date,
  hoursAhead: number,
): boolean {
  const t = scheduledAt.getTime();
  return t > now.getTime() && t <= now.getTime() + hoursAhead * HOUR_MS;
}

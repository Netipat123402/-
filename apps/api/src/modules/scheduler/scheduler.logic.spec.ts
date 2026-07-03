import {
  isContractExpiring,
  isWithinReminderWindow,
} from './scheduler.logic';

describe('scheduler.logic', () => {
  const now = new Date('2026-06-10T00:00:00.000Z');

  describe('isContractExpiring (window 30 วัน)', () => {
    it('endDate ภายใน 30 วัน → true', () => {
      expect(isContractExpiring(new Date('2026-06-20T00:00:00Z'), now, 30)).toBe(true);
    });
    it('endDate เลยกำหนดแล้ว → true (ต้องถูกจับ)', () => {
      expect(isContractExpiring(new Date('2026-06-01T00:00:00Z'), now, 30)).toBe(true);
    });
    it('endDate ไกลกว่า 30 วัน → false', () => {
      expect(isContractExpiring(new Date('2026-08-01T00:00:00Z'), now, 30)).toBe(false);
    });
    it('ไม่มี endDate → false', () => {
      expect(isContractExpiring(null, now, 30)).toBe(false);
      expect(isContractExpiring(undefined, now, 30)).toBe(false);
    });
    it('ขอบเขตพอดี (= now + 30 วัน) → true', () => {
      expect(isContractExpiring(new Date('2026-07-10T00:00:00Z'), now, 30)).toBe(true);
    });
  });

  describe('isWithinReminderWindow (24 ชม.)', () => {
    it('นัดอีก 12 ชม. → true', () => {
      expect(isWithinReminderWindow(new Date('2026-06-10T12:00:00Z'), now, 24)).toBe(true);
    });
    it('นัดอีก 30 ชม. → false (ไกลเกินหน้าต่าง)', () => {
      expect(isWithinReminderWindow(new Date('2026-06-11T06:00:00Z'), now, 24)).toBe(false);
    });
    it('นัดในอดีต → false (ไม่เตือนย้อนหลัง)', () => {
      expect(isWithinReminderWindow(new Date('2026-06-09T12:00:00Z'), now, 24)).toBe(false);
    });
    it('นัด = now พอดี → false (ต้องเป็นอนาคต)', () => {
      expect(isWithinReminderWindow(now, now, 24)).toBe(false);
    });
    it('ขอบเขตพอดี (= now + 24 ชม.) → true', () => {
      expect(isWithinReminderWindow(new Date('2026-06-11T00:00:00Z'), now, 24)).toBe(true);
    });
  });
});

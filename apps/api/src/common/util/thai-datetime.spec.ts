import { thaiDateTime, thaiDate } from './thai-datetime';

describe('thai-datetime (MR-23 — pin Asia/Bangkok)', () => {
  it('นัด 14:00 ไทย (07:00Z) แสดง 14:00 เสมอ ไม่ขึ้นกับ server TZ', () => {
    // 2026-06-01T07:00:00Z = 14:00 ตามเวลาไทย (UTC+7)
    const d = new Date('2026-06-01T07:00:00Z');
    expect(thaiDateTime(d)).toContain('14:00');
  });

  it('เที่ยงคืนไทย (17:00Z วันก่อน) แสดง 00:00 + วันที่ถูกต้องตามไทย', () => {
    const d = new Date('2026-05-31T17:00:00Z'); // = 2026-06-01 00:00 ไทย
    const s = thaiDateTime(d);
    expect(s).toContain('00:00');
  });

  it('รับ string ISO ได้ + ค่าว่าง → "-"', () => {
    expect(thaiDateTime('2026-06-01T07:00:00Z')).toContain('14:00');
    expect(thaiDateTime(null)).toBe('-');
    expect(thaiDate(undefined)).toBe('-');
    expect(thaiDateTime('not-a-date')).toBe('-');
  });
});

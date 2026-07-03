import {
  canTransitionContract,
  hasLiveContract,
  LIVE_CONTRACT_STATUSES,
  OCCUPYING_CONTRACT_STATUSES,
  RENEWABLE_CONTRACT_STATUSES,
} from './contract.lifecycle';

describe('contract.lifecycle (3 สถานะ: draft → active → ended)', () => {
  describe('canTransitionContract', () => {
    it('draft → active อนุญาต (เซ็นสัญญา)', () => {
      expect(canTransitionContract('draft', 'active')).toBe(true);
    });
    it('draft → ended อนุญาต (ยกเลิกตั้งแต่ร่าง)', () => {
      expect(canTransitionContract('draft', 'ended')).toBe(true);
    });
    it('active → ended อนุญาต (ปิด/ยกเลิกสัญญา)', () => {
      expect(canTransitionContract('active', 'ended')).toBe(true);
    });
    it('ended เป็นปลายทาง', () => {
      expect(canTransitionContract('ended', 'active')).toBe(false);
    });
    it('from === to → false', () => {
      expect(canTransitionContract('active', 'active')).toBe(false);
    });
  });

  describe('hasLiveContract (กันสัญญาซ้อน)', () => {
    it('มี active อยู่ → true', () => {
      expect(hasLiveContract(['active'])).toBe(true);
    });
    it('มี draft อยู่ → true (กันสร้างสัญญาซ้อนตั้งแต่ร่าง)', () => {
      expect(hasLiveContract(['draft'])).toBe(true);
    });
    it('มี ended → false (จบ/ปล่อยทรัพย์แล้ว ทำใหม่ได้)', () => {
      expect(hasLiveContract(['ended'])).toBe(false);
    });
    it('list ว่าง → false', () => {
      expect(hasLiveContract([])).toBe(false);
    });
  });

  it('ค่าคงที่กลุ่มสถานะถูกต้อง', () => {
    expect(LIVE_CONTRACT_STATUSES).toEqual(['draft', 'active']);
    expect(LIVE_CONTRACT_STATUSES).not.toContain('ended');
    expect(OCCUPYING_CONTRACT_STATUSES).toEqual(['active']);
    expect(RENEWABLE_CONTRACT_STATUSES).toEqual(['active']);
  });
});

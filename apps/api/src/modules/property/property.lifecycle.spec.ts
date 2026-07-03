import { PropertyStatus } from '@prisma/client';
import {
  allowedTransitions,
  canTransition,
  isPubliclyVisible,
} from './property.lifecycle';

describe('Property Lifecycle (3 สถานะ: draft → available → rented)', () => {
  describe('canTransition — เส้นทางที่ถูกต้อง', () => {
    it.each([
      ['draft', 'available'],
      ['available', 'draft'],
      ['available', 'rented'],
      ['rented', 'available'],
    ])('อนุญาต %s → %s', (from, to) => {
      expect(canTransition(from as PropertyStatus, to as PropertyStatus)).toBe(true);
    });
  });

  describe('canTransition — เส้นทางต้องห้าม', () => {
    it('draft ห้ามข้ามไป rented โดยตรง (ต้องเผยแพร่ก่อน)', () => {
      expect(canTransition(PropertyStatus.draft, PropertyStatus.rented)).toBe(false);
    });

    it('เปลี่ยนเป็นสถานะเดิมไม่ได้', () => {
      expect(canTransition(PropertyStatus.available, PropertyStatus.available)).toBe(false);
    });

    it('rented → draft ไม่ได้ (ต้องผ่าน available)', () => {
      expect(canTransition(PropertyStatus.rented, PropertyStatus.draft)).toBe(false);
    });

    it('draft มีทางออกเดียว = available', () => {
      expect(allowedTransitions(PropertyStatus.draft)).toEqual(['available']);
    });
  });

  describe('isPubliclyVisible — public เห็นเฉพาะทรัพย์ว่าง', () => {
    it('available → เห็นบน public', () => {
      expect(isPubliclyVisible(PropertyStatus.available)).toBe(true);
    });

    it('draft / rented → ไม่เห็น', () => {
      expect(isPubliclyVisible(PropertyStatus.draft)).toBe(false);
      expect(isPubliclyVisible(PropertyStatus.rented)).toBe(false);
    });
  });
});

import { PropertyStatus } from '@prisma/client';
import {
  allowedTransitions,
  canTransition,
  isPubliclyVisible,
} from './property.lifecycle';

describe('Property Lifecycle (4 สถานะ: draft → pending_review → available → rented)', () => {
  describe('canTransition — เส้นทางที่ถูกต้อง', () => {
    it.each([
      ['draft', 'pending_review'], // ผู้จัดการขอเผยแพร่ → เข้าคิว
      ['draft', 'available'], // เจ้าของเผยแพร่ร่างตัวเองตรง ๆ
      ['pending_review', 'available'], // เจ้าของอนุมัติ
      ['pending_review', 'draft'], // เจ้าของตีกลับ / ผู้ส่งถอนคำขอ
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

    it('pending_review ห้ามข้ามไป rented โดยตรง', () => {
      expect(canTransition(PropertyStatus.pending_review, PropertyStatus.rented)).toBe(false);
    });

    it('เปลี่ยนเป็นสถานะเดิมไม่ได้', () => {
      expect(canTransition(PropertyStatus.available, PropertyStatus.available)).toBe(false);
    });

    it('rented → draft ไม่ได้ (ต้องผ่าน available)', () => {
      expect(canTransition(PropertyStatus.rented, PropertyStatus.draft)).toBe(false);
    });

    it('draft ออกได้ 2 ทาง = pending_review (ขอเผยแพร่) หรือ available (เจ้าของเผยแพร่เอง)', () => {
      expect(allowedTransitions(PropertyStatus.draft)).toEqual(['pending_review', 'available']);
    });
  });

  describe('isPubliclyVisible — public เห็นเฉพาะทรัพย์ว่าง', () => {
    it('available → เห็นบน public', () => {
      expect(isPubliclyVisible(PropertyStatus.available)).toBe(true);
    });

    it('draft / pending_review / rented → ไม่เห็น', () => {
      expect(isPubliclyVisible(PropertyStatus.draft)).toBe(false);
      expect(isPubliclyVisible(PropertyStatus.pending_review)).toBe(false);
      expect(isPubliclyVisible(PropertyStatus.rented)).toBe(false);
    });
  });
});

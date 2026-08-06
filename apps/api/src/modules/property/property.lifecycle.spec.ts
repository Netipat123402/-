import { PropertyStatus } from '@prisma/client';
import {
  allowedTransitions,
  canTransition,
  isOperationalTransition,
  isPubliclyVisible,
} from './property.lifecycle';

describe('Property Lifecycle (4 สถานะ: draft → pending_review → available → rented)', () => {
  describe('canTransition — เส้นทางที่ถูกต้อง', () => {
    it.each([
      ['draft', 'pending_review'], // ผู้จัดการขอเผยแพร่ → เข้าคิว
      ['draft', 'available'], // เจ้าของเผยแพร่ร่างตัวเองตรง ๆ
      ['pending_review', 'available'], // เจ้าของอนุมัติ
      ['pending_review', 'draft'], // เจ้าของตีกลับ / ผู้ส่งถอนคำขอ
      ['available', 'pending_review'], // Phase 4: แก้เนื้อหา live → เด้งกลับรอตรวจ
      ['available', 'draft'],
      ['available', 'rented'],
      ['rented', 'available'],
    ])('อนุญาต %s → %s', (from, to) => {
      expect(canTransition(from as PropertyStatus, to as PropertyStatus)).toBe(true);
    });
  });

  // ⭐ Phase 4a — generic changeStatus ทำได้เฉพาะ operational (ว่าง↔ไม่ว่าง)
  describe('isOperationalTransition — กัน change_status ข้ามด่านอนุมัติ', () => {
    it('operational (ผ่าน changeStatus ได้): available↔rented', () => {
      expect(isOperationalTransition(PropertyStatus.available, PropertyStatus.rented)).toBe(true);
      expect(isOperationalTransition(PropertyStatus.rented, PropertyStatus.available)).toBe(true);
    });
    it.each([
      ['draft', 'available'], // publish ตรง = ต้องผ่าน approve (มี gate)
      ['draft', 'pending_review'], // = ต้องผ่าน submit-review
      ['pending_review', 'available'], // = ต้องผ่าน approve
      ['pending_review', 'draft'], // = ต้องผ่าน reject
      ['available', 'draft'], // = ต้องผ่าน reject (ถอนประกาศ)
      ['available', 'pending_review'], // = ระบบเด้งเอง (แก้ live) ไม่ใช่ changeStatus
    ])('governed (changeStatus ทำตรงไม่ได้): %s → %s', (from, to) => {
      expect(isOperationalTransition(from as PropertyStatus, to as PropertyStatus)).toBe(false);
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

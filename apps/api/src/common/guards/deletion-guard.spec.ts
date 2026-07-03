import { ConflictException } from '@nestjs/common';
import { assertDeletable, blockingReasons } from './deletion-guard';

describe('deletion-guard', () => {
  it('blockingReasons คืนเฉพาะ dependent ที่ count > 0', () => {
    expect(
      blockingReasons([
        { label: 'ทรัพย์ 2 รายการ', count: 2 },
        { label: 'สัญญา active', count: 0 },
        { label: 'นัดในอนาคต 1 รายการ', count: 1 },
      ]),
    ).toEqual(['ทรัพย์ 2 รายการ', 'นัดในอนาคต 1 รายการ']);
  });

  it('ไม่มี dependent → ไม่โยน', () => {
    expect(() => assertDeletable('ทรัพย์', [{ label: 'สัญญา', count: 0 }])).not.toThrow();
  });

  it('มี dependent → โยน ConflictException พร้อมเหตุผล', () => {
    expect(() =>
      assertDeletable('เจ้าของ', [{ label: 'ทรัพย์ 3 รายการ', count: 3 }]),
    ).toThrow(ConflictException);
    try {
      assertDeletable('เจ้าของ', [{ label: 'สัญญา active 1', count: 1 }]);
    } catch (e) {
      expect((e as ConflictException).message).toContain('สัญญา active 1');
    }
  });
});

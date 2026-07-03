import { ConflictException } from '@nestjs/common';

/**
 * Deletion guard (Phase 3) — กัน soft-delete entity ที่ยังมี dependent ทำงานอยู่
 *
 * เหตุผล: `onDelete: Restrict` ของ Prisma ทำงานเฉพาะ hard delete เท่านั้น
 * แต่ระบบใช้ soft delete (set deleted_at) — Restrict จึงไม่ยิง → ต้องกันที่ application layer
 * ไม่งั้นจะลบเจ้าของที่มีทรัพย์/ทรัพย์ที่มีสัญญา active ได้ → ข้อมูลกำพร้า
 */
export interface DependencyCount {
  /** คำอธิบาย dependent ที่ขวางการลบ (แสดงในข้อความ error) */
  label: string;
  count: number;
}

/** คืนรายการเหตุผลที่ขวางการลบ (pure — ทดสอบง่าย) */
export function blockingReasons(deps: DependencyCount[]): string[] {
  return deps.filter((d) => d.count > 0).map((d) => d.label);
}

/** โยน ConflictException ถ้ามี dependent ขวางอยู่ */
export function assertDeletable(entityLabel: string, deps: DependencyCount[]): void {
  const blocking = blockingReasons(deps);
  if (blocking.length > 0) {
    throw new ConflictException(`ลบ${entityLabel}ไม่ได้: ยังมี ${blocking.join(' / ')}`);
  }
}

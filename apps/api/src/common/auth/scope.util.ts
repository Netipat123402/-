/**
 * Scope utilities — กัน "null-leak" ตอนสร้าง where ตาม scope (Phase 8 §3.2)
 *
 * ปัญหา: ถ้า user.branchId / teamId เป็น null แล้วใส่ `{ branchId: user.branchId }`
 *   Prisma จะแปลเป็น `branchId IS NULL` → ผู้ใช้เห็น record ที่ไม่มีสาขา/ทีมทั้งหมด (ข้อมูลรั่ว)
 *
 * วิธีแก้: ถ้า branchId/teamId เป็น null ในระดับ branch/team scope → คืน filter ที่ match ไม่ได้เลย
 *   (id = UUID ศูนย์ทั้งหมด ซึ่ง uuid v7 ไม่มีทางสร้างได้)
 */
export const IMPOSSIBLE_ID = '00000000-0000-0000-0000-000000000000';

/** filter ที่ไม่มีทาง match (ใช้เมื่อ scope กว้างเกินกว่าข้อมูลที่ user มี เช่น branch แต่ไม่มี branchId) */
export const NEVER_MATCH = { id: IMPOSSIBLE_ID } as const;

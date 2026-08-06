/**
 * ⭐ บทบาท operating จริง = 3 (owner สั่ง · อีก 5 dormant/isActive=false ปิดกันสับสน)
 *   - super_admin      = เจ้าของ (ทุกสิทธิ์ + control)
 *   - property_manager = ผู้จัดการ (operation เต็ม · ไม่มี approve/money)
 *   - sales_agent      = เซล (ไปป์ไลน์ขาย · ทรัพย์อ่านอย่างเดียว)
 *
 * ผู้รับแจ้งเตือน = ยึด 3 บทบาทนี้เท่านั้น (ห้ามอ้าง dormant roles — ต้นตอความสับสน + ยิงหว่านผิดเจตนา)
 * ถ้าเปิด dormant role คืนในอนาคต → ทบทวนลิสต์เหล่านี้ที่เดียว
 */
export const OPERATING_ROLES = ['super_admin', 'property_manager', 'sales_agent'] as const;

/** ผู้ถือ control (เจ้าของ) — อนุมัติเผยแพร่ · แก้ live · alert กันโกง (Phase 3/4/5) */
export const OWNER_ALERT_ROLES = ['super_admin'];

/** คำขอเพิ่มทรัพย์ — เซลส่ง → ผู้จัดการ/เจ้าของ ตรวจ+convert (Phase 2) */
export const REQUEST_REVIEW_ROLES = ['super_admin', 'property_manager'];

/** ลีดใหม่จากเว็บ public → ทีมขาย + ผู้จัดการ + เจ้าของ */
export const LEAD_ALERT_ROLES = ['super_admin', 'property_manager', 'sales_agent'];

/** ผู้ดูแลกระดานชุมชน (community board) */
export const BOARD_MOD_ROLES = ['super_admin', 'property_manager'];

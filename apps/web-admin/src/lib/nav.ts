// ============================================================================
// Role-aware navigation (Phase 1 · UX แยกตามบทบาท)
// ----------------------------------------------------------------------------
// รากฐานเดียวของ "โครงเมนู" — บอกว่าแต่ละบทบาทเห็นกลุ่มไหน · เรียงลำดับยังไง · กลุ่มไหนปักล่าง
// เพิ่มบทบาทใหม่ในอนาคต = แก้ที่ไฟล์นี้ที่เดียว (future-proof)
//
// หลักการ:
//   - โครง/ลำดับ = ยึดตามบทบาท (เซล งานขายนำ · ผจก/เจ้าของ คลังทรัพย์นำ)
//   - visibility = ยัง gate ด้วย can() เสมอ (ถ้าสิทธิ์เปลี่ยน เมนูซ่อนเองอัตโนมัติ · defense-in-depth)
//   - read-only "รู้สึก" ที่หน้าเอง (ไม่มีปุ่มแก้) — ราง "ไม่ทำให้จางจนดูกดไม่ได้"
// ============================================================================

import type { IconName } from '@/components/Icon';

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  /** สิทธิ์ที่ต้องมีถึงจะโชว์ (ถ้าไม่ใส่ = โชว์เสมอ) */
  perm?: [string, string];
  /** badge จำนวนคำขอทรัพย์ที่รอตรวจ */
  badgeKey?: 'propertyRequest';
  /** ปุ่มเด่น (เช่น "ขอเพิ่มทรัพย์" ของเซล) — เน้นสีทอง ไม่ทำให้จาง */
  accent?: boolean;
  /** เฉพาะผู้ดูแลกระดานชุมชน (super_admin / property_manager) */
  modOnly?: boolean;
};

export type NavGroup = {
  key: string;
  /** ป้ายกลุ่มเล็กบนราง — ใส่เฉพาะกลุ่มที่ต้องสื่อความหมาย (คลังทรัพย์เซล/ระบบ) เพื่อไม่ให้รก */
  label?: string;
  items: NavItem[];
  /** ปักกลุ่มไว้ล่างสุดของราง (ระบบ/ชุมชน) — แบบ Slack/Linear */
  pinBottom?: boolean;
};

export type OperatingRole = 'super_admin' | 'property_manager' | 'sales_agent';

// --- แม่แบบเมนู (นิยามครั้งเดียว · ประกอบต่อบทบาท) ---------------------------
const I = {
  dashboard: { href: '/', label: 'Dashboard', icon: 'home' } as NavItem,
  properties: { href: '/properties', label: 'Properties', icon: 'building', perm: ['property', 'read'] } as NavItem,
  owners: { href: '/owners', label: 'Owners', icon: 'key', perm: ['owner', 'read'] } as NavItem,
  propertyRequests: { href: '/property-requests', label: 'Property requests', icon: 'inbox', perm: ['property_request', 'read'], badgeKey: 'propertyRequest' } as NavItem,
  // เซล: เมนูเดียวกัน (href เดิม) แต่ป้าย/ไอคอนเป็นเชิงรุก "ขอเพิ่มทรัพย์"
  requestAdd: { href: '/property-requests', label: 'Request property', icon: 'plus', perm: ['property_request', 'read'], accent: true } as NavItem,
  leads: { href: '/leads', label: 'Leads', icon: 'user-plus', perm: ['lead', 'read'] } as NavItem,
  appointments: { href: '/appointments', label: 'Appointments', icon: 'clock', perm: ['appointment', 'read'] } as NavItem,
  calendar: { href: '/calendar', label: 'Calendar', icon: 'calendar', perm: ['appointment', 'read'] } as NavItem,
  customers: { href: '/customers', label: 'Customers', icon: 'users', perm: ['customer', 'read'] } as NavItem,
  contracts: { href: '/contracts', label: 'Contracts', icon: 'file-text', perm: ['contract', 'read'] } as NavItem,
  // ระบบ (เจ้าของ) — ยึดไอคอน/route เดิมจาก SYSTEM (drawer) เพื่อความสอดคล้อง
  users: { href: '/users', label: 'Users', icon: 'users', perm: ['user', 'read'] } as NavItem,
  audit: { href: '/audit', label: 'Activity', icon: 'clock', perm: ['activity', 'read'] } as NavItem,
  settings: { href: '/settings', label: 'Settings', icon: 'menu', perm: ['setting', 'read'] } as NavItem,
  community: { href: '/community', label: 'Community', icon: 'users', modOnly: true } as NavItem,
};

// กลุ่มงานขาย (ใช้ซ้ำทุกบทบาท) · กลุ่มคลังทรัพย์ (ผจก/เจ้าของ)
const SALES_ITEMS = [I.leads, I.appointments, I.calendar, I.customers, I.contracts];
const INVENTORY_ITEMS = [I.properties, I.owners, I.propertyRequests];

// --- โครงเมนูต่อบทบาท --------------------------------------------------------
const NAV_BY_ROLE: Record<OperatingRole | 'default', NavGroup[]> = {
  // เซล = นักล่าดีล: งานขายนำ · คลังทรัพย์เป็น "ค้นทรัพย์" (ดูได้เต็ม · แก้ไม่ได้) + ปุ่มขอเพิ่มทรัพย์
  sales_agent: [
    { key: 'overview', items: [I.dashboard] },
    { key: 'sales', items: SALES_ITEMS },
    { key: 'find', label: 'Browse', items: [I.properties, I.owners, I.requestAdd] },
  ],
  // ผู้จัดการ = คุมปฏิบัติการ: คลังทรัพย์นำ (จัดการเต็ม) → งานขาย · ชุมชนปักล่าง
  property_manager: [
    { key: 'overview', items: [I.dashboard] },
    { key: 'inventory', items: INVENTORY_ITEMS },
    { key: 'sales', items: SALES_ITEMS },
    { key: 'system', pinBottom: true, items: [I.community] },
  ],
  // เจ้าของ = ควบคุม+อนุมัติ+กันโกง: คลังทรัพย์+งานขาย · กลุ่ม "ระบบ" ปักล่าง (เลิกซ่อนใน ProfileMenu)
  super_admin: [
    { key: 'overview', items: [I.dashboard] },
    { key: 'inventory', items: INVENTORY_ITEMS },
    { key: 'sales', items: SALES_ITEMS },
    { key: 'system', label: 'System', pinBottom: true, items: [I.users, I.audit, I.settings, I.community] },
  ],
  // fallback (บทบาทอื่น/อนาคต) — โครงกลาง gate ด้วย can() ล้วน (ปลอดภัย)
  default: [
    { key: 'overview', items: [I.dashboard] },
    { key: 'inventory', items: INVENTORY_ITEMS },
    { key: 'sales', items: SALES_ITEMS },
    { key: 'system', label: 'System', pinBottom: true, items: [I.users, I.audit, I.settings, I.community] },
  ],
};

// ============================================================================
// แถบล่างมือถือ (bottom-nav 5 ช่อง · ไอคอนล้วน) — ช่องกลาง (center) = signature ของบทบาท
// เซล=นัด (ขับเคลื่อนรายวัน) · ผจก/เจ้าของ=คำขอ (คิว inbound/อนุมัติ) — แทนของเดิมที่ "ทรัพย์" เหมือนกันหมด
// ค้นหา (search) ย้ายไปหัว (GlobalSearch) แล้ว จึงไม่อยู่ในแถบล่างของ 3 บทบาทหลัก
// ============================================================================
export type NavSlot =
  | { key: string; label: string; icon: IconName; href: string; perm?: [string, string]; center?: boolean }
  | { key: string; label: string; icon: IconName; action: 'search' | 'profile' };

const S = {
  home: { key: 'home', label: 'Home', icon: 'home', href: '/' } as NavSlot,
  properties: { key: 'prop', label: 'Properties', icon: 'building', href: '/properties', perm: ['property', 'read'] } as NavSlot,
  requests: { key: 'req', label: 'Requests', icon: 'inbox', href: '/property-requests', perm: ['property_request', 'read'] } as NavSlot,
  leads: { key: 'lead', label: 'Leads', icon: 'user-plus', href: '/leads', perm: ['lead', 'read'] } as NavSlot,
  appointments: { key: 'appt', label: 'Appts', icon: 'clock', href: '/appointments', perm: ['appointment', 'read'] } as NavSlot,
  customers: { key: 'cust', label: 'Customers', icon: 'users', href: '/customers', perm: ['customer', 'read'] } as NavSlot,
  contracts: { key: 'contract', label: 'Contracts', icon: 'file-text', href: '/contracts', perm: ['contract', 'read'] } as NavSlot,
  search: { key: 'search', label: 'Search', icon: 'search', href: '/search' } as NavSlot,
  profile: { key: 'profile', label: 'Profile', icon: 'user', action: 'profile' } as NavSlot,
};

// center = ช่องกลาง (index 2) เน้นสีทอง · โปรไฟล์ปิดท้ายเสมอ
const SLOTS_BY_ROLE: Record<OperatingRole | 'default', NavSlot[]> = {
  sales_agent: [S.home, S.leads, { ...S.appointments, center: true }, S.customers, S.profile],
  property_manager: [S.home, S.properties, { ...S.requests, center: true }, S.appointments, S.profile],
  super_admin: [S.home, S.contracts, { ...S.requests, center: true }, S.properties, S.profile],
  default: [S.home, S.appointments, { ...S.properties, center: true }, S.search, S.profile],
};

/** แถบล่างมือถือของผู้ใช้ = 5 ช่องตามบทบาท กรองด้วย can() (action slot โชว์เสมอ) */
export function resolveBottomSlots(roles: string[], can: (resource: string, action: string) => boolean): NavSlot[] {
  return SLOTS_BY_ROLE[pickOperatingRole(roles)].filter(
    (s) => !('perm' in s) || !s.perm || can(s.perm[0], s.perm[1]),
  );
}

const ROLE_PRIORITY: OperatingRole[] = ['super_admin', 'property_manager', 'sales_agent'];

/** เลือกบทบาท operating ที่ "สูงสุด" ของผู้ใช้ (ผู้ใช้ 1 คนปกติ 1 บทบาท · เผื่อหลายบทบาท) */
export function pickOperatingRole(roles: string[]): OperatingRole | 'default' {
  return ROLE_PRIORITY.find((r) => roles.includes(r)) ?? 'default';
}

/**
 * โครงเมนูของผู้ใช้ = โครงตามบทบาท กรองด้วย can() (+ modOnly สำหรับชุมชน)
 * คืนเฉพาะกลุ่มที่มี item เหลือ (ซ่อนกลุ่มว่าง)
 */
export function resolveNav(roles: string[], can: (resource: string, action: string) => boolean): NavGroup[] {
  const isMod = roles.some((r) => ['super_admin', 'property_manager'].includes(r));
  const groups = NAV_BY_ROLE[pickOperatingRole(roles)];
  return groups
    .map((g) => ({
      ...g,
      items: g.items.filter((it) => {
        if (it.modOnly && !isMod) return false;
        return !it.perm || can(it.perm[0], it.perm[1]);
      }),
    }))
    .filter((g) => g.items.length > 0);
}

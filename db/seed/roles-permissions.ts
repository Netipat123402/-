// ============================================================================
// RBAC Seed — Roles & Permissions (Phase 1 §15, Phase 7 §1)
// โมเดล: Role × Permission(resource:action) × Scope(own/team/branch/all)
// ============================================================================

import type { PrismaClient, PermissionScope } from '@prisma/client';

// --- Permission catalog ------------------------------------------------------
// resource:action — action ที่ทำได้ในแต่ละ resource
const RESOURCE_ACTIONS: Record<string, string[]> = {
  property: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'change_status'],
  // คำขอเพิ่มทรัพย์ (Phase 2): เซล create/read/update · ผู้ดูแลทรัพย์ convert/reject
  property_request: ['create', 'read', 'update', 'convert', 'reject', 'delete'],
  // reveal_pii (Phase 6): เปิดดูเลขบัตร (decrypt) — เจ้าของ (super_admin ผ่าน '*') เท่านั้น + audit ทุกครั้ง
  owner: ['create', 'read', 'update', 'delete', 'reveal_pii'],
  lead: ['create', 'read', 'update', 'delete', 'assign', 'change_status', 'convert'],
  customer: ['create', 'read', 'update', 'delete', 'reveal_pii'],
  appointment: ['create', 'read', 'update', 'delete', 'change_status'],
  contract: ['create', 'read', 'update', 'delete', 'change_status', 'sign'],
  document: ['create', 'read', 'update', 'delete', 'upload', 'download', 'verify'],
  notification: ['read'],
  activity: ['read'],
  audit: ['read', 'export'],
  dashboard: ['read'],
  user: ['create', 'read', 'update', 'delete'],
  role: ['create', 'read', 'update', 'delete'],
  branch: ['create', 'read', 'update', 'delete'],
  team: ['create', 'read', 'update', 'delete'],
  setting: ['read', 'update'],
};

// --- Role definitions --------------------------------------------------------
// '*' = ทุก action ของ resource นั้น | scope = ขอบเขตข้อมูล
type RoleDef = {
  name: string;
  description: string;
  isSystem: boolean;
  isActive?: boolean; // operating จริง = 3 บทบาท · อีก 5 = false (dormant · ปิดกันสับสน · เปิดคืนได้)
  scope: PermissionScope;
  grants: Record<string, string[] | '*'>;
};

// บทบาทที่ "ปฏิบัติงานจริง" ตอนนี้ = 3 (owner สั่ง: อีก 5 มีได้แต่ปิดไว้ก่อน) — ที่ไม่อยู่ในนี้ → isActive=false
const OPERATING_ROLE_NAMES = new Set(['super_admin', 'property_manager', 'sales_agent']);

const ALL: PermissionScope = 'all';
const BRANCH: PermissionScope = 'branch';
const TEAM: PermissionScope = 'team';
const OWN: PermissionScope = 'own';

export const ROLES: RoleDef[] = [
  {
    name: 'super_admin',
    description: 'ผู้ดูแลระบบสูงสุด — ทุกสิทธิ์ + ระบบ',
    isSystem: true,
    scope: ALL,
    grants: Object.fromEntries(Object.keys(RESOURCE_ACTIONS).map((r) => [r, '*'])),
  },
  {
    name: 'company_admin',
    description: 'ผู้บริหารบริษัท — เห็นทุกสาขา จัดการได้เกือบทุกอย่าง',
    isSystem: true,
    scope: ALL,
    grants: {
      property: '*', property_request: '*', owner: '*', lead: '*', customer: '*', appointment: '*',
      contract: '*', document: '*', notification: '*', activity: '*',
      audit: ['read', 'export'], dashboard: '*',
      user: '*', role: ['read'], branch: '*', team: '*', setting: '*',
    },
  },
  {
    name: 'branch_manager',
    description: 'ผู้จัดการสาขา — บริหารทรัพย์/ทีมเฉพาะสาขาตน',
    isSystem: true,
    scope: BRANCH,
    grants: {
      property: '*', property_request: '*', owner: '*', lead: '*', customer: '*', appointment: '*',
      contract: '*', document: '*', notification: ['read'], activity: ['read'],
      audit: ['read'], dashboard: ['read'],
      user: ['read'], team: ['read'], setting: ['read'],
    },
  },
  {
    name: 'team_lead',
    description: 'หัวหน้าทีม — อนุมัติทรัพย์ จัดสรร lead ดูทั้งทีม',
    isSystem: true,
    scope: TEAM,
    grants: {
      property: ['create', 'read', 'update', 'approve', 'reject', 'change_status'],
      property_request: ['create', 'read', 'update', 'convert', 'reject'],
      owner: ['create', 'read', 'update'],
      lead: ['create', 'read', 'update', 'assign', 'change_status', 'convert'],
      customer: ['create', 'read', 'update'],
      appointment: ['create', 'read', 'update', 'change_status'],
      contract: ['create', 'read', 'update', 'change_status', 'sign'],
      document: ['create', 'read', 'upload', 'download', 'verify'],
      notification: ['read'], activity: ['read'], dashboard: ['read'],
    },
  },
  {
    // ⭐ บทบาท operating จริง #2 (owner-approved) — "ผู้จัดการ" (operation เต็ม + คลังทรัพย์)
    // NOTE: slug คง 'property_manager' เพื่อเสถียร (code/notify อ้างถึง) · label ที่ผู้ใช้เห็น = "ผู้จัดการ"
    name: 'property_manager',
    description: 'ผู้จัดการ — จัดการงานปฏิบัติการเต็ม (ทรัพย์/lead/ลูกค้า/นัด/ร่างสัญญา) + คลังทรัพย์/หน้าเว็บ · เจ้าของถือ control (อนุมัติเผยแพร่/เงิน/ลบ/ระบบ)',
    isSystem: true,
    scope: BRANCH,
    grants: {
      // จัดการคลังทรัพย์ได้ แต่ "อนุมัติเผยแพร่เอง" ไม่ได้ (ไม่มี approve/reject) · ลบไม่ได้ (= control)
      property: ['create', 'read', 'update', 'change_status'],
      // คำขอเพิ่มทรัพย์: ผู้ดูแลตรวจ+convert เป็นประกาศ / ตีกลับ
      property_request: ['create', 'read', 'update', 'convert', 'reject'],
      owner: ['create', 'read', 'update'],
      // operation เต็มเหมือนเจ้าของ ยกเว้น delete (control กันกลบร่องรอย — เจ้าของเท่านั้น)
      lead: ['create', 'read', 'update', 'assign', 'change_status', 'convert'],
      customer: ['create', 'read', 'update'],
      appointment: ['create', 'read', 'update', 'change_status'],
      // ร่าง/แก้สัญญาได้ · เงิน(sign/เปิดสัญญา/ใบเสร็จ) = เจ้าของยืนยันเท่านั้น (money-gate เดียวกับ sales)
      contract: ['create', 'read', 'update'],
      document: ['create', 'read', 'upload', 'download'],
      notification: ['read'], activity: ['read'], dashboard: ['read'],
    },
  },
  {
    name: 'sales_agent',
    description: 'พนักงานขาย — ไปป์ไลน์ขาย (lead/ลูกค้า/นัด/ร่างสัญญา) · ทรัพย์=ดูอย่างเดียว (ขอเพิ่มทรัพย์ผ่าน property request) · เงินให้เจ้าของยืนยัน',
    isSystem: true,
    // BRANCH: เห็นข้อมูลทั้งสำนักงาน (อ้างอิงทรัพย์/เจ้าของ/ลูกค้า เพื่อทำสัญญา/นัด)
    scope: BRANCH,
    grants: {
      // ⛔ ทรัพย์/เจ้าของทรัพย์ = อ่านอย่างเดียว (สินทรัพย์ร่วม · แก้ผ่านผู้ดูแลทรัพย์เท่านั้น · ข้อ ข)
      //   เซลหาทรัพย์ได้ผ่าน "ขอเพิ่มทรัพย์" (property request · Phase 2) → ผู้ดูแลทรัพย์ลงจริง
      property: ['read'],
      // ขอเพิ่มทรัพย์: เซลส่งคำขอ + แก้คำขอตัวเอง (ตอน needs_info)
      property_request: ['create', 'read', 'update'],
      owner: ['read'],
      // เพิ่ม 'assign' — ให้พนักงานขาย "รับ" lead ใหม่มาดูแลเองได้
      lead: ['create', 'read', 'update', 'assign', 'change_status', 'convert'],
      customer: ['create', 'read', 'update'],
      appointment: ['create', 'read', 'update', 'change_status'],
      // ⛔ money-gate (กันโกง): ตัด 'sign'(เปิดสัญญา active) + 'change_status'(→active) ออก
      //   Agent ร่าง/แก้สัญญาได้ แต่ "เปิดสัญญา + ออกใบเสร็จ" = เจ้าของยืนยันเงินเข้าก่อนเท่านั้น
      //   (ใบเสร็จผูกกับ contract:sign ที่ controller — ดู contract.controller.ts)
      contract: ['create', 'read', 'update'],
      document: ['create', 'read', 'upload', 'download'],
      notification: ['read'], activity: ['read'], dashboard: ['read'],
    },
  },
  {
    name: 'back_office',
    description: 'ฝ่ายเอกสาร/หลังบ้าน — จัดการเอกสารและสัญญา',
    isSystem: true,
    scope: BRANCH,
    grants: {
      property: ['read'], owner: ['read'], lead: ['read'], customer: ['read', 'update'],
      appointment: ['read'],
      contract: ['create', 'read', 'update', 'change_status', 'sign'],
      document: ['create', 'read', 'update', 'upload', 'download', 'verify'],
      notification: ['read'], activity: ['read'], dashboard: ['read'],
    },
  },
  {
    name: 'auditor',
    description: 'ผู้ตรวจสอบ — อ่านอย่างเดียว + ดู audit log',
    isSystem: true,
    scope: ALL,
    grants: {
      property: ['read'], property_request: ['read'], owner: ['read'], lead: ['read'], customer: ['read'],
      appointment: ['read'], contract: ['read'], document: ['read', 'download'],
      activity: ['read'], audit: ['read', 'export'], dashboard: ['read'],
    },
  },
];

// --- Seeder ------------------------------------------------------------------
export async function seedRolesAndPermissions(prisma: PrismaClient): Promise<void> {
  console.log('  → seeding permissions...');

  // 1) สร้าง permission ทั้งหมด (resource × action × scope ที่เป็นไปได้)
  const scopes: PermissionScope[] = ['own', 'team', 'branch', 'all'];
  for (const [resource, actions] of Object.entries(RESOURCE_ACTIONS)) {
    for (const action of actions) {
      for (const scope of scopes) {
        await prisma.permission.upsert({
          where: { resource_action_scope: { resource, action, scope } },
          update: {},
          create: { resource, action, scope },
        });
      }
    }
  }

  console.log('  → seeding roles...');
  for (const role of ROLES) {
    // operating จริง = 3 บทบาท → isActive true · อีก 5 → false (dormant · ปิดกันสับสน · flip เปิดคืนได้)
    const isActive = role.isActive ?? OPERATING_ROLE_NAMES.has(role.name);
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem, isActive },
      create: { name: role.name, description: role.description, isSystem: role.isSystem, isActive },
    });

    // map grants → permissions ที่ scope ของ role · เก็บ id ที่ควรมีไว้ reconcile
    const grantedPermIds: string[] = [];
    for (const [resource, actions] of Object.entries(role.grants)) {
      const resolved = actions === '*' ? RESOURCE_ACTIONS[resource] : actions;
      for (const action of resolved) {
        const perm = await prisma.permission.findUnique({
          where: { resource_action_scope: { resource, action, scope: role.scope } },
        });
        if (!perm) continue;
        grantedPermIds.push(perm.id);
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: created.id, permissionId: perm.id } },
          update: {},
          create: { roleId: created.id, permissionId: perm.id },
        });
      }
    }

    // reconcile — ลบสิทธิ์ที่ "ไม่อยู่ใน grants แล้ว" (ทำให้ seed เป็น declarative · รองรับการเพิกถอน เช่น money-gate)
    // guard: ต้องมี grant อย่างน้อย 1 ก่อนลบ (กันเผลอล้างทั้งบทบาทถ้า grants ว่าง)
    if (grantedPermIds.length > 0) {
      await prisma.rolePermission.deleteMany({
        where: { roleId: created.id, permissionId: { notIn: grantedPermIds } },
      });
    }
  }

  console.log(`  ✓ ${ROLES.length} roles + permissions seeded`);
}

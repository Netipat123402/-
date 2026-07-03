// ============================================================================
// RBAC Seed — Roles & Permissions (Phase 1 §15, Phase 7 §1)
// โมเดล: Role × Permission(resource:action) × Scope(own/team/branch/all)
// ============================================================================

import type { PrismaClient, PermissionScope } from '@prisma/client';

// --- Permission catalog ------------------------------------------------------
// resource:action — action ที่ทำได้ในแต่ละ resource
const RESOURCE_ACTIONS: Record<string, string[]> = {
  property: ['create', 'read', 'update', 'delete', 'approve', 'reject', 'change_status'],
  owner: ['create', 'read', 'update', 'delete'],
  lead: ['create', 'read', 'update', 'delete', 'assign', 'change_status', 'convert'],
  customer: ['create', 'read', 'update', 'delete'],
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
  scope: PermissionScope;
  grants: Record<string, string[] | '*'>;
};

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
      property: '*', owner: '*', lead: '*', customer: '*', appointment: '*',
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
      property: '*', owner: '*', lead: '*', customer: '*', appointment: '*',
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
    name: 'sales_agent',
    description: 'พนักงานขาย — จัดการทรัพย์/lead/นัด/สัญญาในสำนักงานของตน',
    isSystem: true,
    // BRANCH: เห็น/อ้างอิงข้อมูลในสำนักงานเดียวกัน (เจ้าของ/ลูกค้า/ทรัพย์/lead รวม public ที่ยังไม่มอบหมาย)
    // เดิมเป็น OWN ทำให้เห็นแต่ของที่ตัวเองสร้าง → ทำสัญญา/นัดไม่ได้ (dropdown ว่าง)
    scope: BRANCH,
    grants: {
      property: ['create', 'read', 'update', 'change_status'],
      owner: ['create', 'read', 'update'],
      // เพิ่ม 'assign' — ให้พนักงานขาย "รับ" lead ใหม่มาดูแลเองได้
      lead: ['create', 'read', 'update', 'assign', 'change_status', 'convert'],
      customer: ['create', 'read', 'update'],
      appointment: ['create', 'read', 'update', 'change_status'],
      contract: ['create', 'read', 'update', 'change_status', 'sign'],
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
      property: ['read'], owner: ['read'], lead: ['read'], customer: ['read'],
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
    const created = await prisma.role.upsert({
      where: { name: role.name },
      update: { description: role.description, isSystem: role.isSystem },
      create: { name: role.name, description: role.description, isSystem: role.isSystem },
    });

    // map grants → permissions ที่ scope ของ role
    for (const [resource, actions] of Object.entries(role.grants)) {
      const resolved = actions === '*' ? RESOURCE_ACTIONS[resource] : actions;
      for (const action of resolved) {
        const perm = await prisma.permission.findUnique({
          where: { resource_action_scope: { resource, action, scope: role.scope } },
        });
        if (!perm) continue;
        await prisma.rolePermission.upsert({
          where: { roleId_permissionId: { roleId: created.id, permissionId: perm.id } },
          update: {},
          create: { roleId: created.id, permissionId: perm.id },
        });
      }
    }
  }

  console.log(`  ✓ ${ROLES.length} roles + permissions seeded`);
}

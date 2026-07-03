// ============================================================================
// ROS — Database Seed (Phase 11)
// idempotent: รันซ้ำได้ปลอดภัย (ใช้ upsert)
//
// สร้าง:
//   1) สาขาเริ่มต้น (HQ)
//   2) Roles + Permissions (RBAC)
//   3) Super Admin user
//   4) Master data (property type, amenity, province, doc type)
//   5) Core settings (บริษัท, consent, retention)
// ============================================================================

import { scryptSync, randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { seedRolesAndPermissions } from './roles-permissions';
import { seedMasterData } from './master-data';

const prisma = new PrismaClient();

// --- Password hashing (seed-only) -------------------------------------------
// ใช้ scrypt (built-in) สำหรับ seed admin — ไม่ต้องพึ่ง native dep
// รูปแบบ: scrypt$<saltHex>$<hashHex>
// หมายเหตุ: Phase 12 (auth module) ใช้ Argon2id เป็นหลัก และต้องรองรับ verify
//          รูปแบบ scrypt นี้สำหรับบัญชี seed (หรือให้ admin reset รหัสตอน login แรก)
function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(plain, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

const HQ_BRANCH_CODE = 'HQ';
const ADMIN_EMAIL = process.env.SEED_ADMIN_EMAIL ?? 'admin@ros.local';
// MR-35: นอก development/test ต้องตั้ง SEED_ADMIN_PASSWORD เอง (ห้าม seed รหัส default ขึ้น prod)
const SEED_ENV = process.env.NODE_ENV ?? 'development';
if (!process.env.SEED_ADMIN_PASSWORD && SEED_ENV !== 'development' && SEED_ENV !== 'test') {
  throw new Error(`[seed] NODE_ENV=${SEED_ENV} ต้องตั้ง SEED_ADMIN_PASSWORD (ห้ามใช้รหัส default บน production/staging)`);
}
const ADMIN_PASSWORD = process.env.SEED_ADMIN_PASSWORD ?? 'ChangeMe!2026';

async function seedBranch() {
  const branch = await prisma.branch.upsert({
    where: { code: HQ_BRANCH_CODE },
    update: {},
    create: { code: HQ_BRANCH_CODE, name: 'สำนักงานใหญ่ (Head Office)', isActive: true },
  });
  console.log(`  ✓ branch: ${branch.code}`);
  return branch;
}

async function seedSuperAdmin(branchId: string) {
  const superAdminRole = await prisma.role.findUnique({ where: { name: 'super_admin' } });
  if (!superAdminRole) throw new Error('super_admin role not found — run roles seed first');

  const admin = await prisma.user.upsert({
    where: { email: ADMIN_EMAIL },
    update: { branchId },
    create: {
      email: ADMIN_EMAIL,
      fullName: 'System Administrator',
      passwordHash: hashPassword(ADMIN_PASSWORD),
      status: 'active',
      locale: 'th',
      branchId,
    },
  });

  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: admin.id, roleId: superAdminRole.id } },
    update: {},
    create: { userId: admin.id, roleId: superAdminRole.id },
  });

  console.log(`  ✓ super admin: ${admin.email}`);
  return admin;
}

async function seedSettings() {
  const settings: { key: string; value: unknown }[] = [
    { key: 'company.name', value: { th: 'ROS Real Estate', en: 'ROS Real Estate' } },
    { key: 'company.contact', value: { phone: '', email: '', lineOaId: '' } },
    { key: 'company.locales', value: { default: 'th', supported: ['th', 'en'] } },
    // PDPA/GDPR (Phase 1/7)
    { key: 'privacy.consent_version', value: { current: '1.0', updatedAt: '2026-06-08' } },
    // Data retention (Phase 3 §9) — หน่วยเป็นวัน
    {
      key: 'retention.policy',
      value: { contract_days: 2555, customer_days: 1825, lead_days: 730, audit_days: 730 },
    },
    // ลำดับสถานะ lifecycle (Phase 1) — ใช้อ้างอิงใน UI
    {
      key: 'lifecycle.property',
      value: ['draft', 'available', 'rented'], // MR-39: ตรงกับ enum จริงหลัง 0007 (เดิมค้าง 8 สถานะเก่า)
    },
  ];

  for (const s of settings) {
    await prisma.setting.upsert({
      where: { key: s.key },
      update: { value: s.value as object },
      create: { key: s.key, value: s.value as object, scope: 'global' },
    });
  }
  console.log(`  ✓ ${settings.length} settings seeded`);
}

async function main() {
  console.log('🌱 ROS database seed — start');

  console.log('\n[1/5] Branch');
  const branch = await seedBranch();

  console.log('\n[2/5] Roles & Permissions');
  await seedRolesAndPermissions(prisma);

  console.log('\n[3/5] Super Admin');
  await seedSuperAdmin(branch.id);

  console.log('\n[4/5] Master Data');
  await seedMasterData(prisma);

  console.log('\n[5/5] Settings');
  await seedSettings();

  console.log('\n✅ Seed complete');
  console.log(`\n   Login (Phase 12): ${ADMIN_EMAIL} / ${ADMIN_PASSWORD}`);
  console.log('   ⚠️  เปลี่ยนรหัสผ่าน admin ทันทีหลัง deploy production\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

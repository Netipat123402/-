// ============================================================================
// ROS — Regenerate demo property images (premium branded illustrations)
// ----------------------------------------------------------------------------
// เปลี่ยนรูป placeholder 1×1 ของ 4 ทรัพย์ demo → SVG "architectural line study" พรีเมียม
// (scene library: scripts/property-scenes.ts) ~6 ฉาก/ทรัพย์ ตามประเภท
//
// ปลอดภัย: แตะเฉพาะ property_media ของ 4 ทรัพย์ (by code) — ไม่แตะตารางอื่น ไม่ wipe
// รัน:  cd db && DATABASE_URL="<url>" npx tsx scripts/regen-demo-images.ts
// ============================================================================

import { PrismaClient } from '@prisma/client';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { scenes, SETS } from './property-scenes';

const prisma = new PrismaClient();
const UPLOADS_DIR = join(__dirname, '..', '..', 'apps', 'api', 'uploads', 'properties');

async function main() {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const codes = ['CD-2026-0001', 'HS-2026-0001', 'TH-2026-0001', 'AP-2026-0001'];
  const props = await prisma.property.findMany({
    where: { code: { in: codes } },
    select: { id: true, code: true, propertyType: true, createdBy: true },
  });
  if (props.length !== codes.length) console.warn(`⚠️ พบ ${props.length}/${codes.length} ทรัพย์`);

  for (const p of props) {
    const set = SETS[p.propertyType] ?? SETS.condo;
    const media = set.map((key, n) => {
      const file = `demo-${p.code}-${n + 1}.svg`;
      writeFileSync(join(UPLOADS_DIR, file), scenes[key](), 'utf8');
      return { storageKey: `properties/${file}`, sortOrder: n, isCover: n === 0 };
    });
    // แตะเฉพาะ media ของทรัพย์นี้: ลบ placeholder เดิม แล้วใส่ SVG ชุดใหม่
    await prisma.$transaction([
      prisma.propertyMedia.deleteMany({ where: { propertyId: p.id } }),
      prisma.propertyMedia.createMany({
        data: media.map((m) => ({ ...m, propertyId: p.id, mediaType: 'image' as const, createdBy: p.createdBy })),
      }),
    ]);
    console.log(`✓ ${p.code} (${p.propertyType}) → ${media.length} รูป`);
  }
  console.log('🎉 regen-demo-images เสร็จ');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());

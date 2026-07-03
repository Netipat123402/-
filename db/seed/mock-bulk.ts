// ============================================================================
// ROS — Mock Bulk Seed (สำหรับทดสอบ UI ชุดใหญ่)
// ----------------------------------------------------------------------------
// จุดประสงค์: ใส่ข้อมูลจำลอง "ครบทุกช่อง" จำนวนมาก เพื่อเทส:
//   - pagination ปุ่มซ้าย-ขวา (≤8 แถว/หน้า) ทุกลิสต์: ทรัพย์ / เจ้าของ / ลูกค้า / ลีด / นัด / สัญญา
//   - แกลเลอรีรูป (เลื่อนซ้าย-ขวา) — 10 รูป/ทรัพย์
//   - ปฏิทิน — นัดกระจายหลายวัน
//
// ปลอดภัย: เพิ่ม "ข้อมูล" อย่างเดียว ไม่แตะ schema / business logic / ของเดิม
// idempotent: รันซ้ำได้ (upsert ตาม code / email จำลอง) — ลบของจำลองเก่าแล้วสร้างใหม่
//
// รัน:  cd db && DATABASE_URL="<url>" npx tsx seed/mock-bulk.ts
//       (ลบของจำลองออก:  ... npx tsx seed/mock-bulk.ts --clean)
// ============================================================================

import { PrismaClient, type Prisma } from '@prisma/client';
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const prisma = new PrismaClient();

// uploads/properties ของ API (จาก db/seed → repo root → apps/api/uploads/properties)
const UPLOADS_DIR = join(__dirname, '..', '..', 'apps', 'api', 'uploads', 'properties');

const MOCK_TAG = 'mock-bulk'; // ติดใน note/createdBy ไม่ได้ → ใช้ prefix code/email แยกของจำลอง
const OWNER_EMAIL_PREFIX = 'mock.owner';
const CUST_EMAIL_PREFIX = 'mock.cust';

// ---------------------------------------------------------------------------
// รูป SVG — สีต่างกันทุกใบเพื่อให้เห็น "การเลื่อน" ชัด + ป้ายบอกรหัส/ลำดับ
// ---------------------------------------------------------------------------
const ROOM_NAMES = [
  'หน้าอาคาร', 'ล็อบบี้', 'ห้องนั่งเล่น', 'ห้องนอนใหญ่', 'ห้องครัว',
  'ห้องน้ำ', 'ระเบียง / วิว', 'สระว่ายน้ำ', 'ฟิตเนส', 'พื้นที่ส่วนกลาง',
];

function buildSvg(code: string, n: number, total: number): string {
  const hue = (n * 36) % 360;
  const bg = `hsl(${hue} 52% 58%)`;
  const bgDark = `hsl(${hue} 48% 40%)`;
  const room = ROOM_NAMES[(n - 1) % ROOM_NAMES.length];
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 800" width="1200" height="800">
  <rect width="1200" height="800" fill="${bg}"/>
  <rect y="640" width="1200" height="160" fill="${bgDark}"/>
  <text x="60" y="160" font-family="sans-serif" font-size="120" font-weight="700" fill="rgba(255,255,255,0.92)">${n}/${total}</text>
  <text x="60" y="720" font-family="sans-serif" font-size="56" font-weight="700" fill="#ffffff">${code}</text>
  <text x="1140" y="720" text-anchor="end" font-family="sans-serif" font-size="48" fill="rgba(255,255,255,0.95)">${room}</text>
</svg>`;
}

function writePropertyImages(code: string, count = 10): { storageKey: string; sortOrder: number; isCover: boolean }[] {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  const media: { storageKey: string; sortOrder: number; isCover: boolean }[] = [];
  for (let n = 1; n <= count; n++) {
    const file = `mock-${code}-${n}.svg`;
    writeFileSync(join(UPLOADS_DIR, file), buildSvg(code, n, count), 'utf8');
    media.push({ storageKey: `properties/${file}`, sortOrder: n - 1, isCover: n === 1 });
  }
  return media;
}

// ---------------------------------------------------------------------------
// ชุดข้อมูลทรัพย์ (16) — คล้องจอง: ชื่อ/โครงการ/จังหวัด/เขต/สิ่งอำนวยความสะดวก
// ---------------------------------------------------------------------------
type PType = 'condo' | 'house' | 'townhome' | 'apartment';
type Furn = 'fully' | 'partial' | 'unfurnished';
type PStatus = 'draft' | 'available' | 'rented';

interface PSeed {
  code: string; type: PType; status: PStatus; titleTh: string; titleEn: string;
  project: string; province: string; district: string; subdistrict: string; address: string;
  lat: number; lng: number; rent: number; deposit: number; beds: number; baths: number;
  area: number; floor: string; furnished: Furn; amenities: string[]; featured: boolean; views: number;
}

const PROPERTIES: PSeed[] = [
  { code: 'CD-2026-1001', type: 'condo', status: 'available', titleTh: 'ไอดีโอ สุขุมวิท 93 — 1 นอน ใกล้ BTS บางจาก', titleEn: 'Ideo Sukhumvit 93 — 1BR near BTS', project: 'Ideo Sukhumvit 93', province: 'กรุงเทพมหานคร', district: 'พระโขนง', subdistrict: 'บางจาก', address: '999 ถ.สุขุมวิท แขวงบางจาก เขตพระโขนง', lat: 13.6962, lng: 100.6053, rent: 18000, deposit: 2, beds: 1, baths: 1, area: 32, floor: '15/30', furnished: 'fully', amenities: ['pool', 'gym', 'parking', 'security', 'near_bts', 'co_working'], featured: true, views: 245 },
  { code: 'CD-2026-1002', type: 'condo', status: 'available', titleTh: 'ลุมพินี วิลล์ อ่อนนุช — สตูดิโอ พร้อมอยู่', titleEn: 'Lumpini Ville Onnut — Studio', project: 'Lumpini Ville Onnut', province: 'กรุงเทพมหานคร', district: 'สวนหลวง', subdistrict: 'อ่อนนุช', address: '88 ซ.อ่อนนุช 46 แขวงอ่อนนุช เขตสวนหลวง', lat: 13.7053, lng: 100.6321, rent: 12000, deposit: 2, beds: 0, baths: 1, area: 26, floor: '8/24', furnished: 'fully', amenities: ['pool', 'gym', 'security', 'cctv', 'near_bts'], featured: false, views: 132 },
  { code: 'CD-2026-1003', type: 'condo', status: 'available', titleTh: 'แอชตัน อโศก — 1 นอน วิวเมือง', titleEn: 'Ashton Asoke — 1BR City View', project: 'Ashton Asoke', province: 'กรุงเทพมหานคร', district: 'วัฒนา', subdistrict: 'คลองเตยเหนือ', address: '63 ถ.อโศกมนตรี แขวงคลองเตยเหนือ เขตวัฒนา', lat: 13.7376, lng: 100.5601, rent: 35000, deposit: 2, beds: 1, baths: 1, area: 35, floor: '28/50', furnished: 'fully', amenities: ['pool', 'gym', 'parking', 'security', 'cctv', 'keycard', 'near_mrt', 'co_working', 'sauna'], featured: true, views: 410 },
  { code: 'CD-2026-1004', type: 'condo', status: 'rented', titleTh: 'เดอะ เบส พระราม 9 — 2 นอน', titleEn: 'The Base Rama 9 — 2BR', project: 'The Base Rama 9', province: 'กรุงเทพมหานคร', district: 'ห้วยขวาง', subdistrict: 'ห้วยขวาง', address: '120 ถ.พระราม 9 แขวงห้วยขวาง เขตห้วยขวาง', lat: 13.7585, lng: 100.5710, rent: 29900, deposit: 2, beds: 2, baths: 2, area: 55, floor: '20/35', furnished: 'fully', amenities: ['pool', 'gym', 'parking', 'security', 'near_mrt'], featured: false, views: 88 },
  { code: 'CD-2026-1005', type: 'condo', status: 'available', titleTh: 'โนเบิล อราวด์ สุขุมวิท 33 — 2 นอน', titleEn: 'Noble Around Sukhumvit 33 — 2BR', project: 'Noble Around 33', province: 'กรุงเทพมหานคร', district: 'วัฒนา', subdistrict: 'คลองตันเหนือ', address: '33 ซ.สุขุมวิท 33 แขวงคลองตันเหนือ เขตวัฒนา', lat: 13.7335, lng: 100.5708, rent: 42000, deposit: 2, beds: 2, baths: 2, area: 62, floor: '12/40', furnished: 'fully', amenities: ['pool', 'gym', 'parking', 'security', 'cctv', 'keycard', 'near_bts', 'sauna', 'co_working'], featured: true, views: 320 },
  { code: 'CD-2026-1006', type: 'condo', status: 'available', titleTh: 'ศุภาลัย ลอฟท์ แยกไฟฉาย — 1 นอน', titleEn: 'Supalai Loft Yaek Fai Chai — 1BR', project: 'Supalai Loft', province: 'กรุงเทพมหานคร', district: 'บางกอกน้อย', subdistrict: 'บ้านช่างหล่อ', address: '1 ถ.อิสรภาพ แขวงบ้านช่างหล่อ เขตบางกอกน้อย', lat: 13.7480, lng: 100.4760, rent: 16500, deposit: 2, beds: 1, baths: 1, area: 34, floor: '22/33', furnished: 'partial', amenities: ['pool', 'gym', 'parking', 'security', 'near_mrt'], featured: false, views: 156 },
  { code: 'CD-2026-1007', type: 'condo', status: 'draft', titleTh: 'ริทึ่ม เอกมัย — สตูดิโอ (กำลังเตรียมข้อมูล)', titleEn: 'Rhythm Ekkamai — Studio (draft)', project: 'Rhythm Ekkamai', province: 'กรุงเทพมหานคร', district: 'วัฒนา', subdistrict: 'พระโขนงเหนือ', address: '21 ถ.สุขุมวิท แขวงพระโขนงเหนือ เขตวัฒนา', lat: 13.7193, lng: 100.5853, rent: 19000, deposit: 2, beds: 0, baths: 1, area: 28, floor: '10/27', furnished: 'fully', amenities: ['pool', 'gym', 'security', 'near_bts'], featured: false, views: 12 },
  { code: 'HS-2026-1001', type: 'house', status: 'available', titleTh: 'บ้านเดี่ยว 2 ชั้น หมู่บ้านเดอะแกรนด์ บางนา', titleEn: 'Detached House 2-Storey, The Grand Bangna', project: 'The Grand Bangna', province: 'กรุงเทพมหานคร', district: 'บางนา', subdistrict: 'บางนาใต้', address: '55/1 ถ.บางนา-ตราด กม.7 แขวงบางนาใต้ เขตบางนา', lat: 13.6680, lng: 100.6450, rent: 45000, deposit: 2, beds: 4, baths: 3, area: 220, floor: '2 ชั้น', furnished: 'partial', amenities: ['parking', 'security', 'cctv', 'garden', 'playground', 'pet_friendly'], featured: true, views: 198 },
  { code: 'HS-2026-1002', type: 'house', status: 'available', titleTh: 'บ้านเดี่ยว หมู่บ้านมัณฑนา ราชพฤกษ์ — 3 นอน', titleEn: 'Detached House, Manthana Ratchaphruek — 3BR', project: 'Manthana Ratchaphruek', province: 'นนทบุรี', district: 'บางกรวย', subdistrict: 'บางขุนกอง', address: '77 ถ.ราชพฤกษ์ ต.บางขุนกอง อ.บางกรวย', lat: 13.8175, lng: 100.4360, rent: 38000, deposit: 2, beds: 3, baths: 3, area: 180, floor: '2 ชั้น', furnished: 'unfurnished', amenities: ['parking', 'security', 'garden', 'playground', 'shuttle'], featured: false, views: 74 },
  { code: 'HS-2026-1003', type: 'house', status: 'rented', titleTh: 'บ้านเดี่ยว 2 ชั้น เพอร์เฟค เพลส รามคำแหง', titleEn: 'Detached House, Perfect Place Ramkhamhaeng', project: 'Perfect Place Ramkhamhaeng', province: 'กรุงเทพมหานคร', district: 'สะพานสูง', subdistrict: 'สะพานสูง', address: '9 ถ.รามคำแหง แขวงสะพานสูง เขตสะพานสูง', lat: 13.7670, lng: 100.6900, rent: 52000, deposit: 2, beds: 4, baths: 4, area: 260, floor: '2 ชั้น', furnished: 'fully', amenities: ['parking', 'security', 'cctv', 'garden', 'pet_friendly'], featured: false, views: 61 },
  { code: 'TH-2026-1001', type: 'townhome', status: 'available', titleTh: 'ทาวน์โฮม 3 ชั้น ลาดพร้าว 71 ใกล้ MRT', titleEn: 'Townhome 3-Storey, Ladprao 71 near MRT', project: 'Town Avenue Ladprao', province: 'กรุงเทพมหานคร', district: 'ลาดพร้าว', subdistrict: 'ลาดพร้าว', address: '71 ซ.ลาดพร้าว 71 แขวงลาดพร้าว เขตลาดพร้าว', lat: 13.7920, lng: 100.5980, rent: 28000, deposit: 2, beds: 3, baths: 3, area: 150, floor: '3 ชั้น', furnished: 'partial', amenities: ['parking', 'security', 'cctv', 'near_mrt', 'pet_friendly'], featured: true, views: 167 },
  { code: 'TH-2026-1002', type: 'townhome', status: 'available', titleTh: 'ทาวน์โฮม 2 ชั้น พฤกษา วิลล์ ศรีนครินทร์', titleEn: 'Townhome 2-Storey, Pruksa Ville Srinakarin', project: 'Pruksa Ville Srinakarin', province: 'สมุทรปราการ', district: 'เมืองสมุทรปราการ', subdistrict: 'บางเมือง', address: '15 ถ.ศรีนครินทร์ ต.บางเมือง อ.เมืองสมุทรปราการ', lat: 13.6210, lng: 100.6190, rent: 17000, deposit: 2, beds: 3, baths: 2, area: 120, floor: '2 ชั้น', furnished: 'unfurnished', amenities: ['parking', 'security', 'playground', 'shuttle'], featured: false, views: 43 },
  { code: 'TH-2026-1003', type: 'townhome', status: 'draft', titleTh: 'ทาวน์โฮม กลางเมืองเชียงใหม่ (ร่าง)', titleEn: 'Townhome Chiang Mai City (draft)', project: 'Sansiri Town CM', province: 'เชียงใหม่', district: 'เมืองเชียงใหม่', subdistrict: 'สุเทพ', address: '5 ถ.นิมมานเหมินท์ ต.สุเทพ อ.เมืองเชียงใหม่', lat: 18.7990, lng: 98.9670, rent: 22000, deposit: 2, beds: 2, baths: 2, area: 110, floor: '2 ชั้น', furnished: 'fully', amenities: ['parking', 'security', 'garden', 'co_working'], featured: false, views: 8 },
  { code: 'AP-2026-1001', type: 'apartment', status: 'available', titleTh: 'อพาร์ทเมนท์ใกล้ ม.เกษตร — 1 นอน', titleEn: 'Apartment near Kasetsart Univ. — 1BR', project: 'Kaset Residence', province: 'กรุงเทพมหานคร', district: 'จตุจักร', subdistrict: 'ลาดยาว', address: '50 ถ.งามวงศ์วาน แขวงลาดยาว เขตจตุจักร', lat: 13.8470, lng: 100.5690, rent: 9500, deposit: 1, beds: 1, baths: 1, area: 30, floor: '4/8', furnished: 'fully', amenities: ['parking', 'security', 'cctv', 'near_bts', 'shuttle'], featured: false, views: 121 },
  { code: 'AP-2026-1002', type: 'apartment', status: 'available', titleTh: 'อพาร์ทเมนท์ติดหาดพัทยา — สตูดิโอ วิวทะเล', titleEn: 'Beachfront Apartment Pattaya — Sea View Studio', project: 'Pattaya Beach Residence', province: 'ชลบุรี', district: 'บางละมุง', subdistrict: 'หนองปรือ', address: '300 ถ.พัทยาสาย 1 ต.หนองปรือ อ.บางละมุง', lat: 12.9270, lng: 100.8770, rent: 14000, deposit: 2, beds: 0, baths: 1, area: 33, floor: '12/20', furnished: 'fully', amenities: ['pool', 'gym', 'security', 'cctv', 'pet_friendly'], featured: true, views: 289 },
  { code: 'AP-2026-1003', type: 'apartment', status: 'available', titleTh: 'อพาร์ทเมนท์เมืองภูเก็ต — 2 นอน', titleEn: 'Phuket Town Apartment — 2BR', project: 'Phuket Town Loft', province: 'ภูเก็ต', district: 'เมืองภูเก็ต', subdistrict: 'ตลาดใหญ่', address: '12 ถ.ถลาง ต.ตลาดใหญ่ อ.เมืองภูเก็ต', lat: 7.8840, lng: 98.3880, rent: 16000, deposit: 2, beds: 2, baths: 1, area: 48, floor: '6/9', furnished: 'partial', amenities: ['parking', 'security', 'co_working', 'pet_friendly'], featured: false, views: 54 },
];

// ---------------------------------------------------------------------------
// ชื่อคนไทย (สำหรับ owner / customer / lead)
// ---------------------------------------------------------------------------
const TH_NAMES = [
  'สมชาย ใจดี', 'สมหญิง รักเรียน', 'วิภา ศรีสุข', 'ธนกร ทองดี', 'ปรีชา มั่นคง',
  'กนกวรรณ วัฒนา', 'อนันต์ บุญมี', 'จิราพร แสงทอง', 'ณัฐพล พงษ์ไพร', 'พิมพ์ใจ อินทรีย์',
  'สุริยา เพชรงาม', 'อรอุมา ดาวเรือง', 'เอกชัย ก้องเกียรติ', 'มาลี สวนสุข', 'ภาณุ รุ่งโรจน์', 'ศิริพร เกษมสุข',
];
const phone = (i: number) => `08${(1 + (i % 8))}-${String(200 + i).padStart(3, '0')}-${String(1000 + i * 7).slice(-4)}`;
const slug = (i: number) => `u${String(i + 1).padStart(2, '0')}`;

function pickAmenities(codes: string[]): Prisma.InputJsonValue {
  const o: Record<string, boolean> = {};
  for (const c of codes) o[c] = true;
  return o;
}

// ---------------------------------------------------------------------------
async function clean() {
  console.log('🧹 ลบข้อมูลจำลองเดิม (mock-bulk)…');
  // ลบไฟล์รูป mock
  for (const p of PROPERTIES) {
    for (let n = 1; n <= 10; n++) {
      const f = join(UPLOADS_DIR, `mock-${p.code}-${n}.svg`);
      if (existsSync(f)) rmSync(f, { force: true });
    }
  }
  const propCodes = PROPERTIES.map((p) => p.code);
  const props = await prisma.property.findMany({ where: { code: { in: propCodes } }, select: { id: true } });
  const propIds = props.map((p) => p.id);
  // ลบลูกของทรัพย์ก่อน
  await prisma.appointment.deleteMany({ where: { code: { startsWith: 'APT-2026-1' } } });
  await prisma.contract.deleteMany({ where: { code: { startsWith: 'CT-2026-1' } } });
  await prisma.leadInterest.deleteMany({ where: { propertyId: { in: propIds } } });
  await prisma.lead.deleteMany({ where: { code: { startsWith: 'LD-2026-1' } } });
  await prisma.propertyMedia.deleteMany({ where: { propertyId: { in: propIds } } });
  await prisma.propertyStatusHistory.deleteMany({ where: { propertyId: { in: propIds } } });
  await prisma.property.deleteMany({ where: { code: { in: propCodes } } });
  await prisma.customer.deleteMany({ where: { email: { startsWith: CUST_EMAIL_PREFIX } } });
  await prisma.owner.deleteMany({ where: { email: { startsWith: OWNER_EMAIL_PREFIX } } });
  console.log('  ✓ ลบเรียบร้อย');
}

async function main() {
  const doClean = process.argv.includes('--clean');
  console.log('🌱 ROS mock-bulk seed — start');

  const branch = await prisma.branch.findFirst({ where: { code: 'HQ' } });
  if (!branch) throw new Error('ไม่พบ branch HQ — รัน db:seed ก่อน');
  const admin = await prisma.user.findFirst({ where: { email: 'admin@ros.local' } });
  if (!admin) throw new Error('ไม่พบ admin user — รัน db:seed ก่อน');
  const agents = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true } });
  const agentId = (i: number) => agents[i % agents.length]?.id ?? admin.id;

  // ลบของจำลองเก่าทุกครั้ง (idempotent)
  await clean();
  if (doClean) {
    console.log('✅ clean เสร็จ (--clean) — ไม่สร้างใหม่');
    return;
  }

  const meta = { branchId: branch.id, createdBy: admin.id } as const;

  // [1] OWNERS (16) — ครบทุกช่อง
  console.log('\n[1/6] เจ้าของทรัพย์ (Owners) × 16');
  const owners = [];
  for (let i = 0; i < 16; i++) {
    const o = await prisma.owner.create({
      data: {
        fullName: TH_NAMES[i],
        phone: phone(i),
        email: `${OWNER_EMAIL_PREFIX}.${slug(i)}@ros.test`,
        idCardNo: `1${String(1000000000000 + i * 37).slice(-12)}`, // plaintext 13 หลัก (legacy-safe)
        address: `${100 + i} หมู่ ${1 + (i % 9)} ${PROPERTIES[i % PROPERTIES.length].district} กรุงเทพมหานคร 10${String(100 + i).slice(-3)}`,
        note: `เจ้าของทรัพย์ตัวอย่าง #${i + 1} (${MOCK_TAG}) — ติดต่อได้ช่วงเย็น`,
        ...meta,
      },
    });
    owners.push(o);
  }
  console.log(`  ✓ ${owners.length} owners`);

  // [2] CUSTOMERS (16)
  console.log('\n[2/6] ลูกค้า (Customers) × 16');
  const customers = [];
  for (let i = 0; i < 16; i++) {
    const c = await prisma.customer.create({
      data: {
        fullName: TH_NAMES[(i + 5) % 16],
        phone: phone(i + 20),
        email: `${CUST_EMAIL_PREFIX}.${slug(i)}@ros.test`,
        idCardNo: `2${String(2000000000000 + i * 53).slice(-12)}`,
        address: `${200 + i}/${1 + i} ถ.ตัวอย่าง ${PROPERTIES[(i + 3) % PROPERTIES.length].district} กรุงเทพมหานคร`,
        ...meta,
      },
    });
    customers.push(c);
  }
  console.log(`  ✓ ${customers.length} customers`);

  // [3] PROPERTIES (16) + รูป 10 ใบ/อัน
  console.log('\n[3/6] ทรัพย์ (Properties) × 16  +  รูป 10 ใบ/อัน');
  const properties = [];
  for (let i = 0; i < PROPERTIES.length; i++) {
    const p = PROPERTIES[i];
    const media = writePropertyImages(p.code, 10);
    const created = await prisma.property.create({
      data: {
        code: p.code,
        ownerId: owners[i % owners.length].id,
        assignedToId: agentId(i),
        propertyType: p.type,
        status: p.status,
        titleTh: p.titleTh,
        titleEn: p.titleEn,
        descriptionTh: `${p.titleTh}\n\nทำเลดี เดินทางสะดวก ใกล้ร้านค้าและระบบขนส่ง พร้อมสิ่งอำนวยความสะดวกครบครัน เหมาะสำหรับพักอาศัยจริง ห้อง/บ้านสภาพดี พร้อมเข้าอยู่ทันที สนใจนัดชมได้ทุกวัน`,
        descriptionEn: `${p.titleEn}. Prime location, easy access to transit and amenities. Move-in ready, well maintained. Viewing available daily.`,
        address: p.address,
        province: p.province,
        district: p.district,
        subdistrict: p.subdistrict,
        projectName: p.project,
        latitude: p.lat,
        longitude: p.lng,
        monthlyRent: p.rent,
        depositMonths: p.deposit,
        bedrooms: p.beds,
        bathrooms: p.baths,
        areaSqm: p.area,
        floor: p.floor,
        furnished: p.furnished,
        amenities: pickAmenities(p.amenities),
        isFeatured: p.featured,
        viewCount: p.views,
        publishedAt: p.status === 'available' ? new Date() : null,
        ...meta,
        media: { create: media.map((m) => ({ ...m, mediaType: 'image' as const, createdBy: admin.id })) },
      },
    });
    properties.push(created);
  }
  console.log(`  ✓ ${properties.length} properties (รวมรูป ${properties.length * 10} ใบ)`);

  // [4] LEADS (16) + ความสนใจในทรัพย์
  console.log('\n[4/6] ลีด (Leads) × 16');
  const sources = ['public_web', 'walk_in', 'phone', 'referral'] as const;
  const statuses = ['new', 'working', 'closed'] as const;
  const leads = [];
  for (let i = 0; i < 16; i++) {
    const st = statuses[i % 3];
    const lead = await prisma.lead.create({
      data: {
        code: `LD-2026-1${String(i + 1).padStart(3, '0')}`,
        fullName: TH_NAMES[(i + 9) % 16],
        phone: phone(i + 40),
        email: `mock.lead.${slug(i)}@ros.test`,
        source: sources[i % 4],
        status: st,
        assignedToId: agentId(i),
        customerId: st === 'closed' ? customers[i % customers.length].id : null,
        lostReason: st === 'closed' && i % 2 === 0 ? 'งบไม่พอ / เลือกทรัพย์อื่น' : null,
        message: `สนใจ ${properties[i % properties.length].titleTh} งบประมาณราว ${(10000 + i * 1500).toLocaleString()} บาท/เดือน ต้องการเข้าอยู่ภายใน 1 เดือน`,
        preferredViewAt: new Date(Date.now() + (i + 1) * 86400000),
        consentAt: new Date(),
        consentVersion: '1.0',
        ...meta,
        interests: {
          create: [
            { propertyId: properties[i % properties.length].id },
            { propertyId: properties[(i + 1) % properties.length].id },
          ],
        },
      },
    });
    leads.push(lead);
  }
  console.log(`  ✓ ${leads.length} leads`);

  // [5] APPOINTMENTS (16) — กระจายวันสำหรับปฏิทิน
  console.log('\n[5/6] นัดหมาย (Appointments) × 16 (กระจายในปฏิทิน)');
  const apptStatus = ['upcoming', 'done', 'cancelled'] as const;
  const locations = ['ที่โครงการ', 'สำนักงานใหญ่ ROS', 'นัดเจอหน้าตึก', 'ออนไลน์ (วิดีโอคอล)'];
  let apptN = 0;
  for (let i = 0; i < 16; i++) {
    const st = apptStatus[i % 3];
    // กระจายเวลา: วันนี้, +1..+15 วัน, สลับช่วงเช้า/บ่าย
    const d = new Date();
    d.setHours(9 + (i % 8), (i % 2) * 30, 0, 0);
    d.setDate(d.getDate() + (i - 2)); // มีทั้งอดีต (done/cancelled) และอนาคต (upcoming)
    apptN++;
    await prisma.appointment.create({
      data: {
        code: `APT-2026-1${String(apptN).padStart(3, '0')}`,
        leadId: leads[i % leads.length].id,
        propertyId: properties[i % properties.length].id,
        agentId: agentId(i),
        status: st,
        title: `นัดชม ${properties[i % properties.length].titleTh}`,
        scheduledAt: d,
        durationMin: [30, 45, 60][i % 3],
        location: locations[i % locations.length],
        note: `ลูกค้า ${leads[i % leads.length].fullName} โทรนัดเข้ามา ยืนยันแล้ว`,
        cancelReason: st === 'cancelled' ? 'ลูกค้าติดธุระ ขอเลื่อน' : null,
        ...meta,
      },
    });
  }
  console.log(`  ✓ ${apptN} appointments`);

  // [6] CONTRACTS (8) — ผูก เจ้าของ + ลูกค้า + ทรัพย์
  console.log('\n[6/6] สัญญา (Contracts) × 8');
  const ctStatus = ['draft', 'active', 'ended'] as const;
  let ctN = 0;
  for (let i = 0; i < 8; i++) {
    const prop = properties[i];
    const st = ctStatus[i % 3];
    const start = new Date(); start.setMonth(start.getMonth() - (6 - i));
    const end = new Date(start); end.setFullYear(end.getFullYear() + 1);
    ctN++;
    await prisma.contract.create({
      data: {
        code: `CT-2026-1${String(ctN).padStart(3, '0')}`,
        propertyId: prop.id,
        ownerId: owners[i % owners.length].id,
        customerId: customers[i % customers.length].id,
        agentId: agentId(i),
        status: st,
        startDate: start,
        endDate: end,
        monthlyRent: PROPERTIES[i].rent,
        depositAmount: PROPERTIES[i].rent * PROPERTIES[i].deposit,
        commissionAmount: PROPERTIES[i].rent,
        signedAt: st === 'draft' ? null : start,
        terminatedReason: st === 'ended' ? 'ครบกำหนดสัญญา ไม่ต่ออายุ' : null,
        ...meta,
      },
    });
  }
  console.log(`  ✓ ${ctN} contracts`);

  console.log('\n✅ mock-bulk seed เสร็จสมบูรณ์');
  console.log('   ทรัพย์ 16 (รูป 10/อัน) · เจ้าของ 16 · ลูกค้า 16 · ลีด 16 · นัด 16 · สัญญา 8');
  console.log('   ลบทั้งหมด:  DATABASE_URL=... npx tsx seed/mock-bulk.ts --clean');
}

main()
  .catch((e) => { console.error('❌ mock-bulk seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });

// ============================================================================
// Master Data Seed — dropdown / lookup (Phase 3 §4.10)
// ใช้สำหรับ filter บน public + form ภายใน (TH/EN)
// ============================================================================

import type { PrismaClient } from '@prisma/client';

type MD = { code: string; th: string; en: string };

const PROPERTY_TYPES: MD[] = [
  { code: 'condo', th: 'คอนโดมิเนียม', en: 'Condominium' },
  { code: 'house', th: 'บ้านเดี่ยว', en: 'House' },
  { code: 'townhome', th: 'ทาวน์โฮม', en: 'Townhome' },
  { code: 'apartment', th: 'อพาร์ทเมนท์', en: 'Apartment' },
];

const FURNISHED: MD[] = [
  { code: 'fully', th: 'เฟอร์นิเจอร์ครบ', en: 'Fully Furnished' },
  { code: 'partial', th: 'เฟอร์นิเจอร์บางส่วน', en: 'Partially Furnished' },
  { code: 'unfurnished', th: 'ไม่มีเฟอร์นิเจอร์', en: 'Unfurnished' },
];

const AMENITIES: MD[] = [
  { code: 'pool', th: 'สระว่ายน้ำ', en: 'Swimming Pool' },
  { code: 'gym', th: 'ฟิตเนส', en: 'Fitness / Gym' },
  { code: 'parking', th: 'ที่จอดรถ', en: 'Parking' },
  { code: 'security', th: 'รักษาความปลอดภัย 24 ชม.', en: '24h Security' },
  { code: 'cctv', th: 'กล้องวงจรปิด', en: 'CCTV' },
  { code: 'keycard', th: 'ระบบคีย์การ์ด', en: 'Keycard Access' },
  { code: 'near_bts', th: 'ใกล้ BTS', en: 'Near BTS' },
  { code: 'near_mrt', th: 'ใกล้ MRT', en: 'Near MRT' },
  { code: 'pet_friendly', th: 'เลี้ยงสัตว์ได้', en: 'Pet Friendly' },
  { code: 'garden', th: 'สวน / พื้นที่สีเขียว', en: 'Garden' },
  { code: 'co_working', th: 'Co-Working Space', en: 'Co-Working Space' },
  { code: 'sauna', th: 'ซาวน่า', en: 'Sauna' },
  { code: 'playground', th: 'สนามเด็กเล่น', en: 'Playground' },
  { code: 'shuttle', th: 'รถรับส่ง', en: 'Shuttle Service' },
];

const DOC_TYPES: MD[] = [
  { code: 'title_deed', th: 'โฉนด / เอกสารกรรมสิทธิ์', en: 'Title Deed' },
  { code: 'id_card', th: 'บัตรประชาชน', en: 'ID Card' },
  { code: 'house_registration', th: 'ทะเบียนบ้าน', en: 'House Registration' },
  { code: 'lease', th: 'สัญญาเช่า', en: 'Lease Agreement' },
  { code: 'receipt', th: 'ใบเสร็จ / หลักฐานการชำระ', en: 'Receipt' },
  { code: 'power_of_attorney', th: 'หนังสือมอบอำนาจ', en: 'Power of Attorney' },
  { code: 'property_photo', th: 'รูปทรัพย์', en: 'Property Photo' },
  { code: 'other', th: 'อื่น ๆ', en: 'Other' },
];

// จังหวัดหลัก (เริ่มต้น — ขยายครบ 77 จังหวัดได้ภายหลัง)
const PROVINCES: MD[] = [
  { code: 'bangkok', th: 'กรุงเทพมหานคร', en: 'Bangkok' },
  { code: 'nonthaburi', th: 'นนทบุรี', en: 'Nonthaburi' },
  { code: 'pathum_thani', th: 'ปทุมธานี', en: 'Pathum Thani' },
  { code: 'samut_prakan', th: 'สมุทรปราการ', en: 'Samut Prakan' },
  { code: 'chonburi', th: 'ชลบุรี', en: 'Chonburi' },
  { code: 'chiang_mai', th: 'เชียงใหม่', en: 'Chiang Mai' },
  { code: 'phuket', th: 'ภูเก็ต', en: 'Phuket' },
  { code: 'rayong', th: 'ระยอง', en: 'Rayong' },
  { code: 'ayutthaya', th: 'พระนครศรีอยุธยา', en: 'Phra Nakhon Si Ayutthaya' },
  { code: 'khon_kaen', th: 'ขอนแก่น', en: 'Khon Kaen' },
  { code: 'nakhon_ratchasima', th: 'นครราชสีมา', en: 'Nakhon Ratchasima' },
  { code: 'songkhla', th: 'สงขลา', en: 'Songkhla' },
];

async function seedCategory(
  prisma: PrismaClient,
  category: string,
  items: MD[],
): Promise<void> {
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    await prisma.masterData.upsert({
      where: { category_code: { category, code: item.code } },
      update: { labelTh: item.th, labelEn: item.en, sortOrder: i },
      create: { category, code: item.code, labelTh: item.th, labelEn: item.en, sortOrder: i },
    });
  }
}

export async function seedMasterData(prisma: PrismaClient): Promise<void> {
  await seedCategory(prisma, 'property_type', PROPERTY_TYPES);
  await seedCategory(prisma, 'furnished', FURNISHED);
  await seedCategory(prisma, 'amenity', AMENITIES);
  await seedCategory(prisma, 'doc_type', DOC_TYPES);
  await seedCategory(prisma, 'province', PROVINCES);

  const total =
    PROPERTY_TYPES.length + FURNISHED.length + AMENITIES.length +
    DOC_TYPES.length + PROVINCES.length;
  console.log(`  ✓ ${total} master-data records seeded`);
}

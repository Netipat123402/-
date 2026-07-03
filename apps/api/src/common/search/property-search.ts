import { Prisma, PropertyType } from '@prisma/client';

/**
 * Smart search สำหรับทรัพย์ — มาตรฐานเดียวทั้งระบบ (public + admin)
 * "พิมอะไรก็เจอ ถ้ามีส่วนเกี่ยวข้อง" — ค้นทุกฟิลด์ที่ผู้ใช้กรอก:
 *   ชื่อ(th/en), รายละเอียดยาว(th/en), โครงการ, จังหวัด, เขต, ตำบล, ที่อยู่
 *   + ตีความเป็น "ประเภททรัพย์" และ "สิ่งอำนวยความสะดวก" จากคำบางส่วน
 *   (เช่น "โด"→คอนโด, "น้ำ"→สระว่ายน้ำ, "bts"→ใกล้ BTS)
 */

// คำพ้องของประเภททรัพย์ (ไทย/อังกฤษ) — ใส่ "ราก/คำสั้น" ด้วย เพื่อให้พิมพ์ไม่เต็มก็เจอ
// (เช่น 'อพา' ครอบ อพาท/อพาร์ท/อพาร์ตเมนต์; 'ทาวน์' ครอบ ทาวน์โฮม/ทาวน์เฮาส์)
const TYPE_LABELS: Record<PropertyType, string[]> = {
  condo: ['คอนโด', 'คอนโดมิเนียม', 'คอน', 'condo', 'condominium'],
  house: ['บ้านเดี่ยว', 'บ้าน', 'house'],
  townhome: ['ทาวน์โฮม', 'ทาวน์เฮ้าส์', 'ทาวน์เฮาส์', 'ทาวน์', 'townhome', 'townhouse'],
  apartment: ['อพาร์ทเมนท์', 'อพาร์ตเมนต์', 'อพาร์ตเมนท์', 'อพา', 'apartment', 'flat'],
};

// คำพ้อง/ตัวย่อของจังหวัด → ชื่อจริงใน DB (labelTh) เพื่อให้พิมพ์ "กทม" ก็เจอ กรุงเทพมหานคร
const PROVINCE_SYNONYMS: { label: string; aliases: string[] }[] = [
  { label: 'กรุงเทพมหานคร', aliases: ['กทม', 'บางกอก', 'bangkok', 'bkk'] },
  { label: 'พระนครศรีอยุธยา', aliases: ['อยุธยา', 'ayutthaya'] },
  { label: 'เชียงใหม่', aliases: ['เชียงใหม่', 'chiang mai', 'chiangmai', 'cnx'] },
  { label: 'ภูเก็ต', aliases: ['ภูเก็ต', 'phuket', 'hkt'] },
];

// คำพ้องของสิ่งอำนวยความสะดวก (map → amenity code)
const AMENITY_LABELS: Record<string, string[]> = {
  pool: ['สระว่ายน้ำ', 'สระ', 'น้ำ', 'pool', 'swimming'],
  gym: ['ฟิตเนส', 'ยิม', 'gym', 'fitness'],
  parking: ['ที่จอดรถ', 'จอดรถ', 'parking'],
  security: ['รักษาความปลอดภัย', 'รปภ', 'security'],
  cctv: ['กล้องวงจรปิด', 'วงจรปิด', 'cctv'],
  keycard: ['คีย์การ์ด', 'keycard'],
  near_bts: ['bts', 'รถไฟฟ้า'],
  near_mrt: ['mrt', 'รถไฟใต้ดิน', 'ใต้ดิน'],
  near_airport_link: ['airport', 'แอร์พอร์ต', 'แอร์พอตลิ้ง', 'airport link', 'arl'],
  pet_friendly: ['เลี้ยงสัตว์', 'สัตว์เลี้ยง', 'pet'],
  garden: ['สวน', 'พื้นที่สีเขียว', 'garden', 'สีเขียว'],
  co_working: ['co-working', 'coworking', 'cowork', 'โคเวิร์ค'],
  sauna: ['ซาวน่า', 'sauna'],
  playground: ['สนามเด็กเล่น', 'playground'],
  shuttle: ['รถรับส่ง', 'shuttle'],
};

const matches = (labels: string[], q: string) =>
  labels.some((l) => {
    const ll = l.toLowerCase();
    return ll.includes(q) || q.includes(ll);
  });

/** สร้าง where (OR) สำหรับค้นหาแบบ smart — รวมเข้ากับ filter อื่นด้วย AND ที่ระดับบน */
export function propertySmartWhere(qRaw: string): Prisma.PropertyWhereInput {
  const q = qRaw.trim();
  if (!q) return {};
  const ql = q.toLowerCase();

  const text = (field: keyof Prisma.PropertyWhereInput): Prisma.PropertyWhereInput =>
    ({ [field]: { contains: q, mode: 'insensitive' } } as Prisma.PropertyWhereInput);

  const or: Prisma.PropertyWhereInput[] = [
    text('titleTh'), text('titleEn'),
    text('descriptionTh'), text('descriptionEn'),
    text('projectName'), text('province'),
    text('district'), text('subdistrict'), text('address'),
  ];

  // ตีความเป็นประเภททรัพย์
  const types = (Object.keys(TYPE_LABELS) as PropertyType[]).filter((t) => matches(TYPE_LABELS[t], ql));
  if (types.length) or.push({ propertyType: { in: types } });

  // ตีความตัวย่อจังหวัด (เช่น กทม → กรุงเทพมหานคร) — เพิ่มเงื่อนไข contains ชื่อจริง
  for (const { label, aliases } of PROVINCE_SYNONYMS) {
    if (matches(aliases, ql)) or.push({ province: { contains: label, mode: 'insensitive' } });
  }

  // ตีความเป็นสิ่งอำนวยความสะดวก (amenities เป็น JSON: { code: true })
  for (const [code, labels] of Object.entries(AMENITY_LABELS)) {
    if (matches(labels, ql)) {
      or.push({ amenities: { path: [code], equals: true } });
    }
  }

  return { OR: or };
}

/** filter ตาม "สถานีรถไฟ" (amenity code) — ใช้ในตัวกรองเว็บ public */
// MR-38: ลบ TRAIN_AMENITY_CODES (dead export — ไม่มีผู้ใช้)
export function trainWhere(code: string): Prisma.PropertyWhereInput {
  return { amenities: { path: [code], equals: true } };
}

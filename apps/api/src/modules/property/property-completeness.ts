// Completeness engine (Phase 2) — เช็ก "ความครบถ้วน" ของประกาศ
// ใช้ 2 จุด: (Phase 3) ด่านก่อน "ขอเผยแพร่" (required ครบ) + panel โชว์ว่าขาดอะไร
// pure function — ไม่แตะ DB · รับ snapshot ของ property + จำนวนรูป

export interface CompletenessItem {
  key: string;
  label: string;
  required: boolean;
  done: boolean;
}
export interface CompletenessResult {
  items: CompletenessItem[];
  requiredDone: number;
  requiredTotal: number;
  score: number; // 0-100 (required 70% + recommended 30%)
  canPublish: boolean; // required ครบทั้งหมด
  missingRequired: string[];
}

export interface PropertyCompletenessInput {
  titleTh?: string | null;
  propertyType?: string | null;
  province?: string | null;
  district?: string | null;
  monthlyRent?: unknown;
  bedrooms?: number | null;
  bathrooms?: number | null;
  descriptionTh?: string | null;
  ownerId?: string | null;
  areaSqm?: unknown;
  floor?: string | null;
  furnished?: string | null;
  amenities?: Record<string, unknown> | null;
  depositMonths?: number | null;
  mediaCount?: number;
}

const has = (v: unknown): boolean => v !== null && v !== undefined && v !== '';

export function computePropertyCompleteness(p: PropertyCompletenessInput): CompletenessResult {
  const items: CompletenessItem[] = [
    // จำเป็น — ต้องครบก่อน "ขอเผยแพร่"
    { key: 'title', label: 'ชื่อ + ประเภททรัพย์', required: true, done: has(p.titleTh) && has(p.propertyType) },
    { key: 'location', label: 'ทำเล (จังหวัด + เขต)', required: true, done: has(p.province) && has(p.district) },
    { key: 'price', label: 'ราคา/เดือน', required: true, done: has(p.monthlyRent) && Number(p.monthlyRent) > 0 },
    { key: 'rooms', label: 'ห้องนอน + ห้องน้ำ', required: true, done: has(p.bedrooms) && has(p.bathrooms) },
    { key: 'landlord', label: 'เจ้าของทรัพย์', required: true, done: has(p.ownerId) },
    { key: 'description', label: 'คำอธิบาย', required: true, done: has(p.descriptionTh) && String(p.descriptionTh).trim().length >= 20 },
    { key: 'cover', label: 'รูปปก', required: true, done: (p.mediaCount ?? 0) >= 1 },
    // แนะนำ — เพิ่มคะแนน/คุณภาพ (ไม่บล็อก)
    { key: 'photos', label: 'รูปครบชุด (≥4)', required: false, done: (p.mediaCount ?? 0) >= 4 },
    { key: 'area', label: 'พื้นที่ (ตร.ม.)', required: false, done: has(p.areaSqm) },
    { key: 'floor', label: 'ชั้น', required: false, done: has(p.floor) },
    { key: 'furnished', label: 'เฟอร์นิเจอร์', required: false, done: has(p.furnished) },
    { key: 'amenities', label: 'สิ่งอำนวยความสะดวก', required: false, done: !!p.amenities && Object.values(p.amenities).some(Boolean) },
    { key: 'deposit', label: 'เงินมัดจำ/เงื่อนไข', required: false, done: has(p.depositMonths) },
  ];

  const req = items.filter((i) => i.required);
  const rec = items.filter((i) => !i.required);
  const requiredDone = req.filter((i) => i.done).length;
  const recDone = rec.filter((i) => i.done).length;
  const score = Math.round((requiredDone / req.length) * 70 + (recDone / rec.length) * 30);

  return {
    items,
    requiredDone,
    requiredTotal: req.length,
    score,
    canPublish: requiredDone === req.length,
    missingRequired: req.filter((i) => !i.done).map((i) => i.label),
  };
}

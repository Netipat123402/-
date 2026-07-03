const BASE = process.env.API_BASE_INTERNAL || 'http://localhost:4000/api/v1';

/** ลิงก์ LINE Official Account — ตั้งผ่าน env NEXT_PUBLIC_LINE_URL (fallback ปลอดภัยถ้ายังไม่ตั้ง)
 *  ใช้ร่วมกันทุกปุ่ม "ติดต่อ"/LINE (Header, Footer, StickyCTA) → แก้ที่เดียว */
export const LINE_URL = process.env.NEXT_PUBLIC_LINE_URL || 'https://line.me';

export interface PropertyCard {
  id: string; code: string; type: string;
  title: { th: string; en: string | null };
  province: string | null; district: string | null; projectName: string | null;
  monthlyRent: number; bedrooms: number | null; bathrooms: number | null;
  areaSqm: number | null; coverImage: string | null; images?: string[];
  nearTransit?: boolean; petFriendly?: boolean;
}

export interface PropertyDetail extends Omit<PropertyCard, 'coverImage'> {
  description: { th: string | null; en: string | null };
  location: { province: string | null; district: string | null; subdistrict: string | null; projectName: string | null; lat: number | null; lng: number | null };
  depositMonths: number | null; floor: string | null; furnished: string | null;
  amenities: Record<string, unknown>;
  media: { type: string; url: string; isCover: boolean }[];
  publishedAt: string | null;
}

/** tag สำหรับ on-demand revalidation — API ยิงมาให้ refresh ทันทีตอน publish/ถอนทรัพย์ */
export const PUBLIC_PROPERTIES_TAG = 'public-properties';

/** SSR fetch — public API
 *  - revalidate: เพดานเวลา cache (กันค้างถ้า webhook พลาด)
 *  - tags: ให้ API สั่ง revalidateTag ได้ทันที (ทรัพย์ขึ้น/ลงเว็บแบบ real-time) */
export async function publicGet<T>(
  path: string,
  revalidate = 300,
  tags: string[] = [],
): Promise<{ data: T; meta?: Record<string, number> }> {
  const res = await fetch(`${BASE}${path}`, { next: { revalidate, tags } });
  if (!res.ok) {
    if (res.status === 404) return { data: null as T };
    throw new Error(`API ${res.status}`);
  }
  const json = await res.json();
  return { data: json.data as T, meta: json.meta };
}

/** URL รูปทรัพย์จาก storageKey (เสิร์ฟ static จาก API /uploads)
 *  ใช้ host เดียวกับที่เปิดเว็บ → รูปขึ้นทั้ง localhost และ LAN/มือถือ (เหมือน web-admin) */
export function mediaUrl(storageKey: string): string {
  const base = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:4000`
    : (process.env.NEXT_PUBLIC_MEDIA_BASE || 'http://localhost:4000');
  return `${base}/uploads/${storageKey}`;
}

/** Base URL ของ API สำหรับ fetch ฝั่ง client (SearchBar/ViewTracker/CommunityBoard/AppointmentForm)
 *  ใช้ host เดียวกับที่เปิดเว็บ (LAN IP เปลี่ยนก็ยังใช้ได้ ไม่ต้อง hardcode) — เดิมก็อปโค้ดนี้ซ้ำ 4 ที่ */
export function clientApiBase(): string {
  if (typeof window !== 'undefined') return `${window.location.protocol}//${window.location.hostname}:4000/api/v1`;
  return process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/api/v1';
}

export function baht(n: number): string {
  return new Intl.NumberFormat('th-TH').format(n);
}

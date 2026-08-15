// Demo property data (Phase 1) — static · เนื้อหา Notify (ไทย · ฿)
// Phase 2+ ค่อยต่อ API จริง · รูปใช้ asset ที่โหลดจาก template
export interface DemoProperty {
  slug: string;
  name: string;
  location: string;
  price: string; // format พร้อมแสดง
  deal: 'rent' | 'sale';
  beds: number;
  baths: number;
  area: number; // ตร.ม.
  img: string;
}

export const DEMO_PROPERTIES: DemoProperty[] = [
  { slug: 'the-river-condo', name: 'เดอะ ริเวอร์ คอนโด', location: 'เจริญนคร · กรุงเทพฯ', price: '฿25,000', deal: 'rent', beds: 1, baths: 1, area: 35, img: '/assets/asset-001.jpg' },
  { slug: 'baan-klang-suan', name: 'บ้านกลางสวน รามอินทรา', location: 'รามอินทรา · กรุงเทพฯ', price: '฿12,500,000', deal: 'sale', beds: 3, baths: 2, area: 180, img: '/assets/asset-002.jpg' },
  { slug: 'lumpini-townhome', name: 'ลุมพินี ทาวน์โฮม', location: 'ศรีนครินทร์ · สมุทรปราการ', price: '฿18,000', deal: 'rent', beds: 2, baths: 2, area: 110, img: '/assets/asset-004.jpg' },
  { slug: 'modern-villa-sukhumvit', name: 'โมเดิร์น วิลล่า สุขุมวิท', location: 'สุขุมวิท · กรุงเทพฯ', price: '฿45,000', deal: 'rent', beds: 3, baths: 3, area: 220, img: '/assets/asset-005.jpg' },
  { slug: 'the-nature-house', name: 'เดอะ เนเชอร์ เฮาส์', location: 'พระโขนง · กรุงเทพฯ', price: '฿8,900,000', deal: 'sale', beds: 2, baths: 2, area: 95, img: '/assets/asset-007.jpg' },
  { slug: 'sky-garden-apartment', name: 'สกาย การ์เดน อพาร์ตเมนต์', location: 'ลาดพร้าว · กรุงเทพฯ', price: '฿15,000', deal: 'rent', beds: 1, baths: 1, area: 42, img: '/assets/asset-011.jpg' },
];

export const dealLabel = (d: DemoProperty['deal']) => (d === 'rent' ? 'ให้เช่า' : 'ขาย');
export const priceSuffix = (d: DemoProperty['deal']) => (d === 'rent' ? '/เดือน' : '');

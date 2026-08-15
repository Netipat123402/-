// Demo property data (Phase 1) — static · เนื้อหา Notify (ไทย · ฿)
// Phase 2+ ค่อยต่อ API จริง · รูปใช้ asset ที่โหลดจาก template
export type PropertyCategory = 'คอนโด' | 'บ้าน' | 'ทาวน์โฮม' | 'อพาร์ตเมนต์' | 'วิลล่า';
export const CATEGORIES: PropertyCategory[] = ['คอนโด', 'บ้าน', 'ทาวน์โฮม', 'อพาร์ตเมนต์', 'วิลล่า'];

export interface DemoProperty {
  slug: string;
  name: string;
  location: string;
  price: string; // format พร้อมแสดง
  deal: 'rent' | 'sale';
  category: PropertyCategory;
  beds: number;
  baths: number;
  area: number; // ตร.ม.
  img: string;
}

export const DEMO_PROPERTIES: DemoProperty[] = [
  { slug: 'the-river-condo', name: 'เดอะ ริเวอร์ คอนโด', location: 'เจริญนคร · กรุงเทพฯ', price: '฿25,000', deal: 'rent', category: 'คอนโด', beds: 1, baths: 1, area: 35, img: '/assets/asset-001.jpg' },
  { slug: 'baan-klang-suan', name: 'บ้านกลางสวน รามอินทรา', location: 'รามอินทรา · กรุงเทพฯ', price: '฿12,500,000', deal: 'sale', category: 'บ้าน', beds: 3, baths: 2, area: 180, img: '/assets/asset-002.jpg' },
  { slug: 'lumpini-townhome', name: 'ลุมพินี ทาวน์โฮม', location: 'ศรีนครินทร์ · สมุทรปราการ', price: '฿18,000', deal: 'rent', category: 'ทาวน์โฮม', beds: 2, baths: 2, area: 110, img: '/assets/asset-004.jpg' },
  { slug: 'modern-villa-sukhumvit', name: 'โมเดิร์น วิลล่า สุขุมวิท', location: 'สุขุมวิท · กรุงเทพฯ', price: '฿45,000', deal: 'rent', category: 'วิลล่า', beds: 3, baths: 3, area: 220, img: '/assets/asset-005.jpg' },
  { slug: 'the-nature-house', name: 'เดอะ เนเชอร์ เฮาส์', location: 'พระโขนง · กรุงเทพฯ', price: '฿8,900,000', deal: 'sale', category: 'บ้าน', beds: 2, baths: 2, area: 95, img: '/assets/asset-007.jpg' },
  { slug: 'sky-garden-apartment', name: 'สกาย การ์เดน อพาร์ตเมนต์', location: 'ลาดพร้าว · กรุงเทพฯ', price: '฿15,000', deal: 'rent', category: 'อพาร์ตเมนต์', beds: 1, baths: 1, area: 42, img: '/assets/asset-011.jpg' },
];

export const dealLabel = (d: DemoProperty['deal']) => (d === 'rent' ? 'ให้เช่า' : 'ขาย');
export const priceSuffix = (d: DemoProperty['deal']) => (d === 'rent' ? '/เดือน' : '');

// ทำเล (Our location) — Notify · กรุงเทพฯ
export interface DemoCity { name: string; count: string; img: string; }
export const DEMO_CITIES: DemoCity[] = [
  { name: 'สุขุมวิท', count: '120 ทรัพย์', img: '/assets/asset-011.jpg' },
  { name: 'สาทร · สีลม', count: '86 ทรัพย์', img: '/assets/asset-001.jpg' },
  { name: 'รัชดา · ลาดพร้าว', count: '74 ทรัพย์', img: '/assets/asset-005.jpg' },
  { name: 'ริมแม่น้ำ', count: '52 ทรัพย์', img: '/assets/asset-002.jpg' },
];

// 3 ขั้น (Simple steps)
export interface DemoStep { no: string; title: string; desc: string; }
export const DEMO_STEPS: DemoStep[] = [
  { no: '01', title: 'บอกโจทย์ของคุณ', desc: 'บอกงบ ทำเล และไลฟ์สไตล์ที่ต้องการ — เราคัดทรัพย์ที่ใช่มาให้' },
  { no: '02', title: 'นัดชมทรัพย์', desc: 'เลือกวันสะดวก ทีมงานพาชมจริง พร้อมให้คำแนะนำตรงไปตรงมา' },
  { no: '03', title: 'ปิดดีล·รับกุญแจ', desc: 'ดูแลสัญญา เอกสาร และการโอน จนคุณเข้าอยู่ได้อย่างสบายใจ' },
];

// เสียงจากลูกค้า (Testimonials) — ⚠️ placeholder รอเจ้าของแทนด้วยรีวิวจริง
export interface DemoTestimonial { quote: string; name: string; role: string; }
export const DEMO_TESTIMONIALS: DemoTestimonial[] = [
  { quote: 'ทีมงานคัดทรัพย์ตรงโจทย์มาก ไม่ต้องเสียเวลาดูหลายที่ ได้คอนโดที่ชอบในสัปดาห์เดียว', name: 'ณิชา ป.', role: 'ผู้เช่า · คอนโดสุขุมวิท' },
  { quote: 'ปล่อยเช่าบ้านผ่าน Notify ได้ผู้เช่าเร็ว ดูแลเอกสารให้ครบ ไม่ต้องกังวลเรื่องจุกจิก', name: 'สมชาย ว.', role: 'เจ้าของทรัพย์' },
  { quote: 'ให้คำปรึกษาการลงทุนดีมาก มองภาพทำเลและผลตอบแทนให้ชัด ตัดสินใจซื้อได้มั่นใจ', name: 'อรุณี ก.', role: 'นักลงทุน' },
];

// ความรู้·อัปเดต (Insights) — ⚠️ placeholder · โครง Findit "Insights & Updates"
export interface DemoArticle { slug: string; category: string; title: string; date: string; img: string; }
export const DEMO_ARTICLES: DemoArticle[] = [
  { slug: 'rent-checklist', category: 'คู่มือผู้เช่า', title: 'เช็กลิสต์ก่อนเซ็นสัญญาเช่า ที่มือใหม่มักลืม', date: '10 ส.ค. 2026', img: '/assets/asset-004.jpg' },
  { slug: 'sell-timing', category: 'เจ้าของทรัพย์', title: 'จังหวะไหนควรปล่อยขาย·ปล่อยเช่าให้ได้ราคาดี', date: '2 ส.ค. 2026', img: '/assets/asset-007.jpg' },
  { slug: 'invest-2026', category: 'การลงทุน', title: 'ทำเลน่าลงทุนปี 2026 ที่ผลตอบแทนยังน่าสนใจ', date: '28 ก.ค. 2026', img: '/assets/asset-010.png' },
];

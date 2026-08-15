// Demo property data (Phase 1) — static · เนื้อหา Notify (ไทย · ฿)
// Phase 2+ ค่อยต่อ API จริง · รูปใช้ asset ที่โหลดจาก template
// pixel-clone Findit (STAGE1 · เนื้อหา Findit เดิม) — การ์ดทรัพย์ rich (Fresh + หน้า /property)
export type PropertyCategory = 'Apartments' | 'Condos' | 'Houses' | 'Villas';
export const CATEGORIES: PropertyCategory[] = ['Apartments', 'Condos', 'Houses', 'Villas'];

export interface DemoProperty {
  slug: string;
  name: string;
  location: string;
  price: string; // format พร้อมแสดง ($)
  deal: 'rent' | 'sale';
  category: PropertyCategory;
  beds: number;
  baths: number;
  area: number; // Sqft
  agent: string; // นายหน้า
  img: string;
}

export const DEMO_PROPERTIES: DemoProperty[] = [
  { slug: 'south-sunlight-apartment', name: 'South Sunlight Apartment', location: 'Staten Island', price: '$1,200', deal: 'rent', category: 'Apartments', beds: 4, baths: 2, area: 160, agent: 'Rachel Gray', img: '/assets/asset-001.jpg' },
  { slug: 'marble-house', name: 'Marble House', location: 'Queens', price: '$550,000', deal: 'sale', category: 'Houses', beds: 4, baths: 3, area: 250, agent: 'Steve Parker', img: '/assets/asset-011.jpg' },
  { slug: 'family-mansion', name: 'Family Mansion', location: 'Manhattan', price: '$2,200', deal: 'rent', category: 'Apartments', beds: 2, baths: 2, area: 150, agent: 'Rachel Gray', img: '/assets/asset-005.jpg' },
  { slug: 'urban-loft-condo', name: 'Urban Loft Condo', location: 'Brooklyn', price: '$1,800', deal: 'rent', category: 'Condos', beds: 2, baths: 1, area: 95, agent: 'Steve Parker', img: '/assets/asset-002.jpg' },
  { slug: 'hillside-villa', name: 'Hillside Villa', location: 'The Bronx', price: '$780,000', deal: 'sale', category: 'Villas', beds: 5, baths: 4, area: 320, agent: 'Rachel Gray', img: '/assets/asset-004.jpg' },
  { slug: 'cozy-studio-flat', name: 'Cozy Studio Flat', location: 'Manhattan', price: '$1,400', deal: 'rent', category: 'Apartments', beds: 1, baths: 1, area: 55, agent: 'Steve Parker', img: '/assets/asset-007.jpg' },
];

export const dealLabel = (d: DemoProperty['deal']) => (d === 'rent' ? 'Rent' : 'Sell');
export const priceSuffix = (_d: DemoProperty['deal']) => '';

// Agents (Meet the experts) — pixel-clone Findit · การ์ด monogram (ไม่มี asset รูปหน้า)
export interface DemoAgent { name: string; email: string; }
export const DEMO_AGENTS: DemoAgent[] = [
  { name: 'Steve Parker', email: 'steveparker@example.com' },
  { name: 'Rachel Gray', email: 'rachelgray@example.com' },
  { name: 'Maya Chen', email: 'mayachen@example.com' },
];

// Featured listings (Home bento) — pixel-clone Findit (STAGE1 · เนื้อหา Findit เดิม เพื่อ diff)
// การ์ดมินิมอล: รูป+ป้าย+ชื่อ+ที่อยู่ (ไม่มีราคา/specs ตาม Findit) · จะสลับ Notify/ไทยที่ STAGE2
export interface FeaturedListing {
  slug: string;
  name: string;
  address: string;
  img: string;
  category?: string; // ป้ายหมวด (ดำ) — เว้นว่าง = การ์ดกว้างแถวบน (ตาม Findit)
  deal?: string; // ป้ายดีล (ขาว)
  wide?: boolean; // การ์ดกว้าง 2 คอลัมน์
}
export const FEATURED_LISTINGS: FeaturedListing[] = [
  { slug: 'marble-house', name: 'Marble House', address: '161-03 84th Ave, Queens, NY 11432, USA Queens New York', img: '/assets/asset-011.jpg', wide: true },
  { slug: 'family-mansion', name: 'Family Mansion', address: '654 Water St, New York, NY 10002, USA Manhattan', img: '/assets/asset-005.jpg' },
  { slug: 'south-side-garden', name: 'South Side Garden', address: '161-03 84th Ave, Queens, NY 11432, USA Queens New York', img: '/assets/asset-002.jpg', category: 'Houses', deal: 'Sell' },
  { slug: 'modern-family-home', name: 'Modern Family Home', address: '654 Water St, New York, NY 10002, USA Manhattan', img: '/assets/asset-004.jpg', category: 'Apartments', deal: 'Rent' },
  { slug: 'rustic-forest-cabin', name: 'Rustic Forest Cabin', address: '1845 Tenbroeck Ave, The Bronx, NY 10461, USA The Bronx', img: '/assets/asset-007.jpg', category: 'Condos', deal: 'Rent' },
];

// ทำเล (Our location for you) — pixel-clone Findit (STAGE1 · เนื้อหา Findit เดิม)
// bento: 3 การ์ดแรกเท่ากัน + 2 การ์ดกว้างครึ่ง (wide) · การ์ด = รูป+ชื่อ+count ใต้รูป (ไม่มี overlay)
export interface DemoCity { name: string; count: string; img: string; wide?: boolean; }
export const DEMO_CITIES: DemoCity[] = [
  { name: 'Brooklyn', count: '3 Property', img: '/assets/asset-001.jpg' },
  { name: 'Manhattan', count: '4 Property', img: '/assets/asset-005.jpg' },
  { name: 'Queens', count: '6 Property', img: '/assets/asset-011.jpg' },
  { name: 'The Bronx', count: '4 Property', img: '/assets/asset-002.jpg', wide: true },
  { name: 'Staten Island', count: '4 Property', img: '/assets/asset-004.jpg', wide: true },
];

// 3 ขั้น (Steps timeline) — pixel-clone Findit (STAGE1 · เนื้อหา Findit เดิม)
export interface DemoStep { no: string; title: string; desc: string; }
export const DEMO_STEPS: DemoStep[] = [
  { no: '01', title: 'Discover', desc: 'We start by understanding your goals and lifestyle, then curate properties that match.' },
  { no: '02', title: 'Experience', desc: 'Guided viewings and expert insights help you explore the best options with confidence.' },
  { no: '03', title: 'Secure', desc: 'From negotiation to closing, we ensure a seamless, stress-free transaction.' },
];

// เสียงจากลูกค้า (Testimonials) — pixel-clone Findit · marquee 2 แถว · copy ทั่วไป (STAGE1) รอเจ้าของแทนรีวิวจริง
export interface DemoTestimonial { title: string; quote: string; name: string; }
export const DEMO_TESTIMONIALS: DemoTestimonial[] = [
  { title: 'A Seamless Journey', quote: 'Smooth and professional service. They guided us through every step and made buying our first home feel effortless.', name: 'Anna V.' },
  { title: 'Trusted Expertise', quote: 'Incredible knowledge of the market. They showed us the best options and secured a property beyond our expectations.', name: 'Lucas G.' },
  { title: 'Support You Can Rely On', quote: 'Truly dedicated and reliable. From the first meeting to closing, their support made the entire process stress-free.', name: 'Mia F.' },
  { title: 'Exceptional Service', quote: 'Every detail was handled with care. Their team made us feel confident and informed during the whole process.', name: 'David S.' },
  { title: 'Professional Guidance', quote: 'From property selection to closing, they provided clear advice and hands-on support every step of the way.', name: 'Sofia R.' },
  { title: 'Confident Decisions', quote: 'Their insights and market knowledge gave us confidence to invest wisely and choose a home we truly love.', name: 'James T.' },
  { title: 'Reliable Partner', quote: 'They were always available to answer questions and made sure the buying process was transparent and worry-free.', name: 'Olivia P.' },
  { title: 'Personalized Attention', quote: 'They took the time to understand exactly what we wanted and found a home that exceeded our expectations.', name: 'Noah K.' },
];

// ความรู้·อัปเดต (Insights & Updates) — pixel-clone Findit · การ์ด รูป+title+excerpt
// title/excerpt = copy ทั่วไป (STAGE1) รอเจ้าของแทนบทความจริง
export interface DemoArticle { slug: string; title: string; excerpt: string; img: string; }
export const DEMO_ARTICLES: DemoArticle[] = [
  { slug: 'natural-light-design', title: 'The Power of Natural Light in Architectural Design', excerpt: 'Natural light plays a crucial role in shaping architectural design, offering both aesthetic and functional benefits for modern homes.', img: '/assets/asset-004.jpg' },
  { slug: 'buying-vs-renting', title: 'Buying vs. Renting: Which Path Fits Your Life', excerpt: 'A clear look at the trade-offs between owning and renting, so you can choose the option that matches your goals and budget.', img: '/assets/asset-007.jpg' },
  { slug: 'smart-homes-future', title: 'The Future of Smart Homes and Interior Design', excerpt: 'The rise of smart homes is transforming the way we live, blending cutting-edge technology with thoughtful, comfortable design.', img: '/assets/asset-010.png' },
];

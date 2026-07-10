'use client';

import { createContext, useCallback, useContext, useEffect, useState } from 'react';

export type Lang = 'th' | 'en';

const DICT = {
  // header / nav
  searchProperties: { th: 'ค้นหาทรัพย์', en: 'Search' },
  contact: { th: 'ติดต่อเรา', en: 'Contact' },
  // hero
  heroLabel: { th: 'ROS REAL ESTATE', en: 'ROS REAL ESTATE' },
  heroTitle1: { th: 'หาบ้านเช่าที่ใช่', en: 'Find your perfect' },
  heroTitle2: { th: 'ในแบบที่คุณต้องการ', en: 'rental home' },
  heroSub: { th: 'คอนโด บ้าน ทาวน์โฮม อพาร์ทเมนท์ คัดสรรคุณภาพโดยทีมนายหน้ามืออาชีพ', en: 'Condos, houses, townhomes & apartments — curated by professional agents' },
  // search bar
  search: { th: 'ค้นหา', en: 'Search' },
  searchPlaceholder: { th: 'ค้นหา เช่น คอนโด อโศก สระว่ายน้ำ BTS…', en: 'Try: condo, Asoke, pool, BTS…' },
  filters: { th: 'ตัวกรอง', en: 'Filters' },
  applyFilters: { th: 'ใช้ตัวกรอง', en: 'Apply' },
  clearFilters: { th: 'ล้าง', en: 'Clear' },
  propertyType: { th: 'ประเภททรัพย์', en: 'Property type' },
  allTypes: { th: 'ทั้งหมด', en: 'All' },
  typeCondo: { th: 'คอนโด', en: 'Condo' },
  typeHouse: { th: 'บ้านเดี่ยว', en: 'House' },
  typeTownhome: { th: 'ทาวน์โฮม', en: 'Townhome' },
  typeApartment: { th: 'อพาร์ทเมนท์', en: 'Apartment' },
  provinceLabel: { th: 'จังหวัด', en: 'Province' },
  allProvinces: { th: 'ทุกจังหวัด', en: 'All provinces' },
  priceRange: { th: 'ช่วงราคา / เดือน', en: 'Price / month' },
  anyPrice: { th: 'ทุกราคา', en: 'Any price' },
  transitStation: { th: 'สถานีรถไฟ', en: 'Transit' },
  // featured
  featured: { th: 'ทรัพย์แนะนำ', en: 'Featured properties' },
  featuredSub: { th: 'คัดมาใหม่ล่าสุด', en: 'Newly listed' },
  viewAll: { th: 'ดูทั้งหมด', en: 'View all' },
  // หมวดทรัพย์เพิ่มเติม (หน้าแรก) — ใช้ระบบเดียวกับทรัพย์แนะนำ
  nearTransitSub: { th: 'เดินทางสะดวกด้วยรถไฟฟ้า BTS/MRT', en: 'Easy access by BTS & MRT' },
  petFriendlyTitle: { th: 'ทรัพย์เลี้ยงสัตว์ได้', en: 'Pet friendly' },
  petFriendlySub: { th: 'ที่พักที่อนุญาตให้เลี้ยงสัตว์', en: 'Homes that welcome pets' },
  noPublished: { th: 'ยังไม่มีทรัพย์ที่เผยแพร่ในขณะนี้', en: 'No published properties yet' },
  // browse / list
  browseTitle: { th: 'ค้นหาทรัพย์', en: 'Search properties' },
  found: { th: 'พบ', en: 'Found' },
  resultsUnit: { th: 'รายการ', en: 'results' },
  noResults: { th: 'ไม่พบทรัพย์ตามเงื่อนไข', en: 'No properties found' },
  noResultsHint: { th: 'ลองปรับตัวกรอง หรือติดต่อทีมงานเพื่อให้ช่วยหา', en: 'Try adjusting the filters or contact our team for help' },
  // card / spec labels
  perMonth: { th: '/เดือน', en: '/mo' },
  details: { th: 'รายละเอียด', en: 'Details' },
  amenities: { th: 'สิ่งอำนวยความสะดวก', en: 'Amenities' },
  location: { th: 'ทำเล', en: 'Location' },
  bedrooms: { th: 'ห้องนอน', en: 'Bedrooms' },
  bathrooms: { th: 'ห้องน้ำ', en: 'Bathrooms' },
  area: { th: 'พื้นที่', en: 'Area' },
  floor: { th: 'ชั้น', en: 'Floor' },
  sqmUnit: { th: 'ตร.ม.', en: 'sqm' },
  bedUnit: { th: 'นอน', en: 'bed' },
  nearTransit: { th: 'ใกล้รถไฟฟ้า', en: 'Near transit' },
  petFriendly: { th: 'เลี้ยงสัตว์ได้', en: 'Pet friendly' },
  lineInquiry: { th: 'สอบถามทาง LINE', en: 'Ask via LINE' },
  contactSales: { th: 'ติดต่อทีมขาย', en: 'Contact our team' },
  contactSalesSub: { th: 'สอบถามทรัพย์นี้กับทีมงานโดยตรง', en: 'Ask our team directly about this property' },
  similarProperties: { th: 'ทรัพย์ใกล้เคียง', en: 'Similar properties' },
  similarPropertiesSub: { th: 'ทรัพย์ที่คล้ายกับที่คุณกำลังดู', en: 'Properties similar to this one' },
  // appointment form
  bookViewing: { th: 'นัดดูทรัพย์', en: 'Book a viewing' },
  bookViewingSub: { th: 'กรอกข้อมูลเพื่อให้ทีมงานติดต่อกลับ', en: 'Leave your details and our team will get back to you' },
  trustReply24: { th: 'ทีมงานตอบกลับภายใน 24 ชม.', en: 'Our team replies within 24 hours' },
  trustFreeNoObligation: { th: 'นัดชมฟรี ไม่มีข้อผูกมัด', en: 'Free viewing, no obligation' },
  successTitle: { th: 'ได้รับข้อมูลแล้ว', en: 'Request received' },
  successSub: { th: 'ทีมงานจะติดต่อกลับโดยเร็วที่สุด ขอบคุณครับ', en: 'Our team will contact you shortly. Thank you!' },
  fieldName: { th: 'ชื่อ-นามสกุล', en: 'Full name' },
  namePlaceholder: { th: 'เช่น สมชาย ใจดี', en: 'e.g. John Doe' },
  fieldPhone: { th: 'เบอร์โทร', en: 'Phone' },
  fieldDatetime: { th: 'วันเวลาที่สะดวกเข้าชม', en: 'Preferred viewing time' },
  datetimeHint: { th: 'ไม่ระบุก็ได้ — ทีมงานจะนัดเวลาที่สะดวกให้', en: 'Optional — we will arrange a convenient time' },
  fieldMessage: { th: 'ข้อความเพิ่มเติม', en: 'Message' },
  messagePlaceholder: { th: 'วันเวลาที่สะดวก หรือสิ่งที่อยากสอบถาม', en: 'Preferred time or anything you would like to ask' },
  consentPre: { th: 'ยอมรับ', en: 'I accept the ' },
  consentPolicy: { th: 'นโยบายความเป็นส่วนตัว', en: 'privacy policy' },
  consentPost: { th: ' และยินยอมให้ติดต่อกลับ', en: ' and consent to being contacted' },
  submitRequest: { th: 'ส่งคำขอนัด', en: 'Send request' },
  sending: { th: 'กำลังส่ง…', en: 'Sending…' },
  errName: { th: 'กรุณากรอกชื่อ-นามสกุล', en: 'Please enter your full name' },
  errPhone: { th: 'กรุณากรอกเบอร์โทร', en: 'Please enter your phone number' },
  errPhone10: { th: 'เบอร์โทรต้องมี 10 หลัก', en: 'Phone number must be 10 digits' },
  errConsent: { th: 'กรุณายอมรับนโยบายความเป็นส่วนตัวก่อน', en: 'Please accept the privacy policy first' },
  errSend: { th: 'ส่งไม่สำเร็จ', en: 'Failed to send' },
  // favorites / saved
  saved: { th: 'รายการโปรด', en: 'Saved' },
  savedSub: { th: 'ทรัพย์ที่คุณบันทึกไว้ดูภายหลัง', en: 'Properties you saved for later' },
  savedEmpty: { th: 'ยังไม่มีรายการโปรด', en: 'No saved properties yet' },
  savedEmptyHint: { th: 'กดรูปหัวใจบนการ์ดทรัพย์ เพื่อบันทึกไว้ดูภายหลัง', en: 'Tap the heart on any property to save it for later' },
  browseAll: { th: 'ดูทรัพย์ทั้งหมด', en: 'Browse all properties' },
  saveAria: { th: 'บันทึกเข้ารายการโปรด', en: 'Save to favorites' },
  unsaveAria: { th: 'นำออกจากรายการโปรด', en: 'Remove from favorites' },
  photosUnit: { th: 'รูป', en: 'photos' },
  viewAllPhotos: { th: 'ดูรูปทั้งหมด', en: 'View all photos' },
  // bottom-nav (mobile)
  navHome: { th: 'หน้าแรก', en: 'Home' },
  navSaved: { th: 'โปรด', en: 'Saved' },
  navContact: { th: 'ติดต่อ', en: 'Contact' },
  // home: popular quick-search chips
  popularLabel: { th: 'ยอดนิยม', en: 'Popular' },
  chipNearBts: { th: 'ใกล้ BTS', en: 'Near BTS' },
  chipNearMrt: { th: 'ใกล้ MRT', en: 'Near MRT' },
  chipUnder15k: { th: 'ต่ำกว่า ฿15,000', en: 'Under ฿15,000' },
  // home: why-ROS trust band
  trustCurated: { th: 'คัดสรรคุณภาพ', en: 'Curated quality' },
  trustPro: { th: 'นายหน้ามืออาชีพ', en: 'Professional agents' },
  trustFast: { th: 'ตอบกลับไว', en: 'Fast response' },
  trustFreeViewing: { th: 'นัดชมฟรี', en: 'Free viewings' },
  // home: how it works (3 steps)
  howItWorksTitle: { th: 'เช่าง่ายใน 3 ขั้นตอน', en: 'Rent in 3 simple steps' },
  howItWorksSub: { th: 'ตั้งแต่ค้นหาจนถึงย้ายเข้า ทีมงานดูแลให้ทุกขั้นตอน', en: 'From search to move-in, our team guides you all the way' },
  step1Title: { th: 'ค้นหา', en: 'Search' },
  step1Sub: { th: 'เลือกทรัพย์ที่ใช่จากรายการคัดสรร', en: 'Browse curated listings that fit you' },
  step2Title: { th: 'นัดชม', en: 'Book a viewing' },
  step2Sub: { th: 'นัดเวลาเข้าชมกับทีมงานมืออาชีพ', en: 'Schedule a visit with our team' },
  step3Title: { th: 'ย้ายเข้า', en: 'Move in' },
  step3Sub: { th: 'เซ็นสัญญาแล้วรับกุญแจได้เลย', en: 'Sign the lease and get your keys' },
} satisfies Record<string, { th: string; en: string }>;

export type DictKey = keyof typeof DICT;

/** ป้ายชื่อประเภททรัพย์ (สองภาษา) — ใช้ร่วมทั้งระบบ */
export const TYPE_LABELS: Record<string, { th: string; en: string }> = {
  condo: { th: 'คอนโด', en: 'Condo' },
  house: { th: 'บ้านเดี่ยว', en: 'House' },
  townhome: { th: 'ทาวน์โฮม', en: 'Townhome' },
  apartment: { th: 'อพาร์ทเมนท์', en: 'Apartment' },
};

/** ป้ายชื่อสิ่งอำนวยความสะดวก (สองภาษา) */
export const AMENITY_LABELS: Record<string, { th: string; en: string }> = {
  pool: { th: 'สระว่ายน้ำ', en: 'Pool' },
  gym: { th: 'ฟิตเนส', en: 'Gym' },
  parking: { th: 'ที่จอดรถ', en: 'Parking' },
  security: { th: 'รปภ. 24 ชม.', en: '24h Security' },
  cctv: { th: 'กล้องวงจรปิด', en: 'CCTV' },
  keycard: { th: 'คีย์การ์ด', en: 'Keycard' },
  near_bts: { th: 'ใกล้ BTS', en: 'Near BTS' },
  near_mrt: { th: 'ใกล้ MRT', en: 'Near MRT' },
  pet_friendly: { th: 'เลี้ยงสัตว์ได้', en: 'Pet friendly' },
  garden: { th: 'สวน', en: 'Garden' },
  co_working: { th: 'Co-Working', en: 'Co-Working' },
  sauna: { th: 'ซาวน่า', en: 'Sauna' },
  playground: { th: 'สนามเด็กเล่น', en: 'Playground' },
  shuttle: { th: 'รถรับส่ง', en: 'Shuttle' },
};

interface Ctx { lang: Lang; setLang: (l: Lang) => void; t: (k: DictKey) => string; }
const LangCtx = createContext<Ctx>({ lang: 'th', setLang: () => {}, t: (k) => DICT[k]?.th ?? k });

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>('th');
  useEffect(() => { const s = localStorage.getItem('lang'); if (s === 'en' || s === 'th') setLangState(s); }, []);
  const setLang = useCallback((l: Lang) => { setLangState(l); localStorage.setItem('lang', l); }, []);
  const t = useCallback((k: DictKey) => DICT[k]?.[lang] ?? DICT[k]?.th ?? String(k), [lang]);
  return <LangCtx.Provider value={{ lang, setLang, t }}>{children}</LangCtx.Provider>;
}

export const useLang = () => useContext(LangCtx);

/** เลือกค่าตามภาษา (fallback → th) */
export function pick(v: { th: string | null; en: string | null }, lang: Lang): string {
  return (lang === 'en' ? v.en : v.th) || v.th || v.en || '';
}

/** ป้ายชื่อประเภท/สิ่งอำนวยฯ ตามภาษา (fallback → code) */
export function typeLabel(code: string, lang: Lang): string {
  return TYPE_LABELS[code]?.[lang] ?? TYPE_LABELS[code]?.th ?? code;
}
export function amenityLabel(code: string, lang: Lang): string {
  return AMENITY_LABELS[code]?.[lang] ?? AMENITY_LABELS[code]?.th ?? code;
}

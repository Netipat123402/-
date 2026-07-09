import Link from 'next/link';
import { publicGet, PUBLIC_PROPERTIES_TAG, type PropertyCard } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import CommunityBoard from '@/components/CommunityBoard';
import { Icon, type IconName } from '@/components/Icon';
import { T } from '@/components/T';

// ตึกสูง (คอนโด/อพาร์ทเมนท์) vs บ้าน (บ้านเดี่ยว/ทาวน์โฮม)
const TYPE_ICON: Record<string, IconName> = { condo: 'building', apartment: 'building', house: 'home', townhome: 'home' };
// ลำดับหมวด + คีย์แปลภาษา (ดึงจาก dict กลาง — แปลครบทั้ง TH/EN)
const TYPE_SHORTCUTS = [
  { code: 'condo', k: 'typeCondo' }, { code: 'house', k: 'typeHouse' },
  { code: 'townhome', k: 'typeTownhome' }, { code: 'apartment', k: 'typeApartment' },
] as const;

export const revalidate = 300;

// ฟีเจอร์ชุมชน ROS — ปิดชั่วคราวจากหน้า public (ผู้ใช้ขอจัดระบบก่อน 2026-06-26); เปลี่ยนเป็น true เพื่อเปิดคืน
const SHOW_COMMUNITY = false;

export default async function HomePage() {
  // หมวดทรัพย์หน้าแรก — ใช้ระบบเดียวกับ "ทรัพย์แนะนำ" (carousel) แต่คนละหัวข้อ/ตัวกรอง
  const [feat, newest, bts, mrt, pet] = await Promise.all([
    publicGet<PropertyCard[]>('/public/properties?limit=12&featured=true', 300, [PUBLIC_PROPERTIES_TAG]), // แอดมินกดดาว
    publicGet<PropertyCard[]>('/public/properties?limit=12&sort=newest', 300, [PUBLIC_PROPERTIES_TAG]),    // fallback
    publicGet<PropertyCard[]>('/public/properties?limit=12&train=near_bts', 300, [PUBLIC_PROPERTIES_TAG]),
    publicGet<PropertyCard[]>('/public/properties?limit=12&train=near_mrt', 300, [PUBLIC_PROPERTIES_TAG]),
    publicGet<PropertyCard[]>('/public/properties?limit=12&amenity=pet_friendly', 300, [PUBLIC_PROPERTIES_TAG]),
  ]);
  // ทรัพย์แนะนำ = ที่แอดมินกดดาว · ถ้ายังไม่กดเลย → ใช้ใหม่ล่าสุด (กันหน้าโล่ง)
  const items = (feat.data && feat.data.length > 0) ? feat.data : (newest.data ?? []);
  const btsItems = bts.data ?? [];
  const mrtItems = mrt.data ?? [];
  const petItems = pet.data ?? [];

  return (
    <main>
      {/* Hero — หัวข้ออยู่กึ่งกลาง เหนือช่องค้นหา (ตามที่ขอ) · luxury minimal */}
      <section className="bg-gradient-to-b from-ink to-ink-soft px-4 pb-24 pt-16 text-center text-white lg:px-8 lg:pb-28 lg:pt-24">
        <div className="mx-auto max-w-content">
          <p className="text-sm font-medium tracking-wide text-gold-light"><T k="heroLabel" /></p>
          <h1 className="mx-auto mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">
            <T k="heroTitle1" /><br /><T k="heroTitle2" />
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-white/70">
            <T k="heroSub" />
          </p>
        </div>
      </section>

      {/* Search (overlap hero) */}
      <div className="mx-auto -mt-12 max-w-content px-4 lg:px-8">
        <SearchBar />
      </div>

      {/* Type shortcuts */}
      <section className="mx-auto max-w-content px-4 py-10 lg:px-8">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {TYPE_SHORTCUTS.map(({ code, k }) => (
            <Link key={code} href={`/properties?type=${code}`}
              className="card group flex flex-col items-center gap-2.5 py-6 text-center font-medium text-ink-soft transition hover:border-gold hover:text-ink hover:shadow-lift">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-gold-dark transition group-hover:bg-gold/10">
                <Icon name={TYPE_ICON[code] ?? 'building'} size={22} />
              </span>
              <T k={k} />
            </Link>
          ))}
        </div>
      </section>

      {/* หมวดทรัพย์ — ทรัพย์แนะนำ + ติด BTS/MRT + เลี้ยงสัตว์ได้ (แสดงเฉพาะหมวดที่มีทรัพย์) */}
      <div className="mx-auto max-w-content space-y-14 px-4 pb-16 lg:px-8">
        {items.length === 0 ? (
          <p className="card px-6 py-16 text-center text-muted"><T k="noPublished" /></p>
        ) : (
          <FeaturedCarousel items={items} />
        )}
        {btsItems.length > 0 && (
          <FeaturedCarousel items={btsItems} titleKey="nearBts" subKey="nearBtsSub" viewAllHref="/properties?train=near_bts" size="sm" />
        )}
        {mrtItems.length > 0 && (
          <FeaturedCarousel items={mrtItems} titleKey="nearMrt" subKey="nearMrtSub" viewAllHref="/properties?train=near_mrt" size="sm" />
        )}
        {petItems.length > 0 && (
          <FeaturedCarousel items={petItems} titleKey="petFriendlyTitle" subKey="petFriendlySub" viewAllHref="/properties?amenity=pet_friendly" size="sm" />
        )}
      </div>

      {/* ชุมชน ROS — กระดานประกาศไม่ระบุตัวตน (Phase 14)
          ซ่อนชั่วคราวจากหน้า public ตามคำขอผู้ใช้ (2026-06-26) — ยังไม่ลบ backend/คอมโพเนนต์
          เปิดคืน: เปลี่ยน SHOW_COMMUNITY เป็น true */}
      {SHOW_COMMUNITY && (
        <div className="border-t border-border bg-canvas/40">
          <CommunityBoard />
        </div>
      )}
    </main>
  );
}

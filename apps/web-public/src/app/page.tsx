import Link from 'next/link';
import { publicGet, PUBLIC_PROPERTIES_TAG, type PropertyCard } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import CommunityBoard from '@/components/CommunityBoard';
import { Icon, type IconName } from '@/components/Icon';
import { T } from '@/components/T';
import type { DictKey } from '@/lib/lang';

// ตึกสูง (คอนโด/อพาร์ทเมนท์) vs บ้าน (บ้านเดี่ยว/ทาวน์โฮม)
const TYPE_ICON: Record<string, IconName> = { condo: 'building', apartment: 'building', house: 'home', townhome: 'home' };
// ลำดับหมวด + คีย์แปลภาษา (ดึงจาก dict กลาง — แปลครบทั้ง TH/EN)
const TYPE_SHORTCUTS = [
  { code: 'condo', k: 'typeCondo' }, { code: 'house', k: 'typeHouse' },
  { code: 'townhome', k: 'typeTownhome' }, { code: 'apartment', k: 'typeApartment' },
] as const;

// ชิปค้นหายอดนิยม — ทางลัดกดเดียวไป listings ที่ filter ไว้ (Information Scent)
// เลือก "ตัวกรองที่การ์ดหมวดด้านล่างทำไม่ได้" (รถไฟ/ราคา/สัตว์เลี้ยง) → ไม่ซ้ำกับ type-shortcut cards
const POPULAR: { href: string; k: DictKey; icon?: IconName }[] = [
  { href: '/properties?train=near_bts', k: 'chipNearBts', icon: 'train' },
  { href: '/properties?train=near_mrt', k: 'chipNearMrt', icon: 'train' },
  { href: '/properties?amenity=pet_friendly', k: 'petFriendly', icon: 'paw' },
  { href: '/properties?maxRent=15000', k: 'chipUnder15k' },
];
// แถบความน่าเชื่อถือ — คุณค่าที่ธุรกิจยืนยันได้จริง (ไม่มีตัวเลขปลอม)
const TRUST: { icon: IconName; k: DictKey }[] = [
  { icon: 'check', k: 'trustCurated' },
  { icon: 'users', k: 'trustPro' },
  { icon: 'clock', k: 'trustFast' },
  { icon: 'calendar', k: 'trustFreeViewing' },
];
// ขั้นตอนใช้งาน 3 สเต็ป — ลดความกังวลลูกค้าใหม่ (ค้นหา → นัดชม → ย้ายเข้า)
const STEPS: { n: number; icon: IconName; tk: DictKey; sk: DictKey }[] = [
  { n: 1, icon: 'search', tk: 'step1Title', sk: 'step1Sub' },
  { n: 2, icon: 'calendar', tk: 'step2Title', sk: 'step2Sub' },
  { n: 3, icon: 'key', tk: 'step3Title', sk: 'step3Sub' },
];

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
      {/* Hero — ดาร์กพรีเมียม: gold spotlight glow + กริดสถาปัตย์จาง (fade ขอบ) · depth ระดับ Linear/Vercel · luxury minimal */}
      <section className="relative overflow-hidden bg-ink px-4 pb-24 pt-16 text-center text-white lg:px-8 lg:pb-28 lg:pt-24">
        {/* spotlight ทองนุ่มด้านบน — โฟกัสหัวข้อ อบอุ่น พรีเมียม */}
        <div aria-hidden className="pointer-events-none absolute inset-0"
          style={{ background: 'radial-gradient(70% 90% at 50% -10%, rgba(200,169,106,0.28), transparent 60%)' }} />
        {/* กริดสถาปัตย์จาง — depth ไม่รก (mask ให้เข้มบน-จางล่าง) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '56px 56px', WebkitMaskImage: 'radial-gradient(80% 80% at 50% 0%, #000, transparent 75%)', maskImage: 'radial-gradient(80% 80% at 50% 0%, #000, transparent 75%)' }} />
        <div className="relative mx-auto max-w-content">
          <p className="text-sm font-medium tracking-wide text-gold-light"><T k="heroLabel" /></p>
          <h1 className="mx-auto mt-3 max-w-3xl font-serif text-4xl font-semibold leading-tight tracking-tight lg:text-5xl">
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
        {/* ชิปยอดนิยม — เริ่มค้นหาไวด้วยคลิกเดียว (info scent) */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-muted"><T k="popularLabel" /></span>
          {POPULAR.map((c) => (
            <Link key={c.href} href={c.href}
              className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3.5 py-1.5 text-sm text-ink-soft transition hover:border-gold hover:text-ink hover:shadow-lift">
              {c.icon && <Icon name={c.icon} size={14} className="text-gold-dark/70" />}
              <T k={c.k} />
            </Link>
          ))}
        </div>
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

      {/* Why ROS — แถบความน่าเชื่อถือ (trust → conversion) */}
      <section className="border-y border-border bg-canvas/40">
        <div className="mx-auto grid max-w-content grid-cols-2 gap-x-4 gap-y-6 px-4 py-10 sm:grid-cols-4 lg:px-8">
          {TRUST.map((it) => (
            <div key={it.k} className="flex flex-col items-center gap-2 text-center sm:flex-row sm:gap-3 sm:text-left">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/10 text-gold-dark">
                <Icon name={it.icon} size={20} />
              </span>
              <span className="text-sm font-medium text-ink-soft"><T k={it.k} /></span>
            </div>
          ))}
        </div>
      </section>

      {/* ขั้นตอนใช้งาน 3 สเต็ป — ค้นหา → นัดชม → ย้ายเข้า */}
      <section className="mx-auto max-w-content px-4 py-16 lg:px-8">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-semibold tracking-tight lg:text-3xl"><T k="howItWorksTitle" /></h2>
          <p className="mx-auto mt-2 max-w-lg text-muted"><T k="howItWorksSub" /></p>
        </div>
        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.n} className="card flex flex-col items-center px-6 py-8 text-center">
              <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-canvas text-gold-dark">
                <Icon name={s.icon} size={24} />
                <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">{s.n}</span>
              </span>
              <h3 className="mt-4 font-semibold"><T k={s.tk} /></h3>
              <p className="mt-1.5 text-sm text-muted"><T k={s.sk} /></p>
            </div>
          ))}
        </div>
      </section>

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

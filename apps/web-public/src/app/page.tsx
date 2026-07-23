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
  // รวม BTS+MRT เป็น "ใกล้รถไฟฟ้า" แถวเดียว (ลดแถวซ้ำ 4→3) — dedupe ตาม id, คงลำดับ BTS ก่อน
  const transitItems = [...(bts.data ?? []), ...(mrt.data ?? [])]
    .filter((p, i, arr) => arr.findIndex((x) => x.id === p.id) === i)
    .slice(0, 12);
  const petItems = pet.data ?? [];

  return (
    <main>
      {/* Hero — Editorial Dark (แบบ A): spotlight ทอง + กริดจาง · search = พระเอกกลาง · ตัวกรอง/ชิป เงียบใต้ (§8c)
          B-ready: สลับเป็น photo hero ภายหลัง = แทนพื้น bg-ink + 2 บล็อก glow/grid ด้วย <Image> ทรัพย์ + overlay มืด */}
      <section className="relative bg-ink px-4 pb-16 pt-16 text-center text-white lg:px-8 lg:pb-20 lg:pt-24">
        {/* พื้นหลังตกแต่ง — overflow-hidden ห่อเฉพาะชั้นนี้ (ไม่ใส่ที่ section มิฉะนั้น dropdown ตัวกรองจะโดน clip ตกกรอบ) */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* spotlight ทองนุ่มด้านบน — โฟกัสหัวข้อ อบอุ่น พรีเมียม */}
          <div className="absolute inset-0"
            style={{ background: 'radial-gradient(70% 90% at 50% -10%, rgba(200,169,106,0.28), transparent 60%)' }} />
          {/* กริดสถาปัตย์จาง — depth ไม่รก (mask ให้เข้มบน-จางล่าง) */}
          <div className="absolute inset-0 opacity-[0.05]"
            style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.7) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.7) 1px, transparent 1px)', backgroundSize: '56px 56px', WebkitMaskImage: 'radial-gradient(80% 80% at 50% 0%, #000, transparent 75%)', maskImage: 'radial-gradient(80% 80% at 50% 0%, #000, transparent 75%)' }} />
        </div>
        <div className="relative mx-auto max-w-content">
          {/* เข้าจอ fade-rise เบา ๆ ไล่ลำดับ (stagger) — animate-fade-rise เคารพ prefers-reduced-motion อยู่แล้ว */}
          <p className="animate-fade-rise text-sm font-medium tracking-wide text-gold-light"><T k="heroLabel" /></p>
          <h1 className="animate-fade-rise mx-auto mt-3 max-w-3xl text-4xl font-semibold leading-tight tracking-tight lg:text-5xl" style={{ animationDelay: '70ms' }}>
            <T k="heroTitle1" /><br /><T k="heroTitle2" />
          </h1>
          <p className="animate-fade-rise mx-auto mt-4 max-w-xl text-white/70" style={{ animationDelay: '140ms' }}>
            <T k="heroSub" />
          </p>
          {/* Search เต็มแถว (การ์ดลอย) + ตัวกรอง/ชิปยอดนิยม เงียบใต้ */}
          <div className="animate-fade-rise mx-auto mt-8 max-w-2xl" style={{ animationDelay: '210ms' }}>
            <SearchBar hero chips={<>
              <span className="hidden text-xs font-medium uppercase tracking-wide text-white/40 sm:inline"><T k="popularLabel" /></span>
              {POPULAR.map((c) => (
                <Link key={c.href} href={c.href}
                  className="inline-flex items-center gap-1.5 text-sm text-white/60 transition hover:text-white">
                  {c.icon && <Icon name={c.icon} size={14} className="text-gold-light/70" />}
                  <T k={c.k} />
                </Link>
              ))}
            </>} />
          </div>
        </div>
      </section>

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
        {transitItems.length > 0 && (
          <FeaturedCarousel items={transitItems} titleKey="nearTransit" subKey="nearTransitSub" viewAllHref="/properties?train=near_bts" size="sm" />
        )}
        {petItems.length > 0 && (
          <FeaturedCarousel items={petItems} titleKey="petFriendlyTitle" subKey="petFriendlySub" viewAllHref="/properties?amenity=pet_friendly" size="sm" />
        )}
      </div>

      {/* Why ROS — trust bar กระชับ กลาง มีเส้นคั่น (มือถือ wrap 2×2 · sm+ แถวเดียวกลาง) */}
      <section className="border-y border-border">
        <div className="mx-auto flex max-w-content flex-wrap items-center justify-center gap-y-3 px-4 py-6 lg:px-8">
          {TRUST.map((it, i) => (
            <div key={it.k} className="flex items-center">
              {i > 0 && <span aria-hidden className="mx-4 hidden h-3.5 w-px bg-border sm:block lg:mx-6" />}
              <span className="flex items-center gap-2 px-2 sm:px-0">
                <Icon name={it.icon} size={16} className="shrink-0 text-gold-dark" />
                <span className="whitespace-nowrap text-sm text-ink-soft"><T k={it.k} /></span>
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ขั้นตอนใช้งาน 3 สเต็ป — D · Editorial เส้นทอง (STEP 0X + เส้นทองซ้าย · มือถือเรียงลง · sm+ 3 คอลัมน์) */}
      <section className="mx-auto max-w-content px-4 py-16 lg:px-8">
        <div className="text-center">
          <h2 className="text-2xl font-semibold tracking-tight lg:text-3xl"><T k="howItWorksTitle" /></h2>
          <p className="mx-auto mt-2 max-w-lg text-muted"><T k="howItWorksSub" /></p>
        </div>
        <div className="mt-10 grid gap-8 sm:grid-cols-3 sm:gap-7">
          {STEPS.map((s) => (
            <div key={s.n} className="border-l-2 border-gold/60 pl-4 sm:pl-5">
              <p className="text-xs font-semibold uppercase tracking-widest text-gold-dark">STEP {String(s.n).padStart(2, '0')}</p>
              <div className="mt-2 flex items-center gap-2">
                <Icon name={s.icon} size={18} className="shrink-0 text-gold-dark" />
                <h3 className="font-semibold"><T k={s.tk} /></h3>
              </div>
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

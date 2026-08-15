import Link from 'next/link';
import FeaturedCard from '@/components/FeaturedCard';
import PropertyCard from '@/components/PropertyCard';
import {
  FEATURED_LISTINGS, DEMO_PROPERTIES, DEMO_CITIES, DEMO_STEPS, DEMO_TESTIMONIALS, DEMO_ARTICLES,
} from '@/lib/demo';

const IStar = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
  </svg>
);
const ICheck = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
);
const ICheckSm = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
);
const ITarget = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" /></svg>
);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{children}</p>;
}

// ป้าย benefit ลอยบน collage (Findit) — pill ขาว + ✓ วงกลมดำ · ตำแหน่งส่งผ่าน className (absolute + %)
function Benefit({ label, className }: { label: string; className: string }) {
  return (
    <span className={`absolute inline-flex items-center gap-2 whitespace-nowrap rounded-pill bg-white py-2 pl-2 pr-4 text-[13px] font-normal text-ink shadow-[3px_3px_12px_rgba(0,0,0,0.08)] sm:py-2.5 sm:text-[15px] ${className}`}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">{ICheckSm}</span>
      {label}
    </span>
  );
}

// 3 การ์ดเลข (Findit "OUR BENEFITS") — STAGE1 เนื้อหา Findit เดิม
const ABOUT_BENEFITS = [
  { no: '01', title: 'Buy a new home', desc: 'Discover your dream home effortlessly. Explore diverse properties and expert guidance for a seamless buying experience.' },
  { no: '02', title: 'Rent a home', desc: 'Discover your perfect rental effortlessly. Explore a diverse variety of listings tailored precisely to suit your unique lifestyle needs.' },
  { no: '03', title: 'Sell a home', desc: "Sell confidently with expert guidance and effective strategies, showcasing your property's best features for a successful sale." },
];

export default function Home() {
  return (
    <>
      {/* HERO — pixel-clone Findit (STAGE1 · EN) · centered: badge → H1 72/600 → subtext → 2 ปุ่ม → รูปกว้าง */}
      <section className="wrap flex flex-col items-center pt-20 text-center md:pt-24">
        <span className="inline-flex items-center gap-2 rounded-pill bg-white py-1 pl-2 pr-4 text-base font-normal text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">{IStar}</span>
          Your trusted partner in real estate
        </span>
        <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[56px] md:text-[72px]">
          Your dream home,<br />just a step away
        </h1>
        <p className="mt-6 max-w-[500px] text-lg leading-relaxed text-body">
          Discover handpicked properties that match your lifestyle, whether you&rsquo;re buying, selling, or investing.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/property" className="inline-flex items-center justify-center rounded-pill bg-ink px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">Explore properties</Link>
          <Link href="/contact" className="inline-flex items-center justify-center rounded-pill border border-ink bg-white px-4 py-2.5 text-[15px] font-semibold text-ink transition hover:bg-ink hover:text-white">Book a visit</Link>
        </div>
        <div className="mt-14 w-full overflow-hidden rounded-card md:mt-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/asset-001.jpg" alt="Premium real estate interior" className="aspect-[16/10] w-full object-cover md:aspect-[16/9]" />
        </div>
      </section>

      {/* FEATURED — pixel-clone Findit "Explore our featured listings" · bento 3-col (การ์ดแรกกว้าง 2) */}
      <section className="wrap py-20 md:py-28">
        <h2 className="max-w-2xl text-[30px] font-medium leading-tight sm:text-[42px]">Explore our featured listings</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURED_LISTINGS.map((p) => <FeaturedCard key={p.slug} p={p} />)}
        </div>
      </section>

      {/* ABOUT — pixel-clone Findit "OUR BENEFITS" · collage (% positioning) + 3 การ์ดเลข */}
      <section className="bg-soft">
        <div className="wrap grid items-center gap-14 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
          {/* LEFT — image collage + floating benefit pills */}
          <div className="relative mx-auto w-full max-w-[550px]">
            <div className="relative w-full pb-[150%]">
              {/* main tall image */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/asset-007.jpg" alt="" className="absolute left-[7.5%] top-[10%] h-[80%] w-[85%] rounded-[10px] object-cover" />
              {/* top-right */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/asset-001.jpg" alt="" className="absolute right-0 top-0 h-[28.5%] w-[45%] rounded-[10px] object-cover shadow-lg" />
              {/* bottom-left */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/assets/asset-004.jpg" alt="" className="absolute bottom-0 left-0 h-[28.5%] w-[45%] rounded-[10px] object-cover shadow-lg" />
              {/* floating pills */}
              <Benefit label="Trusted Expertise" className="left-[33%] top-[7%]" />
              <Benefit label="Tailored to You" className="left-0 top-[29%]" />
              <Benefit label="Seamless Process" className="left-[54%] top-[40%]" />
              <Benefit label="Strong Market Insights" className="left-0 top-[60%]" />
              <Benefit label="After-Sales Support" className="left-[28%] top-[87%]" />
            </div>
          </div>

          {/* RIGHT — content */}
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>Our Benefits
            </p>
            <h2 className="mt-4 text-[30px] font-medium leading-[1.15] sm:text-[42px]">Building dreams, one home at a time</h2>
            <p className="mt-5 max-w-[520px] text-base leading-relaxed text-body">
              Our mission goes beyond real estate &mdash; it&rsquo;s about guiding you through one of life&rsquo;s biggest milestones with heart, expertise, and unwavering commitment.
            </p>
            <div className="mt-8 space-y-4">
              {ABOUT_BENEFITS.map((b) => (
                <div key={b.no} className="flex gap-4 rounded-[10px] bg-white p-5 shadow-[0_4px_24px_rgba(0,0,0,0.04)]">
                  <span className="shrink-0 text-[28px] font-medium leading-none text-ink">{b.no}.</span>
                  <div>
                    <h3 className="text-[22px] font-medium leading-snug text-ink">{b.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-body">{b.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/about" className="mt-8 inline-flex items-center justify-center rounded-pill bg-ink px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">More about us</Link>
          </div>
        </div>
      </section>

      {/* CITIES — pixel-clone Findit "Our location for you" · header กลาง + bento (3 + 2 กว้าง) */}
      <section className="wrap py-20 md:py-28">
        <div className="mx-auto max-w-2xl text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Explore Cities
          </p>
          <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Our location for you</h2>
          <p className="mx-auto mt-4 max-w-[540px] text-base leading-relaxed text-body">
            Each neighborhood has its own story. Discover the areas that match your lifestyle &mdash; whether you seek vibrant city energy, peaceful family communities, or exclusive luxury living.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-6">
          {DEMO_CITIES.map((c) => (
            <Link key={c.name} href="/property" className={`group block ${c.wide ? 'lg:col-span-3' : 'lg:col-span-2'}`}>
              <div className={`overflow-hidden rounded-card ${c.wide ? 'aspect-[16/8]' : 'aspect-[4/3]'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={c.img} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
              </div>
              <h3 className="mt-4 text-xl font-medium text-ink">{c.name}</h3>
              <p className="mt-1 text-sm text-body">{c.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* STEPS — pixel-clone Findit · รูปบ้าน full-bleed + การ์ดขาว timeline (01/02/03) ซ้าย */}
      <section className="relative overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/assets/asset-005.jpg" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="wrap relative py-16 md:py-24">
          <div className="max-w-[500px] rounded-[10px] bg-white p-7 sm:p-8">
            <div className="flex flex-col">
              {DEMO_STEPS.map((s, i) => (
                <div key={s.no} className="flex gap-5">
                  <div className="flex flex-col items-center">
                    <span className="whitespace-nowrap text-[26px] font-medium leading-none text-ink">{s.no}.</span>
                    {i < DEMO_STEPS.length - 1 && <span className="my-2 w-px grow bg-line" />}
                  </div>
                  <div className={i < DEMO_STEPS.length - 1 ? 'pb-8' : ''}>
                    <h3 className="text-[22px] font-medium leading-snug text-ink">{s.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-body">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/contact" className="mt-2 inline-flex items-center justify-center rounded-pill bg-ink px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">Start your journey</Link>
          </div>
        </div>
      </section>

      {/* FRESH on the market — 3 ทรัพย์มาใหม่ */}
      <section className="wrap py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>ทรัพย์มาใหม่</Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[42px]">อัปเดตล่าสุดในตลาด</h2>
            <p className="mt-3 max-w-md text-muted">ทรัพย์คุณภาพที่เพิ่งเข้าสู่ตลาด — คว้าก่อนใคร</p>
          </div>
          <Link href="/property" className="btn-outline shrink-0">ดูทั้งหมด</Link>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PROPERTIES.slice(0, 3).map((p) => <PropertyCard key={p.slug} p={p} />)}
        </div>
      </section>

      {/* TESTIMONIALS — "What our clients say" */}
      <section className="bg-ink text-white">
        <div className="wrap py-20 md:py-28">
          <div className="max-w-xl">
            <Eyebrow><span className="text-white/60">เสียงจากลูกค้า</span></Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight text-white sm:text-[42px]">เรื่องจริงจากคนที่ไว้ใจเรา</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DEMO_TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rounded-card border border-white/15 bg-white/5 p-7">
                <div className="flex gap-1 text-white">{Array.from({ length: 5 }).map((_, i) => <span key={i}>{IStar}</span>)}</div>
                <blockquote className="mt-4 text-white/90">“{t.quote}”</blockquote>
                <figcaption className="mt-5">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-white/60">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* INSIGHTS — "Insights & Updates" (⚠️ placeholder · เราเลื่อน blog — รอเจ้าของตัดสินเก็บ/ตัด) */}
      <section className="wrap py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>ความรู้·อัปเดต</Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[42px]">บทความ·เคล็ดลับอสังหาฯ</h2>
            <p className="mt-3 max-w-md text-muted">ความรู้และเทรนด์ตลาด ช่วยให้ทุกการตัดสินใจของคุณมั่นใจขึ้น</p>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ARTICLES.map((a) => (
            <Link key={a.slug} href="/blog" className="group block overflow-hidden rounded-card border border-line bg-surface transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
              <div className="aspect-[16/10] overflow-hidden bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.img} alt={a.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{a.category} · {a.date}</p>
                <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{a.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

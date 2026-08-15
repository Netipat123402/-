import Link from 'next/link';
import FeaturedCard from '@/components/FeaturedCard';
import FreshListings from '@/components/FreshListings';
import {
  FEATURED_LISTINGS, DEMO_CITIES, DEMO_STEPS, DEMO_TESTIMONIALS, DEMO_ARTICLES,
} from '@/lib/demo';

const IStar = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
  </svg>
);
const ICheckSm = (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
);
const ITarget = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" /></svg>
);

// ป้าย benefit ลอยบน collage (Findit) — pill ขาว + ✓ วงกลมดำ · ตำแหน่งส่งผ่าน className (absolute + %)
function Benefit({ label, className }: { label: string; className: string }) {
  return (
    <span className={`absolute inline-flex items-center gap-2 whitespace-nowrap rounded-pill bg-white py-2 pl-2 pr-4 text-[13px] font-normal text-ink shadow-[3px_3px_12px_rgba(0,0,0,0.08)] sm:py-2.5 sm:text-[15px] ${className}`}>
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">{ICheckSm}</span>
      {label}
    </span>
  );
}

// การ์ดรีวิว (Testimonials marquee) — ดาวทอง 5 + title + quote + avatar initials + ชื่อ
function TCard({ t }: { t: { title: string; quote: string; name: string } }) {
  const initials = t.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  return (
    <figure className="flex w-[300px] shrink-0 flex-col rounded-card bg-white p-7 sm:w-[340px]">
      <div className="flex gap-1 text-[#f5a623]">{Array.from({ length: 5 }).map((_, i) => <span key={i}>{IStar}</span>)}</div>
      <p className="mt-4 text-[17px] font-medium text-ink">{t.title}</p>
      <blockquote className="mt-2 text-sm leading-relaxed text-body">&ldquo;{t.quote}&rdquo;</blockquote>
      <figcaption className="mt-6 flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/10 text-xs font-semibold text-ink">{initials}</span>
        <span className="text-[15px] text-ink">{t.name}</span>
      </figcaption>
    </figure>
  );
}

// Stats band (Findit) — เลขใหญ่ + label + desc · STAGE1 เนื้อหา Findit เดิม
const STATS = [
  { num: '$150M+', label: 'Properties sold', desc: 'Over $150M in sales, helping clients find homes and investments with ease and confidence.' },
  { num: '500+', label: 'Happy clients', desc: 'More than 500 satisfied clients trust us to make their real estate journey smooth and successful.' },
  { num: '20+', label: 'Years of expertise', desc: 'Over 20 years of experience guiding clients with market insight and professional advice.' },
];

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

      {/* FRESH — pixel-clone Findit "Fresh on the market" · header (H2 ซ้าย + sub ขวา) + filter tabs + grid */}
      <section className="wrap py-20 md:py-28">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>Latest Properties
            </p>
            <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Fresh on the market</h2>
          </div>
          <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
            Stay ahead of the curve with our newest listings &mdash; handpicked homes and investments recently added to the market.
          </p>
        </div>
        <div className="mt-10">
          <FreshListings />
        </div>
      </section>

      {/* TESTIMONIALS — pixel-clone Findit "What our clients say" · header กลาง + marquee 2 แถวสวนทาง */}
      <section className="overflow-hidden bg-soft py-20 md:py-28">
        <div className="wrap text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Testimonials
          </p>
          <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">What our clients say</h2>
          <p className="mx-auto mt-4 max-w-[520px] text-base leading-relaxed text-body">
            Real stories from homeowners and investors who trusted us to guide their real estate journey.
          </p>
        </div>
        <div className="mt-14 space-y-6">
          {[DEMO_TESTIMONIALS.slice(0, 4), DEMO_TESTIMONIALS.slice(4, 8)].map((row, ri) => (
            <div key={ri} className="marquee-row group overflow-hidden">
              <div className={`marquee-track flex gap-6 ${ri === 1 ? 'reverse' : ''}`}>
                {[...row, ...row].map((t, i) => <TCard key={i} t={t} />)}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS band — pixel-clone Findit · แถบดำ 3 สถิติ คั่นเส้นตั้ง */}
      <section className="bg-black text-white">
        <div className="wrap py-14 md:py-[50px]">
          <div className="grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-0">
            {STATS.map((s, i) => (
              <div key={s.label} className={i > 0 ? 'sm:border-l sm:border-white/15 sm:pl-10' : 'sm:pr-10'}>
                <p className="text-[44px] font-medium leading-none sm:text-[54px]">{s.num}</p>
                <p className="mt-4 text-base text-white">{s.label}</p>
                <p className="mt-2 max-w-[340px] text-sm leading-relaxed text-white/80">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* INSIGHTS — pixel-clone Findit "Insights & Updates" · header (H2 ซ้าย + sub ขวา) + 3 การ์ดบทความ */}
      <section className="wrap py-20 md:py-28">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>Latest New
            </p>
            <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Insights &amp; Updates</h2>
          </div>
          <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
            Stay informed with expert tips, market trends, and property advice to guide your real estate journey.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ARTICLES.map((a) => (
            <Link key={a.slug} href="/blog" className="group flex flex-col overflow-hidden rounded-card bg-soft transition hover:shadow-[0_14px_44px_rgba(0,0,0,0.10)]">
              <div className="aspect-[4/3] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.img} alt={a.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-medium leading-snug text-ink">{a.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-body">{a.excerpt}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

import Link from 'next/link';
import FeaturedCard from '@/components/FeaturedCard';
import ArticleCard from '@/components/ArticleCard';
import AboutBenefits from '@/components/AboutBenefits';
import FreshSection from '@/components/FreshSection';
import Testimonials from '@/components/Testimonials';
import StatsBand from '@/components/StatsBand';
import { IStar, ITarget } from '@/components/icons';
import {
  FEATURED_LISTINGS, DEMO_CITIES, DEMO_STEPS, DEMO_ARTICLES,
} from '@/lib/demo';

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

      {/* ABOUT — reuse component (Home + Agents) */}
      <AboutBenefits />

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

      {/* FRESH — reuse component (Home + Agents) */}
      <FreshSection />

      {/* TESTIMONIALS + STATS — reuse component (Home + About) */}
      <Testimonials />
      <StatsBand variant="dark" />

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
          {DEMO_ARTICLES.slice(0, 3).map((a) => <ArticleCard key={a.slug} a={a} />)}
        </div>
      </section>
    </>
  );
}

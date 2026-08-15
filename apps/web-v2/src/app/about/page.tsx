import Link from 'next/link';
import StatsBand from '@/components/StatsBand';
import Testimonials from '@/components/Testimonials';
import FaqAccordion from '@/components/FaqAccordion';
import { ITarget } from '@/components/icons';
import { DEMO_STEPS, DEMO_TEAM, DEMO_TIMELINE } from '@/lib/demo';

// /about — pixel-clone Findit · header + collage + stats + timeline + steps + team + testimonials + FAQ
const COLLAGE = ['/assets/asset-002.jpg', '/assets/asset-011.jpg', '/assets/asset-005.jpg'];

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function AboutPage() {
  return (
    <>
      {/* header */}
      <section className="wrap py-16 md:py-20">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>About Us
            </p>
            <h1 className="mt-4 text-[30px] font-medium leading-[1.15] sm:text-[42px]">Building dreams,<br />one home at a time</h1>
          </div>
          <div className="lg:justify-self-end lg:text-right">
            <p className="max-w-[420px] text-base leading-relaxed text-body">
              We&rsquo;re more than real estate agents &mdash; we&rsquo;re your trusted partners, helping you find the right property with confidence and ease.
            </p>
            <Link href="/contact" className="mt-5 inline-flex items-center justify-center rounded-pill bg-ink px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">Contact us</Link>
          </div>
        </div>

        {/* collage band */}
        <div className="mt-10 grid grid-cols-3 gap-4">
          {COLLAGE.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={src} alt="" className={`w-full rounded-card object-cover ${i === 1 ? 'aspect-[3/4]' : 'aspect-[3/4] mt-8'}`} />
          ))}
        </div>
      </section>

      <StatsBand variant="light" />

      {/* legacy timeline */}
      <section className="bg-soft py-20 md:py-28">
        <div className="wrap text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Our History
          </p>
          <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">A legacy of trust and growth</h2>
          <p className="mx-auto mt-4 max-w-[540px] text-base leading-relaxed text-body">
            From a small vision to a trusted real estate partner, our journey has been defined by dedication, growth, and client success.
          </p>
        </div>
        <div className="wrap mt-14 grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {DEMO_TIMELINE.map((m, i) => (
            <div key={m.year} className={`lg:pl-6 ${i > 0 ? 'lg:border-l lg:border-line' : ''}`}>
              <p className="text-2xl font-medium text-ink">{m.year}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-muted">{m.label}</p>
              <p className="mt-3 text-sm leading-relaxed text-body">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* steps variant — list ซ้าย + รูปขวา */}
      <section className="wrap grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Our Process
          </p>
          <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Simple steps to your dream home</h2>
          <p className="mt-4 max-w-[440px] text-base leading-relaxed text-body">We make buying, selling, or investing in property effortless. Here&rsquo;s how we guide you every step of the way.</p>
          <div className="mt-8 flex flex-col">
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
        <div className="overflow-hidden rounded-card">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/asset-005.jpg" alt="" className="aspect-[4/5] w-full object-cover lg:aspect-[4/4]" />
        </div>
      </section>

      {/* team grid */}
      <section className="wrap pb-20 md:pb-28">
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>Our Team
            </p>
            <h2 className="mt-4 max-w-[480px] text-[30px] font-medium leading-tight sm:text-[42px]">Dedicated experts, working for you</h2>
          </div>
          <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
            Behind every successful property journey is a team of professionals committed to guiding you with trust, expertise, and care.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-2 gap-6 lg:grid-cols-4">
          {DEMO_TEAM.map((m) => (
            <div key={m.name}>
              <div className="flex aspect-[4/5] items-center justify-center overflow-hidden rounded-card bg-gradient-to-br from-soft to-line">
                <span className="text-[56px] font-medium text-ink/25">{initials(m.name)}</span>
              </div>
              <h3 className="mt-4 text-lg font-medium text-ink">{m.name}</h3>
              <p className="mt-0.5 text-sm text-body">{m.role}</p>
            </div>
          ))}
        </div>
      </section>

      <Testimonials />

      {/* FAQ */}
      <section className="wrap grid items-start gap-12 py-20 md:py-28 lg:grid-cols-2 lg:gap-16">
        <div className="lg:sticky lg:top-24">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>FAQ
          </p>
          <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Frequently Asked Questions</h2>
          <p className="mt-4 max-w-[440px] text-base leading-relaxed text-body">Got questions? We&rsquo;ve answered some of the most common ones to guide you through your real estate journey.</p>
          <div className="mt-8 overflow-hidden rounded-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/asset-001.jpg" alt="" className="aspect-[4/3] w-full object-cover" />
          </div>
        </div>
        <FaqAccordion />
      </section>
    </>
  );
}

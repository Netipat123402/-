import Link from 'next/link';
import StatsBand from '@/components/StatsBand';
import FaqSection from '@/components/FaqSection';
import { ITarget } from '@/components/icons';

// /services — Notify เสา 2 (Property Services) · PM พระเอก + 5 บริการย่อย + steps + stats + FAQ
const SERVICES = [
  { title: 'Property Management', desc: 'End-to-end care for your property — tenants, maintenance, rent collection, and reporting — so ownership stays effortless. Our flagship service.', featured: true, img: '/assets/asset-001.jpg' },
  { title: 'Property Marketing', desc: 'Professional photography, listings, and targeted campaigns that put your property in front of the right buyers and tenants.' },
  { title: 'Valuation', desc: 'Accurate, data-driven pricing grounded in real market activity — so you list with confidence.' },
  { title: 'Consultation', desc: 'Clear, honest advice on buying, selling, renting, or investing, tailored to your goals and timeline.' },
  { title: 'Renovation & Interior', desc: 'Trusted renovation and interior partners to refresh, stage, and add value before you sell or rent.' },
];
const STEPS = [
  { no: '01', title: 'Assess', desc: 'We review your property and goals, then recommend the right mix of services.' },
  { no: '02', title: 'Manage', desc: 'Our team handles the work — marketing, tenants, maintenance, and reporting.' },
  { no: '03', title: 'Grow', desc: 'You get transparent updates and steady returns, with less stress along the way.' },
];

export default function ServicesPage() {
  return (
    <>
      <section className="wrap py-16 md:py-20">
        {/* header */}
        <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
              <span className="text-ink">{ITarget}</span>Our Services
            </p>
            <h1 className="mt-4 max-w-[540px] text-[30px] font-medium leading-tight sm:text-[42px]">More than listings &mdash; we care for your property</h1>
          </div>
          <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
            From full property management to marketing, valuation, and renovation &mdash; Notify looks after your property and its value at every stage.
          </p>
        </div>

        {/* services bento — PM featured (2-span) */}
        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((s) => (
            <div key={s.title} className={`flex flex-col overflow-hidden rounded-card bg-soft ${s.featured ? 'sm:col-span-2 lg:col-span-2' : ''}`}>
              {s.featured && (
                <div className="aspect-[2/1] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={s.img} alt="" className="h-full w-full object-cover" />
                </div>
              )}
              <div className="p-6">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-medium text-ink">{s.title}</h3>
                  {s.featured && <span className="rounded-pill bg-ink px-2.5 py-0.5 text-[11px] font-medium text-white">Flagship</span>}
                </div>
                <p className="mt-2 text-sm leading-relaxed text-body">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="bg-soft py-20 md:py-28">
        <div className="wrap text-center">
          <p className="flex items-center justify-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>How It Works
          </p>
          <h2 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">A simple path to peace of mind</h2>
        </div>
        <div className="wrap mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
          {STEPS.map((s) => (
            <div key={s.no} className="rounded-card bg-white p-7">
              <span className="text-[28px] font-medium leading-none text-ink">{s.no}.</span>
              <h3 className="mt-3 text-[22px] font-medium text-ink">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-body">{s.desc}</p>
            </div>
          ))}
        </div>
        <div className="wrap mt-12 text-center">
          <Link href="/contact" className="inline-flex items-center justify-center rounded-pill bg-ink px-6 py-3 text-[15px] font-semibold text-white transition hover:opacity-90">Talk to our team</Link>
        </div>
      </section>

      <StatsBand variant="dark" />
      <FaqSection />
    </>
  );
}

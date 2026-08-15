import Link from 'next/link';
import { notFound } from 'next/navigation';
import PropertyCard from '@/components/PropertyCard';
import { DEMO_PROPERTIES, dealLabel } from '@/lib/demo';

// /property/[slug] — pixel-clone Findit detail · header + hero + 2-col (เนื้อหา+sidebar) + related
// เนื้อหา description/features = copy ทั่วไป (STAGE1) · specs = demo static · gallery reuse assets
export function generateStaticParams() {
  return DEMO_PROPERTIES.map((p) => ({ slug: p.slug }));
}

const IBed = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 7v10M3 12h18M21 12v5M3 12V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" /></svg>;
const IBath = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2" /></svg>;
const IArea = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 3h18v18H3zM3 9h18M9 3v18" /></svg>;
const IPin = <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;

const GALLERY = ['/assets/asset-001.jpg', '/assets/asset-005.jpg', '/assets/asset-002.jpg', '/assets/asset-004.jpg', '/assets/asset-011.jpg'];

function Feature({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return <span className="inline-flex items-center gap-1.5 text-sm text-muted"><span className="text-ink/70">{icon}</span>{children}</span>;
}

function SpecRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-3">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-ink">{value}</span>
    </div>
  );
}

function Field({ label, placeholder, defaultValue, readOnly }: { label: string; placeholder?: string; defaultValue?: string; readOnly?: boolean }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs text-muted">{label}</span>
      <input
        type="text" placeholder={placeholder} defaultValue={defaultValue} readOnly={readOnly}
        className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink outline-none focus:border-ink read-only:bg-soft read-only:text-muted"
      />
    </label>
  );
}

export default function PropertyDetailPage({ params }: { params: { slug: string } }) {
  const p = DEMO_PROPERTIES.find((x) => x.slug === params.slug);
  if (!p) notFound();
  const related = DEMO_PROPERTIES.filter((x) => x.slug !== p.slug).slice(0, 3);
  const initials = p.agent.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const DETAILS: [string, string][] = [
    ['Size', `${p.area} m²`], ['Bedrooms', String(p.beds)],
    ['Bathrooms', String(p.baths)], ['Floor', 'Ground'],
    ['Additional Space', 'Basement'], ['Furnishing', 'Semi furnished'],
    ['Ceiling Height', '3 m'], ['Construction Year', 'Jul 1, 2000'],
    ['Renovation', 'Jun 6, 2002'],
  ];
  const UTILITY: [string, string][] = [
    ['Heating', 'Natural gas'], ['Air Condition', 'Yes'],
    ['Fireplace', 'Yes'], ['Elevator', 'Yes'],
    ['Ventilation', 'Yes'], ['Intercom', 'Yes'],
    ['Window Type', 'Aluminum frame'], ['Cable TV', 'Yes'],
    ['Wifi', 'Yes'], ['Parking', 'Yes'],
  ];

  return (
    <div className="wrap py-12 md:py-16">
      {/* header */}
      <div className="flex flex-col gap-4 border-b border-line pb-8 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex gap-2">
            <span className="rounded-pill bg-ink px-3 py-1.5 text-xs text-white">{dealLabel(p.deal)}</span>
            <span className="rounded-pill bg-[#f2f4f7] px-3 py-1.5 text-xs text-ink">{p.category}</span>
          </div>
          <h1 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">{p.name}</h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2">
            <Feature icon={IBed}>Beds: <span className="text-ink">{p.beds}</span></Feature>
            <Feature icon={IBath}>Baths: <span className="text-ink">{p.baths}</span></Feature>
            <Feature icon={IArea}>Sqft: <span className="text-ink">{p.area}</span></Feature>
            <Feature icon={IPin}>{p.location}</Feature>
          </div>
        </div>
        <p className="shrink-0 text-[30px] font-medium text-ink sm:text-[42px]">{p.price}<span className="text-base font-normal text-muted">{p.deal === 'rent' ? '/Month' : ''}</span></p>
      </div>

      {/* hero image */}
      <div className="mt-8 overflow-hidden rounded-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} className="aspect-[16/8] w-full object-cover" />
      </div>

      {/* main 2-col */}
      <div className="mt-12 lg:grid lg:grid-cols-[1fr_360px] lg:gap-12">
        {/* LEFT content */}
        <div className="min-w-0">
          <h2 className="text-2xl font-medium text-ink">Description</h2>
          <p className="mt-4 leading-relaxed text-body">
            {p.name} is a bright, thoughtfully designed residence that makes the most of natural light and comfortable living. Positioned on the sunny side of a modern building, it pairs open, airy spaces with high-quality finishes for an inviting home in the heart of the city.
          </p>

          <h2 className="mt-12 text-2xl font-medium text-ink">Property features</h2>
          <p className="mt-4 leading-relaxed text-body">
            An abundance of natural light fills the open-concept living space, where expansive windows frame the surroundings and warm the interior throughout the day. The contemporary kitchen flows into the dining and living areas, while the master suite offers a private retreat with an en-suite bath and generous closet space.
          </p>

          <h2 className="mt-12 text-2xl font-medium text-ink">Property details</h2>
          <div className="mt-4 grid gap-x-12 sm:grid-cols-2">
            {DETAILS.map(([l, v]) => <SpecRow key={l} label={l} value={v} />)}
          </div>

          <h2 className="mt-12 text-2xl font-medium text-ink">Property utility</h2>
          <div className="mt-4 grid gap-x-12 sm:grid-cols-2">
            {UTILITY.map(([l, v]) => <SpecRow key={l} label={l} value={v} />)}
          </div>

          <h2 className="mt-12 text-2xl font-medium text-ink">Location</h2>
          <p className="mt-4 text-body">6 New Ave, {p.location}, NY 10314, USA</p>
          <button type="button" className="mt-4 inline-flex items-center justify-center rounded-pill bg-ink px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">Show on map</button>

          <h2 className="mt-12 text-2xl font-medium text-ink">Gallery</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={GALLERY[0]} alt="" className="col-span-2 aspect-[16/9] w-full rounded-card object-cover" />
            {GALLERY.slice(1, 5).map((g, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={g} alt="" className="aspect-[4/3] w-full rounded-card object-cover" />
            ))}
          </div>
        </div>

        {/* RIGHT sidebar */}
        <aside className="mt-12 space-y-6 lg:mt-0">
          {/* Contact sellers */}
          <div className="rounded-[10px] bg-white p-6 ring-1 ring-line">
            <h3 className="text-lg font-medium text-ink">Contact sellers</h3>
            <div className="mt-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink/10 text-xs font-semibold text-ink">{initials}</span>
              <div>
                <p className="text-sm font-medium text-ink">{p.agent}</p>
                <p className="text-xs text-muted">560 3rd Ave, New York, NY 10016, USA</p>
              </div>
            </div>
            <dl className="mt-5 space-y-2.5 text-sm">
              {[['Office phone', '+1 714 445 557'], ['Mobile phone', '+1 714 442 225'], ['Whatsapp', '771 444 2225'], ['Email', 'agent@example.com']].map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4"><dt className="text-muted">{k}</dt><dd className="text-ink">{v}</dd></div>
              ))}
            </dl>
            <button type="button" className="mt-5 w-full rounded-pill bg-ink py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">My other property</button>
          </div>

          {/* Schedule tour */}
          <div className="rounded-[10px] bg-white p-6 ring-1 ring-line">
            <h3 className="text-lg font-medium text-ink">Schedule tour</h3>
            <p className="mt-2 text-sm leading-relaxed text-body">See your future home up close! Schedule a tour and let our team help you find the perfect property.</p>
            <form className="mt-5 space-y-3">
              <Field label="Property ID" defaultValue="55W886" readOnly />
              <Field label="Property name" defaultValue={p.name} readOnly />
              <Field label="Your name*" placeholder="Your name" />
              <Field label="Your email*" placeholder="Your email" />
              <Field label="Phone" placeholder="Your phone" />
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted">Message</span>
                <textarea rows={3} placeholder="Message" className="w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink outline-none focus:border-ink" />
              </label>
              <button type="button" className="w-full rounded-pill bg-ink py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">Submit</button>
            </form>
          </div>

          {/* More in location */}
          <div>
            <h3 className="text-lg font-medium text-ink">More in {p.location}</h3>
            <div className="mt-4 space-y-6">
              {related.slice(0, 2).map((r) => <PropertyCard key={r.slug} p={r} />)}
            </div>
          </div>
        </aside>
      </div>

      {/* related */}
      <div className="mt-16 border-t border-line pt-16">
        <h2 className="text-[30px] font-medium leading-tight sm:text-[42px]">Related properties</h2>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((r) => <PropertyCard key={r.slug} p={r} />)}
        </div>
      </div>
    </div>
  );
}

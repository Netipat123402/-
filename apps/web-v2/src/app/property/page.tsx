'use client';

import { useMemo, useState } from 'react';
import PropertyCard from '@/components/PropertyCard';
import { DEMO_PROPERTIES, CATEGORIES, type PropertyCategory } from '@/lib/demo';

// /property — pixel-clone Findit · header "Fresh on the market" + filter sidebar + grid 2-col
type DealFilter = 'all' | 'sale' | 'rent';
const TYPE_TABS: { v: DealFilter; label: string }[] = [
  { v: 'all', label: 'All' }, { v: 'sale', label: 'Sell' }, { v: 'rent', label: 'Rent' },
];
const LOCATIONS = ['Brooklyn', 'Manhattan', 'Queens', 'Staten Island', 'The Bronx'];

const ITarget = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" fill="currentColor" stroke="none" /></svg>
);

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-pill px-4 py-2 text-[13px] font-medium transition ${on ? 'bg-ink text-white' : 'bg-[#f2f4f7] text-ink hover:bg-line'}`}
    >
      {children}
    </button>
  );
}

export default function PropertyListPage() {
  const [type, setType] = useState<DealFilter>('all');
  const [cat, setCat] = useState<PropertyCategory | 'all'>('all');
  const [loc, setLoc] = useState<string | 'all'>('all');

  const results = useMemo(() => DEMO_PROPERTIES.filter((p) =>
    (type === 'all' || p.deal === type) &&
    (cat === 'all' || p.category === cat) &&
    (loc === 'all' || p.location === loc),
  ), [type, cat, loc]);

  const exploreLabel = TYPE_TABS.find((t) => t.v === type)?.label ?? 'All';

  return (
    <div className="wrap py-16 md:py-20">
      {/* header — เหมือน home "Fresh on the market" */}
      <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-ink">
            <span className="text-ink">{ITarget}</span>Latest Properties
          </p>
          <h1 className="mt-4 text-[30px] font-medium leading-tight sm:text-[42px]">Fresh on the market</h1>
        </div>
        <p className="max-w-[420px] text-base leading-relaxed text-body lg:justify-self-end">
          Stay ahead of the curve with our newest listings &mdash; handpicked homes and investments recently added to the market.
        </p>
      </div>

      <div className="mt-12 lg:grid lg:grid-cols-[360px_1fr] lg:gap-10">
        {/* Filter sidebar */}
        <aside className="mb-8 self-start rounded-[10px] bg-white px-5 py-8 shadow-[0_4px_28px_rgba(0,0,0,0.05)] ring-1 ring-line lg:sticky lg:top-24 lg:mb-0">
          <h2 className="text-2xl font-medium text-ink">Explore : {exploreLabel}</h2>
          <p className="mt-3 text-sm leading-relaxed text-body">
            Browse our latest properties &mdash; from cozy family homes to luxury estates. Each listing is carefully selected to match different lifestyles and budgets.
          </p>

          <h3 className="mt-8 text-xl font-medium text-ink">Type</h3>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {TYPE_TABS.map((t) => <Pill key={t.v} on={type === t.v} onClick={() => setType(t.v)}>{t.label}</Pill>)}
          </div>

          <h3 className="mt-7 text-xl font-medium text-ink">Category</h3>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {CATEGORIES.map((c) => <Pill key={c} on={cat === c} onClick={() => setCat(cat === c ? 'all' : c)}>{c}</Pill>)}
          </div>

          <h3 className="mt-7 text-xl font-medium text-ink">Location</h3>
          <div className="mt-4 flex flex-wrap gap-2.5">
            {LOCATIONS.map((l) => <Pill key={l} on={loc === l} onClick={() => setLoc(loc === l ? 'all' : l)}>{l}</Pill>)}
          </div>
        </aside>

        {/* Results grid */}
        <div>
          {results.length === 0 ? (
            <div className="rounded-[10px] bg-soft py-24 text-center text-muted">
              No properties match your filters &mdash; try adjusting them.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {results.map((p) => <PropertyCard key={p.slug} p={p} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

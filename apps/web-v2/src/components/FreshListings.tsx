'use client';

import { useState } from 'react';
import PropertyCard from '@/components/PropertyCard';
import { DEMO_PROPERTIES, CATEGORIES, type PropertyCategory } from '@/lib/demo';

// Fresh filter tabs (Findit) — View All + หมวด · กรอง client-side
// tab active = pill ดำ · idle = pill ขาวมีเส้น
const TABS: Array<'View All' | PropertyCategory> = ['View All', ...CATEGORIES];

export default function FreshListings() {
  const [active, setActive] = useState<'View All' | PropertyCategory>('View All');
  const list = active === 'View All' ? DEMO_PROPERTIES : DEMO_PROPERTIES.filter((p) => p.category === active);

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {TABS.map((t) => {
          const on = t === active;
          return (
            <button
              key={t}
              type="button"
              onClick={() => setActive(t)}
              className={`rounded-pill px-4 py-2 text-[13px] font-medium transition ${on ? 'bg-ink text-white' : 'border border-line bg-white text-body hover:border-ink hover:text-ink'}`}
            >
              {t}
            </button>
          );
        })}
      </div>
      <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((p) => <PropertyCard key={p.slug} p={p} />)}
      </div>
    </div>
  );
}

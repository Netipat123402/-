import Link from 'next/link';
import type { DemoProperty } from '@/lib/demo';
import { dealLabel } from '@/lib/demo';

// PropertyCard — pixel-clone Findit (rich card · Fresh + หน้า /property)
// รูป+ป้าย · 📍location · ชื่อ · Beds/Baths/Sqft · เส้นแบ่ง · avatar+agent · ราคา
const IBed = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 7v10M3 12h18M21 12v5M3 12V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" /></svg>;
const IBath = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2" /></svg>;
const IArea = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true"><path d="M3 3h18v18H3zM3 9h18M9 3v18" /></svg>;
const IPin = <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M12 21s-7-6-7-11a7 7 0 0 1 14 0c0 5-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></svg>;

function initials(name: string) {
  return name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span className="text-ink/70">{icon}</span>
      {label}: <span className="text-ink">{value}</span>
    </span>
  );
}

export default function PropertyCard({ p }: { p: DemoProperty }) {
  return (
    <Link href={`/property/${p.slug}`} className="group flex flex-col overflow-hidden rounded-card bg-soft transition hover:shadow-[0_14px_44px_rgba(0,0,0,0.10)]">
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        <div className="absolute left-4 top-4 flex gap-2">
          <span className="rounded-pill bg-ink px-3 py-1.5 text-xs font-normal text-white">{p.category}</span>
          <span className="rounded-pill bg-white px-3 py-1.5 text-xs font-normal text-ink">{dealLabel(p.deal)}</span>
        </div>
      </div>
      <div className="p-5">
        <p className="flex items-center gap-1.5 text-sm text-muted"><span className="text-ink/60">{IPin}</span>{p.location}</p>
        <h3 className="mt-1 text-xl font-medium text-ink">{p.name}</h3>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
          <Spec icon={IBed} label="Beds" value={String(p.beds)} />
          <Spec icon={IBath} label="Baths" value={String(p.baths)} />
          <Spec icon={IArea} label="Sqft" value={String(p.area)} />
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="flex items-center gap-2.5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-ink/10 text-xs font-semibold text-ink">{initials(p.agent)}</span>
            <span className="text-sm text-ink">{p.agent}</span>
          </span>
          <span className="text-xl font-medium text-ink">{p.price}</span>
        </div>
      </div>
    </Link>
  );
}

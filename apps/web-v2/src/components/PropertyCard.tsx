import Link from 'next/link';
import type { DemoProperty } from '@/lib/demo';
import { dealLabel, priceSuffix } from '@/lib/demo';

// การ์ดทรัพย์ สไตล์ Findit: รูป 4:3 + ป้ายดีลมุมบน · ล่าง = ราคา · ชื่อ · ทำเล · แถบ specs
function Spec({ icon, value }: { icon: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-muted">
      <span className="text-ink/70">{icon}</span>
      {value}
    </span>
  );
}

const IBed = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 7v10M3 12h18M21 12v5M3 12V9a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" /></svg>;
const IBath = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3zM6 12V6a2 2 0 0 1 2-2 2 2 0 0 1 2 2" /></svg>;
const IArea = <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"><path d="M3 3h18v18H3zM3 9h18M9 3v18" /></svg>;

export default function PropertyCard({ p }: { p: DemoProperty }) {
  return (
    <Link href={`/property/${p.slug}`} className="group block overflow-hidden rounded-card border border-line bg-surface transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
      <div className="relative aspect-[4/3] overflow-hidden bg-soft">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        <span className="absolute left-3 top-3 rounded-pill bg-white/95 px-3 py-1 text-xs font-semibold text-ink">
          {dealLabel(p.deal)}
        </span>
      </div>
      <div className="p-5">
        <div className="text-lg font-bold text-ink">
          {p.price}<span className="text-sm font-medium text-muted">{priceSuffix(p.deal)}</span>
        </div>
        <h3 className="mt-1 text-base font-semibold text-ink">{p.name}</h3>
        <p className="mt-0.5 text-sm text-muted">{p.location}</p>
        <div className="mt-4 flex items-center gap-4 border-t border-line pt-4">
          <Spec icon={IBed} value={`${p.beds} นอน`} />
          <Spec icon={IBath} value={`${p.baths} น้ำ`} />
          <Spec icon={IArea} value={`${p.area} ตร.ม.`} />
        </div>
      </div>
    </Link>
  );
}

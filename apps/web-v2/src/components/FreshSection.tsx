import Link from 'next/link';
import FreshListings from '@/components/FreshListings';
import { ITarget } from '@/components/icons';

// Fresh "Fresh on the market" — header + filter tabs + grid · reuse Home + Agents
// viewAll = โชว์ปุ่ม "View all properties" ท้าย (Findit ใส่ในหน้า Agents)
export default function FreshSection({ viewAll = false }: { viewAll?: boolean }) {
  return (
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
      {viewAll && (
        <div className="mt-12">
          <Link href="/property" className="inline-flex items-center justify-center rounded-pill bg-ink px-5 py-3 text-[15px] font-semibold text-white transition hover:opacity-90">View all properties</Link>
        </div>
      )}
    </section>
  );
}

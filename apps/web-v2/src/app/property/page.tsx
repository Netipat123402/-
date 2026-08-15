'use client';

import { useMemo, useState } from 'react';
import PropertyCard from '@/components/PropertyCard';
import { DEMO_PROPERTIES, CATEGORIES, type PropertyCategory } from '@/lib/demo';

type DealFilter = 'all' | 'sale' | 'rent';
const DEAL_TABS: { v: DealFilter; label: string }[] = [
  { v: 'all', label: 'ทั้งหมด' }, { v: 'sale', label: 'ขาย' }, { v: 'rent', label: 'เช่า' },
];
const LOCATIONS = ['ทั้งหมด', 'กรุงเทพฯ', 'สมุทรปราการ'];

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`rounded-pill px-4 py-2 text-sm font-medium transition ${on ? 'bg-ink text-white' : 'bg-soft text-body hover:bg-line'}`}>
      {children}
    </button>
  );
}

export default function PropertyListPage() {
  const [deal, setDeal] = useState<DealFilter>('all');
  const [cat, setCat] = useState<PropertyCategory | 'all'>('all');
  const [loc, setLoc] = useState('ทั้งหมด');

  const results = useMemo(() => DEMO_PROPERTIES.filter((p) =>
    (deal === 'all' || p.deal === deal) &&
    (cat === 'all' || p.category === cat) &&
    (loc === 'ทั้งหมด' || p.location.includes(loc)),
  ), [deal, cat, loc]);

  const reset = () => { setDeal('all'); setCat('all'); setLoc('ทั้งหมด'); };
  const dealLabel = DEAL_TABS.find((t) => t.v === deal)?.label ?? 'ทั้งหมด';

  return (
    <div className="wrap py-16 md:py-20">
      {/* heading — โคลน "LATEST PROPERTIES / Fresh on the market" */}
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">ทรัพย์ทั้งหมด</p>
          <h1 className="mt-3 text-[36px] font-semibold leading-tight sm:text-[52px]">ค้นหาทรัพย์ที่ใช่</h1>
        </div>
        <p className="max-w-sm text-muted md:text-right">
          ทรัพย์คุณภาพคัดสรร — กรองตามประเภท ดีล และทำเล เพื่อเจอหลังที่ตรงใจ
        </p>
      </div>

      <div className="mt-12 lg:grid lg:grid-cols-[280px_1fr] lg:gap-10">
        {/* Filter sidebar */}
        <aside className="mb-8 self-start rounded-card border border-line bg-surface p-6 lg:sticky lg:top-24 lg:mb-0">
          <h2 className="text-xl font-semibold text-ink">สำรวจ : {cat === 'all' ? dealLabel : cat}</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            เลือกดูทรัพย์ — ตั้งแต่คอนโดใจกลางเมือง ถึงบ้านพร้อมสวน คัดสรรทุกหลังเพื่อไลฟ์สไตล์ที่ต่างกัน
          </p>

          <p className="mt-7 text-sm font-semibold text-ink">ดีล</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {DEAL_TABS.map((t) => <Pill key={t.v} on={deal === t.v} onClick={() => setDeal(t.v)}>{t.label}</Pill>)}
          </div>

          <p className="mt-7 text-sm font-semibold text-ink">ประเภท</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Pill on={cat === 'all'} onClick={() => setCat('all')}>ทั้งหมด</Pill>
            {CATEGORIES.map((c) => <Pill key={c} on={cat === c} onClick={() => setCat(c)}>{c}</Pill>)}
          </div>

          <p className="mt-7 text-sm font-semibold text-ink">ทำเล</p>
          <select value={loc} onChange={(e) => setLoc(e.target.value)}
            className="mt-3 h-11 w-full rounded-pill border border-line bg-surface px-4 text-sm outline-none focus:border-ink">
            {LOCATIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>

          <button onClick={reset} className="mt-7 text-sm font-medium text-muted underline-offset-4 hover:text-ink hover:underline">
            ล้างตัวกรอง
          </button>
        </aside>

        {/* Results */}
        <div>
          <p className="mb-6 text-sm text-muted">พบ {results.length} ทรัพย์</p>
          {results.length === 0 ? (
            <div className="rounded-card border border-line bg-soft py-20 text-center text-muted">
              ไม่พบทรัพย์ตามเงื่อนไข — ลองปรับตัวกรอง
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

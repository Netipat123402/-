'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLang, type Lang } from '@/lib/lang';
import PriceRange from '@/components/PriceRange';
import ProvinceCombobox from '@/components/ProvinceCombobox';
import { Icon } from '@/components/Icon';

/**
 * แถบตัวกรองแนวนอน (desktop listings) — แต่ละตัวเป็น dropdown pill (แบบ Airbnb/Google)
 * เขียน URL param ชุดเดิม (ไม่แตะ filter logic) · ประเภทอยู่ที่ CategoryTabs, q อยู่ที่ ListingSearch
 * ราคา = debounce กันยิง navigation ถี่ตอนลาก
 */
const PRICE_MAX = 100000;
const PRICE_STEP = 5000;
const baht = (n: number) => `฿${n.toLocaleString('th-TH')}`;
const TRAINS = [
  { v: 'near_bts', l: 'BTS' },
  { v: 'near_mrt', l: 'MRT' },
  { v: 'near_airport_link', l: 'Airport Link' },
];
const bedOpts = (lang: Lang) => {
  const u = lang === 'en' ? 'bed' : 'นอน';
  return [{ v: '1', l: `1 ${u}` }, { v: '2', l: `2 ${u}` }, { v: '3', l: `3+ ${u}` }];
};

function Chips({ options, value, onToggle }: { options: { v: string; l: string }[]; value: string; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" onClick={() => onToggle(o.v)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${on ? 'border-ink bg-ink text-white' : 'border-border bg-surface text-ink-soft hover:border-ink/40'}`}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t, lang } = useLang();
  const [open, setOpen] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const province = sp.get('province') ?? '';
  const train = sp.get('train') ?? '';
  const bedrooms = sp.get('bedrooms') ?? '';
  const urlLo = sp.get('minRent') ? Number(sp.get('minRent')) : 0;
  const urlHi = sp.get('maxRent') ? Number(sp.get('maxRent')) : PRICE_MAX;
  const [lo, setLo] = useState(urlLo);
  const [hi, setHi] = useState(urlHi);
  useEffect(() => { setLo(urlLo); setHi(urlHi); }, [urlLo, urlHi]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ปิด dropdown เมื่อคลิกนอกแถบ
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(null); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function push(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) { if (v) p.set(k, v); else p.delete(k); }
    p.delete('page');
    router.push(`/properties?${p.toString()}`, { scroll: false });
  }
  function onPrice(nlo: number, nhi: number) {
    setLo(nlo); setHi(nhi);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => push({ minRent: nlo <= 0 ? undefined : String(nlo), maxRent: nhi >= PRICE_MAX ? undefined : String(nhi) }), 450);
  }

  const priceActive = !!(sp.get('minRent') || sp.get('maxRent'));
  const priceLabel = lo <= 0 && hi >= PRICE_MAX ? t('anyPrice') : `${baht(lo)}–${hi >= PRICE_MAX ? `${baht(PRICE_MAX)}+` : baht(hi)}`;
  const activeCount = [province, train, bedrooms].filter(Boolean).length + (priceActive ? 1 : 0);

  const Pill = ({ id, label, active, width = 'w-64', children }: { id: string; label: string; active?: boolean; width?: string; children: React.ReactNode }) => (
    <div className="relative">
      <button type="button" onClick={() => setOpen(open === id ? null : id)}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm transition ${active ? 'border-gold/50 bg-gold/10 font-medium text-gold-dark' : 'border-border bg-surface text-ink-soft hover:border-ink/40'}`}>
        {label}
        <Icon name="chevron-down" size={14} className={`transition ${open === id ? 'rotate-180' : ''}`} />
      </button>
      {open === id && (
        <div className={`absolute left-0 top-full z-30 mt-2 ${width} rounded-xl2 border border-border bg-surface p-3.5 shadow-lift`}>
          {children}
        </div>
      )}
    </div>
  );

  return (
    <div ref={wrapRef} className="flex flex-wrap items-center gap-2">
      <Pill id="price" label={priceActive ? priceLabel : t('priceRange')} active={priceActive} width="w-72">
        <PriceRange min={0} max={PRICE_MAX} step={PRICE_STEP} lo={lo} hi={hi} onChange={onPrice} />
        <div className="mt-1 flex justify-between text-2xs text-muted"><span>฿0</span><span>฿100,000+</span></div>
      </Pill>
      <Pill id="train" label={t('transitStation')} active={!!train}>
        <Chips options={TRAINS} value={train} onToggle={(v) => push({ train: train === v ? undefined : v })} />
      </Pill>
      <Pill id="beds" label={t('bedrooms')} active={!!bedrooms}>
        <Chips options={bedOpts(lang)} value={bedrooms} onToggle={(v) => push({ bedrooms: bedrooms === v ? undefined : v })} />
      </Pill>
      <Pill id="province" label={t('provinceLabel')} active={!!province}>
        <ProvinceCombobox value={province} onChange={(v) => { push({ province: v || undefined }); setOpen(null); }} placeholder={t('provinceLabel')} allLabel={t('allProvinces')} />
      </Pill>
      {activeCount > 0 && (
        <button type="button" onClick={() => push({ province: undefined, train: undefined, bedrooms: undefined, minRent: undefined, maxRent: undefined })}
          className="ml-1 text-sm font-medium text-gold-dark hover:underline">{t('clearFilters')}</button>
      )}
    </div>
  );
}

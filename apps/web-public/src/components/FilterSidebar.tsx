'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLang, type Lang } from '@/lib/lang';
import PriceRange from '@/components/PriceRange';
import ProvinceCombobox from '@/components/ProvinceCombobox';

/**
 * แถบตัวกรอง sticky (desktop listings) — auto-apply ทุกครั้งที่เปลี่ยน โดยเขียน URL param เดิม
 * (ไม่แตะ filter logic: ประเภทอยู่ที่ CategoryTabs, q อยู่ที่ ListingSearch)
 * ราคา = debounce กันยิง navigation ถี่ตอนลากสไลเดอร์
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

function Chips({ options, value, onToggle }: { options: { v: string; l: string }[]; value: string; onToggle: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.v;
        return (
          <button key={o.v} type="button" onClick={() => onToggle(o.v)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              on ? 'border-ink bg-ink text-white' : 'border-border bg-surface text-ink-soft hover:border-ink/40'
            }`}>
            {o.l}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterSidebar() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t, lang } = useLang();

  const province = sp.get('province') ?? '';
  const train = sp.get('train') ?? '';
  const bedrooms = sp.get('bedrooms') ?? '';
  const urlLo = sp.get('minRent') ? Number(sp.get('minRent')) : 0;
  const urlHi = sp.get('maxRent') ? Number(sp.get('maxRent')) : PRICE_MAX;

  // ราคา = local state (ลากลื่น) + sync กลับเมื่อ URL เปลี่ยนจากภายนอก (เช่น กดล้าง)
  const [lo, setLo] = useState(urlLo);
  const [hi, setHi] = useState(urlHi);
  useEffect(() => { setLo(urlLo); setHi(urlHi); }, [urlLo, urlHi]);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function push(next: Record<string, string | undefined>) {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(next)) { if (v) p.set(k, v); else p.delete(k); }
    p.delete('page'); // เปลี่ยนตัวกรอง = กลับหน้า 1
    router.push(`/properties?${p.toString()}`, { scroll: false });
  }

  function onPrice(nlo: number, nhi: number) {
    setLo(nlo); setHi(nhi);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      push({ minRent: nlo <= 0 ? undefined : String(nlo), maxRent: nhi >= PRICE_MAX ? undefined : String(nhi) });
    }, 450);
  }

  const activeCount = [province, train, bedrooms, sp.get('minRent'), sp.get('maxRent')].filter(Boolean).length;
  const priceLabel = lo <= 0 && hi >= PRICE_MAX ? t('anyPrice')
    : `${baht(lo)} – ${hi >= PRICE_MAX ? `${baht(PRICE_MAX)}+` : baht(hi)}`;

  return (
    <div className="rounded-card border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{t('filters')}</h2>
        {activeCount > 0 && (
          <button type="button" onClick={() => push({ province: undefined, train: undefined, bedrooms: undefined, minRent: undefined, maxRent: undefined })}
            className="text-xs font-medium text-gold-dark hover:underline">{t('clearFilters')}</button>
        )}
      </div>
      <div className="mt-4 space-y-4">
        <Field label={t('provinceLabel')}>
          <ProvinceCombobox value={province} onChange={(v) => push({ province: v || undefined })} placeholder={t('provinceLabel')} allLabel={t('allProvinces')} />
        </Field>
        <Field label={`${t('priceRange')} — ${priceLabel}`}>
          <PriceRange min={0} max={PRICE_MAX} step={PRICE_STEP} lo={lo} hi={hi} onChange={onPrice} />
          <div className="mt-1 flex justify-between text-2xs text-muted"><span>฿0</span><span>฿100,000+</span></div>
        </Field>
        <Field label={t('transitStation')}>
          <Chips options={TRAINS} value={train} onToggle={(v) => push({ train: train === v ? undefined : v })} />
        </Field>
        <Field label={t('bedrooms')}>
          <Chips options={bedOpts(lang)} value={bedrooms} onToggle={(v) => push({ bedrooms: bedrooms === v ? undefined : v })} />
        </Field>
      </div>
    </div>
  );
}

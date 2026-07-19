'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useLang, type DictKey } from '@/lib/lang';
import { Icon } from '@/components/Icon';

/**
 * เรียงลำดับผลค้นหา (listing) — native <select> จัดสไตล์เป็น pill
 *   มือถือ = OS picker (native, robust) · เดสก์ท็อป = dropdown ของ OS
 * เขียน URL param `sort` (คง filter เดิม, รีเซ็ต page) — ค่าตรงกับที่ API รองรับเป๊ะ
 *   newest (default, ไม่ใส่ param ให้ URL สะอาด) / price_asc / price_desc / popular
 */
const OPTIONS: { value: string; k: DictKey }[] = [
  { value: 'newest', k: 'sortNewest' },
  { value: 'price_asc', k: 'sortPriceAsc' },
  { value: 'price_desc', k: 'sortPriceDesc' },
  { value: 'popular', k: 'sortPopular' },
];

export default function SortSelect() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useLang();
  const current = sp.get('sort') ?? 'newest';

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const v = e.target.value;
    const p = new URLSearchParams(sp.toString());
    if (v && v !== 'newest') p.set('sort', v);
    else p.delete('sort'); // default = URL สะอาด
    p.delete('page'); // เปลี่ยนการเรียง = กลับหน้า 1
    router.push(`/properties?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="relative inline-flex items-center rounded-lg border border-border bg-surface pl-3 pr-8 text-ink-soft transition hover:border-ink/40 focus-within:border-gold">
      <Icon name="sort" size={14} className="mr-1.5 shrink-0 text-gold-dark/70" />
      <select value={current} onChange={onChange} aria-label={t('sortLabel')}
        className="cursor-pointer appearance-none bg-transparent py-2 text-sm text-ink outline-none">
        {OPTIONS.map((o) => <option key={o.value} value={o.value}>{t(o.k)}</option>)}
      </select>
      <Icon name="chevron-down" size={14} className="pointer-events-none absolute right-2.5 text-muted" />
    </div>
  );
}

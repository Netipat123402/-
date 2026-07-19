'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLang, type DictKey } from '@/lib/lang';
import { Icon } from '@/components/Icon';

/**
 * เรียงลำดับผลค้นหา (listing) — custom dropdown สไตล์เดียวกับ FilterBar pill
 *   (พื้นขาว/กรอบ/radius/ทอง+เช็ค · modal-in) ให้เข้าพวกกับตัวกรอง ไม่ใช่เมนู OS
 *   หน้า listing ไม่มี overflow-hidden → absolute dropdown ไม่ตกกรอบ
 * เขียน URL param `sort` (คง filter เดิม, รีเซ็ต page) — ค่าตรงกับที่ API รองรับเป๊ะ
 *   newest (default, ไม่ใส่ param) / price_asc / price_desc / popular
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
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const current = sp.get('sort') ?? 'newest';
  const isDefault = current === 'newest';
  const currentLabel = t(OPTIONS.find((o) => o.value === current)?.k ?? 'sortNewest');

  // ปิดเมื่อคลิกนอกกล่อง (แบบเดียวกับ FilterBar)
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  function choose(v: string) {
    const p = new URLSearchParams(sp.toString());
    if (v && v !== 'newest') p.set('sort', v);
    else p.delete('sort'); // default = URL สะอาด
    p.delete('page'); // เปลี่ยนการเรียง = กลับหน้า 1
    setOpen(false);
    router.push(`/properties?${p.toString()}`, { scroll: false });
  }

  return (
    <div className="relative shrink-0" ref={wrapRef}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-label={t('sortLabel')} aria-expanded={open}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-sm transition ${
          isDefault ? 'border-border bg-surface text-ink-soft hover:border-ink/40' : 'border-gold/50 bg-gold/10 font-medium text-gold-dark'
        }`}>
        <Icon name="sort" size={14} className={isDefault ? 'text-gold-dark/70' : ''} />
        {currentLabel}
        <Icon name="chevron-down" size={14} className={`transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="animate-modal-in absolute right-0 top-full z-30 mt-2 w-52 rounded-xl2 border border-border bg-surface p-1.5 text-left shadow-lift">
          {OPTIONS.map((o) => {
            const on = o.value === current;
            return (
              <button key={o.value} type="button" onClick={() => choose(o.value)}
                className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm transition ${
                  on ? 'bg-gold/10 font-medium text-gold-dark' : 'text-ink hover:bg-canvas'
                }`}>
                {t(o.k)}
                {on && <Icon name="check" size={16} className="shrink-0" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

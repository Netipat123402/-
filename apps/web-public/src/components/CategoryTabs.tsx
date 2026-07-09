import Link from 'next/link';
import { T } from '@/components/T';
import type { DictKey } from '@/lib/lang';

/**
 * แท็บประเภททรัพย์ (listings) — server Links นำทางด้วย URL param เดิม (ไม่แตะ filter logic)
 * active = ประเภทปัจจุบัน · เลื่อนแนวนอนได้บนมือถือ · คงตัวกรองอื่นไว้ตอนสลับ
 */
const TYPES: { v: string; k: DictKey }[] = [
  { v: '', k: 'allTypes' },
  { v: 'condo', k: 'typeCondo' },
  { v: 'house', k: 'typeHouse' },
  { v: 'townhome', k: 'typeTownhome' },
  { v: 'apartment', k: 'typeApartment' },
];

export default function CategoryTabs({ sp }: { sp: Record<string, string | undefined> }) {
  const active = sp.type ?? '';
  // สร้างลิงก์: คงตัวกรองอื่นไว้ · ตัด page (กลับหน้า 1) · ตั้ง/ล้าง type
  const href = (v: string) => {
    const p = new URLSearchParams();
    for (const [k, val] of Object.entries(sp)) {
      if (val && k !== 'page' && k !== 'type') p.set(k, val);
    }
    if (v) p.set('type', v);
    const s = p.toString();
    return s ? `/properties?${s}` : '/properties';
  };
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {TYPES.map((ty) => {
        const on = active === ty.v;
        return (
          <Link key={ty.v || 'all'} href={href(ty.v)} scroll={false}
            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm transition ${
              on ? 'border-gold/50 bg-gold/10 font-medium text-gold-dark' : 'border-border bg-surface text-ink-soft hover:border-ink/40'
            }`}>
            <T k={ty.k} />
          </Link>
        );
      })}
    </div>
  );
}

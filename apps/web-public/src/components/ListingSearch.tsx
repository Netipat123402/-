'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { useLang } from '@/lib/lang';
import { Icon } from '@/components/Icon';

/**
 * ช่องค้นหาข้อความ (desktop listings) — เขียนเฉพาะ q ลง URL, คงตัวกรองอื่นไว้ (ไม่แตะ filter logic)
 * แยกจาก SearchBar (ที่ใช้บนมือถือ) เพื่อไม่ให้ internal state ชนกับ sidebar
 */
export default function ListingSearch() {
  const router = useRouter();
  const sp = useSearchParams();
  const { t } = useLang();
  const [q, setQ] = useState(sp.get('q') ?? '');

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const p = new URLSearchParams(sp.toString());
    if (q.trim()) p.set('q', q.trim()); else p.delete('q');
    p.delete('page'); // ค้นใหม่ = กลับหน้า 1
    router.push(`/properties${p.toString() ? `?${p}` : ''}`, { scroll: false });
  }

  return (
    <form onSubmit={submit} className="flex gap-2">
      <div className="relative flex-1">
        <Icon name="search" size={18} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
        <input className="field w-full pl-10" placeholder={t('searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <button type="submit" className="btn-gold">{t('search')}</button>
    </form>
  );
}

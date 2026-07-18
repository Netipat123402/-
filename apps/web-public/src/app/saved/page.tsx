'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { clientApiBase, type PropertyCard, type PropertyDetail } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { useLang } from '@/lib/lang';
import PropertyCardView from '@/components/PropertyCard';
import { CardGridSkeleton } from '@/components/loaders';
import { Icon } from '@/components/Icon';

/** map รายละเอียดทรัพย์ (จาก public detail API) → รูปทรง PropertyCard สำหรับ render การ์ดเดิม */
function toCard(d: PropertyDetail): PropertyCard {
  const media = d.media ?? [];
  const images = media.filter((m) => m.type === 'image').map((m) => m.url);
  const cover = media.find((m) => m.isCover)?.url ?? images[0] ?? null;
  return {
    id: d.id, code: d.code, type: d.type, title: d.title,
    province: d.location?.province ?? null, district: d.location?.district ?? null,
    projectName: d.location?.projectName ?? null,
    monthlyRent: d.monthlyRent, bedrooms: d.bedrooms, bathrooms: d.bathrooms,
    areaSqm: d.areaSqm, coverImage: cover, images,
    nearTransit: d.nearTransit, petFriendly: d.petFriendly,
  };
}

export default function SavedPage() {
  const { list } = useFavorites();
  const { t } = useLang();
  // null = กำลังโหลด · [] = ไม่มี/โหลดเสร็จแล้วว่าง
  const [cards, setCards] = useState<PropertyCard[] | null>(null);

  useEffect(() => {
    let alive = true;
    if (list.length === 0) { setCards([]); return; }
    setCards(null);
    (async () => {
      const base = clientApiBase();
      // ดึงสดทีละ code (ทรัพย์อาจถูกถอนออก → 404 = ข้าม) · คงลำดับตาม favorites
      const results = await Promise.all(list.map(async (code) => {
        try {
          const r = await fetch(`${base}/public/properties/${encodeURIComponent(code)}`);
          if (!r.ok) return null;
          const j = await r.json();
          return j?.data ? toCard(j.data as PropertyDetail) : null;
        } catch { return null; }
      }));
      if (alive) setCards(results.filter((c): c is PropertyCard => c !== null));
    })();
    return () => { alive = false; };
  }, [list]);

  return (
    <main className="mx-auto max-w-content px-4 py-8 lg:px-8">
      <div className="flex items-center gap-2.5">
        <Icon name="heart" size={22} fill="currentColor" className="text-gold-dark" />
        <h1 className="text-2xl font-semibold tracking-tight">{t('saved')}</h1>
        {cards && cards.length > 0 && (
          <span className="text-lg font-medium text-muted">{cards.length}</span>
        )}
      </div>
      <p className="mt-1 text-sm text-muted">{t('savedSub')}</p>

      <div className="mt-6">
        {cards === null ? (
          <CardGridSkeleton count={Math.min(list.length || 3, 6)} />
        ) : cards.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold-dark">
              <Icon name="heart" size={26} />
            </span>
            <p className="mt-4 font-medium">{t('savedEmpty')}</p>
            <p className="mt-1 max-w-sm text-sm text-muted">{t('savedEmptyHint')}</p>
            <Link href="/properties"
              className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-ink px-5 py-2.5 text-sm font-medium text-white transition hover:bg-ink/90">
              <Icon name="search" size={16} />
              {t('browseAll')}
            </Link>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {cards.map((p) => <PropertyCardView key={p.id} p={p} />)}
          </div>
        )}
      </div>
    </main>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { baht, mediaUrl, type PropertyCard } from '@/lib/api';
import { Icon } from '@/components/Icon';
import { pick, useLang, typeLabel, type Lang } from '@/lib/lang';
import { useSwipe } from '@/lib/useSwipe';

/**
 * รูปในการ์ด + ลูกศร/ปัดนิ้วเปลี่ยนรูป (เปลี่ยนเรียลไทม์ลื่น)
 * วางรูปทุกใบซ้อนกันแล้ว crossfade ด้วย opacity — รูปโหลดไว้แล้ว (lazy ตอนการ์ดเข้าจอ)
 * ปัดบน "รูป" = เปลี่ยนรูป (touch-pan-y กันชนกับ carousel เลื่อนทรัพย์ของพาเรนต์)
 */
function CardImages({ type, images, cover, alt, lang }: { type: string; images: string[]; cover: string | null; alt: string; lang: Lang }) {
  const list = images.length ? images : cover ? [cover] : [];
  const [i, setI] = useState(0);
  const has = list.length > 1;

  const change = (dir: number) => setI((v) => (v + dir + list.length) % list.length);
  function step(e: React.MouseEvent, dir: number) {
    e.preventDefault(); e.stopPropagation();
    change(dir);
  }
  const swipe = useSwipe(change);

  return (
    <div className="relative aspect-[4/3] touch-pan-y overflow-hidden bg-gradient-to-br from-ink/90 to-gold-dark/70"
      {...(has ? swipe : {})}>
      {list.length === 0 ? (
        <div className="flex h-full items-center justify-center text-center text-white/90">
          <div>
            <div className="text-3xl font-semibold tracking-tight">ROS</div>
            <div className="mt-1 text-xs tracking-wide opacity-80">{typeLabel(type, lang)}</div>
          </div>
        </div>
      ) : (
        list.map((src, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={idx} src={mediaUrl(src)} alt={alt} loading={idx === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-300 ${idx === i ? 'opacity-100' : 'opacity-0'}`} />
        ))
      )}
      {has && (
        <>
          <button aria-label="รูปก่อนหน้า" onClick={(e) => step(e, -1)}
            className="absolute left-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white opacity-100 transition hover:bg-ink/70 sm:opacity-0 sm:group-hover:opacity-100"><Icon name="chevron-left" size={16} /></button>
          <button aria-label="รูปถัดไป" onClick={(e) => step(e, 1)}
            className="absolute right-2 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white opacity-100 transition hover:bg-ink/70 sm:opacity-0 sm:group-hover:opacity-100"><Icon name="chevron-right" size={16} /></button>
          <div className="absolute bottom-2 left-1/2 z-10 flex -translate-x-1/2 gap-1">
            {list.map((_, idx) => (
              <span key={idx} className={`h-1.5 rounded-full transition-all ${idx === i ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function PropertyCardView({ p }: { p: PropertyCard }) {
  const { lang, t } = useLang();
  const title = pick(p.title, lang);
  const meta = [
    typeLabel(p.type, lang),
    p.province,
    p.bedrooms ? `${p.bedrooms} ${lang === 'en' ? 'bed' : 'นอน'}` : null,
    p.areaSqm ? `${p.areaSqm} ${lang === 'en' ? 'sqm' : 'ตร.ม.'}` : null,
  ].filter(Boolean).join(' · ');

  return (
    <Link href={`/properties/${p.code}`} className="card group block overflow-hidden transition hover:border-gold/40 hover:shadow-lift">
      <CardImages type={p.type} images={p.images ?? []} cover={p.coverImage} alt={title} lang={lang} />
      <div className="p-4">
        {/* นำด้วยชื่อทรัพย์ → สเปก → ราคาทองเด่น (อ่านง่าย พรีเมียม ไม่ซ้ำ) */}
        <p className="truncate font-medium">{p.projectName || title}</p>
        <p className="mt-0.5 truncate text-sm text-muted">{meta}</p>
        <p className="mt-2.5 text-xl font-semibold tracking-tight text-gold-dark">
          ฿{baht(p.monthlyRent)} <span className="text-xs font-normal text-muted">{t('perMonth')}</span>
        </p>
        {(p.nearTransit || p.petFriendly) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {p.nearTransit && <span className="badge bg-gold/10 text-gold-dark">{t('nearTransit')}</span>}
            {p.petFriendly && <span className="badge bg-gold/10 text-gold-dark">{t('petFriendly')}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { baht, mediaUrl, type PropertyCard } from '@/lib/api';
import { Icon, type IconName } from '@/components/Icon';
import { pick, useLang, typeLabel, type Lang } from '@/lib/lang';
import { useSwipe } from '@/lib/useSwipe';
import { useFavorites } from '@/lib/favorites';

/** ประเภททรัพย์ → ไอคอน (บ้าน/ทาวน์โฮม = home · คอนโด/อพาร์ทเมนท์ = building) */
const TYPE_ICON: Record<string, IconName> = {
  house: 'home', townhome: 'home', condo: 'building', apartment: 'building',
};

/** ปุ่มหัวใจ (บันทึกทรัพย์) — client-only, sync ทุก card/header ผ่าน useFavorites
 *  กด = toggle + pop animation · stopPropagation กันชนกับลิงก์การ์ด · a11y aria-pressed */
function HeartButton({ code }: { code: string }) {
  const { isFavorite, toggle } = useFavorites();
  const { t } = useLang();
  const fav = isFavorite(code);
  const [pop, setPop] = useState(0);
  function onClick(e: React.MouseEvent) {
    e.preventDefault(); e.stopPropagation();
    toggle(code); setPop((n) => n + 1);
  }
  return (
    <button type="button" onClick={onClick} aria-pressed={fav} aria-label={t(fav ? 'unsaveAria' : 'saveAria')}
      className="absolute right-2.5 top-2.5 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-ink/40 text-white backdrop-blur transition hover:bg-ink/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 active:scale-90">
      <span key={pop} className={pop ? 'flex animate-heart-pop' : 'flex'}>
        <Icon name="heart" size={18} fill={fav ? 'currentColor' : 'none'} className={fav ? 'text-gold' : 'text-white'} />
      </span>
    </button>
  );
}

/**
 * รูปในการ์ด + ลูกศร/ปัดนิ้วเปลี่ยนรูป (เปลี่ยนเรียลไทม์ลื่น) + overlay (type-badge/หัวใจ/จำนวนรูป)
 * วางรูปทุกใบซ้อนกันแล้ว crossfade ด้วย opacity — รูปโหลดไว้แล้ว (lazy ตอนการ์ดเข้าจอ)
 * ปัดบน "รูป" = เปลี่ยนรูป (touch-pan-y กันชนกับ carousel เลื่อนทรัพย์ของพาเรนต์)
 */
function CardImages({ code, type, images, cover, alt, lang }: { code: string; type: string; images: string[]; cover: string | null; alt: string; lang: Lang }) {
  const { t } = useLang();
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
            onError={(e) => { e.currentTarget.style.display = 'none'; }}
            className={`absolute inset-0 h-full w-full object-cover transition-[opacity,transform] duration-500 ${idx === i ? 'opacity-100' : 'opacity-0'} group-hover:scale-[1.05]`} />
        ))
      )}

      {/* ป้ายประเภททรัพย์ (ซ้ายบน) — จัดหมวดทันทีด้วยตา (Gestalt) */}
      <span className="absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-md bg-ink/45 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
        <Icon name={TYPE_ICON[type] ?? 'building'} size={13} />
        {typeLabel(type, lang)}
      </span>

      {/* ปุ่มหัวใจ (ขวาบน) */}
      <HeartButton code={code} />

      {/* จำนวนรูป (ซ้ายล่าง) — บอกว่ามีรูปให้ดูอีก */}
      {has && (
        <span className="absolute bottom-2 left-2 z-10 inline-flex items-center gap-1 rounded-md bg-ink/55 px-2 py-0.5 text-2xs font-medium text-white backdrop-blur">
          <Icon name="image" size={12} />
          {list.length} {t('photosUnit')}
        </span>
      )}

      {has && (
        <>
          <button aria-label="รูปก่อนหน้า" onClick={(e) => step(e, -1)}
            className="absolute left-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white opacity-0 transition hover:bg-ink/70 sm:flex sm:group-hover:opacity-100"><Icon name="chevron-left" size={16} /></button>
          <button aria-label="รูปถัดไป" onClick={(e) => step(e, 1)}
            className="absolute right-2 top-1/2 z-10 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white opacity-0 transition hover:bg-ink/70 sm:flex sm:group-hover:opacity-100"><Icon name="chevron-right" size={16} /></button>
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

/** แถวสเปกย่อในการ์ด (bed/bath/area) — ไอคอนนำ ช่วยกวาดสายตา (คนละแบบกับ SpecStrip กล่องในหน้า detail) */
function CardSpecs({ p }: { p: PropertyCard }) {
  const { t } = useLang();
  const items: { icon: IconName; val: string }[] = [];
  if (p.bedrooms != null) items.push({ icon: 'bed', val: String(p.bedrooms) });
  if (p.bathrooms != null) items.push({ icon: 'bath', val: String(p.bathrooms) });
  if (p.areaSqm != null) items.push({ icon: 'area', val: `${p.areaSqm} ${t('sqmUnit')}` });
  if (items.length === 0) return null;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3.5 gap-y-1 text-sm text-ink-soft">
      {items.map((s) => (
        <span key={s.icon} className="inline-flex items-center gap-1">
          <Icon name={s.icon} size={15} className="shrink-0 text-muted" />{s.val}
        </span>
      ))}
    </div>
  );
}

export default function PropertyCardView({ p }: { p: PropertyCard }) {
  const { lang, t } = useLang();
  const title = pick(p.title, lang);
  const location = [p.province, p.district].filter(Boolean).join(' · ');

  return (
    <Link href={`/properties/${p.code}`} className="card group block overflow-hidden transition duration-200 hover:-translate-y-0.5 hover:border-gold/40 hover:shadow-lift">
      <CardImages code={p.code} type={p.type} images={p.images ?? []} cover={p.coverImage} alt={title} lang={lang} />
      <div className="p-4">
        {/* ชื่อทรัพย์ → ทำเล → สเปก(ไอคอน) → ราคาทองเด่น → ป้ายเด่น */}
        <p className="truncate font-medium">{p.projectName || title}</p>
        {location && <p className="mt-0.5 truncate text-sm text-muted">{location}</p>}
        <CardSpecs p={p} />
        <p className="mt-2.5 text-xl font-semibold tracking-tight text-gold-dark">
          ฿{baht(p.monthlyRent)} <span className="text-xs font-normal text-muted">{t('perMonth')}</span>
        </p>
        {(p.nearTransit || p.petFriendly) && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {p.nearTransit && <span className="badge inline-flex items-center gap-1 bg-gold/10 text-gold-dark"><Icon name="train" size={13} />{t('nearTransit')}</span>}
            {p.petFriendly && <span className="badge inline-flex items-center gap-1 bg-gold/10 text-gold-dark"><Icon name="paw" size={13} />{t('petFriendly')}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

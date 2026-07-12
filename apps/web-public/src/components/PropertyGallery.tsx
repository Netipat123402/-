'use client';

import { useState } from 'react';
import { mediaUrl } from '@/lib/api';
import { Icon } from '@/components/Icon';
import Lightbox from '@/components/Lightbox';
import { useSwipe } from '@/lib/useSwipe';
import { useLang, typeLabel } from '@/lib/lang';

/**
 * แกลเลอรีหน้า detail — responsive แยกตามอุปกรณ์ (re-layout ไม่ scale)
 *  - มือถือ/แท็บเล็ต (<lg): carousel รูปเดียว (crossfade + ลูกศร/ปัดนิ้ว + แถบ thumbnail)
 *  - เดสก์ท็อป (lg+): กริด "รูปใหญ่ 1 + thumbnail 2×2" (เห็นภาพรวมเร็ว ลด click) + ปุ่มดูรูปทั้งหมด
 *  ทั้งสองใช้ state/Lightbox ร่วมกัน — คลิกที่ใดเปิดดูเต็มจอที่รูปนั้น
 */
export default function PropertyGallery({ images, alt, type, overlay }: {
  images: string[]; alt: string; type: string;
  overlay?: React.ReactNode; // tag/สถานะทับรูป — ส่งมาเฉพาะหน้าแอดมิน (หน้า public ไม่ใส่ กันข้อมูลรั่ว)
}) {
  const { lang, t } = useLang();
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const has = images.length > 1;
  const go = (dir: number) => setI((v) => (v + dir + images.length) % images.length);
  const swipe = useSwipe(go);
  const openAt = (idx: number) => { setI(idx); setZoom(true); };

  // หน้าต่าง thumbnail (มือถือ) สูงสุด 4 ใบ เลื่อนให้รูปที่เลือกอยู่ในนั้นเสมอ
  const win = 4;
  const start = Math.max(0, Math.min(i - 1, Math.max(0, images.length - win)));
  const thumbs = images.slice(start, start + win);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full items-center justify-center rounded-card bg-gradient-to-br from-ink/90 to-gold-dark/70 text-center text-white/90 sm:max-h-[380px] lg:max-h-[440px]">
        <div>
          <div className="text-4xl font-semibold tracking-tight">ROS</div>
          <div className="mt-1 text-sm tracking-wide opacity-80">{typeLabel(type, lang)}</div>
        </div>
      </div>
    );
  }

  // ── หนึ่ง cell ในกริดเดสก์ท็อป — คลิกเปิด Lightbox ที่รูปนั้น + zoom เบา ๆ ตอน hover ──
  const Cell = ({ idx, className, moreCount }: { idx: number; className?: string; moreCount?: number }) => (
    <button type="button" onClick={() => openAt(idx)} aria-label={`${t('viewAllPhotos')} — ${idx + 1}/${images.length}`}
      className={`group/cell relative overflow-hidden bg-gradient-to-br from-ink/80 to-gold-dark/60 ${className ?? ''}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(images[idx])} alt={idx === 0 ? alt : ''} loading={idx === 0 ? 'eager' : 'lazy'}
        onError={(e) => { e.currentTarget.style.display = 'none'; }}
        className="h-full w-full object-cover transition-transform duration-500 group-hover/cell:scale-[1.04]" />
      {moreCount ? (
        <span className="absolute inset-0 flex items-center justify-center bg-ink/55 text-lg font-semibold text-white backdrop-blur-[1px]">
          +{moreCount}
        </span>
      ) : null}
    </button>
  );

  return (
    <div>
      {/* ══ มือถือ/แท็บเล็ต (<lg): carousel เดิม ══ */}
      <div className="lg:hidden">
        {/* role=button + คีย์บอร์ด (Enter/Space) → เปิด Lightbox ได้ด้วยคีย์บอร์ด */}
        <div role="button" tabIndex={0} aria-label="ดูรูปเต็มจอ"
          className="group relative aspect-[16/9] w-full cursor-zoom-in touch-pan-y overflow-hidden rounded-card bg-gradient-to-br from-ink/90 to-gold-dark/70 outline-none focus-visible:ring-2 focus-visible:ring-gold max-h-[40vh] sm:max-h-[34vh]"
          onClick={() => setZoom(true)}
          onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setZoom(true); } }}
          {...(has ? swipe : {})}>
          {images.map((src, idx) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={idx} src={mediaUrl(src)} alt={alt} loading={idx === 0 ? 'eager' : 'lazy'}
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${idx === i ? 'opacity-100' : 'opacity-0'}`} />
          ))}
          <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-ink/45 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"><Icon name="search" size={13} /> ดูรูปเต็ม</span>
          {/* overlay ทับรูป — ใส่เฉพาะเมื่อส่ง prop มา (หน้า public ไม่ใส่; หน้าแอดมินไว้โชว์สถานะ) */}
          {overlay && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-ink/65 via-ink/20 to-transparent px-4 pb-3 pt-10 text-xs">
              {overlay}
            </div>
          )}
          {/* มือถือ = ปัดนิ้วเปลี่ยนรูป (ไม่มีลูกศรบัง) + ตัวนับตำแหน่ง — Instagram/Airbnb mobile */}
          {has && (
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/55 px-2.5 py-1 text-xs font-medium text-white">{i + 1} / {images.length}</span>
          )}
        </div>

        {has && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            {thumbs.map((src, k) => {
              const idx = start + k;
              return (
                <button key={idx} onClick={() => setI(idx)} aria-label={`รูปที่ ${idx + 1}`}
                  className={`relative aspect-[4/3] overflow-hidden rounded-lg transition ${idx === i ? 'ring-2 ring-gold' : 'opacity-80 hover:opacity-100'}`}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={mediaUrl(src)} alt="" loading="lazy" onError={(e) => { e.currentTarget.style.display = 'none'; }} className="h-full w-full object-cover" />
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ══ เดสก์ท็อป (lg+): กริดรูปใหญ่ 1 + thumbnail 2×2 ══ */}
      <div className="hidden lg:block">
        {images.length === 1 ? (
          <Cell idx={0} className="aspect-[16/9] w-full rounded-card" />
        ) : images.length <= 4 ? (
          // 2–4 รูป: รูปใหญ่ซ้าย + ที่เหลือเรียงขวา (ไม่มีช่องโหว่)
          <div className="grid h-[440px] grid-cols-3 gap-2">
            <Cell idx={0} className="col-span-2 rounded-l-card" />
            <div className="grid gap-2" style={{ gridTemplateRows: `repeat(${images.length - 1}, minmax(0, 1fr))` }}>
              {images.slice(1).map((_, k) => (
                <Cell key={k + 1} idx={k + 1} className={`${k === 0 ? 'rounded-tr-card' : ''} ${k === images.length - 2 ? 'rounded-br-card' : ''}`} />
              ))}
            </div>
          </div>
        ) : (
          // 5+ รูป: รูปใหญ่ + 2×2 thumbnail (ปุ่ม +N บนใบสุดท้ายถ้ามีเพิ่ม)
          <div className="grid h-[440px] grid-cols-4 grid-rows-2 gap-2">
            <Cell idx={0} className="col-span-2 row-span-2 rounded-l-card" />
            <Cell idx={1} className="" />
            <Cell idx={2} className="rounded-tr-card" />
            <Cell idx={3} className="" />
            <Cell idx={4} className="rounded-br-card" moreCount={images.length > 5 ? images.length - 5 : undefined} />
          </div>
        )}

        {/* ปุ่มดูรูปทั้งหมด — มุมขวาล่างของกริด (Fitts: target ชัด) */}
        {has && (
          <button type="button" onClick={() => openAt(0)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-2 text-sm font-medium text-ink-soft transition hover:border-gold hover:text-ink">
            <Icon name="image" size={16} />
            {t('viewAllPhotos')} <span className="text-muted">({images.length})</span>
          </button>
        )}
      </div>

      {zoom && <Lightbox images={images} index={i} alt={alt} onClose={() => setZoom(false)} onIndex={setI} />}
    </div>
  );
}

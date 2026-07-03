'use client';

import { useState } from 'react';
import { mediaUrl } from '@/lib/api';
import { Icon } from '@/components/Icon';
import Lightbox from '@/components/Lightbox';
import { useSwipe } from '@/lib/useSwipe';
import { useLang, typeLabel } from '@/lib/lang';

/**
 * แกลเลอรีหน้า detail — รูปหลักเปลี่ยนเรียลไทม์ (crossfade) ด้วยลูกศร/คลิก thumbnail
 * thumbnail โชว์สูงสุด 4 (หน้าต่างเลื่อนตามรูปที่เลือก) responsive ตาม device
 */
export default function PropertyGallery({ images, alt, type, overlay }: {
  images: string[]; alt: string; type: string;
  overlay?: React.ReactNode; // tag/สถานะทับรูป — ส่งมาเฉพาะหน้าแอดมิน (หน้า public ไม่ใส่ กันข้อมูลรั่ว)
}) {
  const { lang } = useLang();
  const [i, setI] = useState(0);
  const [zoom, setZoom] = useState(false);
  const has = images.length > 1;
  const go = (dir: number) => setI((v) => (v + dir + images.length) % images.length);
  const swipe = useSwipe(go);

  // หน้าต่าง thumbnail สูงสุด 4 ใบ เลื่อนให้รูปที่เลือกอยู่ในนั้นเสมอ
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

  return (
    <div>
      {/* role=button + คีย์บอร์ด (Enter/Space) → เปิด Lightbox ได้ด้วยคีย์บอร์ด (เปิดเป็น <button> ไม่ได้เพราะมีปุ่ม ‹›ซ้อนใน) + มีตัวรับคืนโฟกัสตอนปิด */}
      <div role="button" tabIndex={0} aria-label="ดูรูปเต็มจอ"
        className="group relative aspect-[16/9] w-full cursor-zoom-in touch-pan-y overflow-hidden rounded-card bg-gradient-to-br from-ink/90 to-gold-dark/70 outline-none focus-visible:ring-2 focus-visible:ring-gold max-h-[40vh] sm:max-h-[34vh]"
        onClick={() => setZoom(true)}
        onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setZoom(true); } }}
        {...(has ? swipe : {})}>
        {images.map((src, idx) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={idx} src={mediaUrl(src)} alt={alt} loading={idx === 0 ? 'eager' : 'lazy'}
            className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-200 ${idx === i ? 'opacity-100' : 'opacity-0'}`} />
        ))}
        <span className="pointer-events-none absolute left-3 top-3 flex items-center gap-1 rounded-full bg-ink/45 px-2.5 py-1 text-xs font-medium text-white opacity-0 transition group-hover:opacity-100"><Icon name="search" size={13} /> ดูรูปเต็ม</span>
        {/* overlay ทับรูป — ใส่เฉพาะเมื่อส่ง prop มา (หน้า public ไม่ใส่; หน้าแอดมินไว้โชว์สถานะ) */}
        {overlay && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap items-center gap-2 bg-gradient-to-t from-ink/65 via-ink/20 to-transparent px-4 pb-3 pt-10 text-xs">
            {overlay}
          </div>
        )}
        {has && (
          <>
            <button aria-label="รูปก่อนหน้า" onClick={(e) => { e.stopPropagation(); go(-1); }}
              className="absolute left-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition duration-150 hover:bg-ink/70 active:scale-90 active:bg-ink/80"><Icon name="chevron-left" size={20} /></button>
            <button aria-label="รูปถัดไป" onClick={(e) => { e.stopPropagation(); go(1); }}
              className="absolute right-2.5 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition duration-150 hover:bg-ink/70 active:scale-90 active:bg-ink/80"><Icon name="chevron-right" size={20} /></button>
            <span className="absolute bottom-3 right-3 rounded-full bg-ink/55 px-2.5 py-1 text-xs font-medium text-white">{i + 1} / {images.length}</span>
          </>
        )}
      </div>

      {zoom && <Lightbox images={images} index={i} alt={alt} onClose={() => setZoom(false)} onIndex={setI} />}

      {has && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {thumbs.map((src, k) => {
            const idx = start + k;
            return (
              <button key={idx} onClick={() => setI(idx)} aria-label={`รูปที่ ${idx + 1}`}
                className={`relative aspect-[4/3] overflow-hidden rounded-lg transition ${idx === i ? 'ring-2 ring-gold' : 'opacity-80 hover:opacity-100'}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl(src)} alt="" loading="lazy" className="h-full w-full object-cover" />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

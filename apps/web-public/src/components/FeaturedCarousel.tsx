'use client';

import { useRef } from 'react';
import Link from 'next/link';
import PropertyCardView from './PropertyCard';
import { Icon } from '@/components/Icon';
import { useLang, type DictKey } from '@/lib/lang';
import type { PropertyCard } from '@/lib/api';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * ทรัพย์แนะนำ — โชว์ 3 ตัว/แถว (responsive 1/2/3)
 * ลูกศร "เปลี่ยนทรัพย์" อยู่มุมขวาบน (คู่หัวข้อ) — แยกชัดจากลูกศร "เปลี่ยนรูป" ในแต่ละการ์ด
 */
export default function FeaturedCarousel({ items, titleKey = 'featured', subKey = 'featuredSub', viewAllHref = '/properties', size = 'lg' }: {
  // size: 'lg' = หมวดหลัก (ทรัพย์แนะนำ) · 'sm' = หมวดรอง (ติด BTS/MRT/เลี้ยงสัตว์) → สร้างลำดับชั้นสายตา (B3)
  items: PropertyCard[]; titleKey?: DictKey; subKey?: DictKey; viewAllHref?: string; size?: 'lg' | 'sm';
}) {
  const ref = useRef<HTMLDivElement>(null);
  const animating = useRef(false);
  const { t } = useLang();

  const scroll = (dir: number) => {
    const el = ref.current;
    if (!el || animating.current) return;
    // เลื่อนเป็นจำนวน "ความกว้างการ์ด + ช่องไฟ" เต็ม ๆ — ลงตรง snap point เสมอทุกขนาดจอ
    const first = el.firstElementChild as HTMLElement | null;
    const stride = first ? first.getBoundingClientRect().width + 20 : el.clientWidth; // 20 = gap-5
    const perView = Math.max(1, Math.round(el.clientWidth / stride));
    const start = el.scrollLeft;
    const max = el.scrollWidth - el.clientWidth;
    const target = Math.max(0, Math.min(max, start + dir * perView * stride));
    if (Math.abs(target - start) < 1) return;

    // เลื่อนลื่นด้วยลูป (ตั้ง scrollLeft ตรง ๆ ต่อเฟรม) + ปิด snap ชั่วคราว
    // (behavior:'smooth' ของ browser โดน snap-mandatory ดึงกลับบนจอเล็ก จึงทำเอง)
    animating.current = true;
    const prevSnap = el.style.scrollSnapType;
    el.style.scrollSnapType = 'none';
    const dur = 420;
    const t0 = performance.now();
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      el.scrollLeft = target; // ลงปลายทางให้ชัวร์
      el.style.scrollSnapType = prevSnap;
      animating.current = false;
    };
    const step = () => {
      const p = Math.min(1, (performance.now() - t0) / dur);
      el.scrollLeft = start + (target - start) * easeOutCubic(p);
      if (p < 1) setTimeout(step, 16);
      else finish();
    };
    step();
    // กัน snap ค้าง/animating ค้าง ถ้าลูปสะดุด (เช่น tab พื้นหลัง) — บังคับจบเสมอ
    setTimeout(finish, dur + 250);
  };

  const many = items.length > 3;

  return (
    <section>
      <div className="mb-5 flex items-end justify-between gap-3">
        <div>
          <h2 className={`font-serif font-semibold tracking-tight ${size === 'lg' ? 'text-2xl' : 'text-xl'}`}>{t(titleKey)}</h2>
          <p className="mt-1 text-sm text-muted">{t(subKey)}</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {many && (
            <div className="flex gap-1.5">
              <button onClick={() => scroll(-1)} aria-label="ทรัพย์ก่อนหน้า"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-gold hover:text-gold-dark active:bg-canvas"><Icon name="chevron-left" size={18} /></button>
              <button onClick={() => scroll(1)} aria-label="ทรัพย์ถัดไป"
                className="flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink transition hover:border-gold hover:text-gold-dark active:bg-canvas"><Icon name="chevron-right" size={18} /></button>
            </div>
          )}
          <Link href={viewAllHref} className="hidden items-center gap-1 whitespace-nowrap text-sm text-gold-dark hover:underline sm:inline-flex">{t('viewAll')} <Icon name="arrow-right" size={14} /></Link>
        </div>
      </div>

      <div ref={ref}
        className="flex snap-x snap-mandatory gap-5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((p) => (
          <div key={p.id}
            className="snap-start shrink-0 basis-full sm:basis-[calc(50%-10px)] lg:basis-[calc(33.333%-14px)]">
            <PropertyCardView p={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

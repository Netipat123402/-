import Link from 'next/link';
import type { FeaturedListing } from '@/lib/demo';

// FeaturedCard — pixel-clone Findit (Home bento) · มินิมอล: รูปมุมโค้งบนพื้นเทา + ป้าย + ชื่อ + ที่อยู่
// wide = การ์ดกว้าง 2 คอลัมน์ (รูป 2:1) · ปกติ 4:3 · การ์ดแถวบน (wide/ไม่มีหมวด) รูปสูงกว่าเล็กน้อย
export default function FeaturedCard({ p }: { p: FeaturedListing }) {
  const hasTag = p.category || p.deal;
  return (
    <Link
      href={`/property/${p.slug}`}
      className={`group flex flex-col overflow-hidden rounded-card bg-soft transition hover:shadow-[0_14px_44px_rgba(0,0,0,0.10)] ${p.wide ? 'sm:col-span-2' : ''}`}
    >
      <div className={`relative overflow-hidden ${p.wide ? 'aspect-[16/9] sm:aspect-[2/1]' : hasTag ? 'aspect-[4/3]' : 'aspect-[4/3] sm:aspect-square'}`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={p.img} alt={p.name} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
        {hasTag && (
          <div className="absolute left-4 top-4 flex gap-2">
            {p.category && <span className="rounded-pill bg-ink px-3 py-1.5 text-xs font-normal text-white">{p.category}</span>}
            {p.deal && <span className="rounded-pill bg-white px-3 py-1.5 text-xs font-normal text-ink">{p.deal}</span>}
          </div>
        )}
      </div>
      <div className="px-5 pb-6 pt-4">
        <h3 className="text-xl font-medium text-ink">{p.name}</h3>
        <p className="mt-1.5 text-sm text-body">{p.address}</p>
      </div>
    </Link>
  );
}

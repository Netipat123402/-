import { Skeleton } from '@/components/loaders';

/**
 * Loading boundary หน้า detail — skeleton "ทรงเดียวกับหน้าจริง" (gallery + specs + รายละเอียด + ฟอร์ม)
 * แทน fallback ระดับ root (card-grid) ที่ผิดทรง → ลด layout-shift/กระตุกตอนสลับเป็นเนื้อหาจริง
 * โครงตรงกับ properties/[code]/page.tsx: mobile = hero 16/9 + thumbnail strip · desktop = กริดรูปใหญ่ 1 + 2×2
 */
export default function Loading() {
  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-6 lg:px-8 lg:pb-16">
      {/* ── Gallery ── */}
      {/* มือถือ/แท็บเล็ต: hero + แถบ thumbnail (ตรงกับ PropertyGallery <lg) */}
      <div className="lg:hidden">
        <Skeleton className="aspect-[16/9] w-full rounded-card max-h-[40vh] sm:max-h-[34vh]" />
        <div className="mt-3 grid grid-cols-4 gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      </div>
      {/* เดสก์ท็อป: กริดรูปใหญ่ 1 + 2×2 (ตรงกับ PropertyGallery lg+) */}
      <div className="hidden h-[440px] grid-cols-4 grid-rows-2 gap-2 lg:grid">
        <Skeleton className="col-span-2 row-span-2 rounded-l-card" />
        <Skeleton className="rounded-none" />
        <Skeleton className="rounded-tr-card" />
        <Skeleton className="rounded-none" />
        <Skeleton className="rounded-br-card" />
      </div>

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* ซ้าย — meta / title / price / specs / การ์ดรายละเอียด */}
        <div>
          <Skeleton className="h-4 w-40" />
          <Skeleton className="mt-2 h-8 w-3/4 lg:h-9" />
          <Skeleton className="mt-2 h-4 w-1/2" />
          <Skeleton className="mt-4 h-8 w-32" />

          {/* specs icon-row (bed/bath/area/floor) */}
          <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-5 w-16" />
            ))}
          </div>

          {/* การ์ดรายละเอียด */}
          <div className="mt-6 rounded-card border border-border bg-surface p-5 lg:p-6">
            <Skeleton className="h-5 w-28" />
            <div className="mt-3 space-y-2.5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          </div>
        </div>

        {/* ขวา — การ์ดฟอร์มนัดดูทรัพย์ (sticky บนเดสก์ท็อป) */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <div className="space-y-4 rounded-card border border-border bg-surface p-5 lg:p-6">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </aside>
      </div>
    </main>
  );
}

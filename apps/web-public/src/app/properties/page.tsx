import Link from 'next/link';
import { publicGet, PUBLIC_PROPERTIES_TAG, type PropertyCard } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import ListingSearch from '@/components/ListingSearch';
import CategoryTabs from '@/components/CategoryTabs';
import FilterSidebar from '@/components/FilterSidebar';
import PropertyCardView from '@/components/PropertyCard';
import { Icon } from '@/components/Icon';
import { T, ResultCount } from '@/components/T';

export const revalidate = 300;
export const metadata = { title: 'ค้นหาทรัพย์' };

const PAGE_SIZE = 24;
// คีย์ตัวกรองที่ "ขนต่อ" ไปกับลิงก์เปลี่ยนหน้า (ไม่รวม page/limit)
const FILTER_KEYS = ['type', 'province', 'minRent', 'maxRent', 'bedrooms', 'train', 'amenity', 'q', 'sort'] as const;

type SP = { [k: string]: string | undefined };

export default async function SearchPage({ searchParams }: { searchParams: SP }) {
  const page = Math.max(1, Number(searchParams.page) || 1);

  const qs = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    if (searchParams[k]) qs.set(k, searchParams[k]!);
  }
  qs.set('limit', String(PAGE_SIZE));
  qs.set('page', String(page));

  const result = await publicGet<PropertyCard[]>(`/public/properties?${qs.toString()}`, 300, [PUBLIC_PROPERTIES_TAG]);
  const items = result.data ?? [];
  const total = result.meta?.total ?? 0;
  const totalPages = result.meta?.totalPages ?? 1;

  // ลิงก์ไปหน้า p โดยรักษาตัวกรองเดิม (URL สะอาด: ไม่ใส่ page เมื่อหน้า 1, ไม่โชว์ limit)
  const pageHref = (p: number) => {
    const u = new URLSearchParams();
    for (const k of FILTER_KEYS) {
      if (searchParams[k]) u.set(k, searchParams[k]!);
    }
    if (p > 1) u.set('page', String(p));
    const s = u.toString();
    return s ? `/properties?${s}` : '/properties';
  };

  return (
    <main className="mx-auto max-w-content px-4 py-8 lg:px-8">
      <h1 className="text-2xl font-semibold tracking-tight"><T k="browseTitle" /></h1>

      {/* ค้นหา — มือถือ: SearchBar เดิม (input+sheet) · เดสก์ท็อป: ช่องค้นหา (ตัวกรองไปอยู่ sidebar)
          key = คิวรีปัจจุบัน → remount SearchBar ให้ sync state จาก URL เมื่อแท็บ/ตัวกรองเปลี่ยน (กัน internal state ค้าง) */}
      <div className="mt-4 lg:hidden"><SearchBar key={JSON.stringify(searchParams)} compact /></div>
      <div className="mt-4 hidden lg:block"><ListingSearch /></div>

      {/* แท็บประเภท (ทุกขนาด) */}
      <div className="mt-4"><CategoryTabs sp={searchParams} /></div>

      {/* เดสก์ท็อป: sidebar (sticky) + ผลลัพธ์ · มือถือ: ผลลัพธ์อย่างเดียว (ตัวกรองใน sheet ของ SearchBar) */}
      <div className="mt-6 lg:grid lg:grid-cols-[220px_1fr] lg:items-start lg:gap-8">
        <aside className="hidden lg:sticky lg:top-20 lg:block"><FilterSidebar /></aside>

        <div>
          <p className="text-sm text-muted"><ResultCount total={total} /></p>

          {items.length === 0 ? (
            <div className="card mt-4 px-6 py-20 text-center">
              <p className="font-medium"><T k="noResults" /></p>
              <p className="mt-1 text-sm text-muted"><T k="noResultsHint" /></p>
            </div>
          ) : (
            <>
              <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {items.map((p) => <PropertyCardView key={p.id} p={p} />)}
              </div>

              {/* B1: เปลี่ยนหน้า — SSR ผ่าน URL (รักษาตัวกรอง, SEO-friendly, ไม่ต้องพึ่ง JS) */}
              {totalPages > 1 && (
                <nav className="mt-10 flex items-center justify-center gap-3" aria-label="แบ่งหน้า">
                  {page > 1 ? (
                    <Link href={pageHref(page - 1)} rel="prev" aria-label="หน้าก่อนหน้า" scroll={false}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-soft transition duration-150 hover:border-gold hover:text-ink active:scale-90">
                      <Icon name="chevron-left" size={20} />
                    </Link>
                  ) : (
                    <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted opacity-40">
                      <Icon name="chevron-left" size={20} />
                    </span>
                  )}

                  <span className="min-w-[5rem] text-center text-sm font-medium tabular-nums text-ink-soft">
                    {page} / {totalPages}
                  </span>

                  {page < totalPages ? (
                    <Link href={pageHref(page + 1)} rel="next" aria-label="หน้าถัดไป" scroll={false}
                      className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-ink-soft transition duration-150 hover:border-gold hover:text-ink active:scale-90">
                      <Icon name="chevron-right" size={20} />
                    </Link>
                  ) : (
                    <span aria-hidden className="flex h-11 w-11 items-center justify-center rounded-full border border-border bg-surface text-muted opacity-40">
                      <Icon name="chevron-right" size={20} />
                    </span>
                  )}
                </nav>
              )}
            </>
          )}
        </div>
      </div>
    </main>
  );
}

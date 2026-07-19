import Link from 'next/link';
import { publicGet, PUBLIC_PROPERTIES_TAG, type PropertyCard } from '@/lib/api';
import SearchBar from '@/components/SearchBar';
import FilterBar from '@/components/FilterBar';
import SortSelect from '@/components/SortSelect';
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

  // มีตัวกรองอยู่ไหม (ไม่นับ sort/page) — ใช้ตัดสินใจโชว์ปุ่ม "ล้างตัวกรอง" ตอนไม่พบผล
  const hasFilters = FILTER_KEYS.some((k) => k !== 'sort' && searchParams[k]);

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

      {/* A (Zillow, เจ้าของเคาะ): ช่องค้นหาเต็มแถว → FilterBar (dropdown pills ทุกจอ) · type เป็น dropdown ใน FilterBar
          (ไม่มี CategoryTabs แยก · filter อยู่ "ใต้" search ไม่ใช่ "ข้าง") · key remount sync state จาก URL */}
      <div className="mt-4"><SearchBar key={JSON.stringify(searchParams)} compact /></div>
      <div className="mt-3"><FilterBar /></div>
      {/* แถวผลลัพธ์ — ผลซ้าย · เรียงขวา (Zillow) · sort โผล่เมื่อมีผลให้เรียง */}
      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted"><ResultCount total={total} /></p>
        {total > 0 && <SortSelect />}
      </div>

      {/* ผลลัพธ์เต็มความกว้าง (ไม่มี sidebar) — การ์ด 4 คอลัมน์บนจอใหญ่ */}
      <div className="mt-4">
        {items.length === 0 ? (
          <div className="card flex flex-col items-center px-6 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gold/10 text-gold-dark">
              <Icon name="search" size={26} />
            </span>
            <p className="mt-4 font-medium"><T k="noResults" /></p>
            <p className="mt-1 max-w-sm text-sm text-muted"><T k="noResultsHint" /></p>
            {hasFilters && (
              <Link href="/properties" scroll={false}
                className="mt-6 inline-flex items-center gap-1.5 rounded-lg border border-gold/45 px-4 py-2.5 text-sm font-medium text-gold-dark transition hover:bg-gold/5">
                <T k="clearFilters" />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
    </main>
  );
}

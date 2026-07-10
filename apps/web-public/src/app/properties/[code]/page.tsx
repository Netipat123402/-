import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { baht, publicGet, PUBLIC_PROPERTIES_TAG, type PropertyDetail, type PropertyCard } from '@/lib/api';
import PropertyGallery from '@/components/PropertyGallery';
import FeaturedCarousel from '@/components/FeaturedCarousel';
import AppointmentForm from '@/components/AppointmentForm';
import StickyCTA from '@/components/StickyCTA';
import { ViewTracker } from '@/components/ViewTracker';
import { Localized } from '@/components/Localized';
import { T, MetaLine, SpecStrip, AmenityBadges, PriceMonthly } from '@/components/T';
import ReadMore from '@/components/ReadMore';

export const revalidate = 300;

async function getProperty(code: string): Promise<PropertyDetail | null> {
  // ใส่ tag เพื่อให้รีเฟรชทันทีเมื่อทรัพย์เปลี่ยน (ราคา/รายละเอียด/สถานะ)
  const r = await publicGet<PropertyDetail>(`/public/properties/${encodeURIComponent(code)}`, 300, [PUBLIC_PROPERTIES_TAG]);
  return r.data ?? null;
}

export async function generateMetadata({ params }: { params: { code: string } }): Promise<Metadata> {
  const p = await getProperty(params.code);
  if (!p) return { title: 'ไม่พบทรัพย์', robots: { index: false, follow: false } };
  const t = `${p.title.th} · เช่า ฿${baht(p.monthlyRent)}/เดือน`;
  return { title: t, description: p.description.th ?? t };
}

export default async function PropertyDetailPage({ params }: { params: { code: string } }) {
  const p = await getProperty(params.code);
  if (!p) notFound();

  // ทรัพย์ใกล้เคียง (ranking ฝั่ง backend ตามความคล้าย)
  const similar = (await publicGet<PropertyCard[]>(`/public/properties/${encodeURIComponent(p.code)}/similar`, 300, [PUBLIC_PROPERTIES_TAG])).data ?? [];

  const hasAmenity = Object.values(p.amenities ?? {}).some((v) => v === true);

  // เรียงรูป: ปกขึ้นก่อน
  const ordered = [...(p.media ?? [])].sort((a, b) => (a.isCover === b.isCover ? 0 : a.isCover ? -1 : 1));

  return (
    <main className="mx-auto max-w-content px-4 pb-28 pt-6 lg:px-8 lg:pb-16">
      {/* MR-13: นับ view ฝั่ง client (ไม่ติด ISR cache) */}
      <ViewTracker code={p.code} />
      <PropertyGallery images={ordered.map((m) => m.url)} alt={p.title.th} type={p.type} />

      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* left */}
        <div>
          {/* ส่วนหัว — ลำดับสายตาชัด: ประเภท/ทำเล (เบา) → ชื่อโครงการ (เด่น) → คำบรรยาย (รอง) → ราคา (ทอง)
              ชื่อหลัก = ชื่อโครงการ (สั้น ลูกค้าจำได้ ไม่ล้นจอ) ตรงกับการ์ด; คำบรรยายยาวลงมาเป็นบรรทัดรอง */}
          <p className="text-sm text-muted"><MetaLine type={p.type} province={p.location.province} /></p>
          {p.location.projectName ? (
            <>
              <h1 className="mt-1.5 text-2xl font-semibold leading-snug tracking-tight lg:text-3xl">{p.location.projectName}</h1>
              <Localized as="p" th={p.title.th} en={p.title.en} className="mt-1 text-sm text-muted" />
            </>
          ) : (
            <Localized as="h1" th={p.title.th} en={p.title.en} className="mt-1.5 text-2xl font-semibold leading-snug tracking-tight lg:text-3xl" />
          )}
          <PriceMonthly amount={p.monthlyRent} />

          <SpecStrip bedrooms={p.bedrooms} bathrooms={p.bathrooms} areaSqm={p.areaSqm} floor={p.floor} />

          {/* เนื้อหา = การ์ดเอกสารพรีเมียม (เข้าชุด admin) · หัวข้ออ่านง่าย · เว้นช่องหายใจ */}
          {(p.description.th || p.description.en) && (
            <section className="mt-6 rounded-card border border-border bg-surface p-5 lg:p-6">
              <h2 className="text-base font-semibold"><T k="details" /></h2>
              <div className="mt-3 leading-relaxed text-ink-soft">
                <ReadMore th={p.description.th} en={p.description.en} />
              </div>
            </section>
          )}

          {hasAmenity && (
            <section className="mt-4 rounded-card border border-border bg-surface p-5 lg:p-6">
              <h2 className="text-base font-semibold"><T k="amenities" /></h2>
              <AmenityBadges amenities={p.amenities} />
            </section>
          )}

          {(p.location.subdistrict || p.location.district || p.location.province) && (
            <section className="mt-4 rounded-card border border-border bg-surface p-5 lg:p-6">
              <h2 className="text-base font-semibold"><T k="location" /></h2>
              <p className="mt-3 text-ink-soft">
                {[p.location.subdistrict, p.location.district, p.location.province].filter(Boolean).join(' · ')}
              </p>
            </section>
          )}
        </div>

        {/* right — appointment (sticky on desktop) */}
        <aside className="lg:sticky lg:top-20 lg:self-start">
          <AppointmentForm propertyCode={p.code} />
        </aside>
      </div>

      {/* ทรัพย์ใกล้เคียง — เติมพื้นที่ว่างใต้ดีเทล (Phase 13) */}
      {similar.length > 0 && (
        <section className="mt-14">
          <FeaturedCarousel items={similar} titleKey="similarProperties" subKey="similarPropertiesSub" viewAllHref="/properties" />
        </section>
      )}

      <StickyCTA />
    </main>
  );
}

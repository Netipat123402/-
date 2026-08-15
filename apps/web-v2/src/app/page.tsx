import Link from 'next/link';
import PropertyCard from '@/components/PropertyCard';
import { DEMO_PROPERTIES } from '@/lib/demo';

const IStar = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
  </svg>
);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{children}</p>;
}

export default function Home() {
  return (
    <>
      {/* HERO — โคลน Findit: badge + headline ใหญ่กลาง + 2 ปุ่ม + รูปเต็มกว้าง */}
      <section className="wrap flex flex-col items-center pt-16 text-center md:pt-24">
        <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface px-4 py-2 text-sm font-medium text-body shadow-[0_2px_10px_rgba(0,0,0,0.04)]">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-white">{IStar}</span>
          พาร์ตเนอร์อสังหาฯ ที่คุณไว้ใจ
        </span>
        <h1 className="mt-7 max-w-4xl text-[40px] font-semibold leading-[1.08] tracking-tightish sm:text-[64px] md:text-[76px]">
          บ้าน·ทรัพย์ในฝัน<br />อยู่ใกล้แค่เอื้อม
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted">
          ค้นหาทรัพย์คัดสรรที่ตรงไลฟ์สไตล์คุณ ไม่ว่าจะซื้อ ขาย เช่า หรือลงทุน — ทีมงานมืออาชีพดูแลทุกขั้นตอน
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/property" className="btn-dark">ดูทรัพย์ทั้งหมด</Link>
          <Link href="/contact" className="btn-outline">นัดชมทรัพย์</Link>
        </div>
        <div className="mt-14 w-full overflow-hidden rounded-card md:mt-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/asset-009.jpg" alt="ทรัพย์คุณภาพจาก Notify"
            className="aspect-[16/10] w-full object-cover md:aspect-[16/8]" />
        </div>
      </section>

      {/* FEATURED — โคลน "Explore our featured listings" */}
      <section className="wrap py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>ทรัพย์แนะนำ</Eyebrow>
            <h2 className="mt-3 max-w-xl text-[30px] font-semibold leading-tight sm:text-[42px]">
              ทรัพย์คัดสรรสำหรับคุณ
            </h2>
            <p className="mt-3 max-w-md text-muted">
              ตั้งแต่คอนโดใจกลางเมือง ถึงบ้านพร้อมสวน — เลือกหลังที่ใช่สำหรับคุณ
            </p>
          </div>
          <Link href="/property" className="btn-outline shrink-0">ดูทั้งหมด</Link>
        </div>

        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PROPERTIES.map((p) => (
            <PropertyCard key={p.slug} p={p} />
          ))}
        </div>
      </section>
    </>
  );
}

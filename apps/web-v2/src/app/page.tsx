import Link from 'next/link';
import PropertyCard from '@/components/PropertyCard';
import {
  DEMO_PROPERTIES, DEMO_CITIES, DEMO_STEPS, DEMO_TESTIMONIALS, DEMO_ARTICLES,
} from '@/lib/demo';

const IStar = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.8 5.9 20.6l1.4-6.8L2.2 9.1l6.9-.8L12 2z" />
  </svg>
);
const ICheck = (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="M20 6L9 17l-5-5" /></svg>
);

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted">{children}</p>;
}

export default function Home() {
  return (
    <>
      {/* HERO — pixel-clone Findit (STAGE1 · EN) · centered: badge → H1 72/600 → subtext → 2 ปุ่ม → รูปกว้าง */}
      <section className="wrap flex flex-col items-center pt-20 text-center md:pt-24">
        <span className="inline-flex items-center gap-2 rounded-pill bg-white py-1 pl-2 pr-4 text-base font-normal text-ink shadow-[0_2px_12px_rgba(0,0,0,0.06)] ring-1 ring-black/5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-white">{IStar}</span>
          Your trusted partner in real estate
        </span>
        <h1 className="mt-6 text-[40px] font-semibold leading-[1.05] tracking-tight sm:text-[56px] md:text-[72px]">
          Your dream home,<br />just a step away
        </h1>
        <p className="mt-6 max-w-[500px] text-lg leading-relaxed text-body">
          Discover handpicked properties that match your lifestyle, whether you&rsquo;re buying, selling, or investing.
        </p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <Link href="/property" className="inline-flex items-center justify-center rounded-pill bg-ink px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">Explore properties</Link>
          <Link href="/contact" className="inline-flex items-center justify-center rounded-pill border border-ink bg-white px-4 py-2.5 text-[15px] font-semibold text-ink transition hover:bg-ink hover:text-white">Book a visit</Link>
        </div>
        <div className="mt-14 w-full overflow-hidden rounded-card md:mt-16">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/assets/asset-001.jpg" alt="Premium real estate interior" className="aspect-[16/10] w-full object-cover md:aspect-[16/9]" />
        </div>
      </section>

      {/* FEATURED */}
      <section className="wrap py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>ทรัพย์แนะนำ</Eyebrow>
            <h2 className="mt-3 max-w-xl text-[30px] font-semibold leading-tight sm:text-[42px]">ทรัพย์คัดสรรสำหรับคุณ</h2>
            <p className="mt-3 max-w-md text-muted">ตั้งแต่คอนโดใจกลางเมือง ถึงบ้านพร้อมสวน — เลือกหลังที่ใช่สำหรับคุณ</p>
          </div>
          <Link href="/property" className="btn-outline shrink-0">ดูทั้งหมด</Link>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PROPERTIES.map((p) => <PropertyCard key={p.slug} p={p} />)}
        </div>
      </section>

      {/* ABOUT teaser — split image + text + trust points (แทน stats ปลอม Findit) */}
      <section className="bg-soft">
        <div className="wrap grid items-center gap-10 py-20 md:grid-cols-2 md:py-28">
          <div className="overflow-hidden rounded-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/assets/asset-004.jpg" alt="ทีมงาน Notify" className="aspect-[4/3] w-full object-cover" />
          </div>
          <div>
            <Eyebrow>เกี่ยวกับเรา</Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[40px]">สร้างบ้าน สร้างชีวิต<br />ทีละหลัง</h2>
            <p className="mt-4 max-w-md text-muted">
              เรามากกว่านายหน้า — เราคือพาร์ตเนอร์ที่อยู่เคียงข้างคุณในหนึ่งในการตัดสินใจสำคัญของชีวิต ด้วยความเข้าใจ ความเชี่ยวชาญ และความจริงใจ
            </p>
            <ul className="mt-6 space-y-3">
              {['คัดสรรทุกทรัพย์ก่อนนำเสนอ', 'ทีมมืออาชีพ ให้คำแนะนำตรงไปตรงมา', 'ดูแลตั้งแต่ค้นหาจนปิดดีล'].map((t) => (
                <li key={t} className="flex items-center gap-3 text-body">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-white">{ICheck}</span>{t}
                </li>
              ))}
            </ul>
            <Link href="/about" className="btn-dark mt-8">รู้จักเราเพิ่มเติม</Link>
          </div>
        </div>
      </section>

      {/* CITIES — "Our location for you" */}
      <section className="wrap py-20 md:py-28">
        <div className="max-w-xl">
          <Eyebrow>ทำเล</Eyebrow>
          <h2 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[42px]">ทำเลสำหรับคุณ</h2>
          <p className="mt-3 text-muted">แต่ละย่านมีเรื่องราวของตัวเอง — เลือกทำเลที่ใช่กับไลฟ์สไตล์คุณ</p>
        </div>
        <div className="mt-10 grid grid-cols-2 gap-5 lg:grid-cols-4">
          {DEMO_CITIES.map((c) => (
            <Link key={c.name} href="/property" className="group relative aspect-[3/4] overflow-hidden rounded-card">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={c.img} alt={c.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-0 left-0 p-5 text-white">
                <p className="text-lg font-semibold">{c.name}</p>
                <p className="text-sm text-white/80">{c.count}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* STEPS — "Simple steps" */}
      <section className="bg-soft">
        <div className="wrap py-20 text-center md:py-28">
          <Eyebrow>ขั้นตอน</Eyebrow>
          <h2 className="mx-auto mt-3 max-w-xl text-[30px] font-semibold leading-tight sm:text-[42px]">ง่ายในไม่กี่ขั้น สู่บ้านในฝัน</h2>
          <p className="mx-auto mt-3 max-w-md text-muted">ไม่ว่าจะซื้อ เช่า หรือลงทุน เราทำให้ทุกขั้นตอนเรียบง่าย</p>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DEMO_STEPS.map((s) => (
              <div key={s.no} className="rounded-card border border-line bg-surface p-8 text-left">
                <span className="text-3xl font-bold text-ink/20">{s.no}</span>
                <h3 className="mt-3 text-xl font-semibold text-ink">{s.title}</h3>
                <p className="mt-2 text-muted">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FRESH on the market — 3 ทรัพย์มาใหม่ */}
      <section className="wrap py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>ทรัพย์มาใหม่</Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[42px]">อัปเดตล่าสุดในตลาด</h2>
            <p className="mt-3 max-w-md text-muted">ทรัพย์คุณภาพที่เพิ่งเข้าสู่ตลาด — คว้าก่อนใคร</p>
          </div>
          <Link href="/property" className="btn-outline shrink-0">ดูทั้งหมด</Link>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_PROPERTIES.slice(0, 3).map((p) => <PropertyCard key={p.slug} p={p} />)}
        </div>
      </section>

      {/* TESTIMONIALS — "What our clients say" */}
      <section className="bg-ink text-white">
        <div className="wrap py-20 md:py-28">
          <div className="max-w-xl">
            <Eyebrow><span className="text-white/60">เสียงจากลูกค้า</span></Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight text-white sm:text-[42px]">เรื่องจริงจากคนที่ไว้ใจเรา</h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {DEMO_TESTIMONIALS.map((t) => (
              <figure key={t.name} className="rounded-card border border-white/15 bg-white/5 p-7">
                <div className="flex gap-1 text-white">{Array.from({ length: 5 }).map((_, i) => <span key={i}>{IStar}</span>)}</div>
                <blockquote className="mt-4 text-white/90">“{t.quote}”</blockquote>
                <figcaption className="mt-5">
                  <p className="font-semibold text-white">{t.name}</p>
                  <p className="text-sm text-white/60">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* INSIGHTS — "Insights & Updates" (⚠️ placeholder · เราเลื่อน blog — รอเจ้าของตัดสินเก็บ/ตัด) */}
      <section className="wrap py-20 md:py-28">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <Eyebrow>ความรู้·อัปเดต</Eyebrow>
            <h2 className="mt-3 text-[30px] font-semibold leading-tight sm:text-[42px]">บทความ·เคล็ดลับอสังหาฯ</h2>
            <p className="mt-3 max-w-md text-muted">ความรู้และเทรนด์ตลาด ช่วยให้ทุกการตัดสินใจของคุณมั่นใจขึ้น</p>
          </div>
        </div>
        <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {DEMO_ARTICLES.map((a) => (
            <Link key={a.slug} href="/blog" className="group block overflow-hidden rounded-card border border-line bg-surface transition hover:shadow-[0_12px_40px_rgba(0,0,0,0.10)]">
              <div className="aspect-[16/10] overflow-hidden bg-soft">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={a.img} alt={a.title} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
              </div>
              <div className="p-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">{a.category} · {a.date}</p>
                <h3 className="mt-2 text-lg font-semibold leading-snug text-ink">{a.title}</h3>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}

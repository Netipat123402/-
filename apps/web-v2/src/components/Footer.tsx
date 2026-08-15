import Link from 'next/link';

// Footer โคลนโครง Findit: CTA band (ดำ) → footer 4 คอลัมน์ + newsletter → bottom bar
// เนื้อหา = Notify (5 เสา) · ที่อยู่/ติดต่อ = placeholder ให้เจ้าของเติมจริง (ไม่ก๊อปข้อมูลปลอม Findit)
const COMPANY = [
  { label: 'ทรัพย์ทั้งหมด', href: '/property' },
  { label: 'ซื้อ', href: '/property?for=sale' },
  { label: 'เช่า', href: '/property?for=rent' },
  { label: 'Network', href: '/network' },
];
const QUICK = [
  { label: 'เกี่ยวกับเรา', href: '/about' },
  { label: 'บริการ', href: '/services' },
  { label: 'ฝากทรัพย์', href: '/add-property' },
  { label: 'ติดต่อ', href: '/contact' },
];

function Social({ label, d }: { label: string; d: string }) {
  return (
    <a href="#" aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-body transition hover:border-ink hover:text-ink">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={d} /></svg>
    </a>
  );
}

export default function Footer() {
  return (
    <footer>
      {/* CTA band — ดำ (Findit "Ready to find your dream home?") */}
      <section className="bg-ink text-white">
        <div className="wrap flex flex-col items-center gap-6 py-16 text-center md:py-20">
          <h2 className="max-w-2xl text-[34px] font-semibold leading-tight text-white sm:text-[44px]">
            พร้อมเจอบ้าน·ทรัพย์ที่ใช่แล้วหรือยัง?
          </h2>
          <p className="max-w-lg text-white/70">
            ไม่ว่าจะซื้อ เช่า ปล่อยเช่า หรือให้เราดูแลทรัพย์ — ทีมงานพร้อมดูแลคุณทุกขั้นตอน
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/contact" className="inline-flex items-center justify-center rounded-pill bg-white px-6 py-3 text-sm font-semibold text-ink transition hover:opacity-90">
              นัดปรึกษา
            </Link>
            <Link href="/add-property" className="inline-flex items-center justify-center rounded-pill border border-white/40 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white hover:text-ink">
              ฝากทรัพย์
            </Link>
          </div>
        </div>
      </section>

      {/* Footer body */}
      <div className="border-t border-line bg-surface">
        <div className="wrap grid grid-cols-2 gap-x-6 gap-y-10 py-14 md:grid-cols-4 lg:grid-cols-5">
          {/* brand */}
          <div className="col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">N</span>
              <span className="text-[19px] font-bold text-ink">Notify</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              ซื้อ · ขาย · เช่า · ดูแลทรัพย์ — พาร์ตเนอร์อสังหาฯ ที่ดูแลคุณตั้งแต่ค้นหาจนปิดดีล
            </p>
            <div className="mt-5 flex gap-2.5">
              <Social label="Facebook" d="M13 3h4V0h-4a5 5 0 0 0-5 5v3H5v3h3v10h3V11h3l1-3h-4V5a2 2 0 0 1 2-2z" />
              <Social label="Instagram" d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4a3.6 3.6 0 0 1-1.4-.9 3.6 3.6 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 12 18.6 6.6 6.6 0 0 0 12 5.4zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm6.8-11.2a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" />
              <Social label="YouTube" d="M23 7.5a3 3 0 0 0-2.1-2.1C19 5 12 5 12 5s-7 0-8.9.4A3 3 0 0 0 1 7.5 31 31 0 0 0 .6 12 31 31 0 0 0 1 16.5a3 3 0 0 0 2.1 2.1C5 19 12 19 12 19s7 0 8.9-.4a3 3 0 0 0 2.1-2.1c.3-1.5.4-3 .4-4.5s-.1-3-.4-4.5zM9.8 15.3V8.7l5.7 3.3-5.7 3.3z" />
            </div>
          </div>

          {/* Our Company */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Our Company</p>
            <ul className="mt-4 space-y-3 text-sm">
              {COMPANY.map((l) => (
                <li key={l.label}><Link href={l.href} className="text-body transition hover:text-ink">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">Quick Links</p>
            <ul className="mt-4 space-y-3 text-sm">
              {QUICK.map((l) => (
                <li key={l.label}><Link href={l.href} className="text-body transition hover:text-ink">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div className="col-span-2 lg:col-span-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-faint">รับข่าวสาร</p>
            <p className="mt-4 text-sm text-muted">ทรัพย์ใหม่ · ดีลเด่น ส่งตรงถึงคุณ</p>
            <form className="mt-3 flex gap-2">
              <input type="email" placeholder="อีเมลของคุณ"
                className="h-11 w-full rounded-pill border border-line bg-surface px-4 text-sm outline-none focus:border-ink" />
              <button type="submit" className="btn-dark shrink-0 !px-5 !py-2.5">ส่ง</button>
            </form>
          </div>
        </div>

        {/* bottom bar */}
        <div className="border-t border-line">
          <div className="wrap flex flex-col items-center justify-between gap-3 py-6 text-xs text-muted sm:flex-row">
            <span>© 2026 Notify Real Estate. All rights reserved.</span>
            <div className="flex gap-5">
              <Link href="/legal/terms" className="transition hover:text-ink">Terms of Service</Link>
              <Link href="/legal/privacy" className="transition hover:text-ink">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

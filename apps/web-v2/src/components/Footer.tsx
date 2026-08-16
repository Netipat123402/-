import Link from 'next/link';

// Footer — เลย์เอาต์ pixel-clone Findit (คงเป๊ะ) · เนื้อหา = Notify (STAGE2 · 5 เสา)
// footer ดำ · CTA card ลอยคร่อมรอยตัดขาว→ดำ · 4 คอลัมน์ (Contact/Explore/Company/Newsletter) · bottom bar

const EXPLORE = [
  { label: 'All Properties', href: '/property' },
  { label: 'For Sale', href: '/property?for=sale' },
  { label: 'For Rent', href: '/property?for=rent' },
  { label: 'Services', href: '/services' },
];
const COMPANY = [
  { label: 'Network', href: '/network' },
  { label: 'Investment', href: '/investment' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
];

export default function Footer() {
  return (
    <footer className="relative overflow-hidden bg-black text-white">
      {/* พื้นขาวชั้นบน (absolute) — สร้างรอยตัดคม ขาว→ดำ ให้การ์ด CTA ลอยคร่อม */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[260px] bg-surface sm:h-[300px]" />

      <div className="wrap relative pt-14 sm:pt-20">
        {/* CTA card — รูปบ้าน + overlay เข้ม + radius 10 */}
        <div className="relative overflow-hidden rounded-[10px]">
          <div
            className="absolute inset-0 bg-cover bg-center"
            style={{ backgroundImage: 'url(/assets/asset-011.jpg)' }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-black/50 to-black/70" />
          <div className="relative flex flex-col items-center gap-5 px-6 py-20 text-center sm:py-24 md:py-28">
            <h2 className="max-w-[640px] text-[30px] font-medium leading-[1.2] text-white sm:text-[38px] md:text-[42px] md:leading-[50px]">
              Ready to find your dream home?
            </h2>
            <p className="max-w-[560px] text-[15px] leading-relaxed text-white/85 sm:text-base">
              Whether you&rsquo;re buying, selling, or investing, our team is here to guide you every step of the way. Let&rsquo;s make your next move simple and successful.
            </p>
            <Link
              href="/contact"
              className="mt-1 inline-flex items-center justify-center rounded-pill bg-white px-6 py-2.5 text-sm font-semibold text-ink transition hover:opacity-90"
            >
              Schedule a consultation
            </Link>
          </div>
        </div>

        {/* 4 คอลัมน์ — ขาวบนดำ */}
        <div className="grid grid-cols-1 gap-x-12 gap-y-10 pt-16 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.5fr] lg:pt-20">
          {/* Contact */}
          <div>
            <h6 className="text-[20px] font-medium leading-6 text-white">Contact</h6>
            <address className="mt-4 space-y-3 text-sm not-italic leading-relaxed text-white/80">
              <p className="max-w-[220px]">Bangkok, Thailand</p>
              <p><a href="tel:+6620000000" className="transition hover:text-white">+66 2 000 0000</a></p>
              <p><a href="mailto:hello@notify.co" className="transition hover:text-white">hello@notify.co</a></p>
            </address>
          </div>

          {/* Explore */}
          <div>
            <h6 className="text-[20px] font-medium leading-6 text-white">Explore</h6>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {EXPLORE.map((l) => (
                <li key={l.label}><Link href={l.href} className="transition hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h6 className="text-[20px] font-medium leading-6 text-white">Company</h6>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {COMPANY.map((l) => (
                <li key={l.label}><Link href={l.href} className="transition hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Join Our Newsletter */}
          <div>
            <h6 className="text-[20px] font-medium leading-6 text-white">Join Our Newsletter</h6>
            <p className="mt-4 text-sm text-white/80">Sign up for updates on our latest news.</p>
            <form className="mt-4 flex h-[52px] items-center rounded-pill bg-white pl-5 pr-1.5">
              <input
                type="email"
                placeholder="Enter your e-mail"
                className="h-full w-full bg-transparent text-[15px] text-ink outline-none placeholder:text-faint"
              />
              <button
                type="submit"
                aria-label="Subscribe"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-white transition hover:opacity-90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M7 17 17 7M9 7h8v8" />
                </svg>
              </button>
            </form>
            <p className="mt-4 text-xs leading-relaxed text-white/60">
              By clicking subscribe, you agree to the{' '}
              <Link href="/legal/terms" className="font-bold text-white/80 transition hover:text-white">Terms of Service</Link> and{' '}
              <Link href="/legal/privacy" className="font-bold text-white/80 transition hover:text-white">Privacy Policy</Link>.
            </p>
          </div>
        </div>

        {/* bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/15 py-7 sm:flex-row">
          <p className="text-sm text-white/80">
            Copyright &copy; 2026 <span className="font-bold">Notify</span> Real Estate. All rights reserved.
          </p>
          <div className="flex items-center gap-5 text-sm">
            <span className="text-white">Follow us :</span>
            <a href="#" className="text-white/80 transition hover:text-white">Instagram</a>
            <a href="#" className="text-white/80 transition hover:text-white">Facebook</a>
            <a href="#" className="text-white/80 transition hover:text-white">Youtube</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

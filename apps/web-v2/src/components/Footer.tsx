import Link from 'next/link';

// Footer — pixel-clone Findit (STAGE1)
// ⚠️ เนื้อหา/อังกฤษ = Findit เดิมชั่วคราว เพื่อให้ pixel-diff ตรง (จะสลับเป็น Notify/ไทยใน STAGE2)
// โครง Findit (วัด DOM สด 1440): footer ดำ · CTA = การ์ดรูปมุมโค้ง 10px ลอยคร่อมรอยตัดขาว→ดำ
// · 4 คอลัมน์ขาวบนดำ (3 แคบ + 1 กว้าง newsletter) · bottom bar

const OUR_COMPANY = [
  { label: 'All Properties', href: '/property' },
  { label: 'Property for Buy', href: '/property?for=buy' },
  { label: 'Property for Rent', href: '/property?for=rent' },
  { label: 'Our Agents', href: '/agents' },
];
const QUICK_LINKS = [
  { label: 'About Us', href: '/about' },
  { label: 'Contact Us', href: '/contact' },
  { label: 'Latest News', href: '/blog' },
  { label: '404', href: '/404' },
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
          {/* Contact Us */}
          <div>
            <h6 className="text-[20px] font-medium leading-6 text-white">Contact Us</h6>
            <address className="mt-4 space-y-3 text-sm not-italic leading-relaxed text-white/80">
              <p className="max-w-[220px]">123 Main Street, Suite 456, Cityville, ST 78901</p>
              <p><a href="tel:+11234567890" className="transition hover:text-white">(123) 456-7890</a></p>
              <p><a href="tel:+19876543210" className="transition hover:text-white">(987) 654-3210</a></p>
              <p><a href="mailto:info@findit.com" className="transition hover:text-white">info@findit.com</a></p>
            </address>
          </div>

          {/* Our Company */}
          <div>
            <h6 className="text-[20px] font-medium leading-6 text-white">Our Company</h6>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {OUR_COMPANY.map((l) => (
                <li key={l.label}><Link href={l.href} className="transition hover:text-white">{l.label}</Link></li>
              ))}
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h6 className="text-[20px] font-medium leading-6 text-white">Quick Links</h6>
            <ul className="mt-4 space-y-3 text-sm text-white/80">
              {QUICK_LINKS.map((l) => (
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
            Copyright &copy; 2025 - Findit by <span className="font-bold">Marcframe</span>. All rights reserved.
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

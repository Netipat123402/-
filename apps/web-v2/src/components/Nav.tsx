'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

// Nav — เลย์เอาต์ pixel-clone Findit (คงเป๊ะ) · IA = Notify 5 เสา (STAGE2)
// Properties▾(เสา1 For Sale/Rent) · Services(2) · Network(4) · Investment(5) · About · [Contact][Submit=เสา3]
// สเปก: header h 78px ขาว · links 16/500 active#000 inactive#747474 · ปุ่ม pill ดำ/outline
const PROPERTIES_SUB = [
  { label: 'All Properties', href: '/property' },
  { label: 'For Sale', href: '/property?for=sale' },
  { label: 'For Rent', href: '/property?for=rent' },
];
const NAV = [
  { label: 'Properties', href: '/property', sub: PROPERTIES_SUB },
  { label: 'Services', href: '/services' },
  { label: 'Network', href: '/network' },
  { label: 'Investment', href: '/investment' },
  { label: 'About', href: '/about' },
];

// โลโก้ Notify — box "N" ดำ + wordmark (mirror โครง Findit icon+text · STAGE2 rebrand)
function Logo() {
  return (
    <Link href="/" aria-label="Notify home" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-black text-[17px] font-bold leading-none text-white">N</span>
      <span className="flex flex-col leading-none">
        <span className="text-[19px] font-extrabold tracking-tight text-black">Notify</span>
        <span className="mt-0.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-[#747474]">Real Estate</span>
      </span>
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
      <nav className="mx-auto flex h-[78px] max-w-[1200px] items-center justify-between px-6 xl:px-0">
        {/* ซ้าย = logo + links เกาะกลุ่ม (ตรงต้นแบบ) */}
        <div className="flex items-center" style={{ gap: '38px' }}>
          <Logo />
          <ul className="hidden items-center xl:flex" style={{ gap: '30px' }}>
            {NAV.map((n) => {
              const active = pathname === n.href || (n.sub && pathname.startsWith('/property'));
              return (
                <li key={n.href} className="group relative">
                  <Link href={n.href}
                    className={`inline-flex items-center gap-1 text-[16px] font-medium transition-colors hover:text-black ${active ? 'text-black' : 'text-[#747474]'}`}>
                    {n.label}
                    {n.sub && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 transition-transform group-hover:rotate-180" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>}
                  </Link>
                  {n.sub && (
                    <div className="invisible absolute left-0 top-full z-50 min-w-[190px] translate-y-1 pt-3 opacity-0 transition-all group-hover:visible group-hover:translate-y-0 group-hover:opacity-100">
                      <ul className="overflow-hidden rounded-[10px] bg-white p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.12)] ring-1 ring-line">
                        {n.sub.map((s) => (
                          <li key={s.href}>
                            <Link href={s.href} className="block rounded-lg px-3 py-2 text-[14px] font-medium text-[#747474] transition hover:bg-soft hover:text-black">{s.label}</Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>

        {/* ปุ่มขวา — desktop */}
        <div className="hidden items-center gap-2.5 xl:flex">
          <Link href="/contact" className="rounded-full bg-black px-4 py-2.5 text-[15px] font-semibold text-white transition hover:opacity-90">Contact us</Link>
          <Link href="/add-property" className="rounded-full border border-black/15 bg-white px-4 py-2.5 text-[15px] font-semibold text-black transition hover:border-black">Submit property</Link>
        </div>

        {/* hamburger — <1200 */}
        <button onClick={() => setOpen((v) => !v)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-black xl:hidden">
          <span className="relative block h-4 w-5">
            <span className={`absolute left-0 block h-0.5 w-5 bg-black transition-all ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
            <span className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-black transition-all ${open ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute left-0 block h-0.5 w-5 bg-black transition-all ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
          </span>
        </button>
      </nav>

      {/* mobile menu */}
      {open && (
        <div className="border-t border-line bg-white xl:hidden">
          <ul className="mx-auto flex max-w-[1360px] flex-col px-6 py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)} className="block py-3 text-base font-medium text-ink transition hover:text-black">{n.label}</Link>
                {n.sub && (
                  <ul className="mb-1 ml-3 flex flex-col border-l border-line pl-4">
                    {n.sub.map((s) => (
                      <li key={s.href}><Link href={s.href} onClick={() => setOpen(false)} className="block py-2 text-sm font-medium text-[#747474] transition hover:text-black">{s.label}</Link></li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <div className="mx-auto flex max-w-[1360px] flex-col gap-3 px-6 pb-5 pt-2">
            <Link href="/contact" onClick={() => setOpen(false)} className="rounded-full bg-black px-4 py-3 text-center text-[15px] font-semibold text-white">Contact us</Link>
            <Link href="/add-property" onClick={() => setOpen(false)} className="rounded-full border border-black/15 px-4 py-3 text-center text-[15px] font-semibold text-black">Submit property</Link>
          </div>
        </div>
      )}
    </header>
  );
}

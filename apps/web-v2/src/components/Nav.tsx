'use client';

import Link from 'next/link';
import { useState } from 'react';

// P1 · Nav — pixel-clone Findit (Stage 1 · เนื้อหา Findit อังกฤษ · จะ swap เป็น Notify 4 เสา ที่ P12)
// สเปกวัดจากต้นแบบ @1440: header h 78px ขาว · links Manrope 16/500 · active #000 · inactive #747474 · gap 30px
// ปุ่ม Contact us = ดำ pill 15/600 radius50 pad 10x16 · Submit property = outline
const NAV = [
  { label: 'Home', href: '/' },
  { label: 'About us', href: '/about' },
  { label: 'Properties', href: '/property' },
  { label: 'Agents', href: '/agent' },
  { label: 'Blog', href: '/blog' },
];

function Logo() {
  return (
    <Link href="/" aria-label="Findit home" className="flex items-center">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/assets/asset-008-logo.svg" alt="Findit" className="h-[26px] w-auto" />
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 bg-white shadow-[0_6px_24px_rgba(0,0,0,0.04)]">
      <nav className="mx-auto flex h-[78px] max-w-[1200px] items-center justify-between px-6 xl:px-0">
        {/* ซ้าย = logo + links เกาะกลุ่ม (ตรงต้นแบบ) */}
        <div className="flex items-center" style={{ gap: '38px' }}>
          <Logo />
          <ul className="hidden items-center xl:flex" style={{ gap: '30px' }}>
            {NAV.map((n, i) => (
              <li key={n.href}>
                <Link href={n.href}
                  className={`text-[16px] font-medium transition-colors hover:text-black ${i === 0 ? 'text-black' : 'text-[#747474]'}`}>
                  {n.label}
                </Link>
              </li>
            ))}
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
                <Link href={n.href} onClick={() => setOpen(false)} className="block py-3 text-base font-medium text-[#747474] transition hover:text-black">{n.label}</Link>
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

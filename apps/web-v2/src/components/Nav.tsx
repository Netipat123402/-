'use client';

import Link from 'next/link';
import { useState } from 'react';

// Nav โคลนสไตล์ Findit: โลโก้ซ้าย · ลิงก์กลาง · ปุ่มขวา (Contact outline + ฝากทรัพย์ ดำ)
// มือถือ: โลโก้ + hamburger → เปิดแผงเมนู · เนื้อหา = 5 เสา Notify
const NAV = [
  { label: 'Home', href: '/' },
  { label: 'Properties', href: '/property' },
  { label: 'Services', href: '/services' },
  { label: 'Network', href: '/network' },
  { label: 'About', href: '/about' },
];

function Logo() {
  return (
    <Link href="/" aria-label="Notify หน้าแรก" className="flex items-center gap-2">
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-bold text-white">N</span>
      <span className="text-[19px] font-bold tracking-tightish text-ink">Notify</span>
    </Link>
  );
}

export default function Nav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-line bg-surface/90 backdrop-blur">
      <nav className="wrap flex h-[72px] items-center justify-between">
        <Logo />

        {/* ลิงก์กลาง — เดสก์ท็อป */}
        <ul className="hidden items-center gap-8 text-sm font-medium text-body lg:flex">
          {NAV.map((n) => (
            <li key={n.href}>
              <Link href={n.href} className="transition hover:text-ink">{n.label}</Link>
            </li>
          ))}
        </ul>

        {/* ปุ่มขวา — เดสก์ท็อป */}
        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/contact" className="btn-outline !px-5 !py-2.5">Contact</Link>
          <Link href="/add-property" className="btn-dark !px-5 !py-2.5">ฝากทรัพย์</Link>
        </div>

        {/* Hamburger — มือถือ/แท็บเล็ต */}
        <button
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'ปิดเมนู' : 'เปิดเมนู'}
          aria-expanded={open}
          className="flex h-10 w-10 items-center justify-center rounded-lg text-ink lg:hidden"
        >
          <span className="relative block h-4 w-5">
            <span className={`absolute left-0 block h-0.5 w-5 bg-ink transition-all ${open ? 'top-1.5 rotate-45' : 'top-0'}`} />
            <span className={`absolute left-0 top-1.5 block h-0.5 w-5 bg-ink transition-all ${open ? 'opacity-0' : 'opacity-100'}`} />
            <span className={`absolute left-0 block h-0.5 w-5 bg-ink transition-all ${open ? 'top-1.5 -rotate-45' : 'top-3'}`} />
          </span>
        </button>
      </nav>

      {/* แผงเมนูมือถือ */}
      {open && (
        <div className="border-t border-line bg-surface lg:hidden">
          <ul className="wrap flex flex-col py-2">
            {NAV.map((n) => (
              <li key={n.href}>
                <Link href={n.href} onClick={() => setOpen(false)}
                  className="block py-3 text-base font-medium text-body transition hover:text-ink">
                  {n.label}
                </Link>
              </li>
            ))}
          </ul>
          <div className="wrap flex flex-col gap-3 pb-5 pt-2">
            <Link href="/contact" onClick={() => setOpen(false)} className="btn-outline w-full">Contact</Link>
            <Link href="/add-property" onClick={() => setOpen(false)} className="btn-dark w-full">ฝากทรัพย์</Link>
          </div>
        </div>
      )}
    </header>
  );
}

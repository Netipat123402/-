'use client';

import Link from 'next/link';
import { useLang } from '@/lib/lang';
import { LINE_URL } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { Icon } from './Icon';
import LangToggle from './LangToggle';

/** ลิงก์รายการโปรด + ตัวนับ — หัวใจเติมทองเมื่อมีรายการ · sync สดกับปุ่มบนการ์ด */
function SavedLink() {
  const { t } = useLang();
  const { count } = useFavorites();
  return (
    <Link href="/saved" aria-label={`${t('saved')}${count ? ` (${count})` : ''}`}
      className="relative hidden h-9 w-9 items-center justify-center rounded-full text-ink-soft transition hover:bg-raised hover:text-ink lg:flex">
      <Icon name="heart" size={20} fill={count ? 'currentColor' : 'none'} className={count ? 'text-gold-dark' : ''} />
      {count > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-dark px-1 text-2xs font-semibold leading-none text-white">
          {count > 99 ? '99+' : count}
        </span>
      )}
    </Link>
  );
}

export function Header() {
  const { t } = useLang();
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-content items-center justify-between px-4 lg:px-8">
        {/* โลโก้ไอคอนล้วน — เรียบ minimal (เอา wordmark "ROS" ออก) */}
        <Link href="/" aria-label="ROS หน้าแรก" className="flex items-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-base font-semibold text-gold">R</span>
        </Link>
        {/* ขวา: สลับภาษา + ติดต่อแบบ "pill เส้นทอง" — พรีเมียม minimal (เติมทองตอน hover) ไม่จืดเหมือน outline เทา */}
        <nav className="flex items-center gap-3 text-sm">
          {/* C2: ลิงก์ดูทรัพย์ทั้งหมด (discoverability) — ซ่อนจอเล็กสุดกัน header แน่น */}
          {/* บนมือถือย้ายไป bottom-nav (ค้นหา/โปรด/ติดต่อ) — header เหลือ logo + ภาษา · เดสก์ท็อปโชว์ครบ */}
          <Link href="/properties" className="hidden text-ink-soft transition hover:text-ink lg:inline">
            {t('searchProperties')}
          </Link>
          <SavedLink />
          <LangToggle />
          <a href={LINE_URL} target="_blank" rel="noreferrer"
            className="hidden items-center rounded-full border border-gold/45 px-4 py-2 text-sm font-medium text-gold-dark transition hover:bg-gold hover:text-white lg:inline-flex">
            {t('contact')}
          </a>
        </nav>
      </div>
    </header>
  );
}

export function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      {/* เว้นล่างบนมือถือให้พ้น bottom-nav/StickyCTA (fixed) — เดสก์ท็อปไม่มีแถบล่าง */}
      <div className="mx-auto max-w-content px-4 pb-24 pt-10 lg:px-8 lg:pb-10">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-sm font-semibold text-gold">R</span>
          <span className="text-lg font-semibold">ROS</span>
        </div>
        <p className="mt-3 max-w-md text-sm text-muted">
          บริการนายหน้าปล่อยเช่าอสังหาริมทรัพย์ คอนโด บ้าน ทาวน์โฮม อพาร์ทเมนท์ — คัดสรรคุณภาพโดยทีมงานมืออาชีพ
        </p>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/properties" className="hover:text-ink">ค้นหาทรัพย์</Link>
          <Link href="/privacy" className="hover:text-ink">นโยบายความเป็นส่วนตัว</Link>
          <a href={LINE_URL} target="_blank" rel="noreferrer" className="hover:text-ink">LINE</a>
        </div>
        <p className="mt-8 text-xs text-muted">© 2026 ROS Real Estate. All rights reserved.</p>
      </div>
    </footer>
  );
}

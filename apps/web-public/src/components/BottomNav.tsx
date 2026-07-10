'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useLang } from '@/lib/lang';
import { LINE_URL } from '@/lib/api';
import { useFavorites } from '@/lib/favorites';
import { Icon, type IconName } from '@/components/Icon';

/**
 * แถบนำทางล่างจอ (mobile only, lg:hidden) — app-like (Jakob/thumb-reach)
 * ซ่อนบนหน้า detail (`/properties/[code]`) เพราะ StickyCTA เป็น CTA เฉพาะทรัพย์แทน (กัน 2 แถบชน)
 * รายการ: หน้าแรก · ค้นหา · โปรด(+badge) · ติดต่อ(LINE)
 */
export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useLang();
  const { count } = useFavorites();

  // หน้า detail = /properties/<code> (มี segment ต่อจาก /properties) → ซ่อน nav ให้ StickyCTA ทำงาน
  const isDetail = pathname.startsWith('/properties/') && pathname !== '/properties';
  if (isDetail) return null;

  const items: { href: string; icon: IconName; label: string; active: boolean; badge?: number }[] = [
    { href: '/', icon: 'home', label: t('navHome'), active: pathname === '/' },
    { href: '/properties', icon: 'search', label: t('search'), active: pathname === '/properties' },
    { href: '/saved', icon: 'heart', label: t('navSaved'), active: pathname === '/saved', badge: count },
  ];

  const itemCls = (active: boolean) =>
    `relative flex flex-1 flex-col items-center gap-0.5 py-2 text-2xs transition ${active ? 'text-gold-dark' : 'text-muted'}`;

  return (
    <nav aria-label="เมนูหลัก"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
      <div className="mx-auto flex max-w-content items-stretch">
        {items.map((it) => (
          <Link key={it.href} href={it.href} aria-current={it.active ? 'page' : undefined} className={itemCls(it.active)}>
            <span className="relative">
              <Icon name={it.icon} size={22} fill={it.icon === 'heart' && it.active ? 'currentColor' : 'none'} />
              {it.badge ? (
                <span className="absolute -right-2 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-gold-dark px-1 text-2xs font-semibold leading-none text-white">
                  {it.badge > 99 ? '99+' : it.badge}
                </span>
              ) : null}
            </span>
            {it.label}
          </Link>
        ))}
        <a href={LINE_URL} target="_blank" rel="noreferrer" className={itemCls(false)}>
          <Icon name="message" size={22} />
          {t('navContact')}
        </a>
      </div>
    </nav>
  );
}

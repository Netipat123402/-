'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import NotificationBell from '@/components/NotificationBell';
import GlobalSearch from '@/components/GlobalSearch';
import ProfileMenu from '@/components/ProfileMenu';
import PropertyForm from '@/components/PropertyForm';
import PullToRefresh from '@/components/PullToRefresh';
import { ToastProvider } from '@/components/Toast';
import { Modal } from '@/components/ui';
import { useScrollLock } from '@/lib/useScrollLock';
import { useFocusTrap } from '@/lib/useFocusTrap';
import ThemeToggle from '@/components/ThemeToggle';
import { Icon, type IconName } from '@/components/Icon';

type NavItem = { href: string; label: string; icon: IconName; perm?: [string, string] };
// เรียงตาม flow ธุรกิจอสังหา: ตั้งต้นคลังทรัพย์ (เจ้าของ→ทรัพย์) → งานขาย (Lead→นัด→ปฏิทิน→ลูกค้า→สัญญา)
const NAV: { group: string; items: NavItem[] }[] = [
  { group: 'ภาพรวม', items: [{ href: '/', label: 'แดชบอร์ด', icon: 'home' }] },
  {
    group: 'คลังทรัพย์',
    items: [
      { href: '/owners', label: 'เจ้าของ', icon: 'key', perm: ['owner', 'read'] },
      { href: '/properties', label: 'ทรัพย์', icon: 'building', perm: ['property', 'read'] },
    ],
  },
  {
    group: 'งานขาย',
    items: [
      { href: '/leads', label: 'Lead', icon: 'user-plus', perm: ['lead', 'read'] },
      { href: '/appointments', label: 'นัดหมาย', icon: 'clock', perm: ['appointment', 'read'] },
      { href: '/calendar', label: 'ปฏิทิน', icon: 'calendar', perm: ['appointment', 'read'] },
      { href: '/customers', label: 'ลูกค้า', icon: 'users', perm: ['customer', 'read'] },
      { href: '/contracts', label: 'สัญญา', icon: 'file-text', perm: ['contract', 'read'] },
    ],
  },
  // หมายเหตุ: กลุ่ม "ระบบ" (ผู้ใช้/ตรวจสอบ/ตั้งค่า) ย้ายไปเมนูโปรไฟล์ (ProfileMenu)
];

// กลุ่ม "ระบบ/บัญชี" — โชว์ในเมนูโปรไฟล์ (ตั้งค่า + กิจกรรม ตามที่ผู้ใช้ขอ)
const SYSTEM: { href: string; label: string; icon: IconName; perm: [string, string] }[] = [
  { href: '/audit', label: 'บันทึกกิจกรรม', icon: 'clock', perm: ['activity', 'read'] },
  { href: '/users', label: 'ผู้ใช้งาน', icon: 'users', perm: ['user', 'read'] },
  { href: '/settings', label: 'ตั้งค่า', icon: 'menu', perm: ['setting', 'read'] },
];

// Bottom nav มือถือแบบ IG (5 ช่อง): หน้าหลัก · นัด · ทรัพย์(กลาง) · ค้นหา · โปรไฟล์
type Slot =
  | { key: string; label: string; icon: IconName; href: string; perm?: [string, string]; center?: boolean }
  | { key: string; label: string; icon: IconName; action: 'search' | 'profile' };
const SLOTS: Slot[] = [
  { key: 'home', label: 'หน้าหลัก', icon: 'home', href: '/' },
  { key: 'appt', label: 'นัด', icon: 'clock', href: '/appointments', perm: ['appointment', 'read'] },
  { key: 'prop', label: 'ทรัพย์', icon: 'building', href: '/properties', perm: ['property', 'read'], center: true },
  { key: 'search', label: 'ค้นหา', icon: 'search', href: '/search' },
  { key: 'profile', label: 'โปรไฟล์', icon: 'user', action: 'profile' },
];
// hrefs ที่อยู่บน bottom nav แล้ว → ไม่ต้องโชว์ซ้ำในเมนูโปรไฟล์ (เหลือเฉพาะ "เมนูที่เหลือ")
const BOTTOM_HREFS = new Set(['/', '/appointments', '/properties']);

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, can, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [drawer, setDrawer] = useState(false);   // เมนูโปรไฟล์ (มือถือ)
  const [quickAdd, setQuickAdd] = useState(false); // ฟอร์มเพิ่มทรัพย์แบบลัด (ปุ่ม + มุมซ้ายบน)
  const [navCollapsed, setNavCollapsed] = useState(false); // bottom nav หุบตอนเลื่อนลง (แบบ IG)
  const [kbOpen, setKbOpen] = useState(false);             // คีย์บอร์ดเด้ง (โฟกัสช่องกรอก) → ซ่อน bottom nav
  const [idleWarn, setIdleWarn] = useState(false);         // A3: เตือนก่อน auto-logout
  const [idleLeft, setIdleLeft] = useState(60);            // นับถอยหลัง (วินาที)
  const resetIdleRef = useRef<() => void>(() => {});       // ให้ปุ่ม "อยู่ต่อ" สั่ง reset ตัวจับเวลาได้

  useEffect(() => {
    if (ready && !user) router.replace('/login');
  }, [ready, user, router]);

  useEffect(() => { setDrawer(false); }, [pathname]);

  // ล็อกพื้นหลัง (iOS-proof) เมื่อเปิดเมนูโปรไฟล์ (drawer) — กันพื้นหลัง pan ใต้ overlay
  useScrollLock(drawer);
  // a11y: drawer = dialog (Esc ปิด · focus trap · คืนโฟกัส)
  const drawerRef = useRef<HTMLElement>(null);
  useFocusTrap(drawer, drawerRef, () => setDrawer(false));

  // ซ่อน bottom nav ตอนคีย์บอร์ดเด้ง (โฟกัสช่องกรอก) — แก้บั๊ก iOS: `fixed bottom-0` ลอยขึ้นกลางจอ
  // เมื่อ visual viewport หด (คีย์บอร์ดขึ้น) · พิมพ์เสร็จ (blur) แถบกลับมา · เป็น UX ที่ดีกว่าด้วย
  useEffect(() => {
    const isField = (el: EventTarget | null): boolean => {
      const n = el as HTMLElement | null;
      if (!n) return false;
      if (n.isContentEditable) return true;
      const tag = n.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (tag === 'INPUT') {
        const t = (n as HTMLInputElement).type;
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color', 'image'].includes(t);
      }
      return false;
    };
    const onIn = (e: FocusEvent) => { if (isField(e.target)) setKbOpen(true); };
    const onOut = () => setKbOpen(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); };
  }, []);

  // bottom nav แบบ IG: เลื่อนลง→หุบเล็ก · เลื่อนขึ้น/ใกล้บนสุด→ขยาย (rAF throttle ลื่นไม่กระตุก)
  useEffect(() => {
    let last = window.scrollY;
    let ticking = false;
    const update = () => {
      const y = window.scrollY;
      if (y < 12) setNavCollapsed(false);
      else if (y - last > 6) setNavCollapsed(true);
      else if (last - y > 6) setNavCollapsed(false);
      last = y;
      ticking = false;
    };
    const onScroll = () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // auto-logout เมื่อไม่มีการใช้งานนาน (ความปลอดภัย) — ออกจากระบบอัตโนมัติหลังไม่แตะ 30 นาที
  // A3: เตือนล่วงหน้า 60 วินาทีพร้อมนับถอยหลัง + ปุ่ม "อยู่ต่อ" (กันงานหายแบบเงียบ ๆ) — ไม่เปลี่ยนนโยบาย 30 นาที
  useEffect(() => {
    const IDLE_MS = 30 * 60 * 1000;
    const WARN_MS = 60 * 1000;
    let warnTimer: ReturnType<typeof setTimeout>;
    let outTimer: ReturnType<typeof setTimeout>;
    let countdown: ReturnType<typeof setInterval> | undefined;
    const clearAll = () => { clearTimeout(warnTimer); clearTimeout(outTimer); if (countdown) clearInterval(countdown); };
    const reset = () => {
      clearAll();
      setIdleWarn(false);
      warnTimer = setTimeout(() => {
        setIdleLeft(Math.round(WARN_MS / 1000));
        setIdleWarn(true);
        countdown = setInterval(() => setIdleLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
      }, IDLE_MS - WARN_MS);
      outTimer = setTimeout(() => { void logout(); }, IDLE_MS);
    };
    resetIdleRef.current = reset;
    const events: (keyof WindowEventMap)[] = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();
    return () => { clearAll(); events.forEach((e) => window.removeEventListener(e, reset)); };
  }, [logout]);

  if (!ready || !user) {
    return <div className="flex min-h-screen items-center justify-center text-muted">กำลังโหลด…</div>;
  }

  const isActive = (href: string) => pathname === href || (href !== '/' && pathname.startsWith(href));
  const slots = SLOTS.filter((s) => !('perm' in s) || !s.perm || can(s.perm[0], s.perm[1]));
  // ชุมชน (moderation) เปิดเฉพาะระดับผู้ดูแล (role-gated ตรงกับ backend) — ไม่ใช่ permission แยก
  const isMod = !!user?.roles?.some((r) => ['super_admin', 'company_admin', 'branch_manager'].includes(r));
  const systemLinks = [
    ...SYSTEM.filter((it) => can(it.perm[0], it.perm[1])),
    ...(isMod ? [{ href: '/community', label: 'ชุมชน', icon: 'users' as IconName, perm: ['', ''] as [string, string] }] : []),
  ];
  // เมนูโปรไฟล์ (มือถือ) = เมนูที่ "เหลือ" จากแถบล่าง (เจ้าของ/Lead/ปฏิทิน/ลูกค้า/สัญญา) ไม่โชว์ซ้ำ
  const extraNav = NAV.flatMap((g) => g.items).filter(
    (it) => !BOTTOM_HREFS.has(it.href) && (!it.perm || can(it.perm[0], it.perm[1])),
  );

  // Sidebar เดสก์ท็อป = ราง (rail) แคบ: ไอคอนบน + ป้ายเล็กล่าง · คั่นกลุ่มด้วยเส้นบาง (ไม่ใส่ข้อความกลุ่มในรางแคบ)
  const NavLinks = () => (
    <nav className="flex flex-col px-1.5 py-2">
      {NAV.map((sec, gi) => {
        const items = sec.items.filter((it) => !it.perm || can(it.perm[0], it.perm[1]));
        if (items.length === 0) return null;
        return (
          <div key={sec.group} className={`space-y-1 ${gi > 0 ? 'mt-2 border-t border-border pt-2' : ''}`}>
            {items.map((it) => (
              <Link key={it.href} href={it.href}
                aria-current={isActive(it.href) ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-center text-[11px] leading-tight transition ${
                  isActive(it.href) ? 'bg-ink text-canvas' : 'text-ink-soft hover:bg-canvas'
                }`}>
                <Icon name={it.icon} size={20} className={isActive(it.href) ? '' : 'opacity-80'} />
                <span>{it.label}</span>
              </Link>
            ))}
          </div>
        );
      })}
    </nav>
  );

  const Brand = () => (
    <div className="flex h-16 items-center justify-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-ink text-base font-semibold text-canvas">R</div>
    </div>
  );

  return (
    <ToastProvider>
    {/* a11y: ข้ามไปเนื้อหาหลักด้วยคีย์บอร์ด (ซ่อนจนกว่าจะ focus) */}
    <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-canvas">
      ข้ามไปเนื้อหาหลัก
    </a>
    <div className="min-h-screen mouse:grid mouse:grid-cols-[84px_1fr]">
      {/* Sidebar — เฉพาะอุปกรณ์ที่มีเมาส์/แทร็กแพด (เดสก์ท็อป/โน้ตบุ๊ก) · ไอแพด/แท็บเล็ตสัมผัส = ใช้ mobile shell */}
      <aside className="hidden border-r border-border bg-surface mouse:block">
        <div className="sticky top-0">
          <Brand />
          <NavLinks />
        </div>
      </aside>

      {/* เมนูโปรไฟล์ — มือถือ (<768px) เปิดจากช่อง "โปรไฟล์" บน bottom nav
          รวม: โปรไฟล์ผู้ใช้ + เมนูทั้งหมด + ระบบ(ตั้งค่า/กิจกรรม/ผู้ใช้) + ออกจากระบบ (กันเมนูตกหล่น) */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 mouse:hidden" onClick={() => setDrawer(false)} />
          <aside ref={drawerRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="เมนูและโปรไฟล์"
            className="fixed inset-y-0 right-0 z-50 flex w-[280px] flex-col overflow-y-auto border-l border-border bg-surface outline-none mouse:hidden">
            {/* หัวโปรไฟล์ */}
            <div className="flex items-center gap-3 border-b border-border px-5 py-4">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ink text-base font-medium text-canvas">
                {user.fullName.charAt(0)}
              </span>
              <div className="min-w-0">
                <p className="truncate font-medium">{user.fullName}</p>
                <p className="truncate text-xs text-muted">{user.email}</p>
              </div>
            </div>
            {/* เมนู = เฉพาะที่ไม่ได้อยู่บน bottom nav (เจ้าของ/Lead/ปฏิทิน/ลูกค้า/สัญญา) + ระบบ → คลีน ไม่ซ้ำ */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {extraNav.length > 0 && (
                <div className="mb-4">
                  <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">เมนู</p>
                  {extraNav.map((it) => (
                    <Link key={it.href} href={it.href} onClick={() => setDrawer(false)}
                      aria-current={isActive(it.href) ? 'page' : undefined}
                      className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                        isActive(it.href) ? 'bg-ink text-canvas' : 'text-ink-soft hover:bg-canvas'
                      }`}>
                      <Icon name={it.icon} size={18} className={isActive(it.href) ? '' : 'opacity-70'} />
                      {it.label}
                    </Link>
                  ))}
                </div>
              )}
              {systemLinks.length > 0 && (
                <div>
                  <p className="px-3 pb-1.5 text-[11px] font-medium uppercase tracking-wider text-muted">ระบบ</p>
                  {systemLinks.map((it) => (
                    <Link key={it.href} href={it.href} onClick={() => setDrawer(false)}
                      aria-current={isActive(it.href) ? 'page' : undefined}
                      className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${
                        isActive(it.href) ? 'bg-ink text-canvas' : 'text-ink-soft hover:bg-canvas'
                      }`}>
                      <Icon name={it.icon} size={18} className={isActive(it.href) ? '' : 'opacity-70'} />
                      {it.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
            <div className="border-t border-border">
              <ThemeToggle />
            </div>
            <button onClick={() => { setDrawer(false); logout(); }}
              className="border-t border-border px-5 py-3.5 text-left text-sm font-medium text-danger hover:bg-canvas">
              ออกจากระบบ
            </button>
          </aside>
        </>
      )}

      {/* Main */}
      <div className="flex min-h-screen flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-2 border-b border-border bg-surface/80 px-4 backdrop-blur mouse:px-8">
          {/* มือถือซ้าย: + เพิ่มทรัพย์ → เปิดฟอร์มมีสเต็ป 1-4 (ตัวเดียวกับเดสก์ท็อป) ในกล่องกลางจอ */}
          {can('property', 'create') && (
            <button onClick={() => setQuickAdd(true)} aria-label="เพิ่มทรัพย์"
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-canvas mouse:hidden">
              <Icon name="plus" size={22} />
            </button>
          )}
          {/* ดันไอคอนขวาให้ชิดขวา (เอาปุ่มสลับบัญชีที่ทำค้างกลางหัวออกแล้ว — เข้าโปรไฟล์ผ่าน bottom-nav/มุมขวา) */}
          <div className="flex-1" />
          <div className="flex items-center gap-1 sm:gap-2">
            <GlobalSearch />
            <NotificationBell />
            <ProfileMenu />
          </div>
        </header>

        {/* เนื้อหา — pb-24 เผื่อ bottom-nav เฉพาะมือถือ (<768px) */}
        {/* Option B (iPad): คง shell มือถือ แต่ให้จอแท็บเล็ตโปร่งขึ้น — เพิ่ม padding ข้างเฉพาะ "อุปกรณ์สัมผัส ≥640" (sm:touch)
            ใช้ touch เพื่อไม่ให้ทับ mouse:px-8 ของเดสก์ท็อป (mouse กับ touch แยกกันชัด → ไม่ชนกัน) */}
        <main id="main-content" tabIndex={-1} className="flex-1 px-4 pb-24 pt-6 outline-none sm:touch:px-6 mouse:px-8 mouse:pb-10 mouse:pt-8">
          {/* A2: key=pathname → เนื้อหา fade เข้าใหม่ทุกครั้งที่เปลี่ยนหน้า (ลื่น/พรีเมียม) */}
          <PullToRefresh><div key={pathname} className="animate-fade-rise">{children}</div></PullToRefresh>
        </main>
      </div>

      {/* Bottom nav — มือถือ (<768px): แถบลอยกลางจอแบบ IG · 5 ช่อง · ไอคอนล้วน (ไม่มีข้อความ)
          z-40: เหนือ search overlay (ถูกจำกัดใน stacking context ของ header z-30) → ยังกดสลับไอคอนอื่นได้ระหว่างเปิดค้นหา
          แต่ต่ำกว่า modal (z-50) → modal/ฟอร์มทับแถบได้ถูกต้อง · ซ่อนเมื่อเปิดเมนูโปรไฟล์ (drawer)
          active = วงกลม ink · ทรัพย์(กลาง) = ไอคอนทองเมื่อยังไม่ active · แตะรอบ ๆ ทะลุไปเนื้อหาได้ */}
      <nav className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] mouse:hidden ${drawer || kbOpen ? 'hidden' : ''}`}>
        <div className={`pointer-events-auto flex w-full max-w-md origin-bottom items-center justify-between rounded-full border border-border bg-surface/95 px-4 py-1.5 shadow-lift backdrop-blur transition-[transform,opacity] duration-300 ease-out ${navCollapsed ? 'translate-y-1 scale-[0.86] opacity-80' : 'scale-100'}`}>
          {slots.map((s) => {
            const on = 'href' in s ? isActive(s.href) : drawer; // action ที่เหลือ = โปรไฟล์ (drawer)
            const center = 'center' in s && s.center;
            const cls = `flex h-11 w-11 items-center justify-center rounded-full transition ${
              on ? 'bg-ink text-canvas' : `${center ? 'text-gold-dark' : 'text-muted'} hover:bg-canvas hover:text-ink`
            }`;
            const icon = <Icon name={s.icon} size={24} />;
            return 'href' in s ? (
              <Link key={s.key} href={s.href} aria-label={s.label} aria-current={on ? 'page' : undefined} className={cls}
                onClick={() => setDrawer(false)}>{icon}</Link>
            ) : (
              <button key={s.key} aria-label={s.label} className={cls}
                onClick={() => setDrawer((v) => !v)}>{icon}</button>
            );
          })}
        </div>
      </nav>

      {/* ฟอร์มเพิ่มทรัพย์ (เปิดจากปุ่ม + มุมซ้ายบน) — wizard มีสเต็ป 1-4 เหมือนหน้าทรัพย์/เดสก์ท็อป */}
      <Modal open={quickAdd} onClose={() => setQuickAdd(false)} title="เพิ่มทรัพย์ใหม่" size="xl">
        <PropertyForm mode="create" onClose={() => setQuickAdd(false)}
          onSaved={(id) => { setQuickAdd(false); router.push(`/properties/${id}`); }} />
      </Modal>

      {/* A3: เตือนก่อนออกจากระบบอัตโนมัติ (ไม่ได้ใช้งานนาน) */}
      <Modal open={idleWarn} onClose={() => resetIdleRef.current()} title="ยังอยู่ไหม?"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost text-danger" onClick={() => { setIdleWarn(false); void logout(); }}>ออกจากระบบ</button>
            <button type="button" className="btn-gold" onClick={() => resetIdleRef.current()}>อยู่ต่อ</button>
          </div>
        }>
        <p className="text-sm leading-relaxed text-ink-soft">
          คุณไม่ได้ใช้งานสักพัก ระบบจะออกจากระบบอัตโนมัติใน{' '}
          <b className="tabular-nums text-ink">{idleLeft}</b> วินาที เพื่อความปลอดภัย
        </p>
      </Modal>
    </div>
    </ToastProvider>
  );
}

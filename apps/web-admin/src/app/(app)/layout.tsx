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
import { resolveNav, resolveBottomSlots, type NavSlot } from '@/lib/nav';

// โครงเมนูทั้งหมด (ราง เดสก์ท็อป · แถบล่าง+drawer มือถือ) ย้ายไป lib/nav.ts (role-aware · single source of truth)

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, ready, can, logout, api } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [prPending, setPrPending] = useState(0); // badge: จำนวนคำขอทรัพย์ที่รอตรวจ
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

  // badge คำขอทรัพย์ที่รอตรวจ — ดึงเมื่อมีสิทธิ์ (รีเฟรชตอนเปลี่ยนหน้า)
  useEffect(() => {
    if (!ready || !user || !can('property_request', 'read')) return;
    let alive = true;
    api<unknown[]>('/property-requests?status=pending&limit=1')
      .then((r) => { if (alive) setPrPending((r as { meta?: { pendingCount?: number } }).meta?.pendingCount ?? 0); })
      .catch(() => {});
    return () => { alive = false; };
  }, [ready, user, can, api, pathname]);

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
  // โครงเมนูตามบทบาท (single source of truth · lib/nav.ts) — ใช้ทั้งราง เดสก์ท็อป และ drawer มือถือ
  const navGroups = resolveNav(user.roles, can);
  // แถบล่างมือถือ = 5 ช่องตามบทบาท (ช่องกลาง = signature ของบทบาท)
  const slots = resolveBottomSlots(user.roles, can);
  // Drawer (มือถือ) = โครงเดียวกับราง ตัดรายการที่อยู่บนแถบล่างแล้ว (ไม่โชว์ซ้ำ) · คงกลุ่ม/ป้าย (ค้นทรัพย์/ระบบ)
  const bottomHrefs = new Set(
    slots.filter((s): s is Extract<NavSlot, { href: string }> => 'href' in s).map((s) => s.href),
  );
  const drawerGroups = navGroups
    .map((g) => ({ ...g, items: g.items.filter((it) => !bottomHrefs.has(it.href)) }))
    .filter((g) => g.items.length > 0);
  // กลุ่มไม่มีป้าย = รวมเป็น "เมนู" · กลุ่มมีป้าย (ค้นทรัพย์/ระบบ) = แยกหัวข้อของตัวเอง
  const drawerMain = drawerGroups.filter((g) => !g.label).flatMap((g) => g.items);
  const drawerLabeled = drawerGroups.filter((g) => g.label);

  // Sidebar เดสก์ท็อป = ราง (rail) แคบ: ไอคอนบน + ป้ายเล็กล่าง · โครง/ลำดับตามบทบาท (lib/nav.ts)
  // คั่นกลุ่มด้วยเส้นบาง · ป้ายกลุ่มโชว์เฉพาะกลุ่มที่ต้องสื่อความหมาย (ค้นทรัพย์/ระบบ) · กลุ่ม pinBottom ดันลงล่าง
  const NavLinks = () => (
    <nav className="flex flex-1 flex-col px-1.5 py-2">
      {navGroups.map((sec, gi) => (
        <div key={sec.key} className={`space-y-1 ${
          sec.pinBottom ? 'mt-auto border-t border-border pt-2' : gi > 0 ? 'mt-2 border-t border-border pt-2' : ''
        }`}>
          {sec.label && <p className="px-1 pb-1 text-center text-2xs text-muted">{sec.label}</p>}
          {sec.items.map((it) => {
            const active = isActive(it.href);
            const tone = active ? 'bg-raised text-gold-dark' : it.accent ? 'text-gold-dark hover:bg-raised' : 'text-ink-soft hover:bg-raised';
            return (
              <Link key={it.label} href={it.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center gap-1 rounded-lg px-1 py-2.5 text-center text-2xs leading-tight transition ${tone}`}>
                <span className="relative">
                  <Icon name={it.icon} size={20} className={active || it.accent ? '' : 'opacity-80'} />
                  {it.badgeKey === 'propertyRequest' && prPending > 0 && (
                    <span className="absolute -right-2.5 -top-1.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold leading-none text-[#1c1b18]">{prPending > 9 ? '9+' : prPending}</span>
                  )}
                </span>
                <span>{it.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );

  const Brand = () => (
    <div className="flex h-16 items-center justify-center">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold text-base font-semibold text-[#1c1b18]">R</div>
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
        <div className="sticky top-0 flex h-screen flex-col overflow-y-auto">
          <Brand />
          <NavLinks />
        </div>
      </aside>

      {/* เมนูโปรไฟล์ — มือถือ (<768px) เปิดจากช่อง "โปรไฟล์" บน bottom nav
          รวม: โปรไฟล์ผู้ใช้ + เมนูทั้งหมด + ระบบ(ตั้งค่า/กิจกรรม/ผู้ใช้) + ออกจากระบบ (กันเมนูตกหล่น) */}
      {drawer && (
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 dark:bg-black/50 mouse:hidden" onClick={() => setDrawer(false)} />
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
            {/* เมนู = โครง roleNav ที่เหลือจากแถบล่าง (ไม่ซ้ำ) · กลุ่มมีป้าย (ค้นทรัพย์/ระบบ) แยกหัวข้อ */}
            <div className="flex-1 overflow-y-auto px-3 py-3">
              {drawerMain.length > 0 && (
                <div className="mb-4">
                  <p className="px-3 pb-1.5 text-2xs font-medium uppercase tracking-wider text-muted">เมนู</p>
                  {drawerMain.map((it) => {
                    const active = isActive(it.href);
                    const tone = active ? 'bg-raised text-gold-dark' : it.accent ? 'text-gold-dark hover:bg-raised' : 'text-ink-soft hover:bg-raised';
                    return (
                      <Link key={it.label} href={it.href} onClick={() => setDrawer(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${tone}`}>
                        <Icon name={it.icon} size={18} className={active || it.accent ? '' : 'opacity-70'} />
                        {it.label}
                        {it.badgeKey === 'propertyRequest' && prPending > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-2xs font-semibold text-[#1c1b18]">{prPending > 9 ? '9+' : prPending}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
              {drawerLabeled.map((g) => (
                <div key={g.key} className="mb-4">
                  <p className="px-3 pb-1.5 text-2xs font-medium uppercase tracking-wider text-muted">{g.label}</p>
                  {g.items.map((it) => {
                    const active = isActive(it.href);
                    const tone = active ? 'bg-raised text-gold-dark' : it.accent ? 'text-gold-dark hover:bg-raised' : 'text-ink-soft hover:bg-raised';
                    return (
                      <Link key={it.label} href={it.href} onClick={() => setDrawer(false)}
                        aria-current={active ? 'page' : undefined}
                        className={`mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition ${tone}`}>
                        <Icon name={it.icon} size={18} className={active || it.accent ? '' : 'opacity-70'} />
                        {it.label}
                        {it.badgeKey === 'propertyRequest' && prPending > 0 && (
                          <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gold px-1 text-2xs font-semibold text-[#1c1b18]">{prPending > 9 ? '9+' : prPending}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
            <div className="border-t border-border">
              <ThemeToggle />
            </div>
            <button onClick={() => { setDrawer(false); logout(); }}
              className="border-t border-border px-5 py-3.5 text-left text-sm font-medium text-danger hover:bg-raised">
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
              className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-raised mouse:hidden">
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
          {/* A2: key=pathname → เนื้อหา fade เข้าใหม่ทุกครั้งที่เปลี่ยนหน้า (ลื่น/พรีเมียม)
              ความกว้างเนื้อหา = คุมที่ shell เดียว (owner lock: ทุกหน้า list เท่ากัน max-w-5xl → สลับ sidebar แล้วขอบนิ่ง)
              หน้าที่ต้องแคบจริง (settings/search = ฟอร์ม/อ่าน) ใส่ max-w ของตัวเองที่แคบกว่า = override ได้ */}
          <PullToRefresh><div key={pathname} className="mx-auto w-full max-w-5xl animate-fade-rise">{children}</div></PullToRefresh>
        </main>
      </div>

      {/* Bottom nav — มือถือ (<768px): แถบลอยกลางจอแบบ IG · 5 ช่อง · ไอคอนล้วน (ไม่มีข้อความ)
          z-40: เหนือ search overlay (ถูกจำกัดใน stacking context ของ header z-30) → ยังกดสลับไอคอนอื่นได้ระหว่างเปิดค้นหา
          แต่ต่ำกว่า modal (z-50) → modal/ฟอร์มทับแถบได้ถูกต้อง · ซ่อนเมื่อเปิดเมนูโปรไฟล์ (drawer)
          active = วงกลม ink · ทรัพย์(กลาง) = ไอคอนทองเมื่อยังไม่ active · แตะรอบ ๆ ทะลุไปเนื้อหาได้ */}
      <nav className={`pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[max(0.875rem,env(safe-area-inset-bottom))] mouse:hidden ${drawer || kbOpen ? 'hidden' : ''}`}>
        <div className={`pointer-events-auto flex w-full max-w-md origin-bottom items-center justify-between rounded-xl2 border border-border bg-surface/95 px-4 py-1.5 shadow-lift backdrop-blur transition-[transform,opacity] duration-300 ease-out ${navCollapsed ? 'translate-y-1 scale-[0.86] opacity-80' : 'scale-100'}`}>
          {slots.map((s) => {
            const on = 'href' in s ? isActive(s.href) : drawer; // action ที่เหลือ = โปรไฟล์ (drawer)
            const center = 'center' in s && s.center;
            const cls = `flex h-11 w-11 items-center justify-center rounded-full transition ${
              on ? 'bg-raised text-gold-dark' : `${center ? 'text-gold-dark' : 'text-muted'} hover:bg-raised hover:text-ink`
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

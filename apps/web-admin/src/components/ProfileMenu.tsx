'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';

// กลุ่ม "ระบบ" ย้ายมาไว้ในเมนูโปรไฟล์ (sidebar สั้นลง)
const SYSTEM: { href: string; label: string; perm: [string, string] }[] = [
  { href: '/audit', label: 'บันทึกกิจกรรม', perm: ['activity', 'read'] }, // ฟีดทีม — เห็นได้ทุกบทบาท
  { href: '/users', label: 'ผู้ใช้งาน', perm: ['user', 'read'] },
  { href: '/settings', label: 'ตั้งค่า', perm: ['setting', 'read'] },
];

export default function ProfileMenu() {
  const { user, can, logout } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!user) return null;
  const items = SYSTEM.filter((it) => can(it.perm[0], it.perm[1]));

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)}
        className="hidden items-center gap-2 rounded-full p-0.5 pr-1 transition hover:bg-raised mouse:flex">
        <span className="hidden max-w-[140px] truncate text-sm text-muted mouse:block">{user.fullName}</span>
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-sm font-medium text-canvas">
          {user.fullName.charAt(0)}
        </span>
      </button>

      {open && (
        <div className="fixed inset-x-3 top-16 z-50 overflow-hidden rounded-xl2 border border-border bg-surface shadow-lift sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-56">
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          {items.length > 0 && (
            <div className="py-1">
              {items.map((it) => (
                <Link key={it.href} href={it.href} onClick={() => setOpen(false)}
                  className="block px-4 py-2.5 text-sm text-ink-soft hover:bg-raised">{it.label}</Link>
              ))}
            </div>
          )}
          <div className="border-t border-border py-1">
            <ThemeToggle />
          </div>
          <button onClick={() => { setOpen(false); logout(); }}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-danger hover:bg-raised">
            ออกจากระบบ
          </button>
        </div>
      )}
    </div>
  );
}

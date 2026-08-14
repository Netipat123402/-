'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import ThemeToggle from '@/components/ThemeToggle';
import LanguageToggle from '@/components/LanguageToggle';
import { Icon } from '@/components/Icon';

// บทบาทที่มี label ใน catalog (users.role.*) — ใช้เป็นคำบรรยายใต้ชื่อในชิปบัญชี
const KNOWN_ROLES = ['super_admin', 'property_manager', 'sales_agent', 'company_admin', 'branch_manager', 'team_lead', 'back_office', 'auditor'];

/**
 * SidebarAccount — ชิปบัญชีผู้ใช้ที่ "ล่างสุด sidebar" (เดสก์ท็อป · มาตรฐาน Linear/Notion/Slack)
 * กด → popover เด้งขึ้นบน: อีเมล · ภาษา · ธีม · ออกจากระบบ
 * (System links ไม่อยู่ที่นี่ — มีใน SYSTEM group ของ sidebar แล้ว) · มือถือ/iPad ใช้ drawer แถบล่างแทน
 */
export default function SidebarAccount({ collapsed }: { collapsed: boolean }) {
  const { user, logout } = useAuth();
  const t = useTranslations();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onEsc);
    return () => { document.removeEventListener('mousedown', onClick); document.removeEventListener('keydown', onEsc); };
  }, [open]);
  useEffect(() => { setOpen(false); }, [pathname]);

  if (!user) return null;
  const role = user.roles[0];
  const roleLabel = role && KNOWN_ROLES.includes(role) ? t(`users.role.${role}`) : role;

  return (
    // translate="no": identity/บัญชี ไม่ควรถูกเบราว์เซอร์แปลซ้ำ (แอปมี i18n เอง) ·
    // กัน Google Translate แทรก <font> ดัน DOM → absolute popover เพี้ยน/ตกขอบ
    <div className="relative shrink-0 border-t border-border" ref={ref} translate="no">
      <button onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu" aria-expanded={open} aria-label={t('shell.account')}
        title={collapsed ? user.fullName : undefined}
        className={`flex w-full items-center transition hover:bg-raised ${collapsed ? 'justify-center py-3' : 'gap-2.5 px-3 py-2.5'}`}>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-canvas">
          {user.fullName.charAt(0)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-sm font-medium">{user.fullName}</span>
              {roleLabel && <span className="block truncate text-2xs text-muted">{roleLabel}</span>}
            </span>
            <Icon name="chevron-down" size={16} className="shrink-0 rotate-180 text-muted" />
          </>
        )}
      </button>

      {open && (
        <div role="menu"
          className={`absolute bottom-full z-50 mb-2 max-h-[calc(100dvh-4rem)] overflow-y-auto rounded-xl2 border border-border bg-surface shadow-lift ${collapsed ? 'left-2 w-56' : 'left-2 right-2'}`}>
          <div className="border-b border-border px-4 py-3">
            <p className="truncate font-medium">{user.fullName}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <div className="py-1">
            <LanguageToggle onToggle={() => setOpen(false)} />
            <ThemeToggle />
          </div>
          <button onClick={() => { setOpen(false); logout(); }}
            className="block w-full border-t border-border px-4 py-2.5 text-left text-sm text-danger hover:bg-raised">
            {t('shell.signOut')}
          </button>
        </div>
      )}
    </div>
  );
}

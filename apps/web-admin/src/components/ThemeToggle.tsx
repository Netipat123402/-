'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Icon } from '@/components/Icon';

/**
 * สลับธีมสว่าง/มืด (เฉพาะ web-admin) — เก็บค่าใน localStorage 'ros-theme'
 * ค่าเริ่มต้น = สว่าง · no-flash จัดการที่ root layout (สคริปต์ก่อนเพนต์)
 * ใช้เป็นแถวเมนูเต็มกว้าง (ใน ProfileMenu / drawer มือถือ)
 */
export default function ThemeToggle({ onToggle }: { onToggle?: () => void }) {
  const t = useTranslations('shell');
  const [dark, setDark] = useState(false);
  useEffect(() => { setDark(document.documentElement.classList.contains('dark')); }, []);

  function toggle() {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle('dark', next);
    try { localStorage.setItem('ros-theme', next ? 'dark' : 'light'); } catch { /* ignore */ }
    onToggle?.();
  }

  return (
    <button type="button" onClick={toggle}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-soft transition hover:bg-raised">
      <Icon name={dark ? 'sun' : 'moon'} size={18} className="opacity-70" />
      {dark ? t('lightMode') : t('darkMode')}
    </button>
  );
}

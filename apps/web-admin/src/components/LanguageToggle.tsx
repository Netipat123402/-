'use client';

import { useLocale } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/Icon';

/**
 * สลับภาษา EN ↔ TH (bilingual · อังกฤษหลัก + ไทยรอง) — เก็บใน cookie NEXT_LOCALE
 * server (i18n/request.ts) อ่าน cookie นี้ · router.refresh() ให้ RSC โหลด messages ใหม่
 * ใช้เป็นแถวเมนูเต็มกว้าง (ProfileMenu / drawer มือถือ) — โทนเดียวกับ ThemeToggle
 */
export default function LanguageToggle({ onToggle }: { onToggle?: () => void }) {
  const locale = useLocale();
  const router = useRouter();

  function switchTo() {
    const next = locale === 'en' ? 'th' : 'en';
    document.cookie = `NEXT_LOCALE=${next};path=/;max-age=31536000;samesite=lax`;
    router.refresh();
    onToggle?.();
  }

  return (
    <button type="button" onClick={switchTo}
      className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-ink-soft transition hover:bg-raised">
      <Icon name="globe" size={18} className="opacity-70" />
      {locale === 'en' ? 'ภาษาไทย' : 'English'}
    </button>
  );
}

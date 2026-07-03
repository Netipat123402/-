'use client';

import { pick, useLang } from '@/lib/lang';

/** แสดงข้อความตามภาษาที่เลือก (fallback → th) */
export function Localized({
  th, en, as = 'span', className,
}: {
  th: string | null;
  en: string | null;
  as?: 'span' | 'h1' | 'h2' | 'p';
  className?: string;
}) {
  const { lang } = useLang();
  const Tag = as;
  const text = pick({ th, en }, lang);
  if (!text) return null;
  return <Tag className={className}>{text}</Tag>;
}

'use client';

import { useState } from 'react';
import { pick, useLang } from '@/lib/lang';

/**
 * ข้อความยาว → ตัดสั้น + ปุ่ม "อ่านเพิ่มเติม" (PDF: Add a "Read More" button for long texts)
 * เก็บ line break เดิม (whitespace-pre-line)
 */
export default function ReadMore({ th, en, className = '' }: { th: string | null; en: string | null; className?: string }) {
  const { lang } = useLang();
  const [open, setOpen] = useState(false);
  const text = pick({ th, en }, lang);
  if (!text) return null;

  const long = text.length > 260;

  return (
    <div>
      <div className="relative">
        <p className={`whitespace-pre-line leading-relaxed ${className} ${long && !open ? 'max-h-32 overflow-hidden' : ''}`}>
          {text}
        </p>
        {long && !open && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-surface to-transparent" />
        )}
      </div>
      {long && (
        <button onClick={() => setOpen((v) => !v)}
          className="mt-1.5 text-sm font-medium text-gold-dark hover:underline">
          {open ? 'ย่อ' : 'อ่านเพิ่มเติม'}
        </button>
      )}
    </div>
  );
}

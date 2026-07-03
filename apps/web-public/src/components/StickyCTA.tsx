'use client';

import { useEffect, useState } from 'react';
import { useLang } from '@/lib/lang';
import { LINE_URL } from '@/lib/api';

/** CTA ตรึงล่างจอ (mobile) — นัด + LINE เข้าถึงตลอด (text-only minimal) */
export default function StickyCTA() {
  const { t } = useLang();
  // ซ่อนตอนคีย์บอร์ดเด้ง (โฟกัสช่องกรอกฟอร์มนัด) — แก้บั๊ก iOS: `fixed bottom-0` ลอยขึ้นกลางจอ
  // เมื่อ visual viewport หด (คีย์บอร์ดขึ้น) · พิมพ์เสร็จ (blur) แถบกลับมา
  const [kbOpen, setKbOpen] = useState(false);
  useEffect(() => {
    const isField = (el: EventTarget | null): boolean => {
      const n = el as HTMLElement | null;
      if (!n) return false;
      if (n.isContentEditable) return true;
      const tag = n.tagName;
      if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
      if (tag === 'INPUT') {
        const ty = (n as HTMLInputElement).type;
        return !['checkbox', 'radio', 'button', 'submit', 'reset', 'range', 'file', 'color', 'image'].includes(ty);
      }
      return false;
    };
    const onIn = (e: FocusEvent) => { if (isField(e.target)) setKbOpen(true); };
    const onOut = () => setKbOpen(false);
    document.addEventListener('focusin', onIn);
    document.addEventListener('focusout', onOut);
    return () => { document.removeEventListener('focusin', onIn); document.removeEventListener('focusout', onOut); };
  }, []);

  if (kbOpen) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/95 p-3 backdrop-blur lg:hidden">
      <div className="mx-auto flex max-w-content gap-2">
        <a href="#appointment" className="btn-gold flex-1">{t('bookViewing')}</a>
        <a href={LINE_URL} target="_blank" rel="noreferrer" className="btn-line flex-1">LINE</a>
      </div>
    </div>
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { useScrollLock } from '@/lib/useScrollLock';
import { useFocusTrap } from '@/lib/useFocusTrap';

/** ดูรูปเต็มจอ + เลื่อนดูรูปอื่น (Esc/←/→) — dialog: portal, ล็อกพื้นหลัง, focus trap */
export default function Lightbox({
  images, index, onClose, onIndex,
}: { images: string[]; index: number; onClose: () => void; onIndex: (i: number) => void }) {
  const prev = useCallback(() => onIndex((index - 1 + images.length) % images.length), [index, images.length, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % images.length), [index, images.length, onIndex]);

  // portal → <body> หนี ancestor ที่มี transform (เช่น .animate-fade-rise ใน layout) ที่ทำให้ fixed ไม่เต็มจอ
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const boxRef = useRef<HTMLDivElement>(null);

  useScrollLock(true); // ล็อกพื้นหลังแบบ iOS-proof (position:fixed) — กันพื้นหลัง pan ใต้ภาพ
  useFocusTrap(mounted, boxRef, onClose); // a11y: dialog (Esc ปิด · focus trap · คืนโฟกัส)
  useEffect(() => {
    // ←/→ เปลี่ยนรูป (Esc จัดการใน useFocusTrap แล้ว)
    const h = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') prev();
      else if (e.key === 'ArrowRight') next();
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [prev, next]);

  if (!mounted) return null;
  return createPortal(
    <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="ดูรูปเต็มจอ"
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ink/90 p-4 outline-none" onClick={onClose}>
      <button aria-label="ปิด" className="absolute right-4 top-4 text-white/80 hover:text-white" onClick={onClose}><Icon name="x" size={28} /></button>
      {images.length > 1 && (
        <>
          <button aria-label="รูปก่อนหน้า" className="absolute left-3 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); prev(); }}><Icon name="chevron-left" size={34} /></button>
          <button aria-label="รูปถัดไป" className="absolute right-3 text-white/70 hover:text-white" onClick={(e) => { e.stopPropagation(); next(); }}><Icon name="chevron-right" size={34} /></button>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={images[index]} alt="" className="max-h-[88vh] max-w-[92vw] rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
      {images.length > 1 && (
        <span className="absolute bottom-5 text-sm text-white/70">{index + 1} / {images.length}</span>
      )}
    </div>,
    document.body,
  );
}

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from '@/components/Icon';
import { mediaUrl } from '@/lib/api';
import { useScrollLock } from '@/lib/useScrollLock';
import { useFocusTrap } from '@/lib/useFocusTrap';

/**
 * ดูรูปเต็มจอ + ซูมไม่แตก (โหลดไฟล์ต้นฉบับเต็มความละเอียด)
 * คลิก = ซูมเข้า/ออก · ลาก = เลื่อนตอนซูม · ล้อเมาส์ = ซูม · ←/→ เปลี่ยนรูป · Esc ปิด
 */
export default function Lightbox({ images, index, alt, onClose, onIndex }: {
  images: string[]; index: number; alt: string; onClose: () => void; onIndex: (i: number) => void;
}) {
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number; moved: boolean } | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  // portal → <body> หนี ancestor ที่มี transform (เช่น .animate-fade-rise ใน layout)
  // ที่ทำให้ fixed inset-0 ไม่เต็มจอ; mount guard กัน SSR
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  const reset = useCallback(() => { setScale(1); setPos({ x: 0, y: 0 }); }, []);
  const prev = useCallback(() => { reset(); onIndex((index - 1 + images.length) % images.length); }, [index, images.length, onIndex, reset]);
  const next = useCallback(() => { reset(); onIndex((index + 1) % images.length); }, [index, images.length, onIndex, reset]);

  useScrollLock(true); // ล็อกพื้นหลังแบบ iOS-proof (position:fixed) — กันพื้นหลัง pan ใต้ภาพเต็มจอ
  // ใช้ `mounted` (ไม่ใช่ true ตายตัว) → effect รันหลัง portal พร้อม (boxRef ถูกเซ็ตแล้ว) โฟกัส/trap จึงผูกกล่องจริง
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

  function onWheel(e: React.WheelEvent) {
    setScale((s) => Math.min(4, Math.max(1, +(s - Math.sign(e.deltaY) * 0.3).toFixed(2))));
  }
  function onPointerDown(e: React.PointerEvent) {
    if (scale === 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y, moved: false };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return;
    const dx = e.clientX - drag.current.x, dy = e.clientY - drag.current.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) drag.current.moved = true;
    setPos({ x: drag.current.px + dx, y: drag.current.py + dy });
  }
  function endDrag() { drag.current = null; }
  function onImgClick() {
    if (drag.current?.moved) return;
    if (scale === 1) setScale(2.4); else reset();
  }

  if (!mounted) return null;
  return createPortal(
    <div ref={boxRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={alt || 'ดูรูปเต็มจอ'}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/95 outline-none backdrop-blur-sm" onClick={onClose}>
      <button aria-label="ปิด" onClick={onClose}
        className="absolute right-4 top-4 z-10 text-white/80 transition hover:text-white"><Icon name="x" size={28} /></button>
      {images.length > 1 && (
        <>
          <button aria-label="รูปก่อนหน้า" onClick={(e) => { e.stopPropagation(); prev(); }}
            className="absolute left-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"><Icon name="chevron-left" size={26} /></button>
          <button aria-label="รูปถัดไป" onClick={(e) => { e.stopPropagation(); next(); }}
            className="absolute right-3 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white/80 transition hover:bg-white/20 hover:text-white"><Icon name="chevron-right" size={26} /></button>
          <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white/80">{index + 1} / {images.length}</span>
        </>
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={mediaUrl(images[index])} alt={alt} draggable={false}
        onClick={(e) => { e.stopPropagation(); onImgClick(); }}
        onWheel={onWheel} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={endDrag} onPointerCancel={endDrag}
        style={{ transform: `scale(${scale}) translate(${pos.x / scale}px, ${pos.y / scale}px)`, cursor: scale > 1 ? (drag.current ? 'grabbing' : 'grab') : 'zoom-in', transition: drag.current ? 'none' : 'transform 0.15s ease' }}
        className="max-h-[92vh] max-w-[94vw] select-none rounded-lg object-contain" />
      <span className="pointer-events-none absolute bottom-5 right-5 hidden text-xs text-white/45 sm:block">คลิกเพื่อซูม · ลากเพื่อเลื่อน · Esc ปิด</span>
    </div>,
    document.body,
  );
}

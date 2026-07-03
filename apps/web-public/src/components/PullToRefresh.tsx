'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from './loaders';

const THRESHOLD = 70; // ระยะดึงที่ต้องผ่านเพื่อรีเฟรช

/**
 * ดึงหน้าจอลง (มือถือ/แท็บเล็ต) เพื่อรีเฟรช + spinner
 * - ทำงานเฉพาะตอนอยู่บนสุดของหน้า (scrollY=0) และเป็น touch (มือถือ/แท็บเล็ต)
 * - เดสก์ท็อป (เมาส์) ไม่ทำงาน — ใช้รีเฟรชเบราว์เซอร์ปกติ
 */
export default function PullToRefresh({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [pull, setPull] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  // ปิด pull-to-refresh ของเบราว์เซอร์เอง (กันเด้ง 2 ชั้น)
  useEffect(() => {
    const prev = document.body.style.overscrollBehaviorY;
    document.body.style.overscrollBehaviorY = 'contain';
    return () => { document.body.style.overscrollBehaviorY = prev; };
  }, []);

  function onTouchStart(e: React.TouchEvent) {
    startY.current = window.scrollY <= 0 && !refreshing ? e.touches[0].clientY : null;
  }
  function onTouchMove(e: React.TouchEvent) {
    if (startY.current === null) return;
    const dy = e.touches[0].clientY - startY.current;
    if (dy > 0 && window.scrollY <= 0) setPull(Math.min(dy * 0.5, THRESHOLD + 24));
    else setPull(0);
  }
  function onTouchEnd() {
    if (startY.current === null) return;
    const reached = pull >= THRESHOLD;
    startY.current = null;
    if (reached) {
      setRefreshing(true);
      setPull(THRESHOLD);
      router.refresh();
      setTimeout(() => { setRefreshing(false); setPull(0); }, 900);
    } else {
      setPull(0);
    }
  }

  return (
    <div onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {/* ตัวบ่งชี้ — เฉพาะมือถือ/แท็บเล็ต */}
      <div className="flex items-center justify-center overflow-hidden text-muted transition-[height] duration-200 lg:hidden"
        style={{ height: refreshing ? 44 : pull }}>
        {refreshing ? (
          <Spinner className="h-5 w-5 text-gold-dark" />
        ) : pull > 0 ? (
          <span className="text-xs" style={{ opacity: Math.min(1, pull / THRESHOLD) }}>
            {pull >= THRESHOLD ? 'ปล่อยเพื่อรีเฟรช' : 'ดึงลงเพื่อรีเฟรช'}
          </span>
        ) : null}
      </div>
      {children}
    </div>
  );
}

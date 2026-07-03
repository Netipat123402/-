'use client';

import { useEffect } from 'react';

/** Route error boundary — minimal, ไม่น่ากลัว */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error('Admin route error:', error); }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-6 text-center">
      <p className="text-xs font-medium uppercase tracking-widest text-muted">ขออภัย</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink">โหลดหน้านี้ไม่สำเร็จ</h1>
      <p className="mt-2 max-w-sm text-sm text-muted">ระบบขัดข้องชั่วคราว ลองใหม่อีกครั้งได้เลย</p>
      <div className="mt-7 flex gap-3">
        <button onClick={reset} className="btn-gold">ลองใหม่</button>
        <a href="/" className="btn-ghost">กลับหน้าหลัก</a>
      </div>
    </div>
  );
}

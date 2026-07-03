'use client';

import { useEffect, useRef } from 'react';
import { clientApiBase as apiBase } from '@/lib/api';

/**
 * MR-13: นับยอดเข้าชมทรัพย์ฝั่ง client (ไม่ติด ISR cache ของ SSR read)
 * - ยิง POST /public/properties/:code/view ครั้งเดียวต่อการเปิดหน้า (ref กันซ้ำใน StrictMode)
 * - fire-and-forget: ไม่กระทบการแสดงผลถ้าพลาด
 */
export function ViewTracker({ code }: { code: string }) {
  const sent = useRef(false);
  useEffect(() => {
    if (sent.current) return;
    sent.current = true;
    fetch(`${apiBase()}/public/properties/${encodeURIComponent(code)}/view`, {
      method: 'POST',
      keepalive: true,
    }).catch(() => { /* เงียบ */ });
  }, [code]);
  return null;
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth';
import { useDebouncedValue } from './useDebounce';

export interface Opt { value: string; label: string }

/**
 * ดึงรายการสำหรับ dropdown (lead/property/owner/customer/agent)
 * โหลดเมื่อ enabled=true (เช่น ตอนเปิด modal) — กันยิง API ถ้ายังไม่ใช้
 */
export function useLookup<T>(
  path: string,
  map: (x: T) => Opt,
  enabled = true,
): { options: Opt[]; loading: boolean; error: boolean; reload: () => void } {
  const { api } = useAuth();
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false); // โหลดล้มเหลว (มักเพราะ session หมดอายุ) — ให้ผู้เรียกโชว์ "ลองใหม่"
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true); setError(false);
    (async () => {
      try {
        const r = await api<T[]>(path);
        if (alive) setOptions((r.data ?? []).map(map));
      } catch { if (alive) setError(true); } // เดิมเงียบ → dropdown ว่างโดยไม่บอก
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // map ตั้งใจไม่ใส่ deps (inline function) — trigger ด้วย path/enabled/nonce(reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, path, enabled, nonce]);

  return { options, loading, error, reload };
}

/**
 * ดึงตัวเลือกจาก server แบบค้นหาได้ (MR-24) — รองรับรายการ >100 (เลือกรายที่ 101+ ได้)
 * พิมพ์ใน Combobox → ยิง `${basePath}?q=...&limit=${limit}` แบบ debounce (ครั้งเดียวหลังหยุดพิมพ์)
 * คืน setQuery ให้ Combobox เรียกผ่าน prop onSearch
 */
export function useSearchLookup<T>(
  basePath: string,
  map: (x: T) => Opt,
  enabled = true,
  limit = 20,
): { options: Opt[]; loading: boolean; setQuery: (q: string) => void; error: boolean; reload: () => void } {
  const { api } = useAuth();
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 350);
  const [options, setOptions] = useState<Opt[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);
  const reload = useCallback(() => setNonce((n) => n + 1), []);

  const setQ = useCallback((q: string) => setQuery(q), []);

  useEffect(() => {
    if (!enabled) return;
    let alive = true;
    setLoading(true); setError(false);
    const sep = basePath.includes('?') ? '&' : '?';
    const path = `${basePath}${sep}limit=${limit}${debounced.trim() ? `&q=${encodeURIComponent(debounced.trim())}` : ''}`;
    (async () => {
      try {
        const r = await api<T[]>(path);
        if (alive) setOptions((r.data ?? []).map(map));
      } catch { if (alive) setError(true); } // เดิมเงียบ → dropdown ว่างโดยไม่บอก
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
    // map inline — trigger ด้วย basePath/enabled/debounced/limit/nonce(reload)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api, basePath, enabled, debounced, limit, nonce]);

  return { options, loading, setQuery: setQ, error, reload };
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './auth';

export interface ListMeta {
  total?: number; page?: number; totalPages?: number;
}

/** hook โหลด list พร้อม pagination/filter (ใช้ซ้ำทุกโมดูล)
 *  opts.pollMs > 0 = รีเฟรชเงียบ ๆ ทุก N ms (near-realtime ไม่กระพริบ skeleton) */
export function useList<T>(path: string, opts?: { pollMs?: number }) {
  const { api } = useAuth();
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<ListMeta>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOnce = useCallback(async (silent?: boolean) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const r = await api<T[]>(path);
      setRows(r.data ?? []);
      setMeta(r.meta ?? {});
    } catch (e) {
      if (!silent) setError((e as { message?: string }).message || 'โหลดข้อมูลไม่สำเร็จ');
    } finally {
      if (!silent) setLoading(false);
    }
  }, [api, path]);

  const reload = useCallback(() => fetchOnce(false), [fetchOnce]);
  // mutate แถวในเครื่องทันที (optimistic update) — ผู้เรียกใช้คู่กับ reload() เพื่อ sync ความจริงทีหลัง
  const mutate = useCallback((fn: (rows: T[]) => T[]) => setRows((rs) => fn(rs)), []);

  useEffect(() => { fetchOnce(false); }, [fetchOnce]);
  // near-realtime: รีเฟรชเงียบ ๆ ตามรอบ
  useEffect(() => {
    const ms = opts?.pollMs;
    if (!ms) return;
    const id = setInterval(() => fetchOnce(true), ms);
    return () => clearInterval(id);
  }, [fetchOnce, opts?.pollMs]);
  // pull-to-refresh (มือถือ) → โหลดใหม่
  useEffect(() => {
    const h = () => reload();
    window.addEventListener('app:refresh', h);
    return () => window.removeEventListener('app:refresh', h);
  }, [reload]);
  return { rows, meta, loading, error, reload, mutate };
}

'use client';

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
} from 'react';
import { apiBase, apiRaw, apiUpload, type ApiResult } from './api';

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  roles: string[];
  permissions: { resource: string; action: string; scope: string }[];
}

interface AuthCtx {
  user: AuthUser | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  api: <T = unknown>(path: string, opts?: RequestInit) => Promise<ApiResult<T>>;
  /** อัปโหลดไฟล์พร้อม progress (%) + auto-refresh เมื่อ 401 */
  upload: <T = unknown>(path: string, formData: FormData, onProgress?: (pct: number) => void) => Promise<ApiResult<T>>;
  /** ดึงไฟล์ไบนารี (เอกสาร) พร้อม bearer + auto-refresh — ใช้กับ endpoint ที่ stream ไฟล์ */
  apiBlob: (path: string) => Promise<Blob>;
  can: (resource: string, action: string) => boolean;
}

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [ready, setReady] = useState(false);
  const tokenRef = useRef<string | null>(null);
  // single-flight: รวมการ refresh ที่เกิดพร้อมกันให้เหลือครั้งเดียว
  // (กัน race: หลาย request เจอ 401 พร้อมกัน → refresh ซ้อนด้วย cookie เดิม
  //  → ฝั่ง server มองเป็น token reuse → เพิกถอนทั้ง family → ผู้ใช้หลุด/ข้อมูลหาย)
  const refreshing = useRef<Promise<boolean> | null>(null);

  const refresh = useCallback((): Promise<boolean> => {
    if (refreshing.current) return refreshing.current;
    const p = (async (): Promise<boolean> => {
      try {
        const r = await apiRaw<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
        tokenRef.current = r.data.accessToken;
        return true;
      } catch {
        tokenRef.current = null;
        return false;
      } finally {
        refreshing.current = null;
      }
    })();
    refreshing.current = p;
    return p;
  }, []);

  /** เรียก API พร้อม bearer + auto-refresh เมื่อ 401 */
  const api = useCallback(async <T,>(path: string, opts: RequestInit = {}) => {
    try {
      return await apiRaw<T>(path, { ...opts, token: tokenRef.current });
    } catch (e) {
      if ((e as { status?: number }).status === 401 && (await refresh())) {
        return await apiRaw<T>(path, { ...opts, token: tokenRef.current });
      }
      throw e;
    }
  }, [refresh]);

  /** อัปโหลดไฟล์พร้อม progress + retry เมื่อ 401 */
  const upload = useCallback(async <T,>(path: string, formData: FormData, onProgress?: (pct: number) => void) => {
    try {
      return await apiUpload<T>(path, formData, { token: tokenRef.current, onProgress });
    } catch (e) {
      if ((e as { status?: number }).status === 401 && (await refresh())) {
        return await apiUpload<T>(path, formData, { token: tokenRef.current, onProgress });
      }
      throw e;
    }
  }, [refresh]);

  /** โหลดไฟล์ไบนารีพร้อม token + retry เมื่อ 401 (เอกสารไม่ใช่ static แล้ว) */
  const apiBlob = useCallback(async (path: string): Promise<Blob> => {
    const doFetch = async () => {
      const res = await fetch(`${apiBase()}${path}`, {
        credentials: 'include',
        headers: tokenRef.current ? { Authorization: `Bearer ${tokenRef.current}` } : {},
      });
      if (!res.ok) throw { status: res.status, message: 'เปิดไฟล์ไม่ได้' };
      return res.blob();
    };
    try {
      return await doFetch();
    } catch (e) {
      if ((e as { status?: number }).status === 401 && (await refresh())) return doFetch();
      throw e;
    }
  }, [refresh]);

  const loadMe = useCallback(async () => {
    const r = await apiRaw<AuthUser>('/auth/me', { token: tokenRef.current });
    setUser(r.data);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const r = await apiRaw<{ accessToken: string; user: AuthUser }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    tokenRef.current = r.data.accessToken;
    setUser(r.data.user);
  }, []);

  const logout = useCallback(async () => {
    try { await apiRaw('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
    tokenRef.current = null;
    setUser(null);
  }, []);

  const can = useCallback(
    (resource: string, action: string) =>
      !!user?.permissions.some((p) => p.resource === resource && p.action === action),
    [user],
  );

  // restore session ตอนโหลด (จาก refresh cookie)
  useEffect(() => {
    (async () => {
      if (await refresh()) {
        try { await loadMe(); } catch { /* ignore */ }
      }
      setReady(true);
    })();
  }, [refresh, loadMe]);

  const value = useMemo<AuthCtx>(
    () => ({ user, ready, login, logout, api, upload, apiBlob, can }),
    [user, ready, login, logout, api, upload, apiBlob, can],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth(): AuthCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAuth ต้องอยู่ใน AuthProvider');
  return ctx;
}

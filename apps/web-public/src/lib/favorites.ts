'use client';

/**
 * รายการโปรด (favorites) — client-only เก็บใน localStorage (ไม่แตะ backend ตาม R2)
 * หลักการ world-class:
 *  - แหล่งความจริงเดียว (module store) + useSyncExternalStore → ทุก card/header sync กันทันที ไม่ tearing
 *  - hydration-safe: server snapshot = ว่างเสมอ → ปุ่มหัวใจ render กลาง ๆ ก่อน mount กัน mismatch
 *  - cross-tab sync ผ่าน `storage` event · in-tab ผ่าน listener set
 *  - เก็บแค่ "code" (ทรัพย์) — ข้อมูลการ์ดดึงสดจาก API ตอนเปิดหน้า /saved (กันข้อมูลค้าง/ราคาเก่า)
 */
import { useCallback, useSyncExternalStore } from 'react';

const KEY = 'ros:favorites';
const EMPTY: readonly string[] = Object.freeze([]);

type Listener = () => void;
const listeners = new Set<Listener>();
let cache: string[] | null = null;

function read(): string[] {
  if (cache) return cache;
  if (typeof window === 'undefined') return (cache = []);
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]');
    cache = Array.isArray(raw) ? raw.filter((c): c is string => typeof c === 'string') : [];
  } catch {
    cache = [];
  }
  return cache;
}

function emit() {
  listeners.forEach((l) => l());
}

function write(next: string[]) {
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* โควตาเต็ม/โหมดส่วนตัว — เงียบไว้ ไม่ให้ UI ล้ม */
  }
  emit();
}

// sync ข้ามแท็บ: แท็บอื่นแก้ localStorage → ล้าง cache แล้วแจ้ง subscriber (ครั้งเดียวทั้งโมดูล)
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) {
      cache = null;
      emit();
    }
  });
}

function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

export function toggleFavorite(code: string) {
  const cur = read();
  write(cur.includes(code) ? cur.filter((c) => c !== code) : [code, ...cur]);
}

export function useFavorites() {
  // getServerSnapshot ต้องคืน ref คงที่ (EMPTY) กัน infinite loop ตอน SSR/hydrate
  const list = useSyncExternalStore(subscribe, read, () => EMPTY as string[]);
  const isFavorite = useCallback((code: string) => list.includes(code), [list]);
  const toggle = useCallback((code: string) => toggleFavorite(code), []);
  return { list, count: list.length, isFavorite, toggle };
}

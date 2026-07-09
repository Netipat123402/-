'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { Icon, type IconName } from '@/components/Icon';

interface Results {
  properties: { id: string; code: string; titleTh: string }[];
  leads: { id: string; code: string; fullName: string; phone: string }[];
  customers: { id: string; fullName: string; phone?: string }[];
  owners: { id: string; fullName: string; phone?: string }[];
}
const EMPTY: Results = { properties: [], leads: [], customers: [], owners: [] };

// F2: คำสั่ง/ทางลัด (command palette) — ไปยังหน้า + สร้างใหม่ · กรองตามสิทธิ์เหมือน sidebar
type Action = { id: string; label: string; icon: IconName; href: string; perm?: [string, string] };
const ALL_ACTIONS: Action[] = [
  { id: 'a-home', label: 'แดชบอร์ด', icon: 'home', href: '/' },
  { id: 'a-prop', label: 'ทรัพย์', icon: 'building', href: '/properties', perm: ['property', 'read'] },
  { id: 'a-prop-new', label: 'เพิ่มทรัพย์ใหม่', icon: 'plus', href: '/properties/new', perm: ['property', 'create'] },
  { id: 'a-owner', label: 'เจ้าของ', icon: 'key', href: '/owners', perm: ['owner', 'read'] },
  { id: 'a-lead', label: 'Lead', icon: 'user-plus', href: '/leads', perm: ['lead', 'read'] },
  { id: 'a-appt', label: 'นัดหมาย', icon: 'clock', href: '/appointments', perm: ['appointment', 'read'] },
  { id: 'a-cal', label: 'ปฏิทิน', icon: 'calendar', href: '/calendar', perm: ['appointment', 'read'] },
  { id: 'a-cust', label: 'ลูกค้า', icon: 'users', href: '/customers', perm: ['customer', 'read'] },
  { id: 'a-contract', label: 'สัญญา', icon: 'file-text', href: '/contracts', perm: ['contract', 'read'] },
  { id: 'a-users', label: 'ผู้ใช้งาน', icon: 'users', href: '/users', perm: ['user', 'read'] },
  { id: 'a-settings', label: 'ตั้งค่า', icon: 'menu', href: '/settings', perm: ['setting', 'read'] },
];

type Item = { id: string; label: string; sub?: string; href: string; icon?: IconName };

export default function GlobalSearch({ variant }: {
  variant?: 'page'; // 'page' = เรนเดอร์เป็นเนื้อหาในหน้า /search (ไม่ใช่ overlay/dropdown)
} = {}) {
  const { api, can } = useAuth();
  const router = useRouter();
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Results>(EMPTY);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0); // F2: แถวที่เลือกด้วยคีย์บอร์ด
  // หมายเหตุ: มือถือค้นหาผ่านหน้า /search (bottom-nav) — GlobalSearch ในเฮดเดอร์ = inline เดสก์ท็อป (mouse:) เท่านั้น
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // E2: คีย์ลัดเปิดค้นหา — ⌘K / Ctrl+K (ทุกที่) · "/" (เฉพาะตอนไม่ได้พิมพ์ในช่องอื่น) · Esc ปิด
  useEffect(() => {
    if (variant === 'page') return; // หน้า /search คุมคีย์เอง — ไม่ต้องผูกคีย์ลัดซ้ำ
    function activate() {
      // จับ shell เดียวกับ Tailwind variant `mouse` → เดสก์ท็อปโฟกัสช่อง inline, สัมผัสไปหน้า /search
      const isMouse = window.matchMedia('(min-width: 768px) and (not (any-pointer: coarse))').matches;
      if (isMouse) { setOpen(true); inputRef.current?.focus(); inputRef.current?.select(); }
      else { router.push('/search'); }
    }
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const typing = el?.tagName === 'INPUT' || el?.tagName === 'TEXTAREA' || el?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) { e.preventDefault(); activate(); return; }
      if (e.key === '/' && !typing && !e.metaKey && !e.ctrlKey && !e.altKey) { e.preventDefault(); activate(); return; }
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (q.trim().length < 2) { setRes(EMPTY); return; }
    const t = setTimeout(async () => {
      try { const r = await api<Results>(`/search?q=${encodeURIComponent(q)}`); setRes(r.data); setOpen(true); }
      catch { /* */ }
    }, 250);
    return () => clearTimeout(t);
  }, [q, api]);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  function go(href: string) { setOpen(false); setQ(''); router.push(href); }

  // F2: รวมคำสั่ง (กรองสิทธิ์ + ตามคำค้น) + ผลค้นหา entity เป็น "section" เดียวกัน
  const ql = q.trim().toLowerCase();
  const sections = useMemo(() => {
    const actions = ALL_ACTIONS
      .filter((a) => !a.perm || can(a.perm[0], a.perm[1]))
      .filter((a) => !ql || a.label.toLowerCase().includes(ql))
      .map((a): Item => ({ id: a.id, label: a.label, href: a.href, icon: a.icon }));
    const out: { title: string; items: Item[] }[] = [];
    if (actions.length) out.push({ title: ql ? 'คำสั่ง' : 'ไปยัง', items: actions });
    if (res.properties.length) out.push({ title: 'ทรัพย์', items: res.properties.map((p) => ({ id: p.id, label: p.titleTh, sub: p.code, href: `/properties/${p.id}` })) });
    if (res.leads.length) out.push({ title: 'Lead', items: res.leads.map((l) => ({ id: l.id, label: l.fullName, sub: l.phone, href: `/leads?focus=${l.id}` })) });
    if (res.customers.length) out.push({ title: 'ลูกค้า', items: res.customers.map((c) => ({ id: c.id, label: c.fullName, sub: c.phone, href: `/customers/${c.id}` })) });
    if (res.owners.length) out.push({ title: 'เจ้าของ', items: res.owners.map((o) => ({ id: o.id, label: o.fullName, sub: o.phone, href: `/owners/${o.id}` })) });
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ql, res, can]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);
  useEffect(() => { setSel(0); }, [ql, res]); // รีเซ็ตแถวที่เลือกเมื่อรายการเปลี่ยน

  // ↑/↓ เลื่อนเลือก · Enter เปิดแถวที่เลือก (ใช้ร่วมทั้ง input เดสก์ท็อป/มือถือ)
  function onNavKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel((s) => Math.min(flat.length - 1, s + 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel((s) => Math.max(0, s - 1)); }
    else if (e.key === 'Enter') { const it = flat[sel]; if (it) { e.preventDefault(); go(it.href); } }
  }

  // เนื้อหา palette — สร้างใหม่ทุกครั้ง (running index สำหรับไฮไลต์แถวที่เลือก)
  function content(emptyText: string) {
    if (sections.length === 0) return <p className="px-3 py-4 text-center text-sm text-muted">{emptyText}</p>;
    let idx = -1;
    return sections.map((sec) => (
      <div key={sec.title}>
        <p className="px-3 pt-2 text-[11px] font-medium uppercase text-muted">{sec.title}</p>
        {sec.items.map((it) => {
          idx++; const i = idx;
          return (
            <button key={it.id} onMouseEnter={() => setSel(i)} onClick={() => go(it.href)}
              className={`flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition ${i === sel ? 'bg-canvas' : 'hover:bg-raised'}`}>
              {it.icon && <Icon name={it.icon} size={16} className="shrink-0 text-faint" />}
              <span className="min-w-0 flex-1 truncate">
                <span className="font-medium">{it.label}</span>
                {it.sub && <span className="ml-2 text-xs text-muted">{it.sub}</span>}
              </span>
            </button>
          );
        })}
      </div>
    ));
  }

  // โหมดหน้า /search — ช่องค้นหา + ผลลัพธ์ inline (ไม่ overlay, ไม่ทับ bottom nav)
  if (variant === 'page') {
    return (
      <div>
        <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3.5 focus-within:border-gold">
          <Icon name="search" size={20} className="shrink-0 text-faint" />
          <input ref={inputRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onNavKey}
            placeholder="ค้นหา ทรัพย์ / Lead / ลูกค้า / คำสั่ง…"
            className="h-12 flex-1 border-0 bg-transparent text-base outline-none placeholder:text-faint" />
          {q && (
            <button type="button" aria-label="ล้าง" onClick={() => setQ('')}
              className="shrink-0 rounded-lg p-1.5 text-muted hover:bg-raised hover:text-ink"><Icon name="x" size={18} /></button>
          )}
        </div>
        <div className="mt-3 overflow-hidden rounded-xl border border-border bg-surface py-1">
          {content('ไม่พบผลลัพธ์')}
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Desktop/แท็บเล็ต (≥sm): ช่องค้นหา inline + dropdown (โฟกัส = เห็นทางลัด) */}
      <div ref={boxRef} className="relative hidden mouse:block">
        <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-faint" />
        <input
          ref={inputRef}
          className="h-9 w-48 rounded-lg border border-border bg-canvas pl-9 pr-8 text-sm outline-none focus:w-64 focus:border-gold focus:bg-surface md:w-56"
          placeholder="ค้นหา / คำสั่ง…"
          value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onKeyDown={onNavKey} />
        {/* E2: บอกใบ้คีย์ลัด "/" (กดเปิดค้นหา) — ซ่อนเมื่อเริ่มพิมพ์ */}
        {!q && (
          <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 rounded border border-border bg-surface px-1.5 text-[11px] font-medium leading-5 text-muted md:block">/</kbd>
        )}
        {open && (
          <div className="absolute left-0 top-11 z-50 max-h-96 w-80 overflow-y-auto rounded-xl2 border border-border bg-surface py-1 shadow-lift">
            {content('ไม่พบผลลัพธ์')}
          </div>
        )}
      </div>

    </>
  );
}

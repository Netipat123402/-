'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';

interface Notif {
  id: string; category: string; title: string; body: string; status: string;
  entityType?: string; entityId?: string; createdAt: string;
}

const CATEGORY_TH: Record<string, { label: string; color: string; icon: IconName }> = {
  property: { label: 'ทรัพย์', color: 'bg-success/10 text-success', icon: 'building' },
  appointment: { label: 'นัดหมาย', color: 'bg-gold/15 text-gold-dark', icon: 'calendar' },
  lead: { label: 'Lead', color: 'bg-info/10 text-info', icon: 'user-plus' },
  contract: { label: 'สัญญา', color: 'bg-warning/10 text-warning', icon: 'file-text' },
  user: { label: 'ผู้ใช้', color: 'bg-info/10 text-info', icon: 'user' },
  system: { label: 'ระบบ', color: 'bg-border text-ink-soft', icon: 'info' },
};
// ลำดับหมวดที่อยากให้แสดงก่อน (หมวดอื่นต่อท้าย)
const CAT_ORDER = ['property', 'appointment', 'lead', 'contract', 'user', 'system'];

// deep-link ไป entity "ถูกตัว" (Phase 50): lead/appointment ใช้ ?focus= (เปิด modal) · ที่มีหน้า detail ใช้ /:id
function entityHref(entityType?: string, entityId?: string): string | undefined {
  if (!entityType || !entityId) return undefined;
  switch (entityType) {
    case 'lead': return `/leads?focus=${entityId}`;
    case 'appointment': return `/appointments?focus=${entityId}`;
    case 'property': return `/properties/${entityId}`;
    case 'contract': return `/contracts/${entityId}`;
    case 'owner': return `/owners/${entityId}`;
    case 'customer': return `/customers/${entityId}`;
    default: return undefined;
  }
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function NotificationsPage() {
  const { api } = useAuth();
  const [rows, setRows] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); // MR-26
  const [cat, setCat] = useState(''); // '' = ทั้งหมด

  const load = useCallback(async () => {
    setLoading(true); setError(false);
    try { const r = await api<Notif[]>('/notifications?limit=50'); setRows(r.data); }
    catch { setError(true); } finally { setLoading(false); }
  }, [api]);
  useEffect(() => { load(); }, [load]);

  async function markRead(id: string) {
    try { await api(`/notifications/${id}/read`, { method: 'PATCH' }); load(); } catch { /* */ }
  }
  async function markAll() {
    try { await api('/notifications/read-all', { method: 'PATCH' }); load(); } catch { /* */ }
  }

  // หมวดที่มีจริง (เรียงตาม CAT_ORDER) + นับยังไม่อ่านต่อหมวด
  const cats = useMemo(() => {
    const unreadBy: Record<string, number> = {};
    const present = new Set<string>();
    for (const r of rows) {
      present.add(r.category);
      if (r.status !== 'read') unreadBy[r.category] = (unreadBy[r.category] ?? 0) + 1;
    }
    return [...present]
      .sort((a, b) => {
        const ia = CAT_ORDER.indexOf(a), ib = CAT_ORDER.indexOf(b);
        return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
      })
      .map((c) => ({ key: c, label: CATEGORY_TH[c]?.label ?? c, icon: CATEGORY_TH[c]?.icon ?? 'bell' as IconName, unread: unreadBy[c] ?? 0 }));
  }, [rows]);

  const totalUnread = rows.filter((r) => r.status !== 'read').length;
  const visible = cat ? rows.filter((r) => r.category === cat) : rows;

  return (
    <div>
      <PageHeader title="การแจ้งเตือน" count={`${rows.length} รายการ`}
        action={totalUnread > 0 && <button className="btn-ghost h-10" onClick={markAll}>อ่านทั้งหมด</button>} />

      {/* แถบหมวดแบบ IG — มือถือ: ปัดซ้ายขวา · เดสก์ท็อป: ปุ่มลูกศร ◄ ► */}
      {cats.length > 0 && (
        <CategoryBar
          all={{ label: 'ทั้งหมด', icon: 'bell', unread: totalUnread }}
          cats={cats} active={cat} onPick={setCat} dep={cats.length}
        />
      )}

      <div className="mt-4 card overflow-hidden">
        {loading ? <ListSkeleton /> : error ? (
          <ErrorState onRetry={load} text="โหลดการแจ้งเตือนไม่สำเร็จ" />
        ) : visible.length === 0 ? (
          <EmptyState text={cat ? 'ไม่มีการแจ้งเตือนในหมวดนี้' : 'ยังไม่มีการแจ้งเตือน'} icon="bell" />
        ) : (
          <ul className="divide-y divide-border">
            {visible.map((n) => {
              const c = CATEGORY_TH[n.category] ?? CATEGORY_TH.system;
              const unread = n.status !== 'read';
              const href = entityHref(n.entityType, n.entityId);
              const Body = (
                <div className={`flex gap-3 px-5 py-4 transition ${unread ? 'bg-gold/[0.03]' : ''} hover:bg-raised`}>
                  {unread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold" />}
                  <div className={`min-w-0 flex-1 ${unread ? '' : 'pl-5'}`}>
                    <div className="flex items-center gap-2">
                      <span className={`badge ${c.color}`}>{c.label}</span>
                      <span className="text-xs text-muted">{timeAgo(n.createdAt)}</span>
                    </div>
                    <p className="mt-1 font-medium">{n.title}</p>
                    <p className="text-sm text-muted">{n.body}</p>
                  </div>
                  {unread && (
                    <button onClick={(e) => { e.preventDefault(); markRead(n.id); }}
                      className="shrink-0 self-center text-xs text-gold-dark hover:underline">ทำเป็นอ่าน</button>
                  )}
                </div>
              );
              return (
                <li key={n.id}>
                  {href ? <Link href={href} onClick={() => unread && markRead(n.id)}>{Body}</Link> : Body}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

/**
 * CategoryBar — แถบกรองหมวดแบบ Instagram
 *   มือถือ/แท็บเล็ต: ปัดเลื่อนแนวนอน (touch scroll) · เดสก์ท็อป: ปุ่มลูกศรซ้าย/ขวา
 *   ปุ่มลูกศรซ่อนเองเมื่อเลื่อนสุดขอบ (เฉพาะ mouse pointer)
 */
function CategoryBar({ all, cats, active, onPick, dep }: {
  all: { label: string; icon: IconName; unread: number };
  cats: { key: string; label: string; icon: IconName; unread: number }[];
  active: string; onPick: (k: string) => void; dep: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [canL, setCanL] = useState(false);
  const [canR, setCanR] = useState(false);

  const update = useCallback(() => {
    const el = ref.current; if (!el) return;
    setCanL(el.scrollLeft > 4);
    setCanR(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);
  useEffect(() => {
    update();
    const el = ref.current;
    el?.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => { el?.removeEventListener('scroll', update); window.removeEventListener('resize', update); };
  }, [update, dep]);

  const nudge = (dir: -1 | 1) => ref.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });

  return (
    <div className="relative mt-4">
      {/* ลูกศรซ้าย — เฉพาะเดสก์ท็อป */}
      <button type="button" aria-label="เลื่อนซ้าย" onClick={() => nudge(-1)}
        className={`absolute left-0 top-1/2 z-10 hidden -translate-y-1/2 mouse:flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-sm transition hover:border-ink/40 hover:text-ink ${canL ? '' : 'pointer-events-none opacity-0'}`}>
        <Icon name="chevron-left" size={18} />
      </button>

      <div ref={ref}
        className="flex gap-2 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] mouse:px-11 [&::-webkit-scrollbar]:hidden">
        <CatChip {...all} on={active === ''} onClick={() => onPick('')} />
        {cats.map((c) => (
          <CatChip key={c.key} label={c.label} icon={c.icon} unread={c.unread}
            on={active === c.key} onClick={() => onPick(c.key)} />
        ))}
      </div>

      {/* ลูกศรขวา — เฉพาะเดสก์ท็อป */}
      <button type="button" aria-label="เลื่อนขวา" onClick={() => nudge(1)}
        className={`absolute right-0 top-1/2 z-10 hidden -translate-y-1/2 mouse:flex h-9 w-9 items-center justify-center rounded-full border border-border bg-surface text-ink-soft shadow-sm transition hover:border-ink/40 hover:text-ink ${canR ? '' : 'pointer-events-none opacity-0'}`}>
        <Icon name="chevron-right" size={18} />
      </button>
    </div>
  );
}

/** ชิปหมวดแบบ IG — ไอคอน + ชื่อ + จำนวนยังไม่อ่าน */
function CatChip({ label, icon, unread, on, onClick }: {
  label: string; icon: IconName; unread: number; on: boolean; onClick: () => void;
}) {
  return (
    <button type="button" onClick={onClick}
      className={`flex shrink-0 items-center gap-2 rounded-lg border px-4 py-2 text-sm transition ${
        on ? 'border-gold bg-gold/15 text-gold-dark' : 'border-border bg-surface text-ink-soft hover:border-ink/40'
      }`}>
      <Icon name={icon} size={16} className={on ? '' : 'text-faint'} />
      {label}
      {unread > 0 && (
        <span className={`rounded-full px-1.5 text-2xs font-semibold ${on ? 'bg-gold/30 text-gold-dark' : 'bg-gold/15 text-gold-dark'}`}>{unread}</span>
      )}
    </button>
  );
}

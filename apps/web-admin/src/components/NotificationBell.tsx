'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Icon, type IconName } from '@/components/Icon';
import { relTime, fmtDateShort } from '@/lib/format';
import { notifTitle, notifBody } from '@/lib/notif';

type TFn = (key: string, values?: Record<string, string | number>) => string;

interface Notif {
  id: string; category: string; title: string; body: string; status: string;
  entityType?: string; entityId?: string; createdAt: string;
  // i18n (C-backend 2/2) — key+params · fallback title/body ถ้าไม่มี key (row เก่า)
  titleKey?: string | null; bodyKey?: string | null; params?: Record<string, unknown> | null;
}
interface Appt { id: string; code: string; title?: string | null; scheduledAt: string; lead?: { fullName: string } | null; property?: { titleTh: string } | null }
interface Contract { id: string; code: string; endDate?: string | null }

// ชนิดที่มี "หน้า detail" จริง → ลิงก์ตรง /{route}/{id}
const DETAIL_ROUTE: Record<string, string> = {
  property: '/properties', owner: '/owners', customer: '/customers', contract: '/contracts',
};
// ชนิดที่ใช้ row→Modal (ไม่มีหน้า detail) → ลิงก์ /{route}?focus={id} ให้หน้า list เปิด modal + highlight
const MODAL_ROUTE: Record<string, string> = { appointment: '/appointments', lead: '/leads' };
const LIST_ROUTE: Record<string, string> = { ...DETAIL_ROUTE, ...MODAL_ROUTE };

/** สร้างลิงก์ deep-link ไปยังรายการนั้นโดยตรง (ใช้ entityId) — กดแล้วเจอตัวที่ใช่ ไม่ใช่หน้ารวม */
function entityHref(type?: string, id?: string): string | null {
  if (!type) return null;
  if (id && DETAIL_ROUTE[type]) return `${DETAIL_ROUTE[type]}/${id}`;
  if (id && MODAL_ROUTE[type]) return `${MODAL_ROUTE[type]}?focus=${id}`;
  return LIST_ROUTE[type] ?? null; // ไม่มี id → หน้ารวม (เผื่อกรณีเก่า)
}

const DAY = 86_400_000;
function startOfToday() { const d = new Date(); d.setHours(0, 0, 0, 0); return d.getTime(); }
// วันที่ local (ไม่ใช้ toISOString ซึ่งเลื่อนไปเป็น UTC ใกล้เที่ยงคืนได้)
const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Bucket = 'today' | 'week' | 'month';

/** จัดช่วงเวลาแบบมองไปข้างหน้า (ไม่ทับกัน): วันนี้ / ภายใน 7 วัน / ภายใน 30 วัน */
function bucketOf(ms: number): Bucket | null {
  const t0 = startOfToday();
  if (ms < t0) return null;
  if (ms < t0 + DAY) return 'today';
  if (ms < t0 + 7 * DAY) return 'week';
  if (ms < t0 + 30 * DAY) return 'month';
  return null;
}

interface WorkItem { id: string; bucket: Bucket; icon: IconName; title: string; meta: string; href: string; ts: number }

function apptMeta(ts: number, t: TFn) {
  const d = new Date(ts);
  const time = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  const isToday = ts < startOfToday() + DAY;
  return isToday ? `${t('notif.today')} ${time}` : `${d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${time}`;
}
function contractMeta(ts: number, t: TFn) {
  const days = Math.round((ts - startOfToday()) / DAY);
  const date = new Date(ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  return days <= 0 ? t('notif.dueToday', { date }) : t('notif.dueIn', { date, days });
}

export default function NotificationBell() {
  const t = useTranslations();
  const { api, can } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<Notif[]>([]);
  const [unreadEvents, setUnreadEvents] = useState(0);
  const [appts, setAppts] = useState<Appt[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  // โหลดทุกแหล่งพร้อมกัน (เงียบ ๆ) — งานตามเวลา + อัปเดตงาน
  const loadAll = useCallback(async () => {
    try {
      // งานตามช่วงเวลาแสดงแค่ วันนี้/สัปดาห์นี้/เดือนนี้ (≤30 วันข้างหน้า) — กรองที่ backend ก่อน
      // เดิม limit=100 ไม่อิงวันที่ ถ้ามีนัด/สัญญาที่ไกลออกไปเยอะ จะเบียดของในหน้าต่าง 30 วันตกหล่นเงียบๆ
      const today = new Date();
      const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
      const [notif, appt, ctr] = await Promise.all([
        api<Notif[]>('/notifications?limit=8').catch(() => null),
        can('appointment', 'read') ? api<Appt[]>(`/appointments?status=upcoming&limit=300&dateFrom=${toISODate(today)}&dateTo=${toISODate(in30)}`).catch(() => null) : null,
        can('contract', 'read') ? api<Contract[]>(`/contracts?status=active&limit=300&sort=expiry&endDateFrom=${toISODate(today)}&endDateTo=${toISODate(in30)}`).catch(() => null) : null,
      ]);
      if (notif) { setRows(notif.data ?? []); setUnreadEvents((notif.meta?.unread as number) ?? 0); }
      if (appt) setAppts(appt.data ?? []);
      if (ctr) setContracts(ctr.data ?? []);
    } catch { /* ignore */ }
  }, [api, can]);

  // near-realtime: รีเฟรชทุก 30 วิ + ตอนเปิด
  useEffect(() => {
    loadAll();
    const t = setInterval(loadAll, 30_000);
    return () => clearInterval(t);
  }, [loadAll]);

  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  // แปลงนัด/สัญญา → งานตามช่วงเวลา (จัดกลุ่ม today/week/month)
  const byBucket = useMemo(() => {
    const items: WorkItem[] = [];
    for (const a of appts) {
      const ts = new Date(a.scheduledAt).getTime();
      const b = bucketOf(ts);
      if (b) items.push({ id: `a-${a.id}`, bucket: b, icon: 'calendar', title: a.lead?.fullName || a.property?.titleTh || a.title || t('notif.apptTitle', { code: a.code }), meta: apptMeta(ts, t), href: `/appointments/${a.id}`, ts });
    }
    for (const c of contracts) {
      if (!c.endDate) continue;
      const ts = new Date(c.endDate).getTime();
      const b = bucketOf(ts);
      if (b) items.push({ id: `c-${c.id}`, bucket: b, icon: 'file-text', title: t('notif.contractTitle', { code: c.code }), meta: contractMeta(ts, t), href: `/contracts/${c.id}`, ts });
    }
    items.sort((x, y) => x.ts - y.ts);
    return {
      today: items.filter((i) => i.bucket === 'today'),
      week: items.filter((i) => i.bucket === 'week'),
      month: items.filter((i) => i.bucket === 'month'),
    } as Record<Bucket, WorkItem[]>;
  }, [appts, contracts, t]);

  // badge = งานวันนี้ + อัปเดตที่ยังไม่อ่าน (สิ่งที่ต้องสนใจตอนนี้)
  const badge = byBucket.today.length + unreadEvents;
  const hasAnything = byBucket.today.length + byBucket.week.length + byBucket.month.length + rows.length > 0;

  async function markAll() {
    try { await api('/notifications/read-all', { method: 'PATCH' }); setRows((r) => r.map((n) => ({ ...n, status: 'read' }))); setUnreadEvents(0); } catch { /* */ }
  }
  function go(href: string) { setOpen(false); router.push(href); }
  function openEvent(n: Notif) {
    if (n.status !== 'read') {
      api(`/notifications/${n.id}/read`, { method: 'PATCH' }).catch(() => {});
      setUnreadEvents((u) => Math.max(0, u - 1));
      setRows((rs) => rs.map((x) => (x.id === n.id ? { ...x, status: 'read' } : x)));
    }
    setOpen(false);
    const href = entityHref(n.entityType, n.entityId);
    if (href) router.push(href);
  }

  return (
    <div className="relative" ref={boxRef}>
      <button onClick={() => { setOpen((v) => !v); if (!open) loadAll(); }} aria-label={t('notif.aria')}
        className="relative flex h-9 w-9 touch:h-10 touch:w-10 items-center justify-center rounded-full text-ink-soft transition hover:bg-raised">
        <Icon name="bell" size={20} />
        {badge > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-semibold text-[#1c1b18] ring-2 ring-surface">
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed right-3 top-16 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl2 border border-border bg-surface shadow-lift sm:absolute sm:right-0 sm:top-full sm:mt-2 sm:w-[22rem]">
          <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
            <p className="text-sm font-semibold">{t('notif.title')}</p>
            {unreadEvents > 0 && (
              <button onClick={markAll} className="text-xs text-gold-dark hover:underline">{t('notif.markAll')}</button>
            )}
          </div>

          {!hasAnything ? (
            <p className="px-4 py-10 text-center text-sm text-muted">{t('notif.empty')}</p>
          ) : (
            <div className="max-h-[24rem] divide-y divide-border overflow-y-auto overscroll-contain">
              {/* งานตามเวลา */}
              {(['today', 'week', 'month'] as Bucket[]).map((b) => {
                const list = byBucket[b];
                if (list.length === 0) return null;
                const shown = list.slice(0, 4);
                return (
                  <div key={b} className="py-1">
                    <div className="flex items-center justify-between px-4 pb-1 pt-1.5">
                      <span className={`text-2xs font-semibold uppercase tracking-wide ${b === 'today' ? 'text-gold-dark' : 'text-muted'}`}>{t(b === 'today' ? 'notif.bucketToday' : b === 'week' ? 'notif.bucketWeek' : 'notif.bucketMonth')}</span>
                      <span className="text-2xs text-muted">{list.length}</span>
                    </div>
                    {shown.map((it) => (
                      <button key={it.id} onClick={() => go(it.href)}
                        className="flex w-full items-center gap-2.5 px-4 py-2 text-left transition hover:bg-raised">
                        <Icon name={it.icon} size={16} className="shrink-0 text-muted" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm text-ink">{it.title}</span>
                          <span className="block truncate text-xs text-muted">{it.meta}</span>
                        </span>
                        <Icon name="chevron-right" size={15} className="shrink-0 text-faint" />
                      </button>
                    ))}
                    {list.length > shown.length && (
                      <button onClick={() => go(b === 'today' ? '/calendar' : '/appointments')}
                        className="px-4 pb-1.5 pt-0.5 text-xs text-gold-dark hover:underline">
                        {t('notif.moreItems', { n: list.length - shown.length })}
                      </button>
                    )}
                  </div>
                );
              })}

              {/* อัปเดตงาน (event เดิม) */}
              {rows.length > 0 && (
                <div className="py-1">
                  <div className="px-4 pb-1 pt-1.5">
                    <span className="text-2xs font-semibold uppercase tracking-wide text-muted">{t('notif.updates')}</span>
                  </div>
                  {rows.slice(0, 5).map((n) => {
                    const unread = n.status !== 'read';
                    return (
                      <button key={n.id} onClick={() => openEvent(n)}
                        className={`flex w-full gap-2.5 px-4 py-2 text-left transition hover:bg-raised ${unread ? 'bg-gold/[0.04]' : ''}`}>
                        <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${unread ? 'bg-gold' : 'bg-transparent'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="flex items-baseline justify-between gap-2">
                            <span className={`truncate text-sm ${unread ? 'font-semibold text-ink' : 'font-normal text-ink-soft'}`}>{notifTitle(n, t)}</span>
                            <span className="shrink-0 text-2xs text-muted">{relTime(n.createdAt, t, (d) => fmtDateShort(d.toISOString()))}</span>
                          </span>
                          <span className="block truncate text-xs text-muted">{notifBody(n, t)}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          <button onClick={() => go('/notifications')}
            className="block w-full border-t border-border px-4 py-2.5 text-center text-xs font-medium text-gold-dark hover:bg-raised">
            {t('notif.viewAll')}
          </button>
        </div>
      )}
    </div>
  );
}

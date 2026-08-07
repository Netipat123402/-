'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { bahtFormat } from '@/lib/status';
import { ErrorState } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';

// ── payload จาก GET /dashboard (server aggregation ต่อบทบาท · Phase 2) ──
interface Kpi { key: string; label: string; value: number; href: string; icon: string; hot?: boolean }
interface AgendaItem { id: string; code?: string; primary: string; secondary?: string | null; scheduledAt?: string | null; endDate?: string | null; href?: string }
interface AgendaSection { key: string; title: string; icon: string; href: string; items: AgendaItem[]; tone?: 'alert' }
interface DashboardData { role: string; kpis: Kpi[]; agenda: AgendaSection[] }

const fmtDayTime = (iso: string) => {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} · ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
};
const fmtExpiry = (iso: string) => {
  const d = new Date(iso);
  const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
  return { label: `Due ${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`, days };
};

export default function DashboardPage() {
  const { api } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true); setError(false);
      try {
        const r = await api<DashboardData>('/dashboard');
        if (alive) setData(r.data);
      } catch { if (alive) setError(true); }
      finally { if (alive) setLoading(false); }
    })();
    return () => { alive = false; };
  }, [api, tick]);

  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
  const kpis = data?.kpis ?? [];
  const agenda = (data?.agenda ?? []).filter((s) => s.items.length > 0);
  const hasAgenda = agenda.length > 0;

  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-sm text-muted">{todayLabel}</p>

      {error && !loading && <div className="mt-4 card"><ErrorState onRetry={() => setTick((t) => t + 1)} text="Couldn't load dashboard" /></div>}

      {/* KPI — ตัวเลขที่ต้อง action (hot) = ขอบ+พื้นทองอ่อน */}
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        {(loading ? Array.from({ length: 4 }) : kpis).map((c, i) => {
          const kpi = c as Kpi;
          if (loading) return <div key={i} className="card h-[118px] animate-pulse" />;
          return (
            <Link key={kpi.key} href={kpi.href}
              className={`card flex flex-col items-center gap-1.5 px-3 py-6 text-center transition hover:shadow-lift ${
                kpi.hot ? 'border-gold/40 bg-gold/[0.06] hover:bg-gold/10' : 'hover:border-gold/40 hover:bg-raised'
              }`}>
              <Icon name={kpi.icon as IconName} size={18} className={kpi.hot ? 'text-gold-dark' : 'text-faint'} />
              <span className="mt-1 text-[30px] font-semibold leading-none tracking-tight tabular-nums">{bahtFormat(kpi.value)}</span>
              <span className="text-xs text-muted">{kpi.label}</span>
            </Link>
          );
        })}
      </div>

      {/* สิ่งที่ต้องทำ — คิวงานตามบทบาท (ซ่อนหมวดว่าง) */}
      <section className="mt-9 card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <h2 className="text-base font-semibold tracking-tight">To do</h2>
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-canvas" />)}</div>
        ) : !hasAgenda ? (
          <div className="flex flex-col items-center gap-2.5 px-6 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-faint"><Icon name="check" size={22} /></span>
            <p className="text-sm text-muted">Nothing to do right now</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {agenda.map((sec) => {
              const alert = sec.tone === 'alert';
              return (
              <div key={sec.key} className="py-1.5">
                <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-2 sm:px-5">
                  <span className={`inline-flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wide ${alert ? 'text-warning' : 'text-muted'}`}>
                    <Icon name={sec.icon as IconName} size={13} /> {sec.title} <span className={alert ? 'text-warning/70' : 'text-faint/70'}>{sec.items.length}</span>
                  </span>
                  <Link href={sec.href} className="text-xs text-gold-dark hover:underline">View all</Link>
                </div>
                <ul className="divide-y divide-border">
                  {sec.items.map((it) => {
                    const expiry = it.endDate ? fmtExpiry(it.endDate) : null;
                    return (
                      <li key={it.id}>
                        <Link href={it.href || sec.href} className={`flex items-center gap-3 px-4 py-2.5 sm:px-5 ${alert ? 'bg-warning/[0.06] hover:bg-warning/10' : 'hover:bg-raised'}`}>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{it.primary}</p>
                            {(it.secondary || it.scheduledAt || expiry) && (
                              <p className="truncate text-xs text-muted">
                                {it.secondary || (it.scheduledAt ? fmtDayTime(it.scheduledAt) : expiry ? expiry.label : '')}
                              </p>
                            )}
                          </div>
                          {it.scheduledAt && <span className="hidden shrink-0 whitespace-nowrap text-xs text-ink-soft sm:inline">{fmtDayTime(it.scheduledAt)}</span>}
                          {expiry && <span className="hidden shrink-0 whitespace-nowrap text-xs font-medium text-gold-dark sm:inline">{expiry.label}<span className="hidden lg:inline"> · {expiry.days} days left</span></span>}
                          {it.code && <span className="hidden shrink-0 font-mono text-2xs text-faint lg:inline">{it.code}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}

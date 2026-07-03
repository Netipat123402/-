'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@/lib/auth';
import { bahtFormat } from '@/lib/status';
import { Segmented, ErrorState } from '@/components/ui';
import { Icon, type IconName } from '@/components/Icon';

interface ApptRow { id: string; code: string; scheduledAt: string; }
interface LeadRow { id: string; code: string; fullName: string; phone: string; createdAt: string; }
interface ContractRow { id: string; code: string; endDate?: string; }

// วันที่ local (ไม่ใช้ toISOString ซึ่งเลื่อนไปเป็น UTC ใกล้เที่ยงคืนได้)
const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

type Win = 'today' | '7d' | '30d';
const WIN_OPTIONS = [
  { value: 'today', label: 'วันนี้' },
  { value: '7d', label: '7 วัน' },
  { value: '30d', label: '30 วัน' },
];

// หมวดย่อยใน "สิ่งที่ต้องทำ" — ป้ายเล็ก uppercase (ภาษาเดียวกับกระดิ่ง/รายละเอียด) ซ่อนถ้าว่าง
function AgendaSection({ title, icon, href, hrefLabel, count, children }: {
  title: string; icon: IconName; href: string; hrefLabel: string; count: number; children: React.ReactNode;
}) {
  if (count === 0) return null;
  return (
    <div className="py-1.5">
      <div className="flex items-center justify-between gap-2 px-4 pb-1 pt-2 sm:px-5">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted">
          <Icon name={icon} size={13} /> {title} <span className="text-faint/70">{count}</span>
        </span>
        <Link href={href} className="text-xs text-gold-dark hover:underline">{hrefLabel}</Link>
      </div>
      <ul className="divide-y divide-border">{children}</ul>
    </div>
  );
}

function Row({ left, right, href }: { left: React.ReactNode; right: React.ReactNode; href?: string }) {
  const inner = <><span className="min-w-0 flex-1 truncate">{left}</span><span className="shrink-0">{right}</span></>;
  return href
    ? <li><Link href={href} className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-canvas">{inner}</Link></li>
    : <li className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm">{inner}</li>;
}

export default function DashboardPage() {
  const { api, can } = useAuth();
  const [stats, setStats] = useState({ available: 0, working: 0, upcoming: 0, active: 0 });
  const [appts, setAppts] = useState<ApptRow[]>([]);
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [contracts, setContracts] = useState<ContractRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false); // MR-26
  const [tick, setTick] = useState(0);
  const [win, setWin] = useState<Win>('today');

  useEffect(() => {
    (async () => {
      setLoading(true); setError(false);
      try {
        const total = async (p: string) => (await api(p)).meta?.total ?? 0;
        const [available, working, upcoming, active] = await Promise.all([
          can('property', 'read') ? total('/properties?status=available&limit=1') : 0,
          can('lead', 'read') ? total('/leads?status=working&limit=1') : 0,
          can('appointment', 'read') ? total('/appointments?status=upcoming&limit=1') : 0,
          can('contract', 'read') ? total('/contracts?status=active&limit=1') : 0,
        ]);
        setStats({ available, working, upcoming, active });
        // ดึงรายการดิบครั้งเดียว กรองด้วยวันที่ตรงกับหน้าต่าง 30 วัน (ช่วงกว้างสุดที่หน้านี้แสดง) ที่ backend ก่อน
        // แล้วค่อยกรองซ้ำตามช่วงเวลาที่เลือก (วันนี้/7วัน/30วัน) ฝั่ง client (สลับมุมมองได้ทันที ไม่ต้องโหลดใหม่)
        // เดิม limit=100 ไม่อิงวันที่เลย → ถ้าธุรกิจมีรายการเกิน 100 ที่ไกลออกไปจะเบียดของในหน้าต่าง 30 วันตกหล่น
        const today = new Date();
        const in30 = new Date(today); in30.setDate(in30.getDate() + 30);
        const back30 = new Date(today); back30.setDate(back30.getDate() - 30);
        if (can('appointment', 'read')) {
          setAppts((await api<ApptRow[]>(`/appointments?status=upcoming&limit=200&dateFrom=${toISODate(today)}&dateTo=${toISODate(in30)}`)).data ?? []);
        }
        if (can('lead', 'read')) {
          setLeads((await api<LeadRow[]>(`/leads?status=new&limit=200&dateFrom=${toISODate(back30)}&dateTo=${toISODate(today)}`)).data ?? []);
        }
        if (can('contract', 'read')) {
          setContracts((await api<ContractRow[]>(`/contracts?status=active&limit=200&sort=expiry&endDateFrom=${toISODate(today)}&endDateTo=${toISODate(in30)}`)).data ?? []);
        }
      } catch { setError(true); } // API ล่ม → แสดง error+retry แทนตัวเลข 0 ลวงตา
      finally { setLoading(false); }
    })();
  }, [api, can, tick]);

  // กรองตามช่วงเวลา: นัด/สัญญา = มองไปข้างหน้า N วัน · Lead ใหม่ = ที่เข้ามาภายใน N วันล่าสุด
  const { winAppts, winLeads, winContracts } = useMemo(() => {
    const days = win === 'today' ? 0 : win === '7d' ? 7 : 30;
    const dayMs = 86_400_000;
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const fwdEnd = todayStart.getTime() + (days + 1) * dayMs - 1; // สิ้นสุดวันสุดท้ายไปข้างหน้า
    const backStart = todayStart.getTime() - days * dayMs;        // ย้อนหลังสำหรับ Lead ใหม่
    return {
      winAppts: appts.filter((a) => { const t = new Date(a.scheduledAt).getTime(); return t >= todayStart.getTime() && t <= fwdEnd; }),
      winLeads: leads.filter((l) => new Date(l.createdAt).getTime() >= backStart),
      winContracts: contracts.filter((c) => { if (!c.endDate) return false; const t = new Date(c.endDate).getTime(); return t >= todayStart.getTime() && t <= fwdEnd; }),
    };
  }, [win, appts, leads, contracts]);

  const allKpis: { label: string; value: number; href: string; icon: IconName; show: boolean }[] = [
    { label: 'ทรัพย์ว่าง', value: stats.available, href: '/properties?status=available', icon: 'building', show: can('property', 'read') },
    { label: 'Lead กำลังดูแล', value: stats.working, href: '/leads?status=working', icon: 'user-plus', show: can('lead', 'read') },
    { label: 'นัดรอพบ', value: stats.upcoming, href: '/appointments', icon: 'clock', show: can('appointment', 'read') },
    { label: 'สัญญามีผล', value: stats.active, href: '/contracts?status=active', icon: 'file-text', show: can('contract', 'read') },
  ];
  const kpis = allKpis.filter((c) => c.show);

  const todayLabel = new Date().toLocaleDateString('th-TH', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="mx-auto max-w-5xl">
      {/* eyebrow วันที่ — minimal ไม่มีคำทักทาย */}
      <p className="text-sm text-muted">{todayLabel}</p>

      {/* MR-26: API ล่ม → แสดง error + ลองใหม่ (ไม่ใช่ตัวเลข 0 ที่ดูเหมือนข้อมูลจริง) */}
      {error && !loading && <div className="mt-4 card"><ErrorState onRetry={() => setTick((t) => t + 1)} text="โหลดข้อมูลแดชบอร์ดไม่สำเร็จ" /></div>}

      {/* KPI — การ์ดเรียบ ตัวเลข+ป้ายจัดกึ่งกลาง · เว้นช่องโปร่ง อ่านสบาย */}
      <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-4 sm:gap-4">
        {kpis.map((c) => (
          <Link key={c.label} href={c.href}
            className="card flex flex-col items-center gap-1.5 px-3 py-6 text-center transition hover:border-gold/40 hover:shadow-lift">
            <Icon name={c.icon} size={18} className="text-faint" />
            <span className="mt-1 text-[30px] font-semibold leading-none tracking-tight tabular-nums">{loading ? '—' : bahtFormat(c.value)}</span>
            <span className="text-xs text-muted">{c.label}</span>
          </Link>
        ))}
      </div>

      {/* สิ่งที่ต้องทำ — การ์ดเดียว รวมทุกหมวด (ซ่อนหมวดที่ว่าง) เลือกช่วงเวลาในหัวการ์ด */}
      <section className="mt-9 card overflow-hidden">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5 sm:px-5">
          <h2 className="text-base font-semibold tracking-tight">สิ่งที่ต้องทำ</h2>
          <Segmented options={WIN_OPTIONS} value={win} onChange={(v) => setWin(v as Win)} />
        </div>
        {loading ? (
          <div className="space-y-2 p-4">{[1, 2, 3].map((i) => <div key={i} className="h-10 animate-pulse rounded-lg bg-canvas" />)}</div>
        ) : (winAppts.length + winLeads.length + winContracts.length === 0) ? (
          <div className="flex flex-col items-center gap-2.5 px-6 py-16 text-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-canvas text-faint"><Icon name="check" size={22} /></span>
            <p className="text-sm text-muted">ไม่มีงานที่ต้องทำในช่วงนี้</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {can('appointment', 'read') && (
              <AgendaSection title="นัดหมาย" icon="clock" href="/calendar" hrefLabel="ปฏิทิน" count={winAppts.length}>
                {winAppts.slice(0, 4).map((a) => (
                  <Row key={a.id} href="/calendar"
                    left={<span className="font-medium">{new Date(a.scheduledAt).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} · {new Date(a.scheduledAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>}
                    right={<span className="font-mono text-xs text-muted">{a.code}</span>} />
                ))}
              </AgendaSection>
            )}
            {can('lead', 'read') && (
              <AgendaSection title="Lead ใหม่" icon="user-plus" href="/leads?status=new" hrefLabel="ดูทั้งหมด" count={winLeads.length}>
                {winLeads.slice(0, 4).map((l) => (
                  <Row key={l.id} href="/leads?status=new" left={l.fullName}
                    right={<span className="text-xs text-muted">{l.phone}</span>} />
                ))}
              </AgendaSection>
            )}
            {can('contract', 'read') && (
              <AgendaSection title="สัญญาใกล้ครบ" icon="file-text" href="/contracts?status=active" hrefLabel="ดูทั้งหมด" count={winContracts.length}>
                {winContracts.slice(0, 4).map((c) => (
                  <Row key={c.id} href={`/contracts/${c.id}`}
                    left={<span className="font-mono text-sm">{c.code}</span>}
                    right={<span className="whitespace-nowrap text-xs font-medium text-gold-dark">{c.endDate ? `ครบ ${new Date(c.endDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })}` : ''}</span>} />
                ))}
              </AgendaSection>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

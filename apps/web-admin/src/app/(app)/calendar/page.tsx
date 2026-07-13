'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useLookup } from '@/lib/lookups';
import { useToast } from '@/components/Toast';
import { APPOINTMENT_STATUS } from '@/lib/status';
import { Combobox, ErrorState, Field, Modal, PageHeader, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface Appt {
  id: string; code: string; scheduledAt: string; status: string; location?: string; title?: string;
  lead?: { fullName: string }; property?: { titleTh: string };
}

const MONTHS = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'];
const DOW = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส'];
const key = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CalendarPage() {
  const { api, user, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [appts, setAppts] = useState<Appt[]>([]);
  const [selected, setSelected] = useState<string>(key(today));
  const [reloadTick, setReloadTick] = useState(0);
  const [error, setError] = useState(false); // MR-26

  useEffect(() => {
    (async () => {
      setError(false);
      // กรองเฉพาะเดือนที่กำลังแสดง (เดิม limit=100 ไม่อิงเดือน → เดือนที่มีนัดเกิน 100 รายการนัดจะตกหล่นเงียบๆ)
      const from = new Date(year, month, 1);
      const to = new Date(year, month + 1, 0);
      try {
        const r = await api<Appt[]>(`/appointments?limit=300&dateFrom=${key(from)}&dateTo=${key(to)}`);
        setAppts(r.data ?? []);
      } catch { setError(true); }
    })();
  }, [api, reloadTick, year, month]);

  // --- เพิ่มนัดนอกรอบ (ไม่อิง Lead/ทรัพย์) ---
  const [open, setOpen] = useState(false);
  const agents = useLookup<{ id: string; fullName: string }>('/users/assignable', (u) => ({ value: u.id, label: u.fullName }), open);
  const blank = { title: '', agentId: '', scheduledAt: '', durationMin: 30, location: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [fe, setFe] = useState<{ title?: string; scheduledAt?: string }>({});
  const [err, setErr] = useState('');

  async function createAppt(e: React.FormEvent) {
    e.preventDefault();
    const v: typeof fe = {};
    if (!form.title.trim()) v.title = 'กรุณาระบุหัวข้อนัด';
    if (!form.scheduledAt) v.scheduledAt = 'กรุณาเลือกวันเวลานัด';
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/appointments', { method: 'POST', body: JSON.stringify({
        title: form.title.trim(), agentId: form.agentId || user?.id,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMin: Number(form.durationMin), location: form.location || undefined,
      }) });
      setOpen(false); setForm(blank); setFe({}); setReloadTick((t) => t + 1);
      toast.success('เพิ่มนัดแล้ว');
    } catch (e2) { setErr((e2 as { message?: string }).message || 'เพิ่มนัดไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  const byDay = useMemo(() => {
    const m = new Map<string, Appt[]>();
    for (const a of appts) { const k = key(new Date(a.scheduledAt)); (m.get(k) ?? m.set(k, []).get(k)!).push(a); }
    return m;
  }, [appts]);

  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const start = first.getDay();
    const days = new Date(year, month + 1, 0).getDate();
    const arr: (Date | null)[] = [];
    for (let i = 0; i < start; i++) arr.push(null);
    for (let d = 1; d <= days; d++) arr.push(new Date(year, month, d));
    while (arr.length % 7 !== 0) arr.push(null);
    return arr;
  }, [year, month]);

  function shift(delta: number) {
    const m = month + delta;
    setYear((y) => y + Math.floor(m / 12) - (m < 0 ? 1 : 0));
    setMonth((m + 12) % 12);
  }

  const selectedAppts = (byDay.get(selected) ?? []).sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt));

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="ปฏิทินนัดหมาย" count={`${appts.length} นัดเดือนนี้`}
        action={(
          <div className="flex items-center gap-2">
            <button className="btn-ghost btn-sm" onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); setSelected(key(today)); }}>วันนี้</button>
            {can('appointment', 'create') && (
              <button className="btn-gold btn-sm" onClick={() => {
                const d = new Date(selected); const pad = (n: number) => String(n).padStart(2, '0');
                setForm({ ...blank, scheduledAt: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T10:00` });
                setFe({}); setErr(''); setOpen(true);
              }}><Icon name="plus" size={16} /> เพิ่มนัด</button>
            )}
          </div>
        )} />

      {/* MR-26: โหลดนัดไม่สำเร็จ → แสดง error + ลองใหม่ (ไม่ใช่ปฏิทินว่างที่ดูเหมือนไม่มีนัด) */}
      {error && <div className="mt-5 card"><ErrorState onRetry={() => setReloadTick((t) => t + 1)} text="โหลดปฏิทินนัดหมายไม่สำเร็จ" /></div>}

      {/* มือถือ/iPad-ตั้ง = ปฏิทินกระชับ(จุด) + รายละเอียดวันล่าง · lg+ (iPad-นอน/คอม) = ปฏิทินเต็มความกว้าง + chip ชื่อนัดในช่อง เห็นทั้งเดือน */}
      <div className="mt-5 space-y-5">
        {/* calendar */}
        <div className="card h-fit p-4">
          <div className="mb-4 flex items-center justify-between">
            <button aria-label="เดือนก่อนหน้า" className="btn-ghost h-9 w-9 p-0" onClick={() => shift(-1)}><Icon name="chevron-left" size={18} /></button>
            <h2 className="font-semibold">{MONTHS[month]} {year + 543}</h2>
            <button aria-label="เดือนถัดไป" className="btn-ghost h-9 w-9 p-0" onClick={() => shift(1)}><Icon name="chevron-right" size={18} /></button>
          </div>
          <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted">
            {DOW.map((d, idx) => <div key={d} className={`py-1.5 ${idx === 0 || idx === 6 ? 'text-gold-dark/60' : ''}`}>{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              const k = key(d);
              const items = byDay.get(k) ?? [];
              const isToday = k === key(today);
              const isSel = k === selected;
              return (
                <button key={i} onClick={() => setSelected(k)}
                  className={`flex aspect-square min-h-[44px] flex-col items-center justify-center gap-0.5 rounded-lg text-sm transition sm:rounded-xl lg:aspect-auto lg:min-h-[96px] lg:items-stretch lg:justify-start lg:gap-1 lg:p-1.5 lg:text-left ${
                    isSel ? 'bg-gold font-medium text-[#1c1b18] shadow-sm lg:bg-gold/10 lg:font-normal lg:text-ink lg:shadow-none lg:ring-1 lg:ring-gold' : isToday ? 'text-gold-dark ring-1 ring-gold' : 'hover:bg-raised'
                  }`}>
                  <span className="lg:text-xs lg:font-medium">{d.getDate()}</span>
                  {items.length > 0 && (
                    <>
                      {/* จอเล็ก (มือถือ/iPad-ตั้ง) = จุด */}
                      <span className="flex h-1 items-center gap-0.5 lg:hidden">
                        {Array.from({ length: Math.min(items.length, 3) }).map((_, j) => (
                          <span key={j} className={`h-1 w-1 rounded-full ${isSel ? 'bg-[#1c1b18]/70' : 'bg-gold'}`} />
                        ))}
                      </span>
                      {/* lg+ (iPad-นอน/คอม) = chip เวลา+ชื่อในช่อง เห็นทั้งเดือนทีเดียว */}
                      <span className="hidden w-full flex-col gap-0.5 lg:flex">
                        {items.slice(0, 3).map((a) => (
                          <span key={a.id} className="truncate rounded bg-gold/20 px-1 py-0.5 text-2xs leading-tight text-gold-dark">
                            {new Date(a.scheduledAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} {a.lead?.fullName || a.title || a.code}
                          </span>
                        ))}
                        {items.length > 3 && <span className="px-1 text-2xs font-medium text-muted">+{items.length - 3}</span>}
                      </span>
                    </>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* day detail */}
        <div className="card p-5">
          <h3 className="mb-3 font-semibold">
            {new Date(selected).toLocaleDateString('th-TH', { dateStyle: 'long' })}
            {selectedAppts.length > 0 && <span className="ml-2 text-sm font-normal text-muted">· {selectedAppts.length} นัด</span>}
          </h3>
          {selectedAppts.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-canvas text-faint"><Icon name="calendar" size={22} /></span>
              <p className="text-sm text-muted">ไม่มีนัดในวันนี้</p>
            </div>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              {selectedAppts.map((a) => (
                <li key={a.id}>
                  {/* กดการ์ด → เปิดรายละเอียดนัดนั้นทันที (deep-link เดียวกับแจ้งเตือน) */}
                  <button type="button" onClick={() => router.push(`/appointments?focus=${a.id}`)}
                    className="w-full rounded-xl border border-border p-4 text-left transition hover:border-gold/40 active:scale-[0.99]">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 font-semibold"><Icon name="clock" size={15} className="text-faint" />{new Date(a.scheduledAt).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.</span>
                      <StatusBadge map={APPOINTMENT_STATUS} value={a.status} short />
                    </div>
                    <p className="mt-2 font-medium">{a.lead?.fullName || a.title || `นัด ${a.code}`}</p>
                    {a.property && <p className="truncate text-sm text-muted">{a.property.titleTh}</p>}
                    {a.location && <p className="mt-0.5 text-xs text-muted">{a.location}</p>}
                    <p className="mt-1.5 font-mono text-2xs text-muted">{a.code}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มนัด (นอกรอบ)"
        confirmOnClose={!!(form.title.trim() || form.location.trim())}>
        <form onSubmit={createAppt} className="space-y-4">
          <Field label="หัวข้อนัด *" error={fe.title} placeholder="เช่น ประชุมทีม, นัดเจ้าของทรัพย์" value={form.title}
            onChange={(e) => { setForm((f) => ({ ...f, title: e.target.value })); setFe((x) => ({ ...x, title: undefined })); }} />
          <Combobox label="ผู้รับผิดชอบ" value={form.agentId} onChange={(v) => setForm((f) => ({ ...f, agentId: v }))}
            options={[{ value: '', label: '— ตัวฉันเอง —' }, ...agents.options]} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="วันเวลานัด *" type="datetime-local" error={fe.scheduledAt} value={form.scheduledAt}
              onChange={(e) => { setForm((f) => ({ ...f, scheduledAt: e.target.value })); setFe((x) => ({ ...x, scheduledAt: undefined })); }} />
            <Field label="ระยะเวลา (นาที)" type="number" value={form.durationMin}
              onChange={(e) => setForm((f) => ({ ...f, durationMin: Number(e.target.value) }))} />
          </div>
          <Field label="สถานที่" value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-gold" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'เพิ่มนัด'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useLookup, useSearchLookup } from '@/lib/lookups';
import { useDebouncedValue } from '@/lib/useDebounce';
import { useToast } from '@/components/Toast';
import { APPOINTMENT_STATUS } from '@/lib/status';
import { Col, Combobox, FilterBar, Field, ListView, Modal, PageHeader, Pagination, Segmented, StatusBadge, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtDateTime } from '@/lib/format';

interface Appt {
  id: string; code: string; scheduledAt: string; status: string;
  durationMin: number; location?: string; title?: string;
  lead?: { fullName: string }; property?: { titleTh: string };
}

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'upcoming', label: 'รอพบ' },
  { value: 'done', label: 'พบแล้ว' },
  { value: 'cancelled', label: 'ยกเลิก' },
];

const TIME_OPTIONS = [
  { value: '', label: 'ทุกวัน' },
  { value: 'today', label: 'วันนี้' },
  { value: 'week', label: 'สัปดาห์นี้' },
];

const fmt = fmtDateTime;

// วันที่ local (ไม่ใช้ toISOString ซึ่งเลื่อนไปเป็น UTC ใกล้เที่ยงคืนได้)
const toISODate = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
// สัปดาห์นี้ อา-ส (ตรงกับปฏิทินหน้า /calendar ที่ขึ้นต้นวันอาทิตย์)
function thisWeekRange() {
  const now = new Date();
  const start = new Date(now); start.setDate(now.getDate() - now.getDay());
  const end = new Date(start); end.setDate(start.getDate() + 6);
  return { from: toISODate(start), to: toISODate(end) };
}

export default function AppointmentsPage() {
  const { api, user, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [date, setDate] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sort, setSort] = useState('asc');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (status) params.set('status', status);
  if (date) params.set('date', date);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (dq) params.set('q', dq);
  const { rows, meta, loading, reload } = useList<Appt>(`/appointments?${params}`);
  const filtered = !!(q || status || date || dateFrom || dateTo);
  const clearFilters = () => { setQ(''); setStatus(''); setDate(''); setDateFrom(''); setDateTo(''); setPage(1); };
  // เรียงฝั่ง server แล้ว (sort=asc/desc ไป API → ถูกต้องข้ามหน้า) — MR-12

  // P11+: preset ช่วงเวลานัด (ทุกวัน/วันนี้/สัปดาห์นี้) — แยกจาก "วันนัด" แบบเลือกวันที่เองในตัวกรอง
  const todayISO = toISODate(new Date());
  const timePreset = dateFrom && dateTo ? 'week' : (date && date === todayISO ? 'today' : '');
  function setTimePreset(v: string) {
    setPage(1);
    if (v === 'today') { setDate(todayISO); setDateFrom(''); setDateTo(''); }
    else if (v === 'week') { const r = thisWeekRange(); setDateFrom(r.from); setDateTo(r.to); setDate(''); }
    else { setDate(''); setDateFrom(''); setDateTo(''); }
  }

  // รายละเอียด/การกระทำนัด ย้ายไปหน้า /appointments/[id] แล้ว · list เหลือ นำทาง + create

  // --- create ---
  const [open, setOpen] = useState(false);
  // MR-24: server-side search → เลือก lead/ทรัพย์รายที่ 101+ ได้
  const leads = useSearchLookup<{ id: string; code: string; fullName: string }>('/leads', (l) => ({ value: l.id, label: `${l.code} · ${l.fullName}` }), open);
  const props = useSearchLookup<{ id: string; code: string; titleTh: string }>('/properties', (p) => ({ value: p.id, label: `${p.code} · ${p.titleTh}` }), open);
  const agents = useLookup<{ id: string; fullName: string }>('/users/assignable', (u) => ({ value: u.id, label: u.fullName }), open);
  const blank = { leadId: '', propertyId: '', agentId: '', scheduledAt: '', durationMin: 30, location: '', title: '' };
  const [form, setForm] = useState(blank);
  const [mode, setMode] = useState<'viewing' | 'general'>('viewing');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  type FErr = { leadId?: string; propertyId?: string; scheduledAt?: string; title?: string };
  const [fe, setFe] = useState<FErr>({});
  // Phase 16 (จาก Lead): seed option ให้ Combobox โชว์ป้าย lead/ทรัพย์ที่ prefill มาได้ (ก่อน server-search โหลด)
  const [seedLead, setSeedLead] = useState<{ value: string; label: string } | null>(null);
  const [seedProp, setSeedProp] = useState<{ value: string; label: string } | null>(null);

  // deep-link จาก Lead working: /appointments?newLead={id} → เปิดฟอร์มนัด prefill lead (+ทรัพย์ถ้าสนใจรายการเดียว)
  const newLeadId = sp.get('newLead');
  const newLeadRef = useRef<string | null>(null);
  useEffect(() => {
    if (!newLeadId || newLeadRef.current === newLeadId) return;
    newLeadRef.current = newLeadId;
    api<{ id: string; code: string; fullName: string; interests?: { property: { id: string; code: string; titleTh: string } }[] }>(`/leads/${newLeadId}`)
      .then((r) => {
        const l = r.data;
        setSeedLead({ value: l.id, label: `${l.code} · ${l.fullName}` });
        const only = l.interests?.length === 1 ? l.interests[0].property : undefined;
        if (only) setSeedProp({ value: only.id, label: `${only.code} · ${only.titleTh}` });
        setMode('viewing');
        setForm({ ...blank, leadId: l.id, propertyId: only?.id ?? '' });
        setOpen(true);
        router.replace('/appointments'); // ล้าง param กันเปิดซ้ำตอน refresh/back
      })
      .catch(() => toast.error('ไม่พบ Lead สำหรับสร้างนัด'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [newLeadId]);
  function setField<K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }
  function close() { setOpen(false); setFe({}); setErr(''); setSeedLead(null); setSeedProp(null); }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const v: FErr = {};
    if (mode === 'viewing') {
      if (!form.leadId) v.leadId = 'กรุณาเลือก Lead';
      if (!form.propertyId) v.propertyId = 'กรุณาเลือกทรัพย์';
    } else if (!form.title.trim()) {
      v.title = 'กรุณาระบุหัวข้อนัด';
    }
    if (!form.scheduledAt) v.scheduledAt = 'กรุณาเลือกวันเวลานัด';
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/appointments', { method: 'POST', body: JSON.stringify({
        ...(mode === 'viewing' ? { leadId: form.leadId, propertyId: form.propertyId } : { title: form.title.trim() }),
        agentId: form.agentId || user?.id,
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        durationMin: Number(form.durationMin), location: form.location || undefined,
      }) });
      setOpen(false); setForm(blank); setFe({}); setSeedLead(null); setSeedProp(null); reload();
      toast.success('สร้างนัดหมายแล้ว');
    } catch (e2) { setErr((e2 as { message?: string }).message || 'สร้างนัดไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  // Phase 24 (ข้อ 5): "นัดกับ" = ชื่อคนก่อน (lead) → title (นัดนอกรอบ) → รหัส · ทรัพย์อยู่คอลัมน์รองแล้ว ไม่ซ้ำ
  const subject = (a: Appt) => a.lead?.fullName || a.title || `นัด ${a.code}`;
  const cols: Col<Appt>[] = [
    { header: 'นัดกับ', primary: true, cell: (a) => subject(a) },
    { header: 'วันที่-เวลา', sub: true, cell: (a) => <span className="tabular-nums">{fmt(a.scheduledAt)}</span> },
    // ทรัพย์ = คอลัมน์ sub ตัวที่ 2 → เดสก์ท็อป: คอลัมน์ตารางแยก (ตัด …) · การ์ด: บรรทัดของตัวเอง
    // hidden sm:inline → ซ่อนบนมือถือ (การ์ด minimal ไม่มีทรัพย์) · โผล่ตั้งแต่ iPad ขึ้นไป (การ์ด+ตาราง)
    { header: 'ทรัพย์', sub: true, width: 'w-48', cell: (a) => a.property
      ? <span className="hidden sm:inline">{a.property.titleTh}</span>
      : <span className="hidden text-faint sm:inline">—</span> },
    // สถานะ = pill outline (action ย้ายไปหน้า detail /appointments/[id] · list สะอาดเหมือน list อื่น)
    { header: 'สถานะ', right: true, cell: (a) => <StatusBadge map={APPOINTMENT_STATUS} value={a.status} outline /> },
  ];

  return (
    <div>
      <PageHeader title="นัดหมาย" count={`${meta.total ?? 0} รายการ`}
        action={can('appointment', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> นัด</button>} />
      {/* P11: สถานะ = quick-filter เห็นชัด แตะเดียว (ของใช้บ่อยสุด) — ไม่ต้องเปิดแผ่นตัวกรอง */}
      <div className="mt-4 -mb-1">
        <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      {/* preset ช่วงเวลานัด (ทุกวัน/วันนี้/สัปดาห์นี้) — งานประจำวันของเจ้าหน้าที่ ไม่ต้องเปิดตัวกรองทุกครั้ง */}
      <div className="mt-2 -mb-1">
        <Segmented options={TIME_OPTIONS} value={timePreset} onChange={setTimePreset} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'ค้นหารหัส/ลูกค้า/ทรัพย์…' }}
        filters={[
          { key: 'date', label: 'เลือกวันที่เอง', type: 'date', value: date, onChange: (v) => { setPage(1); setDate(v); setDateFrom(''); setDateTo(''); } },
        ]}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: [{ value: 'asc', label: 'วันนัด ใกล้→ไกล' }, { value: 'desc', label: 'วันนัด ไกล→ใกล้' }] }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(a) => a.id} loading={loading}
          emptyIcon={filtered ? 'search' : 'calendar'}
          empty={filtered ? 'ไม่พบนัดหมายตามเงื่อนไขที่เลือก' : 'ยังไม่มีนัดหมาย'}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>ล้างตัวกรอง</button>
            : (can('appointment', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> เพิ่มนัด</button>)}
          onRow={(a) => router.push(`/appointments/${a.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* create */}
      <Modal open={open} onClose={close} title="สร้างนัดหมาย"
        confirmOnClose={!!(form.scheduledAt || form.location.trim() || form.title.trim())}>
        <form onSubmit={create} className="space-y-4">
          <Segmented
            options={[{ value: 'viewing', label: 'นัดดูทรัพย์' }, { value: 'general', label: 'นัดนอกรอบ' }]}
            value={mode} onChange={(v) => { setMode(v as 'viewing' | 'general'); setFe({}); }} />
          {mode === 'viewing' ? (
            <>
              <Combobox label="Lead *" error={fe.leadId} placeholder="— เลือก Lead —" value={form.leadId} onChange={(v) => setField('leadId', v)} options={seedLead && !leads.options.some((o) => o.value === seedLead.value) ? [seedLead, ...leads.options] : leads.options} onSearch={leads.setQuery} loading={leads.loading} loadError={leads.error} onRetry={leads.reload} />
              <Combobox label="ทรัพย์ *" error={fe.propertyId} placeholder="— เลือกทรัพย์ —" value={form.propertyId} onChange={(v) => setField('propertyId', v)} options={seedProp && !props.options.some((o) => o.value === seedProp.value) ? [seedProp, ...props.options] : props.options} onSearch={props.setQuery} loading={props.loading} loadError={props.error} onRetry={props.reload} />
            </>
          ) : (
            <Field label="หัวข้อนัด *" error={fe.title} placeholder="เช่น ประชุมทีม, นัดเจ้าของทรัพย์" value={form.title} onChange={(e) => setField('title', e.target.value)} />
          )}
          <Combobox label="พนักงานรับผิดชอบ" value={form.agentId} onChange={(v) => setField('agentId', v)} options={[{ value: '', label: '— ตัวฉันเอง —' }, ...agents.options]} loadError={agents.error} onRetry={agents.reload} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="วันเวลานัด *" type="datetime-local" error={fe.scheduledAt}
              hint={form.scheduledAt ? fmtDateTime(form.scheduledAt) : undefined}
              value={form.scheduledAt} onChange={(e) => setField('scheduledAt', e.target.value)} />
            <Field label="ระยะเวลา (นาที)" type="number" value={form.durationMin} onChange={(e) => setField('durationMin', Number(e.target.value))} />
          </div>
          <Field label="สถานที่นัด" value={form.location} onChange={(e) => setField('location', e.target.value)} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={close}>ยกเลิก</button>
            <button className="btn-gold" disabled={saving}>{saving ? 'กำลังสร้าง…' : 'สร้างนัด'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

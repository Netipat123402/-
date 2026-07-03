'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useLookup, useSearchLookup } from '@/lib/lookups';
import { useToast } from '@/components/Toast';
import { APPOINTMENT_STATUS } from '@/lib/status';
import { Avatar, Col, Combobox, FilterBar, Field, ListView, Modal, PageHeader, Pagination, PhoneLink, SectionLabel, Segmented, StatusBadge , PAGE_SIZE} from '@/components/ui';
import { Icon } from '@/components/Icon';
import { thaiDateTime } from '@/lib/format';

interface Appt {
  id: string; code: string; scheduledAt: string; status: string;
  durationMin: number; location?: string; title?: string;
  lead?: { fullName: string }; property?: { titleTh: string };
}
interface ApptDetail {
  id: string; code: string; scheduledAt: string; status: string;
  durationMin: number; location?: string; title?: string;
  lead?: { id: string; fullName: string; phone?: string };
  property?: { id: string; code: string; titleTh: string };
  agent?: { fullName: string };
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

const fmt = (s: string) => new Date(s).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' });

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
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (status) params.set('status', status);
  if (date) params.set('date', date);
  if (dateFrom) params.set('dateFrom', dateFrom);
  if (dateTo) params.set('dateTo', dateTo);
  if (q) params.set('q', q);
  const { rows, meta, loading, reload, mutate } = useList<Appt>(`/appointments?${params}`);
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

  const [active, setActive] = useState<Appt | null>(null);
  const [detail, setDetail] = useState<ApptDetail | null>(null);
  const [busy, setBusy] = useState(false);

  // เปิดนัด → โชว์หัวข้อทันทีจากแถว แล้วดึงรายละเอียด (ลูกค้า/ทรัพย์/พนักงาน) เพิ่ม
  function openAppt(a: Appt) {
    setActive(a); setDetail(null);
    api<ApptDetail>(`/appointments/${a.id}`).then((r) => setDetail(r.data)).catch(() => { /* */ });
  }
  function closeAppt() { setActive(null); setDetail(null); }

  // deep-link จากแจ้งเตือน: /appointments?focus={id} → เปิด modal ของนัดนั้นทันที (ไม่ต้องหาในหน้ารวม)
  const focusId = sp.get('focus');
  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || focusedRef.current === focusId) return;
    focusedRef.current = focusId;
    api<ApptDetail>(`/appointments/${focusId}`)
      .then((r) => { setActive(r.data as Appt); setDetail(r.data); })
      .catch(() => toast.error('ไม่พบนัดหมายนี้ (อาจถูกลบหรือหมดสิทธิ์)'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

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
  function setField<K extends keyof typeof blank>(k: K, v: (typeof blank)[K]) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }
  function close() { setOpen(false); setFe({}); setErr(''); }

  // optimistic: เปลี่ยนสถานะแถว + ปิด modal "ทันที" ที่กด (รู้สึกไวทันมือ) แล้วค่อยยิง API เบื้องหลัง
  // สำเร็จ → reload sync ความจริง · ล้มเหลว → reload ดึงสถานะเดิมกลับ (rollback) + แจ้ง error
  async function run(appt: Appt, action: string, label: string, nextStatus: string) {
    setBusy(true);
    mutate((rs) => rs.map((r) => (r.id === appt.id ? { ...r, status: nextStatus } : r)));
    closeAppt();
    try {
      await api(`/appointments/${appt.id}/${action}`, { method: 'POST', body: JSON.stringify({}) });
      toast.success(`${label}แล้ว`);
      reload();
    } catch (e) {
      toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ');
      reload();
    } finally { setBusy(false); }
  }

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
      setOpen(false); setForm(blank); setFe({}); reload();
      toast.success('สร้างนัดหมายแล้ว');
    } catch (e2) { setErr((e2 as { message?: string }).message || 'สร้างนัดไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  // หลัก = นัดกับใคร/เรื่องอะไร · รอง = วันเวลา + ทรัพย์ (สแกนได้ว่าใคร เมื่อไหร่ ทรัพย์ไหน)
  const subject = (a: Appt) => a.title || a.lead?.fullName || `นัด ${a.code}`;
  const cols: Col<Appt>[] = [
    { header: 'นัดกับ', primary: true, cell: (a) => subject(a) },
    { header: 'วันเวลา · ทรัพย์', sub: true, cell: (a) => `${fmt(a.scheduledAt)}${a.property ? ` · ${a.property.titleTh}` : ''}` },
    { header: 'สถานะ', right: true, cell: (a) => <StatusBadge map={APPOINTMENT_STATUS} value={a.status} /> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
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
          onRow={openAppt} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* manage */}
      <Modal open={!!active} onClose={closeAppt} title={active ? `นัด ${active.code}` : ''}>
        {active && (
          <div className="space-y-5">
            {/* PRIMARY — นัดกับใคร + เมื่อไหร่ + สถานะ */}
            <div className="flex items-center gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-canvas text-gold-dark"><Icon name="calendar" size={22} /></span>
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{subject(active)}</p>
                <p className="text-sm text-muted">{fmt(active.scheduledAt)}</p>
                <div className="mt-1.5"><StatusBadge map={APPOINTMENT_STATUS} value={active.status} /></div>
              </div>
            </div>

            {/* SECONDARY — รายละเอียดนัด */}
            <div>
              <SectionLabel className="mb-2">รายละเอียดนัด</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div><dt className="text-xs text-muted">ระยะเวลา</dt><dd className="mt-0.5 text-sm text-ink">{active.durationMin} นาที</dd></div>
                <div><dt className="text-xs text-muted">พนักงาน</dt><dd className="mt-0.5 text-sm text-ink">{detail?.agent?.fullName ?? '—'}</dd></div>
                <div className="col-span-2"><dt className="text-xs text-muted">สถานที่</dt><dd className="mt-0.5 text-sm text-ink">{active.location || '—'}</dd></div>
              </dl>
            </div>

            {/* SECONDARY — ลูกค้า (แตะโทรได้) */}
            {detail?.lead && (
              <div>
                <SectionLabel className="mb-2">ลูกค้า</SectionLabel>
                <div className="flex items-center gap-3">
                  <Avatar name={detail.lead.fullName} size={38} />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{detail.lead.fullName}</p>
                    {detail.lead.phone && <PhoneLink phone={detail.lead.phone} className="text-sm text-muted" />}
                  </div>
                </div>
              </div>
            )}

            {/* SECONDARY — ทรัพย์ (กดเข้าได้) */}
            {detail?.property && (
              <div>
                <SectionLabel className="mb-2">ทรัพย์ที่นัดดู</SectionLabel>
                <button onClick={() => detail.property && router.push(`/properties/${detail.property.id}`)}
                  className="flex w-full items-center gap-2 text-left transition hover:opacity-70">
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">{detail.property.titleTh}</span>
                  <span className="shrink-0 font-mono text-xs text-gold-dark">{detail.property.code}</span>
                  <Icon name="chevron-right" size={16} className="shrink-0 text-faint" />
                </button>
              </div>
            )}

            {/* ADVANCED — การกระทำ */}
            <div className="border-t border-border pt-4">
              {active.status === 'upcoming' ? (
                <div className="space-y-2">
                  <button className="btn-primary w-full" disabled={busy} onClick={() => run(active, 'complete', 'บันทึกว่าพบแล้ว', 'done')}>พบลูกค้าแล้ว</button>
                  <button className="btn-ghost w-full text-danger" disabled={busy} onClick={() => run(active, 'cancel', 'ยกเลิกนัด', 'cancelled')}>ยกเลิกนัด</button>
                </div>
              ) : (
                <p className="text-center text-sm text-muted">นัดนี้ปิดแล้ว</p>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* create */}
      <Modal open={open} onClose={close} title="สร้างนัดหมาย">
        <form onSubmit={create} className="space-y-4">
          <Segmented
            options={[{ value: 'viewing', label: 'นัดดูทรัพย์' }, { value: 'general', label: 'นัดนอกรอบ' }]}
            value={mode} onChange={(v) => { setMode(v as 'viewing' | 'general'); setFe({}); }} />
          {mode === 'viewing' ? (
            <>
              <Combobox label="Lead *" error={fe.leadId} placeholder="— เลือก Lead —" value={form.leadId} onChange={(v) => setField('leadId', v)} options={leads.options} onSearch={leads.setQuery} loading={leads.loading} loadError={leads.error} onRetry={leads.reload} />
              <Combobox label="ทรัพย์ *" error={fe.propertyId} placeholder="— เลือกทรัพย์ —" value={form.propertyId} onChange={(v) => setField('propertyId', v)} options={props.options} onSearch={props.setQuery} loading={props.loading} loadError={props.error} onRetry={props.reload} />
            </>
          ) : (
            <Field label="หัวข้อนัด *" error={fe.title} placeholder="เช่น ประชุมทีม, นัดเจ้าของทรัพย์" value={form.title} onChange={(e) => setField('title', e.target.value)} />
          )}
          <Combobox label="พนักงานรับผิดชอบ" value={form.agentId} onChange={(v) => setField('agentId', v)} options={[{ value: '', label: '— ตัวฉันเอง —' }, ...agents.options]} loadError={agents.error} onRetry={agents.reload} />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="วันเวลานัด *" type="datetime-local" error={fe.scheduledAt}
              hint={form.scheduledAt ? thaiDateTime(form.scheduledAt) : undefined}
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

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useLookup, useSearchLookup } from '@/lib/lookups';
import { useDebouncedValue } from '@/lib/useDebounce';
import { useToast } from '@/components/Toast';
import { APPOINTMENT_STATUS } from '@/lib/status';
import { Col, Combobox, FilterBar, Field, InfoGroup, InfoRow, ListView, Modal, MoreMenu, PageHeader, Pagination, PhoneLink, Segmented, StatusBadge, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtDateTime } from '@/lib/format';

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
  cancelReason?: string;
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
  const [reFor, setReFor] = useState<Appt | null>(null); // นัดที่กำลังเลื่อน
  const [reAt, setReAt] = useState('');

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

  // เลื่อนนัด — ต้องระบุเวลาใหม่ (เปิด modal เลือกวันเวลา)
  async function doReschedule() {
    if (!reFor || !reAt) return;
    const appt = reFor; const at = reAt;
    setReFor(null); setReAt(''); setBusy(true);
    try {
      await api(`/appointments/${appt.id}/reschedule`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(at).toISOString() }) });
      toast.success('เลื่อนนัดแล้ว'); closeAppt(); reload();
    } catch (e) { toast.error((e as { message?: string }).message || 'เลื่อนนัดไม่สำเร็จ'); reload(); }
    finally { setBusy(false); }
  }

  // นัดใหม่อีกครั้ง (จากนัดที่จบ/ยกเลิก) — prefill lead+ทรัพย์ เปิดฟอร์มสร้าง (Phase 26)
  function rebook(d: ApptDetail) {
    if (d.lead) setSeedLead({ value: d.lead.id, label: d.lead.fullName });
    if (d.property) setSeedProp({ value: d.property.id, label: `${d.property.code} · ${d.property.titleTh}` });
    setMode(d.lead ? 'viewing' : 'general');
    setForm({ ...blank, leadId: d.lead?.id ?? '', propertyId: d.property?.id ?? '', title: d.title ?? '' });
    closeAppt(); setOpen(true);
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
    { header: 'ทรัพย์', sub: true, cell: (a) => a.property
      ? <span className="hidden sm:inline">{a.property.titleTh}</span>
      : <span className="hidden text-faint sm:inline">—</span> },
    { header: 'สถานะ', right: true, cell: (a) => (
      // Phase 25: ปรับสถานะจากลิสต์ได้เลย (upcoming) — stopPropagation กันเปิด detail modal
      <span className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
        <StatusBadge map={APPOINTMENT_STATUS} value={a.status} />
        {a.status === 'upcoming' && can('appointment', 'change_status') && (
          <MoreMenu items={[
            { label: 'พบลูกค้าแล้ว', icon: 'check', onClick: () => run(a, 'complete', 'บันทึกว่าพบแล้ว', 'done') },
            { label: 'เลื่อนนัด', icon: 'clock', onClick: () => { setReAt(''); setReFor(a); } },
            { label: 'ยกเลิกนัด', icon: 'x', danger: true, onClick: () => run(a, 'cancel', 'ยกเลิกนัด', 'cancelled') },
            { label: 'ลูกค้าไม่มาตามนัด', icon: 'x', danger: true, onClick: () => run(a, 'no-show', 'บันทึกว่าไม่มาตามนัด', 'cancelled') },
          ]} />
        )}
      </span>
    ) },
  ];

  return (
    <div className="mx-auto max-w-5xl">
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

      {/* manage — หัว = ชื่อคน/หัวข้อ · เนื้อ = InfoGroup (Phase 26) */}
      <Modal open={!!active} onClose={closeAppt} title={active ? subject(active) : ''}>
        {active && (
          <div className="space-y-4">
            {/* meta: รหัส + สถานะ */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs text-muted">{active.code}</span>
              <StatusBadge map={APPOINTMENT_STATUS} value={active.status} />
            </div>

            {/* นัดหมาย: เวลา + ระยะเวลา (+ ผลลัพธ์ถ้าจบ/ยกเลิก) */}
            <InfoGroup label="นัดหมาย">
              <InfoRow label="วันเวลา" value={fmt(active.scheduledAt)} strong />
              <InfoRow label="ระยะเวลา" value={`${active.durationMin} นาที`} />
              {active.status === 'cancelled' && <InfoRow label="ผลลัพธ์" value={detail?.cancelReason || 'ยกเลิก'} stack />}
              {active.status === 'done' && <InfoRow label="ผลลัพธ์" value="พบลูกค้าแล้ว" />}
            </InfoGroup>

            {/* ลูกค้า (แตะโทร + กดเข้า lead) */}
            {detail?.lead && (
              <InfoGroup label="ลูกค้า">
                <InfoRow label="ชื่อ" value={detail.lead.fullName} href={`/leads?focus=${detail.lead.id}`} strong />
                <InfoRow label="เบอร์โทร" value={detail.lead.phone ? <PhoneLink phone={detail.lead.phone} /> : undefined} hideEmpty />
              </InfoGroup>
            )}

            {/* ทรัพย์ (กดเข้าได้) — meeting-center */}
            {detail?.property && (
              <InfoGroup label="ทรัพย์ที่นัดดู">
                <InfoRow label="ทรัพย์" href={`/properties/${detail.property.id}`} strong
                  value={<span>{detail.property.titleTh} <span className="font-mono text-xs font-normal text-gold-dark">· {detail.property.code}</span></span>} />
              </InfoGroup>
            )}

            {/* รายละเอียด */}
            <InfoGroup label="รายละเอียด">
              <InfoRow label="พนักงาน" value={detail?.agent?.fullName || undefined} hideEmpty />
              <InfoRow label="สถานที่" value={active.location || undefined} stack hideEmpty />
              {!detail?.agent?.fullName && !active.location && <p className="py-2.5 text-sm text-muted">—</p>}
            </InfoGroup>

            {/* การกระทำ */}
            <div className="border-t border-border pt-4">
              {active.status === 'upcoming' ? (
                <div className="space-y-2">
                  {can('appointment', 'change_status') && (
                    <button className="btn-gold w-full" disabled={busy} onClick={() => run(active, 'complete', 'บันทึกว่าพบแล้ว', 'done')}>พบลูกค้าแล้ว</button>
                  )}
                  {can('appointment', 'change_status') && (
                    <div className="flex gap-2">
                      <button className="btn-ghost flex-1" disabled={busy} onClick={() => { setReAt(''); setReFor(active); }}>เลื่อนนัด</button>
                      <MoreMenu items={[
                        { label: 'ยกเลิกนัด', icon: 'x', danger: true, onClick: () => run(active, 'cancel', 'ยกเลิกนัด', 'cancelled') },
                        { label: 'ลูกค้าไม่มาตามนัด', icon: 'x', danger: true, onClick: () => run(active, 'no-show', 'บันทึกว่าไม่มาตามนัด', 'cancelled') },
                      ]} />
                    </div>
                  )}
                </div>
              ) : (
                can('appointment', 'create') && detail && (
                  <button className="btn-gold w-full" disabled={busy} onClick={() => rebook(detail)}>
                    <Icon name="calendar" size={16} /> นัดใหม่อีกครั้ง
                  </button>
                )
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* เลื่อนนัด — เลือกวันเวลาใหม่ (Phase 26) */}
      <Modal open={!!reFor} onClose={() => { setReFor(null); setReAt(''); }} title="เลื่อนนัด"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setReFor(null); setReAt(''); }}>ยกเลิก</button>
            <button type="button" className="btn-gold" disabled={busy || !reAt} onClick={doReschedule}>ยืนยันเลื่อนนัด</button>
          </div>
        }>
        <Field label="วันเวลานัดใหม่ *" type="datetime-local"
          hint={reAt ? fmtDateTime(reAt) : undefined} value={reAt} onChange={(e) => setReAt(e.target.value)} />
      </Modal>

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

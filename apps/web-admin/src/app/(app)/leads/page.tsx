'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useLookup } from '@/lib/lookups';
import { useDebouncedValue } from '@/lib/useDebounce';
import { useToast } from '@/components/Toast';
import { LEAD_SOURCE, LEAD_STATUS, PROPERTY_STATUS, bahtFormat } from '@/lib/status';
import { formatPhone, phoneDigits } from '@/lib/format';
import { Col, Combobox, ConfirmDialog, FilterBar, Field, InfoGroup, InfoRow, ListView, Modal, MoreMenu, PageHeader, Pagination, PhoneLink, Segmented, StatusBadge, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface Lead {
  id: string; code: string; fullName: string; phone: string;
  status: string; source: string; assignedToId?: string; customerId?: string;
  email?: string; message?: string; createdAt?: string; preferredViewAt?: string; lostReason?: string;
}
interface PropLite { id: string; code: string; titleTh: string; status: string; monthlyRent: string; }
interface LeadDetail extends Lead { assignedTo?: { fullName: string }; interests?: { property: PropLite }[]; }

function fmtDate(iso?: string) {
  return iso ? new Date(iso).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
}

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'new', label: 'ใหม่' },
  { value: 'working', label: 'กำลังดูแล' },
  { value: 'closed', label: 'ปิดจบ' },
];
const SORT_OPTIONS = [
  { value: 'new', label: 'ใหม่สุด' },
  { value: 'code', label: 'รหัส' },
  { value: 'name', label: 'ชื่อ (ก–ฮ)' },
];

export default function LeadsPage() {
  const { api, user, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [source, setSource] = useState('');
  const [sort, setSort] = useState('new');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์ (ไม่ยิงทุกตัวอักษร)
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (status) params.set('status', status);
  if (source) params.set('source', source);
  if (dq) params.set('q', dq);
  const { rows, meta, loading, reload, mutate } = useList<Lead>(`/leads?${params}`);
  const filtered = !!(q || status || source);
  const clearFilters = () => { setQ(''); setStatus(''); setSource(''); setPage(1); };
  // เรียงฝั่ง server แล้ว (sort ไป API → ถูกต้องข้ามหน้า) — MR-12

  const [active, setActive] = useState<Lead | null>(null);
  const [detail, setDetail] = useState<LeadDetail | null>(null);
  const [busy, setBusy] = useState(false);

  // เปิด Lead → โชว์หัวข้อทันทีจากแถว แล้วดึงรายละเอียด (ผู้ดูแล + ทรัพย์ที่สนใจ) เพิ่ม
  function openLead(l: Lead) {
    setActive(l); setDetail(null);
    api<LeadDetail>(`/leads/${l.id}`).then((r) => setDetail(r.data)).catch(() => { /* */ });
  }
  function closeLead() { setActive(null); setDetail(null); }

  // deep-link จากแจ้งเตือน: /leads?focus={id} → เปิด modal ของ Lead นั้นทันที
  const focusId = sp.get('focus');
  const focusedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!focusId || focusedRef.current === focusId) return;
    focusedRef.current = focusId;
    api<LeadDetail>(`/leads/${focusId}`)
      .then((r) => { setActive(r.data); setDetail(r.data); })
      .catch(() => toast.error('ไม่พบ Lead นี้ (อาจถูกลบหรือหมดสิทธิ์)'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  // create walk-in lead
  const [open, setOpen] = useState(false);
  const [closeOpen, setCloseOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const assignable = useLookup<{ id: string; fullName: string }>('/users/assignable', (u) => ({ value: u.id, label: u.fullName }), transferOpen);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '', message: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [fe, setFe] = useState<{ fullName?: string; phone?: string }>({});
  function setField(k: 'fullName' | 'phone' | 'email' | 'message', v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }
  async function create(e: React.FormEvent) {
    e.preventDefault();
    const v: typeof fe = {};
    if (!form.fullName.trim()) v.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    const d = phoneDigits(form.phone);
    if (!d) v.phone = 'กรุณากรอกเบอร์โทร';
    else if (d.length !== 10) v.phone = 'เบอร์โทรต้องมี 10 หลัก';
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/leads', { method: 'POST', body: JSON.stringify({
        fullName: form.fullName, phone: phoneDigits(form.phone), email: form.email || undefined,
        source: 'walk_in', message: form.message || undefined,
      }) });
      setOpen(false); setForm({ fullName: '', phone: '', email: '', message: '' }); setFe({}); reload();
      toast.success('สร้าง Lead แล้ว');
    } catch (e2) { setErr((e2 as { message?: string }).message || 'สร้างไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  // optimisticStatus: ถ้าใส่ → อัปเดตสถานะแถว + ปิด modal ทันที (รู้สึกไวทันมือ) แล้วยิง API เบื้องหลัง
  //   สำเร็จ → reload sync · ล้มเหลว → reload ดึงสถานะเดิมกลับ (rollback) + แจ้ง error
  // ไม่ใส่ (เช่น convert/delete ที่มี side-effect หนัก) → ปิด modal หลังสำเร็จเหมือนเดิม
  async function act(fn: () => Promise<unknown>, successMsg: string, optimisticStatus?: string) {
    setBusy(true);
    const id = active?.id;
    if (optimisticStatus && id) {
      mutate((rs) => rs.map((r) => (r.id === id ? { ...r, status: optimisticStatus } : r)));
      closeLead();
    }
    try {
      await fn();
      if (!optimisticStatus) closeLead();
      reload();
      toast.success(successMsg);
    } catch (e) {
      toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ');
      reload();
    } finally { setBusy(false); }
  }

  function changeStatus(lead: Lead, to: string, label: string, reason?: string) {
    return act(
      () => api(`/leads/${lead.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: to, lostReason: reason }) }),
      `${label}แล้ว`,
      to, // optimistic: สถานะปลายทาง
    );
  }

  // Phase 16: "รับดูแล Lead นี้" คลิกเดียว — assign ตัวเอง + new→working ใน request เดียว (backend atomic)
  function takeOwnership(lead: Lead) {
    return act(
      () => api(`/leads/${lead.id}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId: user!.id, startWorking: true }) }),
      'รับ Lead มาดูแลแล้ว',
      'working', // optimistic: กระโดดเป็นกำลังดูแลทันที
    );
  }

  const cols: Col<Lead>[] = [
    { header: 'ลูกค้า', primary: true, cell: (l) => l.fullName },
    { header: 'เบอร์โทร', sub: true, cell: (l) => <span className="inline-flex items-center gap-1"><PhoneLink phone={l.phone} /> · {LEAD_SOURCE[l.source] ?? l.source}</span> },
    { header: 'รหัส', cell: (l) => <span className="font-mono text-xs text-muted">{l.code}</span> },
    { header: 'สถานะ', right: true, cell: (l) => <StatusBadge map={LEAD_STATUS} value={l.status} /> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Lead" count={`${meta.total ?? 0} รายการ`}
        action={can('lead', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> Lead</button>} />
      {/* P11: สถานะ Lead = quick-filter แตะเดียว (ใช้บ่อยสุดใน flow งานขาย) */}
      <div className="mt-4 -mb-1">
        <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'ค้นหาชื่อ/เบอร์…' }}
        filters={[
          { key: 'source', label: 'แหล่งที่มา', value: source, onChange: (v) => { setPage(1); setSource(v); }, options: [{ value: '', label: 'ทุกแหล่งที่มา' }, ...Object.entries(LEAD_SOURCE).map(([v, l]) => ({ value: v, label: l }))] },
        ]}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(l) => l.id} loading={loading}
          emptyIcon={filtered ? 'search' : 'user-plus'}
          empty={filtered ? 'ไม่พบ Lead ตามเงื่อนไขที่เลือก' : 'ยังไม่มี Lead — เพิ่ม Lead แรกเพื่อเริ่มต้น'}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>ล้างตัวกรอง</button>
            : (can('lead', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> เพิ่ม Lead</button>)}
          onRow={openLead} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* รายละเอียด + การกระทำ — หัว modal = ชื่อคน (Phase 17), เนื้อ = InfoGroup (Phase 18) */}
      <Modal open={!!active} onClose={closeLead} title={active ? active.fullName : ''}>
        {active && (() => {
          const closeItems = active.status !== 'closed'
            ? [{ label: 'ปิด Lead (ไม่สำเร็จ)', icon: 'x' as const, danger: true, onClick: () => setCloseOpen(true) }]
            : [];
          const transferItems = active.status === 'working' && can('lead', 'assign')
            ? [{ label: 'โอนให้คนอื่น', icon: 'users' as const, onClick: () => setTransferOpen(true) }]
            : [];
          const delItems = can('lead', 'delete') && !active.customerId
            ? [{ label: 'ลบ Lead นี้', icon: 'trash' as const, danger: true, onClick: () => setDelOpen(true) }]
            : [];
          const moreItems = [...transferItems, ...closeItems, ...delItems];
          return (
          <div className="space-y-5">
            {/* meta: รหัส (จาง) + สถานะ + ช่องทาง */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs text-muted">{active.code}</span>
              <StatusBadge map={LEAD_STATUS} value={active.status} />
              <span className="text-xs text-muted">· {LEAD_SOURCE[active.source] ?? active.source}</span>
            </div>

            {/* ติดต่อ */}
            <InfoGroup label="ติดต่อ">
              <InfoRow label="เบอร์โทร" value={active.phone ? <PhoneLink phone={active.phone} /> : undefined} hideEmpty />
              <InfoRow label="อีเมล" value={active.email || undefined} hideEmpty />
            </InfoGroup>

            {/* ความต้องการ */}
            <InfoGroup label="ความต้องการ">
              <InfoRow label="รายละเอียด" value={active.message || undefined} stack hideEmpty />
              <InfoRow label="อยากเข้าชม" value={active.preferredViewAt ? fmtDate(active.preferredViewAt) : undefined} hideEmpty />
              {!active.message && !active.preferredViewAt && <p className="py-2.5 text-sm text-muted">ยังไม่ได้ระบุ</p>}
            </InfoGroup>

            {/* ทรัพย์ที่สนใจ (กดเข้าทรัพย์ได้) */}
            {detail?.interests && detail.interests.length > 0 && (
              <InfoGroup label={`ทรัพย์ที่สนใจ · ${detail.interests.length}`}>
                {detail.interests.map((it) => (
                  <button key={it.property.id} onClick={() => router.push(`/properties/${it.property.id}`)}
                    className="group flex w-full items-center gap-2 py-2.5 text-left transition hover:opacity-70">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.property.titleTh}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-gold-dark">฿{bahtFormat(Number(it.property.monthlyRent))}</span>
                    <StatusBadge map={PROPERTY_STATUS} value={it.property.status} short />
                    <Icon name="chevron-right" size={15} className="shrink-0 text-faint" />
                  </button>
                ))}
              </InfoGroup>
            )}

            {/* การดูแล */}
            <InfoGroup label="การดูแล">
              <InfoRow label="ผู้ดูแล" value={detail?.assignedTo?.fullName ?? (active.assignedToId ? '—' : 'ยังไม่มอบหมาย')} />
              <InfoRow label="เข้ามาเมื่อ" value={fmtDate(active.createdAt)} />
              {active.status === 'closed' && active.lostReason && <InfoRow label="เหตุผลที่ปิด" value={active.lostReason} stack />}
            </InfoGroup>

            {/* การกระทำ (Phase 16) — 1-2 ปุ่มหลัก context-aware + ⋯ */}
            <div className="space-y-2 border-t border-border pt-4">
              {active.status === 'new' && (
                <div className="flex gap-2">
                  {can('lead', 'assign') ? (
                    <button className="btn-gold flex-1" disabled={busy} onClick={() => takeOwnership(active)}>รับดูแล Lead นี้</button>
                  ) : <span className="flex-1" />}
                  {moreItems.length > 0 && <MoreMenu items={moreItems} />}
                </div>
              )}

              {active.status === 'working' && (
                <>
                  {can('appointment', 'create') && (
                    <button className="btn-gold w-full" disabled={busy}
                      onClick={() => router.push(`/appointments?newLead=${active.id}`)}>
                      <Icon name="calendar" size={16} /> สร้างนัดดูทรัพย์
                    </button>
                  )}
                  <div className="flex gap-2">
                    {can('lead', 'convert') && !active.customerId ? (
                      <button className="btn-ghost flex-1" disabled={busy}
                        onClick={() => act(() => api(`/leads/${active.id}/convert`, { method: 'POST' }), 'แปลงเป็นลูกค้าแล้ว')}>
                        แปลงเป็นลูกค้า
                      </button>
                    ) : <span className="flex-1" />}
                    {moreItems.length > 0 && <MoreMenu items={moreItems} />}
                  </div>
                </>
              )}

              {active.status === 'closed' && (
                <div className="flex items-center gap-2">
                  <p className="inline-flex flex-1 items-center justify-center gap-1 text-center text-sm text-success">
                    {active.customerId ? <><Icon name="check" size={15} /> ปิดสำเร็จ — แปลงเป็นลูกค้าแล้ว</> : 'ปิด Lead แล้ว'}
                  </p>
                  {moreItems.length > 0 && <MoreMenu items={moreItems} />}
                </div>
              )}
            </div>
          </div>
          );
        })()}
      </Modal>

      {/* สร้าง Lead */}
      <Modal open={open} onClose={() => setOpen(false)} title="สร้าง Lead (walk-in / โทรศัพท์)"
        confirmOnClose={!!(form.fullName || form.phone || form.email || form.message)}>
        <form onSubmit={create} className="space-y-4">
          <Field label="ชื่อ-นามสกุล *" error={fe.fullName} placeholder="เช่น สมชาย ใจดี" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
          <Field label="เบอร์โทร *" error={fe.phone} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone} onChange={(e) => setField('phone', formatPhone(e.target.value))} />
          <Field label="อีเมล" type="email" placeholder="name@email.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">ความต้องการ/บันทึก</span>
            <textarea className="field h-auto py-2.5" rows={3} placeholder="เช่น สนใจคอนโดใกล้ BTS งบไม่เกิน 20,000" value={form.message} onChange={(e) => setField('message', e.target.value)} />
          </label>
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-gold" disabled={saving}>{saving ? 'กำลังสร้าง…' : 'สร้าง Lead'}</button>
          </div>
        </form>
      </Modal>

      {/* โอนให้คนอื่น (Phase 16) — เลือกผู้ดูแลใหม่ */}
      <Modal open={transferOpen} onClose={() => { setTransferOpen(false); setTransferTo(''); }} title="โอน Lead ให้คนอื่น"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setTransferOpen(false); setTransferTo(''); }}>ยกเลิก</button>
            <button type="button" className="btn-gold" disabled={busy || !transferTo}
              onClick={() => { if (active && transferTo) { setTransferOpen(false); act(() => api(`/leads/${active.id}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId: transferTo }) }), 'โอน Lead ให้ผู้ดูแลใหม่แล้ว'); setTransferTo(''); } }}>
              โอน Lead
            </button>
          </div>
        }>
        <Combobox label="ผู้ดูแลใหม่" value={transferTo} onChange={setTransferTo}
          options={assignable.options} loading={assignable.loading} loadError={assignable.error} onRetry={assignable.reload}
          placeholder="— เลือกผู้ดูแล —" />
      </Modal>

      {/* ปิด Lead (ไม่สำเร็จ) — ขอเหตุผล */}
      <ConfirmDialog open={closeOpen} onClose={() => setCloseOpen(false)} busy={busy}
        title="ปิด Lead (ไม่สำเร็จ)" tone="danger" confirmLabel="ปิด Lead" withReason
        message={active ? <>ปิด Lead <b>{active.fullName}</b>? จะนับเป็นไม่สำเร็จ</> : ''}
        reasonPlaceholder="เหตุผลที่ปิด (ถ้ามี)"
        onConfirm={(reason) => { if (active) changeStatus(active, 'closed', 'ปิด Lead', reason); setCloseOpen(false); }} />

      {/* ลบ Lead — สร้างผิด/สแปม (ที่แปลงเป็นลูกค้าแล้ว/มีนัด จะลบไม่ได้) */}
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} busy={busy}
        title="ลบ Lead" tone="danger" confirmLabel="ลบ Lead"
        message={active ? <>ลบ Lead <b>{active.fullName}</b> ทิ้ง? ใช้กรณีสร้างผิด/สแปม — ถ้าแค่ติดต่อไม่ได้ ใช้ “ปิด Lead” แทน</> : ''}
        onConfirm={() => { if (active) act(() => api(`/leads/${active.id}`, { method: 'DELETE' }), 'ลบ Lead แล้ว'); setDelOpen(false); }} />
    </div>
  );
}

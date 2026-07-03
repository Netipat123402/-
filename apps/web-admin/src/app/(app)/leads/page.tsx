'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useToast } from '@/components/Toast';
import { LEAD_SOURCE, LEAD_STATUS, PROPERTY_STATUS, bahtFormat } from '@/lib/status';
import { formatPhone, phoneDigits } from '@/lib/format';
import { Avatar, Col, ConfirmDialog, FilterBar, Field, ListView, Modal, PageHeader, Pagination, PhoneLink, SectionLabel, Segmented, StatusBadge , PAGE_SIZE} from '@/components/ui';
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
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (status) params.set('status', status);
  if (source) params.set('source', source);
  if (q) params.set('q', q);
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

      {/* รายละเอียด + การกระทำ */}
      <Modal open={!!active} onClose={closeLead} title={active ? `Lead ${active.code}` : ''}>
        {active && (
          <div className="space-y-5">
            {/* PRIMARY — ชื่อ + แตะโทร + สถานะ */}
            <div className="flex items-center gap-3.5">
              <Avatar name={active.fullName} size={48} />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold">{active.fullName}</p>
                <p className="flex items-center gap-1 text-sm text-muted"><PhoneLink phone={active.phone} /> · {LEAD_SOURCE[active.source] ?? active.source}</p>
                <div className="mt-1.5"><StatusBadge map={LEAD_STATUS} value={active.status} /></div>
              </div>
            </div>

            {/* PRIMARY — ความต้องการของลูกค้า (สิ่งที่เซลต้องรู้ก่อน) */}
            <div>
              <SectionLabel className="mb-1.5">ความต้องการ</SectionLabel>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{active.message || 'ไม่ได้ระบุ'}</p>
            </div>

            {/* SECONDARY — ข้อมูลติดต่อ/การดูแล */}
            <div>
              <SectionLabel className="mb-2">ข้อมูล</SectionLabel>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <div><dt className="text-xs text-muted">อีเมล</dt><dd className="mt-0.5 truncate text-sm text-ink">{active.email || '—'}</dd></div>
                <div><dt className="text-xs text-muted">ผู้ดูแล</dt><dd className="mt-0.5 text-sm text-ink">{detail?.assignedTo?.fullName ?? (active.assignedToId ? '—' : 'ยังไม่มอบหมาย')}</dd></div>
                <div><dt className="text-xs text-muted">เข้ามาเมื่อ</dt><dd className="mt-0.5 text-sm text-ink">{fmtDate(active.createdAt)}</dd></div>
                <div><dt className="text-xs text-muted">อยากเข้าชม</dt><dd className="mt-0.5 text-sm text-ink">{fmtDate(active.preferredViewAt)}</dd></div>
              </dl>
            </div>

            {/* SECONDARY — ทรัพย์ที่สนใจ (กดเข้าทรัพย์ได้) */}
            {detail?.interests && detail.interests.length > 0 && (
              <div>
                <SectionLabel className="mb-2">ทรัพย์ที่สนใจ · {detail.interests.length}</SectionLabel>
                <ul className="divide-y divide-border">
                  {detail.interests.map((it) => (
                    <li key={it.property.id}>
                      <button onClick={() => router.push(`/properties/${it.property.id}`)}
                        className="flex w-full items-center gap-2 py-2.5 text-left transition hover:opacity-70">
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.property.titleTh}</span>
                        <span className="shrink-0 text-sm font-medium tabular-nums text-gold-dark">฿{bahtFormat(Number(it.property.monthlyRent))}</span>
                        <StatusBadge map={PROPERTY_STATUS} value={it.property.status} short />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ADVANCED — เหตุผลที่ปิด */}
            {active.status === 'closed' && active.lostReason && (
              <div>
                <SectionLabel className="mb-1.5">เหตุผลที่ปิด</SectionLabel>
                <p className="text-sm text-ink-soft">{active.lostReason}</p>
              </div>
            )}

            {/* การกระทำ */}
            <div className="space-y-2 border-t border-border pt-4">
            {can('lead', 'assign') && active.assignedToId !== user?.id && active.status !== 'closed' && (
              <button className="btn-ghost w-full" disabled={busy}
                onClick={() => act(() => api(`/leads/${active.id}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId: user!.id }) }), 'รับ Lead มาดูแลแล้ว', 'working')}>
                รับ Lead นี้มาดูแล
              </button>
            )}

            {active.status === 'new' && (
              <button className="btn-primary w-full" disabled={busy}
                onClick={() => changeStatus(active, 'working', 'เริ่มดูแล')}>
                เริ่มดูแล
              </button>
            )}

            {active.status === 'working' && can('lead', 'convert') && !active.customerId && (
              <button className="btn-gold w-full" disabled={busy}
                onClick={() => act(() => api(`/leads/${active.id}/convert`, { method: 'POST' }), 'แปลงเป็นลูกค้าแล้ว')}>
                แปลงเป็นลูกค้า
              </button>
            )}

            {active.status !== 'closed' && (
              <button className="btn-ghost w-full text-danger" disabled={busy}
                onClick={() => setCloseOpen(true)}>
                ปิด Lead (ไม่สำเร็จ)
              </button>
            )}

            {active.status === 'closed' && (
              <p className="inline-flex w-full items-center justify-center gap-1 text-center text-sm text-success">
                {active.customerId ? <><Icon name="check" size={15} /> ปิดสำเร็จ — แปลงเป็นลูกค้าแล้ว</> : 'ปิด Lead แล้ว'}
              </p>
            )}
            {/* ลบ Lead — เฉพาะที่ยังไม่แปลงเป็นลูกค้า (สร้างผิด/สแปม) */}
            {can('lead', 'delete') && !active.customerId && (
              <button className="w-full pt-1 text-center text-xs text-muted hover:text-danger" disabled={busy}
                onClick={() => setDelOpen(true)}>ลบ Lead นี้</button>
            )}
            </div>
          </div>
        )}
      </Modal>

      {/* สร้าง Lead */}
      <Modal open={open} onClose={() => setOpen(false)} title="สร้าง Lead (walk-in / โทรศัพท์)">
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

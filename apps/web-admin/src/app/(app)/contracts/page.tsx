'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useToast } from '@/components/Toast';
import { useLookup, useSearchLookup } from '@/lib/lookups';
import { useDebouncedValue } from '@/lib/useDebounce';
import { bahtFormat, CONTRACT_STATUS, isExpiringSoon } from '@/lib/status';
import { Col, Combobox, FilterBar, Field, ListView, Modal, PageHeader, Pagination, SectionLabel, Segmented, StatusBadge , PAGE_SIZE} from '@/components/ui';
import { Icon } from '@/components/Icon';
import { thaiDate } from '@/lib/format';

interface Contract {
  id: string; code: string; status: string; monthlyRent: string;
  startDate?: string; endDate?: string;
  customer?: { fullName: string };
  property?: { titleTh: string; code: string };
}

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'draft', label: 'ร่าง' },
  { value: 'active', label: 'มีผล' },
  { value: 'ended', label: 'สิ้นสุด' },
];
const SORT_OPTIONS = [
  { value: 'code', label: 'รหัสสัญญา' },
  { value: 'expiry', label: 'ใกล้ครบสัญญา' },
  { value: 'rent', label: 'ค่าเช่า มาก→น้อย' },
];

// P1: นิยามที่ module scope (ไม่ใช่ใน render) — ไม่งั้น Combobox ข้างในถูก remount ทุก render → dropdown/ค้นหารีเซ็ต
function Sel({ label, val, set, opts, req, error, onSearch, loading, loadError, onRetry }: {
  label: string; val: string; set: (v: string) => void; opts: { value: string; label: string }[];
  req?: boolean; error?: string; onSearch?: (q: string) => void; loading?: boolean; loadError?: boolean; onRetry?: () => void;
}) {
  return (
    <Combobox label={`${label}${req ? ' *' : ''}`} error={error} value={val} onChange={set} options={opts} onSearch={onSearch} loading={loading} loadError={loadError} onRetry={onRetry} />
  );
}

export default function ContractsPage() {
  const { api, user, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [sort, setSort] = useState('code');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (status) params.set('status', status);
  if (dq) params.set('q', dq);
  const { rows, meta, loading, reload } = useList<Contract>(`/contracts?${params}`);
  const filtered = !!(q || status);
  const clearFilters = () => { setQ(''); setStatus(''); setPage(1); };
  // เรียงฝั่ง server แล้ว (sort ไป API → ถูกต้องข้ามหน้า) — MR-12

  // --- create ---
  const [open, setOpen] = useState(false);
  // MR-24: server-side search → เลือกทรัพย์/เจ้าของ/ลูกค้ารายที่ 101+ ได้
  const props = useSearchLookup<{ id: string; code: string; titleTh: string }>('/properties?status=available', (p) => ({ value: p.id, label: `${p.code} · ${p.titleTh}` }), open);
  const owners = useSearchLookup<{ id: string; fullName: string }>('/owners', (o) => ({ value: o.id, label: o.fullName }), open);
  const customers = useSearchLookup<{ id: string; fullName: string }>('/customers', (c) => ({ value: c.id, label: c.fullName }), open);
  const agents = useLookup<{ id: string; fullName: string }>('/users/assignable', (u) => ({ value: u.id, label: u.fullName }), open);
  const blank = { propertyId: '', ownerId: '', customerId: '', agentId: '', monthlyRent: '', depositAmount: '', commissionAmount: '', startDate: '', endDate: '' };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  type FErr = { propertyId?: string; ownerId?: string; customerId?: string; monthlyRent?: string; startDate?: string; endDate?: string };
  const [fe, setFe] = useState<FErr>({});
  function setField(k: keyof typeof blank, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }
  const [seedOwner, setSeedOwner] = useState<{ value: string; label: string } | null>(null); // seed ป้ายเจ้าของที่ auto-fill
  function close() { setOpen(false); setFe({}); setErr(''); setSeedOwner(null); }

  // เปิดฟอร์ม + ตั้งค่า default วันเริ่ม=วันนี้ / วันสิ้นสุด=+12 เดือน (Phase 35 ลดการกรอก)
  function openCreate() {
    const pad = (n: number) => String(n).padStart(2, '0');
    const iso = (dt: Date) => `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
    const today = new Date(); const end = new Date(today); end.setFullYear(end.getFullYear() + 1);
    setForm({ ...blank, startDate: iso(today), endDate: iso(end) });
    setFe({}); setErr(''); setSeedOwner(null); setOpen(true);
  }

  // เลือกทรัพย์ → auto-fill เจ้าของ + ค่าเช่า + มัดจำ (จากข้อมูลทรัพย์) — ลดการกรอกซ้ำ
  async function pickProperty(id: string) {
    setField('propertyId', id);
    if (!id) return;
    try {
      const r = await api<{ owner?: { id: string; fullName: string }; monthlyRent?: string; depositMonths?: number }>(`/properties/${id}`);
      const p = r.data;
      setForm((f) => ({
        ...f,
        propertyId: id,
        ownerId: p.owner?.id ?? f.ownerId,
        monthlyRent: p.monthlyRent != null ? String(Number(p.monthlyRent)) : f.monthlyRent,
        depositAmount: p.depositMonths && p.monthlyRent ? String(p.depositMonths * Number(p.monthlyRent)) : f.depositAmount,
      }));
      if (p.owner) setSeedOwner({ value: p.owner.id, label: p.owner.fullName });
    } catch { /* auto-fill พลาด = ผู้ใช้เลือกเองได้ ไม่ต้องแจ้ง error */ }
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const v: FErr = {};
    if (!form.propertyId) v.propertyId = 'กรุณาเลือกทรัพย์';
    if (!form.ownerId) v.ownerId = 'กรุณาเลือกเจ้าของ';
    if (!form.customerId) v.customerId = 'กรุณาเลือกลูกค้า';
    if (!(Number(form.monthlyRent) > 0)) v.monthlyRent = 'กรุณากรอกค่าเช่าให้ถูกต้อง';
    if (!form.startDate) v.startDate = 'กรุณาเลือกวันเริ่มสัญญา';
    if (!form.endDate) v.endDate = 'กรุณาเลือกวันสิ้นสุด';
    else if (form.startDate && form.endDate <= form.startDate) v.endDate = 'วันสิ้นสุดต้องอยู่หลังวันเริ่ม';
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/contracts', { method: 'POST', body: JSON.stringify({
        propertyId: form.propertyId, ownerId: form.ownerId, customerId: form.customerId,
        agentId: form.agentId || user?.id,
        monthlyRent: Number(form.monthlyRent),
        depositAmount: form.depositAmount ? Number(form.depositAmount) : undefined,
        commissionAmount: form.commissionAmount ? Number(form.commissionAmount) : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      }) });
      setOpen(false); setForm(blank); setFe({}); setSeedOwner(null); reload();
      toast.success('สร้างสัญญาแล้ว');
    } catch (e2) { setErr((e2 as { message?: string }).message || 'สร้างสัญญาไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  const cols: Col<Contract>[] = [
    // หลัก = ลูกค้า (สัญญาของใคร) · รอง = รหัส + ทรัพย์ + วันสิ้นสุด — สแกนได้ว่าใคร/ทรัพย์ไหน
    { header: 'ลูกค้า', primary: true, cell: (c) => c.customer?.fullName || `สัญญา ${c.code}` },
    {
      header: 'รหัส · ทรัพย์ · ระยะเวลา', sub: true, cell: (c) =>
        `${c.code}${c.property ? ` · ${c.property.titleTh}` : ''}${c.endDate ? ` · สิ้นสุด ${new Date(c.endDate).toLocaleDateString('th-TH')}` : ''}`,
    },
    {
      header: 'สถานะ', right: true, cell: (c) => (
        <span className="inline-flex items-center gap-1.5">
          <StatusBadge map={CONTRACT_STATUS} value={c.status} />
          {c.status === 'active' && isExpiringSoon(c.endDate) && <span className="badge bg-gold/15 text-gold-dark">ใกล้ครบ</span>}
        </span>
      ),
    },
    { header: 'ค่าเช่า', right: true, cell: (c) => <span className="font-medium tabular-nums">฿{bahtFormat(Number(c.monthlyRent))}</span> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="สัญญา" count={`${meta.total ?? 0} ฉบับ`}
        action={can('contract', 'create') && <button className="btn-gold btn-sm" onClick={openCreate}><Icon name="plus" size={16} /> สัญญา</button>} />
      {/* P11: สถานะสัญญา = quick-filter แตะเดียว (ร่าง/มีผล/สิ้นสุด) */}
      <div className="mt-4 -mb-1">
        <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'ค้นหารหัส/ลูกค้า/ทรัพย์…' }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(c) => c.id} loading={loading}
          emptyIcon={filtered ? 'search' : 'file-text'}
          empty={filtered ? 'ไม่พบสัญญาตามเงื่อนไขที่เลือก' : 'ยังไม่มีสัญญา'}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>ล้างตัวกรอง</button>
            : (can('contract', 'create') && <button className="btn-gold btn-sm" onClick={openCreate}><Icon name="plus" size={16} /> เพิ่มสัญญา</button>)}
          onRow={(c) => router.push(`/contracts/${c.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* create (Phase 35) — จัด 3 หมวด + auto-fill (เลือกทรัพย์ → เติมเจ้าของ/ค่าเช่า/มัดจำ) + default วันที่ */}
      <Modal open={open} onClose={close} title="สร้างสัญญา"
        confirmOnClose={!!(form.propertyId || form.customerId || form.ownerId || form.monthlyRent)}>
        <form onSubmit={create} className="space-y-5">
          <div className="space-y-3">
            <SectionLabel>คู่สัญญา</SectionLabel>
            <Sel label="ทรัพย์ (เฉพาะที่ว่าง)" req error={fe.propertyId} val={form.propertyId} set={pickProperty} opts={props.options} onSearch={props.setQuery} loading={props.loading} loadError={props.error} onRetry={props.reload} />
            <Sel label="เจ้าของ" req error={fe.ownerId} val={form.ownerId} set={(v) => setField('ownerId', v)} opts={seedOwner && !owners.options.some((o) => o.value === seedOwner.value) ? [seedOwner, ...owners.options] : owners.options} onSearch={owners.setQuery} loading={owners.loading} loadError={owners.error} onRetry={owners.reload} />
            <Sel label="ลูกค้า" req error={fe.customerId} val={form.customerId} set={(v) => setField('customerId', v)} opts={customers.options} onSearch={customers.setQuery} loading={customers.loading} loadError={customers.error} onRetry={customers.reload} />
            {customers.options.length === 0 && <p className="-mt-2 text-xs text-warning">* ยังไม่มีลูกค้า — แปลง Lead เป็นลูกค้าก่อน (หน้า Lead)</p>}
            <Sel label="พนักงาน (เว้นว่าง = ตัวฉันเอง)" val={form.agentId} set={(v) => setField('agentId', v)} opts={[{ value: '', label: '— ตัวฉันเอง —' }, ...agents.options]} />
          </div>

          <div className="space-y-3">
            <SectionLabel>การเงิน</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="ค่าเช่า/เดือน *" type="number" error={fe.monthlyRent} value={form.monthlyRent} onChange={(e) => setField('monthlyRent', e.target.value)} />
              <Field label="มัดจำ (บาท)" type="number" value={form.depositAmount} onChange={(e) => setField('depositAmount', e.target.value)} />
              <Field label="ค่านายหน้า" type="number" value={form.commissionAmount} onChange={(e) => setField('commissionAmount', e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>ระยะเวลา</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="วันเริ่มสัญญา *" type="date" error={fe.startDate}
                hint={form.startDate ? thaiDate(form.startDate) : undefined}
                value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
              <Field label="วันสิ้นสุด *" type="date" error={fe.endDate}
                hint={form.endDate ? thaiDate(form.endDate) : undefined}
                value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
            </div>
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={close}>ยกเลิก</button>
            <button className="btn-gold" disabled={saving}>{saving ? 'กำลังสร้าง…' : 'สร้างสัญญา'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

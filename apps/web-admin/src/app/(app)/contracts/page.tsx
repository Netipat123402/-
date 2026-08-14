'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useToast } from '@/components/Toast';
import { useLookup, useSearchLookup } from '@/lib/lookups';
import { useDebouncedValue } from '@/lib/useDebounce';
import { bahtFormat, CONTRACT_STATUS } from '@/lib/status';
import { Col, Combobox, FilterBar, Field, ListView, Modal, PageHeader, Pagination, PhoneLink, SectionLabel, Segmented, StatusBadge , PAGE_SIZE} from '@/components/ui';
import { Icon } from '@/components/Icon';
import { fmtDate, fmtDateCompact } from '@/lib/format';

interface Contract {
  id: string; code: string; status: string; monthlyRent: string;
  startDate?: string; endDate?: string;
  customer?: { fullName: string; phone?: string };
  property?: { titleTh: string; code: string };
}

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
  const t = useTranslations();
  const { api, user, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  // ค่า value คงเดิม (ส่ง API) · สถานะ reuse CONTRACT_STATUS labelKey
  const STATUS_OPTIONS = [
    { value: '', label: t('common.all') },
    ...Object.entries(CONTRACT_STATUS).map(([v, m]) => ({ value: v, label: t(m.labelKey) })),
  ];
  const SORT_OPTIONS = [
    { value: 'expiry', label: t('contracts.sortExpiry') },
    { value: 'expiry_desc', label: t('contracts.sortExpiryDesc') },
    { value: 'new', label: t('contracts.sortNewest') },
    { value: 'rent', label: t('contracts.sortRent') },
    { value: 'code', label: t('contracts.sortCode') },
  ];
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [sort, setSort] = useState('expiry');
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
    if (!form.propertyId) v.propertyId = t('contracts.valProperty');
    if (!form.ownerId) v.ownerId = t('contracts.valOwner');
    if (!form.customerId) v.customerId = t('contracts.valCustomer');
    if (!(Number(form.monthlyRent) > 0)) v.monthlyRent = t('contracts.valRent');
    if (!form.startDate) v.startDate = t('contracts.valStart');
    if (!form.endDate) v.endDate = t('contracts.valEnd');
    else if (form.startDate && form.endDate <= form.startDate) v.endDate = t('contracts.valEndAfterStart');
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
      toast.success(t('contracts.toastAdded'));
    } catch (e2) { setErr((e2 as { message?: string }).message || t('contracts.toastCreateFailed')); }
    finally { setSaving(false); }
  }

  // แม่แบบ list มาตรฐาน sidebar (เหมือนลูกค้า/นัดหมาย): ผู้เช่า ชื่อ+เบอร์ · ทรัพย์ รหัส+ชื่อ แบบหน้าทรัพย์ · ครบกำหนด · สถานะ·ค่าเช่า stacked
  const cols: Col<Contract>[] = [
    // 1) ผู้เช่า = ชื่อ + เบอร์ (twoLine · PhoneLink)
    { header: t('contracts.colTenant'), primary: true, twoLine: true, cell: (c) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{c.customer?.fullName || t('contracts.subjectFallback', { code: c.code })}</div>
        {c.customer?.phone ? <PhoneLink phone={c.customer.phone} className="text-xs text-muted" /> : <span className="text-xs text-faint">—</span>}
      </div>
    ) },
    // 2) ทรัพย์ = รหัส(mono ทอง) + ชื่อทรัพย์ แบบหน้าทรัพย์ (ไม่มีรูป) · ไม่ใส่ width (เฉลี่ยช่องไฟ)
    { header: t('contracts.colProperty'), sub: true, cell: (c) => c.property ? (
      <span className="block min-w-0 max-w-[16rem]">
        <span className="block font-mono text-xs text-gold-dark">{c.property.code}</span>
        <span className="block truncate text-muted">{c.property.titleTh}</span>
      </span>
    ) : <span className="text-faint">—</span> },
    // 3) ครบกำหนด = วันสิ้นสุด (วันที่มาตรฐาน "15 Jan 27") — คีย์สแกนต่ออายุ
    { header: t('contracts.colEndDate'), sub: true, cell: (c) => c.endDate
      ? <span className="whitespace-nowrap text-muted">{fmtDateCompact(c.endDate)}</span>
      : <span className="text-faint">—</span> },
    // 4) สถานะ · ค่าเช่า = stacked แบบหน้าทรัพย์ (สถานะบน · ค่าเช่าล่าง · กึ่งกลาง)
    { header: t('contracts.colStatusRent'), right: true, width: 'w-40', cell: (c) => (
      <div className="flex flex-col items-center gap-1">
        <StatusBadge map={CONTRACT_STATUS} value={c.status} outline />
        <span className="font-semibold tabular-nums">฿{bahtFormat(Number(c.monthlyRent))}</span>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title={t('nav.contracts')} count={t('contracts.countUnit', { n: meta.total ?? 0 })}
        action={can('contract', 'create') && <button className="btn-gold btn-sm" onClick={openCreate}><Icon name="plus" size={16} /> {t('contracts.addBtn')}</button>} />
      {/* P11: สถานะสัญญา = quick-filter แตะเดียว (ร่าง/มีผล/สิ้นสุด) */}
      <div className="mt-4 -mb-1">
        <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      <FilterBar
        searchWide
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: t('appts.searchPlaceholder') }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(c) => c.id} loading={loading}
          emptyIcon={filtered ? 'search' : 'file-text'}
          empty={filtered ? t('contracts.emptyNoMatch') : t('contracts.emptyNone')}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>{t('common.clearFilters')}</button>
            : (can('contract', 'create') && <button className="btn-gold btn-sm" onClick={openCreate}><Icon name="plus" size={16} /> {t('contracts.addBtnFull')}</button>)}
          onRow={(c) => router.push(`/contracts/${c.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* create (Phase 35) — จัด 3 หมวด + auto-fill (เลือกทรัพย์ → เติมเจ้าของ/ค่าเช่า/มัดจำ) + default วันที่ */}
      <Modal open={open} onClose={close} title={t('contracts.addTitle')}
        confirmOnClose={!!(form.propertyId || form.customerId || form.ownerId || form.monthlyRent)}>
        <form onSubmit={create} className="space-y-5">
          <div className="space-y-3">
            <SectionLabel>{t('contracts.secParties')}</SectionLabel>
            <Sel label={t('contracts.fieldPropertyAvail')} req error={fe.propertyId} val={form.propertyId} set={pickProperty} opts={props.options} onSearch={props.setQuery} loading={props.loading} loadError={props.error} onRetry={props.reload} />
            <Sel label={t('contracts.fieldOwner')} req error={fe.ownerId} val={form.ownerId} set={(v) => setField('ownerId', v)} opts={seedOwner && !owners.options.some((o) => o.value === seedOwner.value) ? [seedOwner, ...owners.options] : owners.options} onSearch={owners.setQuery} loading={owners.loading} loadError={owners.error} onRetry={owners.reload} />
            <Sel label={t('contracts.fieldCustomer')} req error={fe.customerId} val={form.customerId} set={(v) => setField('customerId', v)} opts={customers.options} onSearch={customers.setQuery} loading={customers.loading} loadError={customers.error} onRetry={customers.reload} />
            {customers.options.length === 0 && <p className="-mt-2 text-xs text-warning">{t('contracts.noCustomerHint')}</p>}
            <Sel label={t('contracts.fieldAgent')} val={form.agentId} set={(v) => setField('agentId', v)} opts={[{ value: '', label: t('appts.agentSelf') }, ...agents.options]} />
          </div>

          <div className="space-y-3">
            <SectionLabel>{t('contracts.secFinance')}</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label={`${t('contracts.fieldRentMonth')} *`} type="number" error={fe.monthlyRent} value={form.monthlyRent} onChange={(e) => setField('monthlyRent', e.target.value)} />
              <Field label={t('contracts.fieldDeposit')} type="number" value={form.depositAmount} onChange={(e) => setField('depositAmount', e.target.value)} />
              <Field label={t('contracts.fieldCommission')} type="number" value={form.commissionAmount} onChange={(e) => setField('commissionAmount', e.target.value)} />
            </div>
          </div>

          <div className="space-y-3">
            <SectionLabel>{t('contracts.secDuration')}</SectionLabel>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={`${t('contracts.fieldStart')} *`} type="date" error={fe.startDate}
                hint={form.startDate ? fmtDate(form.startDate) : undefined}
                value={form.startDate} onChange={(e) => setField('startDate', e.target.value)} />
              <Field label={`${t('contracts.fieldEnd')} *`} type="date" error={fe.endDate}
                hint={form.endDate ? fmtDate(form.endDate) : undefined}
                value={form.endDate} onChange={(e) => setField('endDate', e.target.value)} />
            </div>
          </div>

          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={close}>{t('common.cancel')}</button>
            <button className="btn-gold" disabled={saving}>{saving ? t('contracts.creating') : t('contracts.createBtn')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useDebouncedValue } from '@/lib/useDebounce';
import { useToast } from '@/components/Toast';
import { PROPERTY_REQUEST_STATUS, PROPERTY_TYPE, bahtFormat } from '@/lib/status';
import { fmtDateCompact, formatPhone } from '@/lib/format';
import { Col, Field, FilterBar, ListView, Modal, PageHeader, Pagination, Segmented, StatusBadge, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface PropertyRequestRow {
  id: string; code: string; titleTh: string; status: string;
  propertyType?: string; province?: string; district?: string;
  expectedRent?: string; bedrooms?: number; bathrooms?: number;
  submittedBy?: { id: string; fullName: string };
  createdAt?: string;
}

const emptyForm = {
  titleTh: '', propertyType: '', province: '', district: '',
  expectedRent: '', bedrooms: '', bathrooms: '', note: '',
  ownerName: '', ownerPhone: '', ownerConsent: false,
};

export default function PropertyRequestsPage() {
  const t = useTranslations();
  const { api, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const STATUS_OPTIONS = [
    { value: '', label: t('common.all') },
    ...Object.entries(PROPERTY_REQUEST_STATUS).map(([v, m]) => ({ value: v, label: t(m.labelKey) })),
  ];
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300);
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (status) params.set('status', status);
  if (dq) params.set('q', dq);
  const { rows, meta, loading, reload } = useList<PropertyRequestRow>(`/property-requests?${params}`);
  const filtered = !!(q || status);
  const clearFilters = () => { setQ(''); setStatus(''); setPage(1); };

  // ฟอร์ม "ขอเพิ่มทรัพย์"
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [fe, setFe] = useState<{ titleTh?: string }>({});
  const set = (k: keyof typeof emptyForm, v: string | boolean) => setForm((f) => ({ ...f, [k]: v }));

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleTh.trim()) { setFe({ titleTh: t('propReq.valTitle') }); return; }
    setSaving(true); setErr('');
    try {
      const r = await api<{ duplicateHints?: string[] }>('/property-requests', { method: 'POST', body: JSON.stringify({
        titleTh: form.titleTh.trim(),
        propertyType: form.propertyType || undefined,
        province: form.province || undefined,
        district: form.district || undefined,
        expectedRent: form.expectedRent ? Number(form.expectedRent) : undefined,
        bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined,
        bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
        note: form.note || undefined,
        ownerName: form.ownerName || undefined,
        ownerPhone: form.ownerPhone || undefined,
        ownerConsent: form.ownerConsent,
      }) });
      setOpen(false); setForm(emptyForm); setFe({}); reload();
      const hints = r.data.duplicateHints ?? [];
      if (hints.length) toast.info(t('propReq.toastSentDup', { hints: hints.join(' · ') }));
      else toast.success(t('propReq.toastSent'));
    } catch (e2) { setErr((e2 as { message?: string }).message || t('propReq.toastFailed')); }
    finally { setSaving(false); }
  }

  const cols: Col<PropertyRequestRow>[] = [
    { header: t('propReq.colRequest'), primary: true, twoLine: true, cell: (r) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{r.titleTh}</div>
        <div className="truncate text-xs text-muted">{t('propReq.submittedBy', { name: r.submittedBy?.fullName ?? '—' })}</div>
      </div>
    ) },
    { header: t('properties.col.location'), sub: true, cell: (r) => {
      const loc = [r.province, r.district].filter(Boolean).join(' · ');
      return loc ? <span className="hidden truncate text-muted sm:inline">{loc}</span> : <span className="hidden text-faint sm:inline">—</span>;
    } },
    { header: t('propReq.colExpected'), sub: true, cell: (r) => r.expectedRent ? <span className="hidden whitespace-nowrap tabular-nums text-muted sm:inline">฿{bahtFormat(Number(r.expectedRent))}</span> : <span className="hidden text-faint sm:inline">—</span> },
    { header: t('propReq.colStatus'), right: true, cell: (r) => <StatusBadge map={PROPERTY_REQUEST_STATUS} value={r.status} outline /> },
  ];

  return (
    <div>
      <PageHeader title={t('nav.propertyRequests')} count={t('common.itemCount', { n: meta.total ?? 0 })}
        action={can('property_request', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> {t('nav.requestProperty')}</button>} />
      <div className="mt-4 -mb-1">
        <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      <FilterBar searchWide search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: t('properties.searchPlaceholder') }} />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(r) => r.id} loading={loading}
          emptyIcon={filtered ? 'search' : 'inbox'}
          empty={filtered ? t('propReq.emptyNoMatch') : t('propReq.emptyNone')}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>{t('common.clearFilters')}</button>
            : (can('property_request', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> {t('nav.requestProperty')}</button>)}
          onRow={(r) => router.push(`/property-requests/${r.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* ฟอร์ม "ขอเพิ่มทรัพย์" (ข้อความล้วน · ผู้ดูแลลงประกาศ+จัดรูปเอง) */}
      <Modal open={open} onClose={() => setOpen(false)} title={t('nav.requestProperty')}
        confirmOnClose={!!(form.titleTh || form.province || form.ownerName || form.note)}>
        <form onSubmit={create} className="space-y-5">
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('propReq.secProperty')}</p>
            <Field label={`${t('propReq.fieldTitle')} *`} error={fe.titleTh} placeholder={t('propReq.titlePlaceholder')} value={form.titleTh} onChange={(e) => { set('titleTh', e.target.value); if (fe.titleTh) setFe({}); }} />
            <div className="grid grid-cols-2 gap-3">
              <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('common.type')}</span>
                <select className="field" value={form.propertyType} onChange={(e) => set('propertyType', e.target.value)}>
                  <option value="">{t('common.selectPlaceholder')}</option>
                  {Object.keys(PROPERTY_TYPE).map((v) => <option key={v} value={v}>{t(`propertyType.${v}`)}</option>)}
                </select>
              </label>
              <Field label={t('propReq.fieldExpected')} inputMode="numeric" placeholder={t('propReq.expectedPlaceholder')} value={form.expectedRent} onChange={(e) => set('expectedRent', e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('common.province')} placeholder={t('propReq.provincePlaceholder')} value={form.province} onChange={(e) => set('province', e.target.value)} />
              <Field label={t('propReq.fieldDistrict')} placeholder={t('propReq.districtPlaceholder')} value={form.district} onChange={(e) => set('district', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('propReq.fieldBedrooms')} inputMode="numeric" placeholder={t('propReq.bedroomsPlaceholder')} value={form.bedrooms} onChange={(e) => set('bedrooms', e.target.value.replace(/[^0-9]/g, ''))} />
              <Field label={t('propReq.fieldBathrooms')} inputMode="numeric" placeholder={t('propReq.bathroomsPlaceholder')} value={form.bathrooms} onChange={(e) => set('bathrooms', e.target.value.replace(/[^0-9]/g, ''))} />
            </div>
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('propReq.fieldDetail')}</span>
              <textarea className="field h-auto py-2.5" rows={3} placeholder={t('propReq.detailPlaceholder')} value={form.note} onChange={(e) => set('note', e.target.value)} />
            </label>
          </div>
          <div className="space-y-3">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">{t('propReq.secOwner')}</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('propReq.fieldOwnerName')} placeholder={t('propReq.ownerNamePlaceholder')} value={form.ownerName} onChange={(e) => set('ownerName', e.target.value)} />
              <Field label={t('common.phone')} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.ownerPhone} onChange={(e) => set('ownerPhone', formatPhone(e.target.value))} />
            </div>
            <label className="flex cursor-pointer items-center gap-2.5 text-sm text-ink-soft">
              <input type="checkbox" className="h-4 w-4 accent-gold" checked={form.ownerConsent} onChange={(e) => set('ownerConsent', e.target.checked)} />
              {t('propReq.consentLabel')}
            </label>
          </div>
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn-gold" disabled={saving}>{saving ? t('propReq.submitting') : t('propReq.submitBtn')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

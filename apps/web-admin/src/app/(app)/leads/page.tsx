'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useDebouncedValue } from '@/lib/useDebounce';
import { useToast } from '@/components/Toast';
import { LEAD_SOURCE, LEAD_STATUS } from '@/lib/status';
import { fmtDateTime, formatPhone, phoneDigits } from '@/lib/format';
import { Col, Field, FilterBar, ListView, Modal, PageHeader, Pagination, PhoneLink, Segmented, StatusBadge, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface Lead {
  id: string; code: string; fullName: string; phone: string;
  status: string; source: string; assignedToId?: string; customerId?: string;
  email?: string; message?: string; createdAt?: string; preferredViewAt?: string; lostReason?: string;
  interests?: { property: { id: string; code: string; titleTh: string } }[]; // R2: ทรัพย์ที่สนใจล่าสุด (list ส่ง 1 อัน)
}

export default function LeadsPage() {
  const t = useTranslations();
  const { api, can, user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const sp = useSearchParams();
  // ค่า value คงเดิม (ส่ง API) · สถานะ reuse LEAD_STATUS labelKey
  const STATUS_OPTIONS = [
    { value: '', label: t('common.all') },
    ...Object.entries(LEAD_STATUS).map(([v, m]) => ({ value: v, label: t(m.labelKey) })),
  ];
  const SORT_OPTIONS = [
    { value: 'new', label: t('leads.sortNewest') },
    { value: 'code', label: t('leads.sortCode') },
    { value: 'name', label: t('leads.sortName') },
  ];
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [source, setSource] = useState('');
  const [assignee, setAssignee] = useState(''); // '' = ทั้งหมด · 'me' = ผู้ดูแลของฉัน (โฟกัสงานตัวเอง)
  const [sort, setSort] = useState('new');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์ (ไม่ยิงทุกตัวอักษร)
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (status) params.set('status', status);
  if (source) params.set('source', source);
  if (assignee === 'me' && user) params.set('assignedToId', user.id);
  if (dq) params.set('q', dq);
  const { rows, meta, loading, reload } = useList<Lead>(`/leads?${params}`);
  const filtered = !!(q || status || source || assignee);
  const clearFilters = () => { setQ(''); setStatus(''); setSource(''); setAssignee(''); setPage(1); };
  // เรียงฝั่ง server แล้ว (sort ไป API → ถูกต้องข้ามหน้า) — MR-12 · รายละเอียด/การกระทำย้ายไปหน้า /leads/[id]

  // create walk-in lead
  const [open, setOpen] = useState(false);
  // deep-link จาก command palette: /leads?new=1 → เปิดฟอร์มเพิ่มผู้สนใจ (ล้าง param กันเปิดซ้ำ)
  useEffect(() => {
    if (sp.get('new') && can('lead', 'create')) { setOpen(true); router.replace('/leads'); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
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
    if (!form.fullName.trim()) v.fullName = t('leads.valName');
    const d = phoneDigits(form.phone);
    if (!d) v.phone = t('leads.valPhoneRequired');
    else if (d.length !== 10) v.phone = t('leads.valPhone10');
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/leads', { method: 'POST', body: JSON.stringify({
        fullName: form.fullName, phone: phoneDigits(form.phone), email: form.email || undefined,
        source: 'walk_in', message: form.message || undefined,
      }) });
      setOpen(false); setForm({ fullName: '', phone: '', email: '', message: '' }); setFe({}); reload();
      toast.success(t('leads.toastAdded'));
    } catch (e2) { setErr((e2 as { message?: string }).message || t('leads.toastCreateFailed')); }
    finally { setSaving(false); }
  }

  const cols: Col<Lead>[] = [
    // primary 2 บรรทัด = ชื่อ + เบอร์ใต้ชื่อ (เกาะเป็นชุด · เบอร์ muted กดโทรได้ · แก้ "เบอร์ลอยไกล/ห่าง")
    { header: t('leads.colCustomer'), primary: true, twoLine: true, cell: (l) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{l.fullName}</div>
        <PhoneLink phone={l.phone} className="text-xs text-muted" />
      </div>
    ) },
    // ทรัพย์ที่สนใจ = ล่าสุด 1 อัน (R2 unlocked · อันก่อน ๆ ดูใน detail) → iPad การ์ด + ตาราง · ซ่อนมือถือ (แก่น)
    { header: t('leads.colInterest'), sub: true, cell: (l) => {
      const p = l.interests?.[0]?.property;
      return p ? <span className="hidden truncate text-muted sm:inline">{p.titleTh}</span> : <span className="hidden text-faint sm:inline">—</span>;
    } },
    // อยากเข้าชม = วัน·เวลา 1 บรรทัด (preferredViewAt · วันก่อนเวลา)
    { header: t('leads.colWantView'), sub: true, cell: (l) => l.preferredViewAt ? <span className="whitespace-nowrap text-muted">{fmtDateTime(l.preferredViewAt)}</span> : <span className="text-faint">—</span> },
    // สถานะ (บน · pill) + ช่องทาง (ล่าง · จาง ซ่อนมือถือ) — คอม ชิดซ้ายใต้หัวข้อ (items-start ไม่ตกขอบ) · right:true = มือถือ cluster ขวา
    { header: t('leads.colStatusSource'), right: true, cell: (l) => (
      <div className="flex flex-col items-center gap-1">
        <StatusBadge map={LEAD_STATUS} value={l.status} outline />
        <span className="hidden text-xs text-faint sm:block">{LEAD_SOURCE[l.source] ? t(`leadSource.${l.source}`) : l.source}</span>
      </div>
    ) },
  ];

  return (
    <div>
      <PageHeader title={t('nav.leads')} count={t('common.itemCount', { n: meta.total ?? 0 })}
        action={can('lead', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> {t('leads.addBtn')}</button>} />
      {/* P11: สถานะ Lead = quick-filter แตะเดียว (ใช้บ่อยสุดใน flow งานขาย) */}
      <div className="mt-4 -mb-1">
        <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      <FilterBar
        searchWide
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: t('leads.searchPlaceholder') }}
        filters={[
          // ผู้ดูแล: ของฉัน = โฟกัสงาน sales ตัวเอง (My leads · CRM ระดับโลก) — ใช้บ่อยกว่าแหล่งที่มา → มาก่อน
          { key: 'assignee', label: t('leads.filterAssignee'), value: assignee, onChange: (v) => { setPage(1); setAssignee(v); }, options: [{ value: '', label: t('leads.assigneeAll') }, { value: 'me', label: t('leads.assigneeMe') }] },
          { key: 'source', label: t('leads.filterSource'), value: source, onChange: (v) => { setPage(1); setSource(v); }, options: [{ value: '', label: t('leads.sourceAll') }, ...Object.keys(LEAD_SOURCE).map((v) => ({ value: v, label: t(`leadSource.${v}`) }))] },
        ]}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(l) => l.id} loading={loading}
          emptyIcon={filtered ? 'search' : 'user-plus'}
          empty={filtered ? t('leads.emptyNoMatch') : t('leads.emptyNone')}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>{t('common.clearFilters')}</button>
            : (can('lead', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> {t('leads.addBtnFull')}</button>)}
          onRow={(l) => router.push(`/leads/${l.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* สร้าง Lead */}
      <Modal open={open} onClose={() => setOpen(false)} title={t('leads.addTitle')}
        confirmOnClose={!!(form.fullName || form.phone || form.email || form.message)}>
        <form onSubmit={create} className="space-y-4">
          <Field label={`${t('common.fullName')} *`} error={fe.fullName} placeholder={t('leads.namePlaceholder')} value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
          <Field label={`${t('common.phone')} *`} error={fe.phone} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone} onChange={(e) => setField('phone', formatPhone(e.target.value))} />
          <Field label={t('common.email')} type="email" placeholder="name@email.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('leads.fieldNeed')}</span>
            <textarea className="field h-auto py-2.5" rows={3} placeholder={t('leads.needPlaceholder')} value={form.message} onChange={(e) => setField('message', e.target.value)} />
          </label>
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn-gold" disabled={saving}>{saving ? t('leads.creating') : t('leads.addBtnFull')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

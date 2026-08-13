'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useDebouncedValue } from '@/lib/useDebounce';
import { useToast } from '@/components/Toast';
import { Col, FilterBar, Field, ListView, Modal, PageHeader, Pagination, PhoneLink, Segmented, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { formatPhone, phoneDigits } from '@/lib/format';

interface Owner {
  id: string; fullName: string; phone?: string; email?: string; propertyCount?: number;
  availableCount?: number; // R2: ทรัพย์ว่างอยู่ (status available)
  rentedCount?: number;    // R2: ทรัพย์เช่าอยู่ (status rented)
  latestRented?: { code: string; titleTh: string } | null; // R2: ปล่อยเช่าล่าสุด (สัญญาล่าสุด)
}

export default function OwnersPage() {
  const t = useTranslations();
  const { api, can } = useAuth();
  const router = useRouter();
  const toast = useToast();
  // ค่า value คงเดิม (ส่ง API) · label แปลตาม locale
  const SORT_OPTIONS = [
    { value: 'name', label: t('owners.sortName') },
    { value: 'most_properties', label: t('owners.sortMostProps') },
    { value: 'new', label: t('owners.sortNewest') },
  ];
  const VACANT_OPTIONS = [
    { value: '', label: t('common.all') },
    { value: 'vacant', label: t('owners.vacantHas') },
  ];
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [vacant, setVacant] = useState(''); // '' = ทั้งหมด · 'vacant' = เฉพาะมีทรัพย์ว่าง
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (dq) params.set('q', dq);
  if (vacant) params.set('hasVacant', '1');
  const { rows, meta, loading, reload } = useList<Owner>(`/owners?${params}`);
  // เรียงฝั่ง server แล้ว (ส่ง sort ไป API → ถูกต้องข้ามหน้า) — MR-12

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ fullName: '', phone: '', email: '' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [fe, setFe] = useState<{ fullName?: string; phone?: string }>({});
  function setField(k: 'fullName' | 'phone' | 'email', v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const v: typeof fe = {};
    if (!form.fullName.trim()) v.fullName = t('owners.valName');
    const d = phoneDigits(form.phone);
    if (d && d.length !== 10) v.phone = t('owners.valPhone'); // เบอร์ไม่บังคับ แต่ถ้ากรอกต้องครบ
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/owners', { method: 'POST', body: JSON.stringify({
        fullName: form.fullName, phone: d || undefined, email: form.email || undefined,
      }) });
      setOpen(false); setForm({ fullName: '', phone: '', email: '' }); setFe({}); reload();
      toast.success(t('owners.toastAdded'));
    } catch (e2) { setErr((e2 as { message?: string }).message || t('common.saveFailed')); }
    finally { setSaving(false); }
  }

  // แม่แบบ list มาตรฐาน sidebar: เจ้าของ ชื่อ+เบอร์ · ทรัพย์ทั้งหมด · ปล่อยเช่าล่าสุด (รหัส+ชื่อ แบบหน้าทรัพย์) · ว่างอยู่
  const cols: Col<Owner>[] = [
    // 1) เจ้าของ = ชื่อ + เบอร์ (twoLine · PhoneLink)
    { header: t('owners.colOwner'), primary: true, twoLine: true, cell: (o) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{o.fullName}</div>
        <PhoneLink phone={o.phone} className="text-xs text-muted" />
      </div>
    ) },
    // 2) ทรัพย์ทั้งหมด · C1: ตาราง(คอม)=เลขเดี่ยว (หัวข้อบอกความหมาย) · การ์ด(touch)=รวม 3 สถิติเป็นบรรทัดเดียวกระชับ (เลิก 3 สถิติซ้อนแย่งสายตา)
    { header: t('owners.colTotalProps'), right: true, cell: (o) => {
      const total = o.propertyCount ?? 0, rented = o.rentedCount ?? 0, avail = o.availableCount ?? 0;
      return (
        <>
          <span className="hidden tabular-nums text-muted mouse:block">{total}</span>
          <span className="whitespace-nowrap text-xs text-muted mouse:hidden">{t.rich('owners.cardStat', { total, rented, avail, hl: (c) => <span className={avail > 0 ? 'text-ink' : 'text-faint'}>{c}</span> })}</span>
        </>
      );
    } },
    // 3) ปล่อยเช่าล่าสุด = ทรัพย์จากสัญญาล่าสุด (รหัส mono ทอง + ชื่อ แบบหน้าทรัพย์ ไม่มีรูป)
    { header: t('owners.colLatestRented'), sub: true, cell: (o) => o.latestRented ? (
      <span className="block min-w-0 max-w-[16rem]">
        <span className="block font-mono text-xs text-gold-dark">{o.latestRented.code}</span>
        <span className="block truncate text-muted">{o.latestRented.titleTh}</span>
      </span>
    ) : <span className="text-faint">—</span> },
    // 4) เช่าอยู่ · เฉพาะตาราง(คอม) — การ์ดรวมไว้ใน "ทรัพย์ทั้งหมด" แล้ว (C1)
    { header: t('owners.colRenting'), right: true, cell: (o) => <span className="hidden tabular-nums text-muted mouse:block">{o.rentedCount ?? 0}</span> },
    // 5) ว่าง · เฉพาะตาราง(คอม) — เน้นเมื่อ >0 · การ์ดรวมไว้ใน "ทรัพย์ทั้งหมด" แล้ว (C1)
    { header: t('owners.colVacant'), right: true, cell: (o) => <span className={`hidden tabular-nums mouse:block ${(o.availableCount ?? 0) > 0 ? 'text-ink' : 'text-faint'}`}>{o.availableCount ?? 0}</span> },
  ];

  return (
    <div>
      <PageHeader title={t('owners.pageTitle')} count={t('owners.countUnit', { n: meta.total ?? 0 })}
        action={can('owner', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> {t('owners.addBtn')}</button>} />
      {/* quick-filter: มีทรัพย์ว่าง (action หลัก) — Segmented เดียวกับ pattern property/lead */}
      <div className="mt-4 -mb-1">
        <Segmented options={VACANT_OPTIONS} value={vacant} onChange={(v) => { setPage(1); setVacant(v); }} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: t('owners.searchPlaceholder') }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(o) => o.id} loading={loading} empty={t('owners.empty')}
          emptyIcon="user"
          onRow={(o) => router.push(`/owners/${o.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      <Modal open={open} onClose={() => setOpen(false)} title={t('owners.addTitle')}>
        <form onSubmit={create} className="space-y-4">
          <Field label={`${t('common.fullName')} *`} error={fe.fullName} placeholder={t('owners.namePlaceholder')} value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
          <Field label={t('common.phone')} error={fe.phone} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone} onChange={(e) => setField('phone', formatPhone(e.target.value))} />
          <Field label={t('common.email')} type="email" placeholder="name@email.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn-gold" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

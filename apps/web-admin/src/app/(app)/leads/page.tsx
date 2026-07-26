'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const { api, can } = useAuth();
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
  const { rows, meta, loading, reload } = useList<Lead>(`/leads?${params}`);
  const filtered = !!(q || status || source);
  const clearFilters = () => { setQ(''); setStatus(''); setSource(''); setPage(1); };
  // เรียงฝั่ง server แล้ว (sort ไป API → ถูกต้องข้ามหน้า) — MR-12 · รายละเอียด/การกระทำย้ายไปหน้า /leads/[id]

  // create walk-in lead
  const [open, setOpen] = useState(false);
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

  const cols: Col<Lead>[] = [
    // primary 2 บรรทัด = ชื่อ + เบอร์ใต้ชื่อ (เกาะเป็นชุด · เบอร์ muted กดโทรได้ · แก้ "เบอร์ลอยไกล/ห่าง")
    { header: 'ลูกค้า', primary: true, twoLine: true, cell: (l) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{l.fullName}</div>
        <PhoneLink phone={l.phone} className="text-xs text-muted" />
      </div>
    ) },
    // ทรัพย์ที่สนใจ = ล่าสุด 1 อัน (R2 unlocked · อันก่อน ๆ ดูใน detail) → iPad การ์ด + ตาราง · ซ่อนมือถือ (แก่น)
    { header: 'ทรัพย์ที่สนใจ', sub: true, cell: (l) => {
      const p = l.interests?.[0]?.property;
      return p ? <span className="hidden truncate text-muted sm:inline">{p.titleTh}</span> : <span className="hidden text-faint sm:inline">—</span>;
    } },
    // อยากเข้าชม = วัน·เวลา 1 บรรทัด (preferredViewAt · วันก่อนเวลา)
    { header: 'อยากเข้าชม', sub: true, cell: (l) => l.preferredViewAt ? <span className="whitespace-nowrap text-muted">{fmtDateTime(l.preferredViewAt)}</span> : <span className="text-faint">—</span> },
    // สถานะ (บน · pill) + ช่องทาง (ล่าง · จาง ซ่อนมือถือ) — คอม ชิดซ้ายใต้หัวข้อ (items-start ไม่ตกขอบ) · right:true = มือถือ cluster ขวา
    { header: 'สถานะ · ช่องทาง', right: true, cell: (l) => (
      <div className="flex flex-col items-start gap-1">
        <StatusBadge map={LEAD_STATUS} value={l.status} outline />
        <span className="hidden text-xs text-faint sm:block">{LEAD_SOURCE[l.source] ?? l.source}</span>
      </div>
    ) },
  ];

  return (
    <div>
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
          onRow={(l) => router.push(`/leads/${l.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

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
    </div>
  );
}

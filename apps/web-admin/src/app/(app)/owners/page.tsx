'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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

const SORT_OPTIONS = [
  { value: 'name', label: 'ชื่อ (ก–ฮ)' },
  { value: 'most_properties', label: 'ทรัพย์มากสุด' },
  { value: 'new', label: 'ใหม่สุด' },
];
// toggle มีทรัพย์ว่าง (action หลัก: หาเจ้าของที่มีของว่างเพื่อปล่อยเช่า)
const VACANT_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'vacant', label: 'มีทรัพย์ว่าง' },
];

export default function OwnersPage() {
  const { api, can } = useAuth();
  const router = useRouter();
  const toast = useToast();
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
    if (!form.fullName.trim()) v.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    const d = phoneDigits(form.phone);
    if (d && d.length !== 10) v.phone = 'เบอร์โทรต้องมี 10 หลัก'; // เบอร์ไม่บังคับ แต่ถ้ากรอกต้องครบ
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/owners', { method: 'POST', body: JSON.stringify({
        fullName: form.fullName, phone: d || undefined, email: form.email || undefined,
      }) });
      setOpen(false); setForm({ fullName: '', phone: '', email: '' }); setFe({}); reload();
      toast.success('เพิ่มเจ้าของแล้ว');
    } catch (e2) { setErr((e2 as { message?: string }).message || 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  // แม่แบบ list มาตรฐาน sidebar: เจ้าของ ชื่อ+เบอร์ · ทรัพย์ทั้งหมด · ปล่อยเช่าล่าสุด (รหัส+ชื่อ แบบหน้าทรัพย์) · ว่างอยู่
  const cols: Col<Owner>[] = [
    // 1) เจ้าของ = ชื่อ + เบอร์ (twoLine · PhoneLink)
    { header: 'เจ้าของ', primary: true, twoLine: true, cell: (o) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{o.fullName}</div>
        <PhoneLink phone={o.phone} className="text-xs text-muted" />
      </div>
    ) },
    // 2) ทรัพย์ทั้งหมด · C1: ตาราง(คอม)=เลขเดี่ยว (หัวข้อบอกความหมาย) · การ์ด(touch)=รวม 3 สถิติเป็นบรรทัดเดียวกระชับ (เลิก 3 สถิติซ้อนแย่งสายตา)
    { header: 'ทรัพย์ทั้งหมด', right: true, cell: (o) => {
      const total = o.propertyCount ?? 0, rented = o.rentedCount ?? 0, avail = o.availableCount ?? 0;
      return (
        <>
          <span className="hidden tabular-nums text-muted mouse:block">{total}</span>
          <span className="whitespace-nowrap text-xs text-muted mouse:hidden">{total} ทรัพย์ · เช่า {rented} · <span className={avail > 0 ? 'text-ink' : 'text-faint'}>ว่าง {avail}</span></span>
        </>
      );
    } },
    // 3) ปล่อยเช่าล่าสุด = ทรัพย์จากสัญญาล่าสุด (รหัส mono ทอง + ชื่อ แบบหน้าทรัพย์ ไม่มีรูป)
    { header: 'ปล่อยเช่าล่าสุด', sub: true, cell: (o) => o.latestRented ? (
      <span className="block min-w-0 max-w-[16rem]">
        <span className="block font-mono text-xs text-gold-dark">{o.latestRented.code}</span>
        <span className="block truncate text-muted">{o.latestRented.titleTh}</span>
      </span>
    ) : <span className="text-faint">—</span> },
    // 4) เช่าอยู่ · เฉพาะตาราง(คอม) — การ์ดรวมไว้ใน "ทรัพย์ทั้งหมด" แล้ว (C1)
    { header: 'เช่าอยู่', right: true, cell: (o) => <span className="hidden tabular-nums text-muted mouse:block">{o.rentedCount ?? 0}</span> },
    // 5) ว่าง · เฉพาะตาราง(คอม) — เน้นเมื่อ >0 · การ์ดรวมไว้ใน "ทรัพย์ทั้งหมด" แล้ว (C1)
    { header: 'ว่าง', right: true, cell: (o) => <span className={`hidden tabular-nums mouse:block ${(o.availableCount ?? 0) > 0 ? 'text-ink' : 'text-faint'}`}>{o.availableCount ?? 0}</span> },
  ];

  return (
    <div>
      <PageHeader title="เจ้าของทรัพย์" count={`${meta.total ?? 0} ราย`}
        action={can('owner', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> เจ้าของ</button>} />
      {/* quick-filter: มีทรัพย์ว่าง (action หลัก) — Segmented เดียวกับ pattern property/lead */}
      <div className="mt-4 -mb-1">
        <Segmented options={VACANT_OPTIONS} value={vacant} onChange={(v) => { setPage(1); setVacant(v); }} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'ค้นหาชื่อ/เบอร์…' }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(o) => o.id} loading={loading} empty="ยังไม่มีเจ้าของทรัพย์"
          emptyIcon="user"
          onRow={(o) => router.push(`/owners/${o.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      <Modal open={open} onClose={() => setOpen(false)} title="เพิ่มเจ้าของทรัพย์">
        <form onSubmit={create} className="space-y-4">
          <Field label="ชื่อ-นามสกุล *" error={fe.fullName} placeholder="เช่น สมชาย ใจดี" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
          <Field label="เบอร์โทร" error={fe.phone} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone} onChange={(e) => setField('phone', formatPhone(e.target.value))} />
          <Field label="อีเมล" type="email" placeholder="name@email.com" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-gold" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

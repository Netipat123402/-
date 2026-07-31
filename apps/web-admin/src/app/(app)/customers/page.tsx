'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useList } from '@/lib/useList';
import { useDebouncedValue } from '@/lib/useDebounce';
import { Col, FilterBar, ListView, PageHeader, Pagination, PhoneLink, Segmented, PAGE_SIZE } from '@/components/ui';

interface Customer {
  id: string; fullName: string; phone?: string; email?: string; contractCount?: number;
  rentedProperty?: { code: string; titleTh: string } | null; // R2: ทรัพย์ที่เช่า (สัญญา active ล่าสุด)
  rentedOwner?: { fullName: string; phone?: string } | null;  // R2: เจ้าของทรัพย์นั้น
}

const SORT_OPTIONS = [
  { value: 'name', label: 'ชื่อ (ก–ฮ)' },
  { value: 'new', label: 'ใหม่สุด' },
];
// toggle กำลังเช่าอยู่ (status ผู้เช่า: มีสัญญา active)
const RENTING_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'active', label: 'กำลังเช่าอยู่' },
];

export default function CustomersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const [renting, setRenting] = useState(''); // '' = ทั้งหมด · 'active' = กำลังเช่าอยู่ (มีสัญญา active)
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (dq) params.set('q', dq);
  if (renting) params.set('renting', '1');
  const { rows, meta, loading } = useList<Customer>(`/customers?${params}`);
  // เรียงฝั่ง server แล้ว (sort ไป API → ถูกต้องข้ามหน้า) — MR-12

  const cols: Col<Customer>[] = [
    // 1) ผู้เช่า = ชื่อ + เบอร์ (twoLine เกาะชุด · muted กดโทรได้)
    { header: 'ผู้เช่า', primary: true, twoLine: true, cell: (c) => (
      <div className="min-w-0">
        <div className="truncate font-medium text-ink">{c.fullName}</div>
        <PhoneLink phone={c.phone} className="text-xs text-muted" />
      </div>
    ) },
    // 2) ทรัพย์ที่เช่า = รหัส(mono ทอง) + ชื่อทรัพย์ แบบหน้าทรัพย์ (ไม่มีรูป) · จากสัญญา active/ล่าสุด
    //    ไม่ใส่ width → auto เฉลี่ยช่องไฟเท่าหน้าอื่น · title ตัด … ด้วย max-w
    { header: 'ทรัพย์ที่เช่า', sub: true, cell: (c) => c.rentedProperty ? (
      <span className="block min-w-0 max-w-[16rem]">
        <span className="block font-mono text-xs text-gold-dark">{c.rentedProperty.code}</span>
        <span className="block truncate text-muted">{c.rentedProperty.titleTh}</span>
      </span>
    ) : <span className="text-faint">—</span> },
    // 3) เจ้าของ = ชื่อ + เบอร์ · ซ่อนมือถือ (แก่นลูกค้า = ผู้เช่า/ทรัพย์/สัญญา · เจ้าของเป็นบริบท → iPad/คอม)
    { header: 'เจ้าของ', sub: true, cell: (c) => c.rentedOwner ? (
      <span className="hidden min-w-0 max-w-[12rem] sm:block">
        <span className="block truncate text-ink-soft">{c.rentedOwner.fullName}</span>
        {c.rentedOwner.phone && <PhoneLink phone={c.rentedOwner.phone} className="text-xs text-muted" />}
      </span>
    ) : <span className="hidden text-faint sm:block">—</span> },
    // 4) สัญญา = จำนวนสัญญาทั้งหมดของลูกค้า
    { header: 'สัญญา', right: true, cell: (c) => <span className="text-muted">{c.contractCount ?? 0} สัญญา</span> },
  ];

  return (
    <div>
      <PageHeader title="ลูกค้า" count={`${meta.total ?? 0} ราย`} />
      {/* quick-filter: กำลังเช่าอยู่ (แยกผู้เช่าปัจจุบันจากลูกค้าเก่า) */}
      <div className="mt-4 -mb-1">
        <Segmented options={RENTING_OPTIONS} value={renting} onChange={(v) => { setPage(1); setRenting(v); }} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'ค้นหาชื่อ/เบอร์…' }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(c) => c.id} loading={loading}
          empty="ยังไม่มีลูกค้า — ลูกค้าจะถูกสร้างเมื่อแปลงจาก Lead" emptyIcon="users"
          onRow={(c) => router.push(`/customers/${c.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />
    </div>
  );
}

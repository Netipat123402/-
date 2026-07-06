'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useList } from '@/lib/useList';
import { useDebouncedValue } from '@/lib/useDebounce';
import { Avatar, Col, FilterBar, ListView, PageHeader, Pagination, PhoneLink , PAGE_SIZE} from '@/components/ui';

interface Customer { id: string; fullName: string; phone?: string; email?: string; contractCount?: number; }

const SORT_OPTIONS = [
  { value: 'name', label: 'ชื่อ (ก–ฮ)' },
  { value: 'new', label: 'ใหม่สุด' },
];

export default function CustomersPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [sort, setSort] = useState('name');
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์
  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
  if (dq) params.set('q', dq);
  const { rows, meta, loading } = useList<Customer>(`/customers?${params}`);
  // เรียงฝั่ง server แล้ว (sort ไป API → ถูกต้องข้ามหน้า) — MR-12

  // หลัก = ชื่อ · รอง = เบอร์(แตะโทร) + อีเมล (Phase 45: ไม่ให้หน้าโล้น) · ขวา = จำนวนสัญญา (นับทุกสัญญาไม่ถูกลบ)
  const cols: Col<Customer>[] = [
    { header: 'ชื่อ', primary: true, cell: (c) => c.fullName },
    { header: 'เบอร์โทร · อีเมล', sub: true, cell: (c) => (
      <span className="inline-flex min-w-0 items-center gap-1">
        <PhoneLink phone={c.phone} />
        {c.email && <span className="truncate text-muted"> · {c.email}</span>}
      </span>
    ) },
    { header: 'สัญญา', right: true, width: 'w-28', cell: (c) => <span className="text-muted">{c.contractCount ?? 0} สัญญา</span> },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="ลูกค้า" count={`${meta.total ?? 0} ราย`} />
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'ค้นหาชื่อ/เบอร์…' }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(c) => c.id} loading={loading}
          empty="ยังไม่มีลูกค้า — ลูกค้าจะถูกสร้างเมื่อแปลงจาก Lead" emptyIcon="users"
          leading={(c) => <Avatar name={c.fullName} size={38} />} onRow={(c) => router.push(`/customers/${c.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />
    </div>
  );
}

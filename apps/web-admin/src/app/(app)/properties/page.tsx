'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useDebouncedValue } from '@/lib/useDebounce';
import { mediaUrl } from '@/lib/api';
import { PROPERTY_STATUS, PROPERTY_TYPE, bahtFormat } from '@/lib/status';
import { Col, FilterBar, ListView, Modal, PageHeader, Pagination, Segmented, StatusBadge , PAGE_SIZE} from '@/components/ui';
import { Icon } from '@/components/Icon';
import PropertyForm from '@/components/PropertyForm';

interface PropertyRow {
  id: string; code: string; titleTh: string; propertyType: string;
  status: string; monthlyRent: string; province?: string; bedrooms?: number;
  media?: { storageKey: string }[];
}

const STATUS_OPTIONS = [
  { value: '', label: 'ทั้งหมด' },
  { value: 'available', label: 'ว่าง' },
  { value: 'rented', label: 'ไม่ว่าง' },
  { value: 'draft', label: 'ร่าง' },
];
const TYPE_OPTIONS = [{ value: '', label: 'ทุกประเภท' }, ...Object.entries(PROPERTY_TYPE).map(([value, label]) => ({ value, label }))];
// ไอคอนตามประเภท (ตึกสูง vs บ้าน) — ใช้ในรูป placeholder ของทรัพย์ที่ยังไม่มีภาพ
const TYPE_ICON: Record<string, 'building' | 'home'> = { condo: 'building', apartment: 'building', house: 'home', townhome: 'home' };
const SORT_OPTIONS = [
  { value: 'code', label: 'รหัสทรัพย์ (ก–ฮ)' },
  { value: 'price_asc', label: 'ค่าเช่า น้อย→มาก' },
  { value: 'price_desc', label: 'ค่าเช่า มาก→น้อย' },
  { value: 'new', label: 'เพิ่มล่าสุด' },
];
// ช่วงค่าเช่าสำหรับสไลเดอร์กรอง (บาท/เดือน)
const RENT_MAX = 100000;
const RENT_STEP = 1000;

export default function PropertiesPage() {
  const { api, can } = useAuth();
  const router = useRouter();
  const sp = useSearchParams();
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [meta, setMeta] = useState<{ total?: number; page?: number; totalPages?: number }>({});
  const [status, setStatus] = useState(sp.get('status') ?? '');
  const [type, setType] = useState('');
  const [province, setProvince] = useState('');
  const [rentMin, setRentMin] = useState('');
  const [rentMax, setRentMax] = useState('');
  // หน่วงค่าช่วงค่าเช่า: สไลเดอร์เลื่อนลื่น (rentMin/Max อัปเดตทันที) แต่ยิง API หลังหยุดลาก 300ms (กัน request ถล่มตอนลาก)
  const dRentMin = useDebouncedValue(rentMin, 300);
  const dRentMax = useDebouncedValue(rentMax, 300);
  const [sort, setSort] = useState('code');
  const [q, setQ] = useState('');
  const dq = useDebouncedValue(q, 300); // BUG-M3: ค้นหายิง API หลังหยุดพิมพ์ (เดิม q ตรง ๆ = ทุกตัวอักษร)
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [provinceOpts, setProvinceOpts] = useState<{ value: string; label: string }[]>([]);
  const [showNew, setShowNew] = useState(false);

  // โหลดรายชื่อจังหวัด (master-data เดียวกับฟอร์ม) สำหรับฟิลเตอร์
  useEffect(() => {
    // ค่าฟิลเตอร์ใช้ "ชื่อจังหวัด" (labelTh) ให้ตรงกับที่ DB เก็บจริง — ไม่ใช่ code (ไม่งั้นกรองไม่เจอ)
    api<Record<string, { code: string; labelTh: string }[]>>('/public/master-data')
      .then((m) => setProvinceOpts((m.data.province ?? []).map((p) => ({ value: p.labelTh, label: p.labelTh }))))
      .catch(() => { /* ignore */ });
  }, [api]);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE), sort });
    if (status) params.set('status', status);
    if (type) params.set('propertyType', type);
    if (province) params.set('province', province);
    if (dRentMin) params.set('rentMin', dRentMin);
    if (dRentMax) params.set('rentMax', dRentMax);
    if (dq) params.set('q', dq);
    try {
      const r = await api<PropertyRow[]>(`/properties?${params}`);
      setRows(r.data); setMeta(r.meta ?? {});
    } finally { setLoading(false); }
  }, [api, page, status, type, province, dRentMin, dRentMax, dq, sort]);

  useEffect(() => { load(); }, [load]);

  // เรียงฝั่ง server แล้ว (ส่ง sort ไป API) — ใช้ rows ตรง ๆ
  const sorted = rows;
  // มีการกรอง/ค้นหาอยู่ไหม → ใช้เลือกข้อความ+ปุ่มของ empty state (ไม่เจอเพราะกรอง vs ยังไม่มีข้อมูลจริง)
  const filtered = !!(q || status || type || province || rentMin || rentMax);
  const clearFilters = () => { setQ(''); setStatus(''); setType(''); setProvince(''); setRentMin(''); setRentMax(''); setPage(1); };

  const thumb = (p: PropertyRow) => (
    p.media?.[0]
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(p.media[0].storageKey)} alt="" className="h-11 w-11 rounded-lg object-cover sm:h-12 sm:w-12" />
      : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-canvas to-border/50 text-faint ring-1 ring-border/60 sm:h-12 sm:w-12"><Icon name={TYPE_ICON[p.propertyType] ?? 'building'} size={18} /></span>
  );

  const cols: Col<PropertyRow>[] = [
    {
      header: 'รหัส / ทรัพย์', primary: true, cell: (p) => (
        <span className="min-w-0">
          <span className="block font-mono text-xs text-gold-dark">{p.code}</span>
          <span className="block truncate font-medium">{p.titleTh}</span>
        </span>
      ),
    },
    // ทำเล = คีย์สแกนอสังหา (ที่ตั้ง) → แยกจากชนิด · โชว์ทุกจอ (มือถือ+)
    { header: 'ทำเล', sub: true, cell: (p) => p.province || <span className="text-faint">—</span> },
    // ประเภท = ชนิดทรัพย์อย่างเดียว (§10: 1 คอลัมน์ 1 ความหมาย) — เลิกพ่วง "· N นอน"
    //   เดิมพ่วงห้องนอน = ซ้ำกับชื่อทรัพย์ที่มี "— N นอน" อยู่แล้ว + ปนความหมาย · ห้องนอนอยู่ในหน้า detail
    { header: 'ประเภท', sub: true, cell: (p) => (
      <span className="hidden sm:inline">{PROPERTY_TYPE[p.propertyType] ?? p.propertyType}</span>
    ) },
    {
      // สถานะ + ค่าเช่า รวมคอลัมน์เดียว: สถานะอยู่บน · ราคาอยู่ล่าง · จัดกึ่งกลางเข้าหากัน
      header: 'สถานะ · ค่าเช่า', right: true, width: 'w-40', cell: (p) => (
        <div className="flex flex-col items-center gap-1">
          <span className="md:hidden"><StatusBadge map={PROPERTY_STATUS} value={p.status} short /></span>
          <span className="hidden md:inline"><StatusBadge map={PROPERTY_STATUS} value={p.status} /></span>
          <span className="font-semibold tabular-nums">฿{bahtFormat(Number(p.monthlyRent))}</span>
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <PageHeader title="ทรัพย์" count={`${meta.total ?? 0} รายการ`}
        action={can('property', 'create') && <button className="btn-gold btn-sm" onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> เพิ่มทรัพย์</button>} />

      {/* P11: สถานะทรัพย์ = quick-filter แตะเดียว (ว่าง/ไม่ว่าง/ร่าง) */}
      <div className="mt-4 -mb-1">
        <Segmented options={STATUS_OPTIONS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: 'ค้นหาชื่อ/โครงการ…' }}
        filters={[
          { key: 'type', label: 'ประเภท', value: type, onChange: (v) => { setPage(1); setType(v); }, options: TYPE_OPTIONS },
          { key: 'province', label: 'จังหวัด', value: province, onChange: (v) => { setPage(1); setProvince(v); }, options: [{ value: '', label: 'ทุกจังหวัด' }, ...provinceOpts], searchable: true },
        ]}
        range={{
          label: 'ค่าเช่า/เดือน',
          min: 0, max: RENT_MAX, step: RENT_STEP,
          lo: rentMin ? Number(rentMin) : 0,
          hi: rentMax ? Number(rentMax) : RENT_MAX,
          display: (!rentMin && !rentMax)
            ? 'ทุกช่วงราคา'
            : `฿${bahtFormat(rentMin ? Number(rentMin) : 0)} – ${rentMax ? `฿${bahtFormat(Number(rentMax))}` : `฿${bahtFormat(RENT_MAX)}+`}`,
          active: !!rentMin || !!rentMax,
          onChange: (lo, hi) => { setPage(1); setRentMin(lo <= 0 ? '' : String(lo)); setRentMax(hi >= RENT_MAX ? '' : String(hi)); },
          onClear: () => { setPage(1); setRentMin(''); setRentMax(''); },
        }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: SORT_OPTIONS }}
      />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={sorted} cols={cols} keyOf={(p) => p.id} loading={loading} leading={thumb}
          emptyIcon={filtered ? 'search' : 'building'}
          empty={filtered ? 'ไม่พบทรัพย์ตามเงื่อนไขที่เลือก' : 'ยังไม่มีทรัพย์ในระบบ — เพิ่มทรัพย์แรกเพื่อเริ่มต้น'}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>ล้างตัวกรอง</button>
            : (can('property', 'create') && <button className="btn-gold btn-sm" onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> เพิ่มทรัพย์</button>)}
          onRow={(p) => router.push(`/properties/${p.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* เพิ่มทรัพย์ — กรอบลอยกลางจอ (เหมือนสร้าง Lead/เจ้าของ) ไม่เต็มจอ */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title="เพิ่มทรัพย์ใหม่" size="xl">
        <PropertyForm mode="create" onClose={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}

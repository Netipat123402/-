'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
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

// ไอคอนตามประเภท (ตึกสูง vs บ้าน) — ใช้ในรูป placeholder ของทรัพย์ที่ยังไม่มีภาพ
const TYPE_ICON: Record<string, 'building' | 'home'> = { condo: 'building', apartment: 'building', house: 'home', townhome: 'home' };
// STATUS/TYPE/SORT options ย้ายเข้า component (แปลด้วย t) · ค่า value = enum ส่ง API คงเดิม
// ช่วงค่าเช่าสำหรับสไลเดอร์กรอง (บาท/เดือน)
const RENT_MAX = 100000;
const RENT_STEP = 1000;

export default function PropertiesPage() {
  const { api, can } = useAuth();
  const t = useTranslations();
  const router = useRouter();
  const sp = useSearchParams();
  const statusOptions = [
    { value: '', label: t('properties.tab.all') },
    { value: 'pending_review', label: t('properties.tab.pending') },
    { value: 'available', label: t('properties.tab.available') },
    { value: 'rented', label: t('properties.tab.rented') },
    { value: 'draft', label: t('properties.tab.draft') },
  ];
  const typeOptions = [{ value: '', label: t('common.allTypes') }, ...Object.keys(PROPERTY_TYPE).map((v) => ({ value: v, label: t(`propertyType.${v}`) }))];
  const sortOptions = [
    { value: 'new', label: t('properties.sort.newest') },
    { value: 'price_asc', label: t('properties.sort.priceAsc') },
    { value: 'price_desc', label: t('properties.sort.priceDesc') },
    { value: 'code', label: t('properties.sort.code') },
  ];
  const [rows, setRows] = useState<PropertyRow[]>([]);
  const [meta, setMeta] = useState<{ total?: number; page?: number; totalPages?: number }>({});
  const [status, setStatus] = useState(sp.get('status') ?? '');
  // กรองตามเจ้าของ (มาจาก owner detail "ดูทั้งหมด") — ชื่อส่งมาใน url เพื่อโชว์ชิป ไม่ต้อง fetch ซ้ำ
  const [ownerFilter, setOwnerFilter] = useState(sp.get('owner') ?? '');
  const ownerName = sp.get('ownerName') ?? '';
  const [type, setType] = useState('');
  const [province, setProvince] = useState('');
  const [rentMin, setRentMin] = useState('');
  const [rentMax, setRentMax] = useState('');
  // หน่วงค่าช่วงค่าเช่า: สไลเดอร์เลื่อนลื่น (rentMin/Max อัปเดตทันที) แต่ยิง API หลังหยุดลาก 300ms (กัน request ถล่มตอนลาก)
  const dRentMin = useDebouncedValue(rentMin, 300);
  const dRentMax = useDebouncedValue(rentMax, 300);
  const [sort, setSort] = useState('new');
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
    if (ownerFilter) params.set('ownerId', ownerFilter);
    try {
      const r = await api<PropertyRow[]>(`/properties?${params}`);
      setRows(r.data); setMeta(r.meta ?? {});
    } finally { setLoading(false); }
  }, [api, page, status, type, province, dRentMin, dRentMax, dq, sort, ownerFilter]);

  useEffect(() => { load(); }, [load]);

  // เรียงฝั่ง server แล้ว (ส่ง sort ไป API) — ใช้ rows ตรง ๆ
  const sorted = rows;
  // มีการกรอง/ค้นหาอยู่ไหม → ใช้เลือกข้อความ+ปุ่มของ empty state (ไม่เจอเพราะกรอง vs ยังไม่มีข้อมูลจริง)
  const filtered = !!(q || status || type || province || rentMin || rentMax || ownerFilter);
  const clearFilters = () => { setQ(''); setStatus(''); setType(''); setProvince(''); setRentMin(''); setRentMax(''); setOwnerFilter(''); setPage(1); router.replace('/properties'); };

  const thumb = (p: PropertyRow) => (
    p.media?.[0]
      // eslint-disable-next-line @next/next/no-img-element
      ? <img src={mediaUrl(p.media[0].storageKey)} alt="" className="h-11 w-11 rounded-lg object-cover sm:h-12 sm:w-12" />
      : <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-to-br from-canvas to-border/50 text-faint ring-1 ring-border/60 sm:h-12 sm:w-12"><Icon name={TYPE_ICON[p.propertyType] ?? 'building'} size={18} /></span>
  );

  const cols: Col<PropertyRow>[] = [
    {
      header: t('properties.col.codeProperty'), primary: true, cell: (p) => (
        <span className="min-w-0">
          <span className="block font-mono text-xs text-gold-dark">{p.code}</span>
          <span className="block truncate font-medium">{p.titleTh}</span>
        </span>
      ),
    },
    // ทำเล = คีย์สแกนอสังหา (ที่ตั้ง) → แยกจากชนิด · โชว์ทุกจอ (มือถือ+)
    { header: t('properties.col.location'), sub: true, cell: (p) => p.province || <span className="text-faint">—</span> },
    // ประเภท = ชนิดทรัพย์อย่างเดียว (§10: 1 คอลัมน์ 1 ความหมาย) — เลิกพ่วง "· N นอน"
    //   เดิมพ่วงห้องนอน = ซ้ำกับชื่อทรัพย์ที่มี "— N นอน" อยู่แล้ว + ปนความหมาย · ห้องนอนอยู่ในหน้า detail
    { header: t('properties.col.type'), sub: true, cell: (p) => (
      <span className="hidden sm:inline">{PROPERTY_TYPE[p.propertyType] ? t(`propertyType.${p.propertyType}`) : p.propertyType}</span>
    ) },
    {
      // สถานะ + ค่าเช่า รวมคอลัมน์เดียว: สถานะอยู่บน · ราคาอยู่ล่าง · จัดกึ่งกลางเข้าหากัน
      header: t('properties.col.statusRent'), right: true, width: 'w-40', cell: (p) => (
        <div className="flex flex-col items-center gap-1">
          <span className="md:hidden"><StatusBadge map={PROPERTY_STATUS} value={p.status} short outline /></span>
          <span className="hidden md:inline"><StatusBadge map={PROPERTY_STATUS} value={p.status} outline /></span>
          <span className="font-semibold tabular-nums">฿{bahtFormat(Number(p.monthlyRent))}</span>
        </div>
      ),
    },
  ];

  // เซล = อ่านอย่างเดียว (ไม่มี property:create) แต่ขอเพิ่มทรัพย์ผ่านคำขอได้ → CTA คนละแบบ + framing แคตตาล็อก
  const canAddProperty = can('property', 'create');
  const canRequestProperty = !canAddProperty && can('property_request', 'create');
  const addCta = canAddProperty
    ? <button className="btn-gold btn-sm" onClick={() => setShowNew(true)}><Icon name="plus" size={16} /> {t('shell.addProperty')}</button>
    : canRequestProperty
      ? <Link href="/property-requests" className="btn-gold btn-sm"><Icon name="plus" size={16} /> {t('nav.requestProperty')}</Link>
      : null;

  return (
    <div>
      <PageHeader title={t('nav.properties')} count={t('common.itemCount', { n: meta.total ?? 0 })} action={addCta} />

      {/* เซล: คลังทรัพย์กลาง = อ่านอย่างเดียว ไว้จับคู่ลูกค้า · เพิ่มใหม่ผ่าน "ขอเพิ่มทรัพย์" */}
      {canRequestProperty && (
        <p className="mt-3 flex items-center gap-2 rounded-lg bg-raised px-3 py-2 text-xs text-ink-soft">
          <Icon name="info" size={14} className="shrink-0 text-faint" />
          {t('properties.salesBanner')}
        </p>
      )}

      {/* P11: สถานะทรัพย์ = quick-filter แตะเดียว (ว่าง/ไม่ว่าง/ร่าง) */}
      <div className="mt-4 -mb-1">
        <Segmented options={statusOptions} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>
      <FilterBar
        search={{ value: q, onChange: (v) => { setPage(1); setQ(v); }, placeholder: t('properties.searchPlaceholder') }}
        searchWide
        filters={[
          { key: 'province', label: t('common.province'), value: province, onChange: (v) => { setPage(1); setProvince(v); }, options: [{ value: '', label: t('common.allProvinces') }, ...provinceOpts], searchable: true },
          { key: 'type', label: t('common.type'), value: type, onChange: (v) => { setPage(1); setType(v); }, options: typeOptions },
        ]}
        range={{
          label: t('properties.rentMonth'),
          min: 0, max: RENT_MAX, step: RENT_STEP,
          lo: rentMin ? Number(rentMin) : 0,
          hi: rentMax ? Number(rentMax) : RENT_MAX,
          display: (!rentMin && !rentMax)
            ? t('common.allPrices')
            : `฿${bahtFormat(rentMin ? Number(rentMin) : 0)} – ${rentMax ? `฿${bahtFormat(Number(rentMax))}` : `฿${bahtFormat(RENT_MAX)}+`}`,
          active: !!rentMin || !!rentMax,
          onChange: (lo, hi) => { setPage(1); setRentMin(lo <= 0 ? '' : String(lo)); setRentMax(hi >= RENT_MAX ? '' : String(hi)); },
          onClear: () => { setPage(1); setRentMin(''); setRentMax(''); },
        }}
        sort={{ value: sort, onChange: (v) => { setPage(1); setSort(v); }, options: sortOptions }}
      />

      {/* ชิปกรองเจ้าของ (มาจาก owner detail "ดูทั้งหมด") — กดกากบาทล้าง */}
      {ownerFilter && (
        <div className="mt-3">
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-gold/40 bg-gold/10 px-3 py-1.5 text-sm text-gold-dark">
            {t('properties.ownerChip', { name: ownerName || t('properties.thisOwner') })}
            <button onClick={clearFilters} aria-label={t('properties.clearOwnerFilter')} className="ml-0.5 transition hover:text-ink"><Icon name="x" size={14} /></button>
          </span>
        </div>
      )}

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={sorted} cols={cols} keyOf={(p) => p.id} loading={loading} leading={thumb}
          emptyIcon={filtered ? 'search' : 'building'}
          empty={filtered ? t('properties.emptyNoMatch') : t('properties.emptyNone')}
          emptyAction={filtered
            ? <button className="btn-ghost btn-sm" onClick={clearFilters}>{t('common.clearFilters')}</button>
            : addCta}
          onRow={(p) => router.push(`/properties/${p.id}`)} />
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />

      {/* เพิ่มทรัพย์ — กรอบลอยกลางจอ (เหมือนสร้าง Lead/เจ้าของ) ไม่เต็มจอ */}
      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('shell.newProperty')} size="xl">
        <PropertyForm mode="create" onClose={() => setShowNew(false)} />
      </Modal>
    </div>
  );
}

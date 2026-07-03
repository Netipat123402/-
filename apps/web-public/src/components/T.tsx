'use client';

import {
  useLang, type DictKey, typeLabel, amenityLabel,
} from '@/lib/lang';
import { baht } from '@/lib/api';

/** ป้ายข้อความตาม dict — ใช้ฝังในหน้า server ได้ (client comp ยัง SSR เป็น HTML ปกติ) */
export function T({ k }: { k: DictKey }) {
  const { t } = useLang();
  return <>{t(k)}</>;
}

/** ชื่อประเภททรัพย์ + จังหวัด (จังหวัดเป็นข้อมูลไทยจาก DB) */
export function MetaLine({ type, province }: { type: string; province?: string | null }) {
  const { lang } = useLang();
  return <>{typeLabel(type, lang)}{province ? ` · ${province}` : ''}</>;
}

/** แถบสเปก ห้องนอน/ห้องน้ำ/พื้นที่/ชั้น — ป้ายแปลตามภาษา */
export function SpecStrip({
  bedrooms, bathrooms, areaSqm, floor,
}: {
  bedrooms?: number | null; bathrooms?: number | null; areaSqm?: number | null; floor?: string | number | null;
}) {
  const { t } = useLang();
  // ค่าใหญ่ = ตัวเลขล้วน (เท่ากันทุกกล่อง) · หน่วยเป็นตัวเล็กจาง ไม่ให้รก/กวาดสายตาแปลก
  const specs: { label: string; value: string | number; unit?: string }[] = [];
  if (bedrooms != null) specs.push({ label: t('bedrooms'), value: bedrooms });
  if (bathrooms != null) specs.push({ label: t('bathrooms'), value: bathrooms });
  if (areaSqm != null) specs.push({ label: t('area'), value: areaSqm, unit: t('sqmUnit') });
  if (floor) specs.push({ label: t('floor'), value: floor });
  if (specs.length === 0) return null;
  return (
    // แถวเดียวทุกขนาด (มือถือ→เดสก์ท็อป) — กวาดสายตาซ้าย→ขวาครั้งเดียว ไม่แตกเป็น 2×2
    // เส้นแบ่งบางด้วย gap-px บนพื้น bg-border; แต่ละช่อง flex-1 กว้างเท่ากัน
    <div className="mt-5 flex gap-px overflow-hidden rounded-xl2 border border-border bg-border">
      {specs.map((s) => (
        <div key={s.label} className="flex-1 bg-surface px-2 py-3 text-center sm:px-3 sm:py-3.5">
          <p className="text-lg font-semibold leading-none">
            {s.value}{s.unit ? <span className="ml-0.5 text-[11px] font-normal text-muted">{s.unit}</span> : null}
          </p>
          <p className="mt-1 whitespace-nowrap text-xs text-muted">{s.label}</p>
        </div>
      ))}
    </div>
  );
}

/** ป้ายสิ่งอำนวยความสะดวก (รับ map ของ amenities; เลือกเฉพาะที่ค่าเป็น true) */
export function AmenityBadges({ amenities }: { amenities: Record<string, unknown> | null | undefined }) {
  const { lang } = useLang();
  const codes = Object.entries(amenities ?? {}).filter(([, v]) => v === true).map(([k]) => k);
  if (codes.length === 0) return null;
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {codes.map((c) => (
        <span key={c} className="badge border border-border bg-surface text-ink-soft">{amenityLabel(c, lang)}</span>
      ))}
    </div>
  );
}

/** ราคา /เดือน — เด่นด้วยโทนทอง เว้นช่องจากชื่อให้หายใจ */
export function PriceMonthly({ amount }: { amount: number }) {
  const { t } = useLang();
  return (
    <p className="mt-3 text-2xl font-semibold text-gold-dark lg:text-[1.75rem]">
      ฿{baht(amount)} <span className="text-base font-normal text-muted">{t('perMonth')}</span>
    </p>
  );
}

/** จำนวนผลลัพธ์ — TH: "พบ N รายการ" · EN: "Found N results" */
export function ResultCount({ total }: { total: number }) {
  const { t } = useLang();
  return <>{`${t('found')} ${total} ${t('resultsUnit')}`}</>;
}

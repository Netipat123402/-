'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useLang, pick, typeLabel, type Lang } from '@/lib/lang';
import { type PropertyCard, clientApiBase as publicApiBase } from '@/lib/api';
import { Spinner } from '@/components/loaders';
import { Icon } from '@/components/Icon';
import PriceRange from '@/components/PriceRange';
import ProvinceCombobox from '@/components/ProvinceCombobox';
import { useScrollLock } from '@/lib/useScrollLock';

type Opt = { value: string; label: string };

// ประเภท: ป้ายแปลตามภาษา · รถไฟ: ชื่อสากลคงเดิม · ห้องนอน: เลข + หน่วยตามภาษา
const typeOpts = (lang: Lang): Opt[] => [
  { value: 'condo', label: lang === 'en' ? 'Condo' : 'คอนโด' },
  { value: 'house', label: lang === 'en' ? 'House' : 'บ้านเดี่ยว' },
  { value: 'townhome', label: lang === 'en' ? 'Townhome' : 'ทาวน์โฮม' },
  { value: 'apartment', label: lang === 'en' ? 'Apartment' : 'อพาร์ทเมนท์' },
];
const PRICE_MAX = 100000;
const PRICE_STEP = 5000;
const baht = (n: number) => `฿${n.toLocaleString('th-TH')}`;
const TRAINS: Opt[] = [
  { value: 'near_bts', label: 'BTS' },
  { value: 'near_mrt', label: 'MRT' },
  { value: 'near_airport_link', label: 'Airport Link' },
];
const bedOpts = (lang: Lang): Opt[] => {
  const u = lang === 'en' ? 'bed' : 'นอน';
  return [
    { value: '1', label: `1 ${u}` },
    { value: '2', label: `2 ${u}` },
    { value: '3', label: `3+ ${u}` },
  ];
};

function Chips({ options, value, onChange }: { options: Opt[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => {
        const on = value === o.value;
        return (
          <button key={o.value} type="button" onClick={() => onChange(on ? '' : o.value)}
            className={`rounded-lg border px-3 py-1.5 text-sm transition ${
              on ? 'border-ink bg-ink text-white' : 'border-border bg-surface text-ink-soft hover:border-ink/40'
            }`}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

// แถวฟิลด์ (label บน + เนื้อหา) — ต้องอยู่ระดับโมดูล! ถ้านิยามใน render จะสร้าง type ใหม่ทุกครั้ง
// → React remount ลูกทั้งหมด (เคยทำให้ PriceRange ถูก unmount กลางลาก = ลากไม่ต่อเนื่อง)
function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      {children}
    </div>
  );
}

export default function SearchBar({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const sp = useSearchParams();
  const { t, lang } = useLang();

  const [q, setQ] = useState(sp.get('q') ?? '');
  const [type, setType] = useState(sp.get('type') ?? '');
  const [minRent, setMinRent] = useState(sp.get('minRent') ?? '');
  const [maxRent, setMaxRent] = useState(sp.get('maxRent') ?? '');
  const [train, setTrain] = useState(sp.get('train') ?? '');
  const [beds, setBeds] = useState(sp.get('bedrooms') ?? '');
  const [province, setProvince] = useState(sp.get('province') ?? '');
  const [open, setOpen] = useState(false);

  // ตัวกรองบนมือถือ = แผ่นเด้งล่างเต็มความกว้าง (fixed) → ต้องล็อกพื้นหลังกัน pan
  // เดสก์ท็อป (≥sm) = dropdown เล็กชิดขวา → ไม่ล็อก (จะได้เลื่อนหน้าได้ตามปกติ)
  const [isSheet, setIsSheet] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const on = () => setIsSheet(mq.matches);
    on(); mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  useScrollLock(open && isSheet);

  // ค้นหาแนะนำสด (เหมือน admin) — พิมพ์ ≥2 ตัว → โชว์ทรัพย์ที่ตรง คลิกไปหน้ารายละเอียดเลย
  const [sugg, setSugg] = useState<PropertyCard[]>([]);
  const [suggOpen, setSuggOpen] = useState(false);
  const [loadingSugg, setLoadingSugg] = useState(false);
  const suggRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setSugg([]); setLoadingSugg(false); return; }
    setLoadingSugg(true);
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`${publicApiBase()}/public/properties?q=${encodeURIComponent(term)}&limit=6`, { signal: ctrl.signal });
        const json = await res.json();
        setSugg(json.data ?? []);
      } catch { /* ignore (abort/เน็ตล่ม) */ }
      finally { setLoadingSugg(false); }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [q]);

  // ปิด dropdown แนะนำเมื่อคลิกนอกกล่อง
  useEffect(() => {
    if (!suggOpen) return;
    const h = (e: MouseEvent) => { if (suggRef.current && !suggRef.current.contains(e.target as Node)) setSuggOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [suggOpen]);

  const lo = minRent ? Number(minRent) : 0;
  const hi = maxRent ? Number(maxRent) : PRICE_MAX;
  const priceLabel = lo === 0 && hi >= PRICE_MAX ? t('anyPrice')
    : `${baht(lo)} – ${hi >= PRICE_MAX ? `${baht(PRICE_MAX)}+` : baht(hi)}`;
  const activeCount = [type, minRent, maxRent, train, beds, province].filter(Boolean).length;

  function go(e?: React.FormEvent) {
    e?.preventDefault();
    const p = new URLSearchParams();
    if (q.trim()) p.set('q', q.trim());
    if (type) p.set('type', type);
    if (minRent) p.set('minRent', minRent);
    if (maxRent) p.set('maxRent', maxRent);
    if (train) p.set('train', train);
    if (beds) p.set('bedrooms', beds);
    if (province) p.set('province', province);
    setOpen(false);
    setSuggOpen(false);
    router.push(`/properties${p.toString() ? `?${p}` : ''}`);
  }

  // เลือกทรัพย์จากผลแนะนำ → ไปหน้ารายละเอียดเลย
  function pickSuggestion(code: string) {
    setSuggOpen(false);
    router.push(`/properties/${code}`);
  }

  function clearAll() {
    setType(''); setMinRent(''); setMaxRent(''); setTrain(''); setBeds(''); setProvince('');
  }

  // ตั้งค่าช่วงราคา — 0/สุด = ล้างเป็นค่าว่าง (ไม่ส่ง query เกินจำเป็น)
  function setPrice(nlo: number, nhi: number) {
    setMinRent(nlo <= 0 ? '' : String(nlo));
    setMaxRent(nhi >= PRICE_MAX ? '' : String(nhi));
  }

  // รายการฟิลเตอร์ (ใช้ร่วม sheet มือถือ + dropdown เดสก์ท็อป) — R1: 1 บรรทัด 1 กลุ่ม
  const filterFields = (
    <>
      <Row label={t('propertyType')}><Chips options={typeOpts(lang)} value={type} onChange={setType} /></Row>
      <Row label={t('provinceLabel')}>
        <ProvinceCombobox value={province} onChange={setProvince} placeholder={t('provinceLabel')} allLabel={t('allProvinces')} />
      </Row>
      <Row label={`${t('priceRange')} — ${priceLabel}`}>
        <PriceRange min={0} max={PRICE_MAX} step={PRICE_STEP} lo={lo} hi={hi} onChange={setPrice} />
        <div className="mt-1 flex justify-between text-2xs text-muted"><span>฿0</span><span>฿100,000+</span></div>
      </Row>
      <Row label={t('transitStation')}><Chips options={TRAINS} value={train} onChange={setTrain} /></Row>
      <Row label={t('bedrooms')}><Chips options={bedOpts(lang)} value={beds} onChange={setBeds} /></Row>
    </>
  );

  return (
    <div className={`relative ${compact ? '' : 'rounded-xl2 bg-surface p-2.5 shadow-lift'}`}>
      <form onSubmit={go} className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative sm:flex-1" ref={suggRef}>
          <input
            className="field w-full"
            placeholder={t('searchPlaceholder')}
            value={q}
            onChange={(e) => { setQ(e.target.value); setSuggOpen(true); }}
            onFocus={() => { setOpen(false); if (q.trim().length >= 2) setSuggOpen(true); }} />
          {/* ผลแนะนำสด — คลิกไปหน้ารายละเอียดทรัพย์ทันที (ปุ่ม "ค้นหา" ยังพาไปหน้า /properties ตามเดิม) */}
          {suggOpen && !open && q.trim().length >= 2 && (
            <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl2 border border-border bg-surface py-1 text-left shadow-lift">
              {loadingSugg && sugg.length === 0 ? (
                <p className="flex items-center justify-center gap-2 px-3 py-4 text-sm text-muted"><Spinner className="h-4 w-4" /></p>
              ) : sugg.length === 0 ? (
                <p className="px-3 py-4 text-center text-sm text-muted">{t('noResults')}</p>
              ) : (
                <ul className="max-h-80 overflow-y-auto">
                  {sugg.map((p) => (
                    <li key={p.id}>
                      <button type="button" onClick={() => pickSuggestion(p.code)}
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-canvas">
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{p.projectName || pick(p.title, lang)}</span>
                          <span className="block truncate text-xs text-muted">{typeLabel(p.type, lang)}{p.province ? ` · ${p.province}` : ''}</span>
                        </span>
                        <span className="shrink-0 text-sm font-semibold text-gold-dark">{baht(p.monthlyRent)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => { setSuggOpen(false); setOpen((v) => !v); }}
            className={`btn-ghost ${open || activeCount ? 'border-ink' : ''}`}>
            {t('filters')}{activeCount > 0 && <span className="ml-1 text-gold-dark">({activeCount})</span>}
          </button>
          <button type="submit" className="btn-gold flex-1 sm:flex-none">{t('search')}</button>
        </div>
      </form>

      {open && (isSheet ? (
        /* มือถือ = bottom-sheet: สูงคงที่ ~82vh · หัว(ที่จับ+ชื่อ+ปิด)ตรึง · ท้าย(ปุ่ม)ตรึง · เฉพาะรายการเลื่อน */
        <>
          <div className="fixed inset-0 z-40 bg-ink/40 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
          <div className="fixed inset-x-0 bottom-0 z-50 flex max-h-[82vh] flex-col rounded-t-xl2 border-t border-border bg-surface shadow-lift"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} role="dialog" aria-modal="true" aria-label={t('filters')}>
            <div className="mx-auto mt-2.5 h-1 w-9 shrink-0 rounded-full bg-border" />
            <div className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3">
              <h3 className="font-semibold">{t('filters')}</h3>
              <button type="button" onClick={() => setOpen(false)} aria-label="ปิด"
                className="flex h-8 w-8 items-center justify-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"><Icon name="x" size={18} /></button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">{filterFields}</div>
            <div className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-3">
              <button type="button" onClick={clearAll}
                className="rounded-full border border-gold/45 px-4 py-2.5 text-sm font-medium text-gold-dark transition hover:bg-gold/5">
                {t('clearFilters')}
              </button>
              <button type="button" className="btn-gold flex-1" onClick={() => go()}>{t('applyFilters')}</button>
            </div>
          </div>
        </>
      ) : (
        /* เดสก์ท็อป = dropdown เล็กชิดขวาปุ่ม */
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-50 mt-2 w-[340px] rounded-xl2 border border-border bg-surface p-4 shadow-lift">
            <div className="space-y-4">{filterFields}</div>
            <div className="mt-5 flex items-center justify-between">
              <button type="button" onClick={clearAll}
                className="rounded-lg border border-gold/45 px-3.5 py-2 text-sm font-medium text-gold-dark transition hover:bg-gold/5">
                {t('clearFilters')}
              </button>
              <button type="button" className="btn-gold btn-sm" onClick={() => go()}>{t('applyFilters')}</button>
            </div>
          </div>
        </>
      ))}
    </div>
  );
}

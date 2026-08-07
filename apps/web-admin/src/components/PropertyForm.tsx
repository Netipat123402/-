'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useSearchLookup } from '@/lib/lookups';
import { Combobox, SectionLabel } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface Master { code: string; labelTh: string }
interface Owner { id: string; fullName: string }

export interface PropertyInitial {
  id?: string;
  status?: string; // Phase 4: ถ้า available → เตือนว่าแก้แล้วเด้งกลับรอตรวจสอบ
  propertyType?: string; ownerId?: string;
  owner?: { id: string; fullName: string }; // แก้ทรัพย์: เจ้าของเดิมอาจไม่อยู่ในผลค้นหาเริ่มต้น (ต้องโชว์ชื่อได้แม้ field ถูก disable)
  titleTh?: string; titleEn?: string; descriptionTh?: string;
  monthlyRent?: number | string; depositMonths?: number; bedrooms?: number; bathrooms?: number;
  areaSqm?: number | string; floor?: string; furnished?: string;
  province?: string; district?: string; projectName?: string;
  amenities?: Record<string, boolean>;
}

// labels → i18n (propertyForm.furnish.* / .steps.* / .amenityGroup.*) แปลตอน render
const FURNISHED = ['fully', 'partial', 'unfurnished'] as const;
const STEP_KEYS = ['main', 'location', 'priceRooms', 'amenities'] as const;

// จัดกลุ่มสิ่งอำนวยความสะดวก (title = key แปลตอน render · code นอกกลุ่ม → 'other' อัตโนมัติ)
const AMENITY_GROUPS: { title: string; codes: string[] }[] = [
  { title: 'common', codes: ['pool', 'gym', 'sauna', 'garden', 'co_working', 'playground'] },
  { title: 'security', codes: ['security', 'cctv', 'keycard'] },
  { title: 'transport', codes: ['parking', 'near_bts', 'near_mrt', 'shuttle'] },
];

export default function PropertyForm({ initial, mode, onClose, onSaved }: { initial?: PropertyInitial; mode: 'create' | 'edit'; onClose?: () => void; onSaved?: (id: string) => void }) {
  const t = useTranslations();
  const { api } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState<Master[]>([]);
  const [provinces, setProvinces] = useState<Master[]>([]);
  const [amenityOpts, setAmenityOpts] = useState<Master[]>([]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState(false); // โหลด master-data ล้มเหลว (มักเพราะ session หมดอายุ)
  const [step, setStep] = useState(0);
  const [fe, setFe] = useState<{ ownerId?: string; titleTh?: string; monthlyRent?: string }>({});
  // ค้นหาเจ้าของฝั่ง server (MR-24 pattern) — รองรับเจ้าของ >100 ราย (เดิม limit=100 ตัดรายที่ 101+ ทิ้งเงียบๆ)
  const owners = useSearchLookup<Owner>('/owners', (o) => ({ value: o.id, label: o.fullName }), true);
  // แก้ทรัพย์: เจ้าของเดิม (จาก initial) อาจไม่อยู่ในผลค้นหาเริ่มต้น (top 20) → แทรกเข้าไปให้แสดงชื่อถูกเสมอ
  const ownerOptions = initial?.owner && !owners.options.some((o) => o.value === initial.owner!.id)
    ? [{ value: initial.owner.id, label: initial.owner.fullName }, ...owners.options]
    : owners.options;

  const [f, setF] = useState<PropertyInitial>({
    propertyType: 'condo', ownerId: '', titleTh: '', titleEn: '', descriptionTh: '',
    monthlyRent: '', depositMonths: 2, bedrooms: 1, bathrooms: 1, areaSqm: '',
    floor: '', furnished: 'fully', province: '', district: '', projectName: '',
    amenities: {}, ...initial,
  });
  function set<K extends keyof PropertyInitial>(k: K, v: PropertyInitial[K]) {
    setF((s) => ({ ...s, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }

  const loadData = useCallback(async () => {
    setLoadErr(false);
    try {
      const m = await api<Record<string, Master[]>>('/public/master-data');
      setTypes(m.data.property_type ?? []);
      setProvinces(m.data.province ?? []);
      setAmenityOpts(m.data.amenity ?? []);
    } catch {
      // เดิม catch เงียบ → dropdown จังหวัด/ตัวเลือกว่างโดยไม่บอก = ดูเหมือน "พัง"
      setLoadErr(true);
    }
  }, [api]);

  useEffect(() => { loadData(); }, [loadData]);

  // ตรวจ error เฉพาะของแต่ละสเต็ป
  function stepErrors(s: number) {
    const v: typeof fe = {};
    if (s === 0) {
      if (mode === 'create' && !f.ownerId) v.ownerId = t('propertyForm.v.owner');
      if (!f.titleTh?.trim()) v.titleTh = t('propertyForm.v.title');
    } else if (s === 2) {
      if (!(Number(f.monthlyRent) > 0)) v.monthlyRent = t('propertyForm.v.rent');
    }
    return v;
  }

  function next() {
    const v = stepErrors(step);
    if (Object.keys(v).length) { setFe(v); return; }
    setStep((s) => Math.min(STEP_KEYS.length - 1, s + 1));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (step < STEP_KEYS.length - 1) { next(); return; }
    const v = { ...stepErrors(0), ...stepErrors(2) };
    if (Object.keys(v).length) { setFe(v); setStep((v.ownerId || v.titleTh) ? 0 : 2); return; }
    setErr(''); setSaving(true);
    const body = {
      propertyType: f.propertyType, ownerId: f.ownerId || undefined,
      titleTh: f.titleTh, titleEn: f.titleEn || undefined, descriptionTh: f.descriptionTh || undefined,
      monthlyRent: Number(f.monthlyRent),
      depositMonths: f.depositMonths ? Number(f.depositMonths) : undefined,
      bedrooms: f.bedrooms != null ? Number(f.bedrooms) : undefined,
      bathrooms: f.bathrooms != null ? Number(f.bathrooms) : undefined,
      areaSqm: f.areaSqm ? Number(f.areaSqm) : undefined,
      floor: f.floor || undefined, furnished: f.furnished || undefined,
      province: f.province || undefined, district: f.district || undefined,
      projectName: f.projectName || undefined, amenities: f.amenities,
    };
    try {
      if (mode === 'create') {
        const r = await api<{ id: string }>('/properties', { method: 'POST', body: JSON.stringify(body) });
        if (onSaved) onSaved(r.data.id); else router.push(`/properties/${r.data.id}`);
      } else {
        const { ownerId, ...rest } = body;
        await api(`/properties/${initial!.id}`, { method: 'PATCH', body: JSON.stringify(rest) });
        if (onSaved) onSaved(initial!.id!); else router.push(`/properties/${initial!.id}`);
      }
    } catch (e2) {
      setErr((e2 as { message?: string; details?: unknown }).message || t('propertyForm.v.saveFailed'));
      setSaving(false);
    }
  }

  function toggleAmenity(code: string) {
    setF((s) => ({ ...s, amenities: { ...s.amenities, [code]: !s.amenities?.[code] } }));
  }

  const Label = ({ children }: { children: React.ReactNode }) =>
    <span className="mb-1.5 block text-sm font-medium text-ink-soft">{children}</span>;

  // ตัวเลือกแบบโชว์ทั้งหมด (PDF น.57) · wrap = responsive
  const ChipGroup = ({ options, value, onChange }: {
    options: { code: string; labelTh: string }[]; value?: string; onChange: (v: string) => void;
  }) => (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button type="button" key={o.code} onClick={() => onChange(o.code)}
          className={`rounded-lg border px-3 py-2 text-sm transition ${
            value === o.code ? 'border-gold bg-gold/15 text-gold-dark' : 'border-border bg-surface text-ink-soft hover:border-ink/40'
          }`}>
          {o.labelTh}
        </button>
      ))}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* ตัวบอกขั้นตอน (PDF น.19 — ฟอร์มยาวแบ่งสเต็ป + โชว์ progress) */}
      <div className="flex items-center gap-1">
        {STEP_KEYS.map((key, i) => (
          <button type="button" key={key} onClick={() => setStep(i)}
            className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left transition ${i === step ? 'bg-canvas' : ''}`}>
            <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
              i === step ? 'bg-gold text-[#1c1b18]' : i < step ? 'bg-gold/30 text-gold-dark' : 'bg-canvas text-muted ring-1 ring-border'
            }`}>
              {i < step ? <Icon name="check" size={15} /> : i + 1}
            </span>
            <span className={`hidden truncate text-sm sm:inline ${i === step ? 'font-medium text-ink' : 'text-muted'}`}>{t(`propertyForm.steps.${key}`)}</span>
          </button>
        ))}
      </div>

      {loadErr && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
          <span>{t('propertyForm.loadErr')}</span>
          <button type="button" onClick={loadData} className="shrink-0 font-medium underline">{t('common.retry')}</button>
        </div>
      )}

      {/* Phase 4: แก้ทรัพย์ที่เผยแพร่อยู่ → เด้งกลับรอตรวจสอบ + ซ่อนจากเว็บจนอนุมัติใหม่ */}
      {mode === 'edit' && initial?.status === 'available' && (
        <div className="flex items-start gap-2.5 rounded-lg border border-warning/40 bg-warning/10 px-3.5 py-2.5 text-sm text-warning">
          <Icon name="alert-triangle" size={16} className="mt-0.5 shrink-0" />
          <span>{t.rich('propertyForm.liveWarning', { b: (c) => <b className="font-medium">{c}</b> })}</span>
        </div>
      )}

      {step === 0 && (
        <div className="card p-5">
          <h2 className="mb-4 font-semibold sm:hidden">{t('propertyForm.steps.main')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2"><Label>{t('propertyForm.type')} *</Label>
              <ChipGroup options={types.length ? types : [{ code: 'condo', labelTh: t('propertyType.condo') }]} value={f.propertyType} onChange={(v) => set('propertyType', v)} />
            </div>
            <div className="sm:col-span-2">
              <Combobox label={`${t('propertyForm.owner')}${mode === 'create' ? ' *' : ''}`} placeholder={t('propertyForm.ownerPlaceholder')} error={fe.ownerId}
                disabled={mode === 'edit'} value={f.ownerId ?? ''} onChange={(v) => set('ownerId', v)}
                options={ownerOptions} onSearch={owners.setQuery} loading={owners.loading}
                loadError={owners.error} onRetry={owners.reload} />
            </div>
            <label className="sm:col-span-2"><Label>{t('propertyForm.titleTh')} *</Label>
              <input className={`field ${fe.titleTh ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`} placeholder={t('propertyForm.titlePlaceholder')} value={f.titleTh} onChange={(e) => set('titleTh', e.target.value)} />
              {fe.titleTh && <span className="mt-1 block text-xs text-danger">{fe.titleTh}</span>}
            </label>
            <label className="sm:col-span-2"><Label>{t('propertyForm.titleEn')}</Label>
              <input className="field" placeholder="e.g. The Base Sukhumvit — 1BR City View" value={f.titleEn} onChange={(e) => set('titleEn', e.target.value)} />
            </label>
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="card p-5">
          <h2 className="mb-4 font-semibold sm:hidden">{t('propertyForm.steps.location')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><Label>{t('propertyForm.project')}</Label>
              <input className="field" placeholder={t('propertyForm.projectPlaceholder')} value={f.projectName} onChange={(e) => set('projectName', e.target.value)} />
            </label>
            <Combobox label={t('common.province')} value={f.province ?? ''} onChange={(v) => set('province', v)}
              options={provinces.map((p) => ({ value: p.labelTh, label: p.labelTh }))} />
            <label><Label>{t('propertyForm.district')}</Label>
              <input className="field" value={f.district} onChange={(e) => set('district', e.target.value)} />
            </label>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card space-y-5 p-5">
          <h2 className="font-semibold sm:hidden">{t('propertyForm.steps.priceRooms')}</h2>
          {/* กลุ่ม 1 — ราคา (แยกจาก "ห้อง" ตาม §10 · หัวข้อไม่มีไอคอน §10b) */}
          <div className="space-y-3">
            <SectionLabel>{t('propertyForm.price')}</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><Label>{t('propertyForm.rent')} *</Label>
                <input className={`field ${fe.monthlyRent ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`} type="number" placeholder={t('propertyForm.rentPlaceholder')} value={f.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} />
                {fe.monthlyRent && <span className="mt-1 block text-xs text-danger">{fe.monthlyRent}</span>}
              </label>
              <label><Label>{t('propertyForm.deposit')}</Label>
                <input className="field" type="number" value={f.depositMonths ?? ''} onChange={(e) => set('depositMonths', Number(e.target.value))} />
              </label>
            </div>
          </div>
          {/* กลุ่ม 2 — ห้อง & พื้นที่ (ชั้น ย้ายมาจาก "ทำเล" ให้ตรงกลุ่มหน้า detail) */}
          <div className="space-y-3">
            <SectionLabel>{t('propertyDetail.roomsArea')}</SectionLabel>
            <div className="grid gap-4 sm:grid-cols-3">
              <label><Label>{t('propertyDetail.bedrooms')}</Label>
                <input className="field" type="number" value={f.bedrooms ?? ''} onChange={(e) => set('bedrooms', Number(e.target.value))} />
              </label>
              <label><Label>{t('propertyDetail.bathrooms')}</Label>
                <input className="field" type="number" value={f.bathrooms ?? ''} onChange={(e) => set('bathrooms', Number(e.target.value))} />
              </label>
              <label><Label>{t('propertyForm.areaSqm')}</Label>
                <input className="field" type="number" value={f.areaSqm} onChange={(e) => set('areaSqm', e.target.value)} />
              </label>
              <label><Label>{t('propertyDetail.floor')}</Label>
                <input className="field" value={f.floor} onChange={(e) => set('floor', e.target.value)} />
              </label>
              <div className="sm:col-span-3"><Label>{t('propertyDetail.furnishing')}</Label>
                <ChipGroup options={FURNISHED.map((c) => ({ code: c, labelTh: t(`propertyForm.furnish.${c}`) }))} value={f.furnished} onChange={(v) => set('furnished', v)} />
              </div>
            </div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card space-y-5 p-5">
          <h2 className="font-semibold sm:hidden">{t('propertyForm.steps.amenities')}</h2>
          {(() => {
            const known = new Set(AMENITY_GROUPS.flatMap((g) => g.codes));
            const buckets = AMENITY_GROUPS.map((g) => ({ title: g.title, items: amenityOpts.filter((a) => g.codes.includes(a.code)) }));
            const others = amenityOpts.filter((a) => !known.has(a.code));
            if (others.length) buckets.push({ title: 'other', items: others });
            return buckets.filter((b) => b.items.length > 0).map((b) => (
              <div key={b.title}>
                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{t(`propertyForm.amenityGroup.${b.title}`)}</p>
                <div className="flex flex-wrap gap-2">
                  {b.items.map((a) => (
                    <button type="button" key={a.code} onClick={() => toggleAmenity(a.code)}
                      className={`rounded-lg px-3 py-1.5 text-sm transition ${
                        f.amenities?.[a.code] ? 'bg-gold text-[#1c1b18]' : 'border border-border bg-surface text-ink-soft hover:bg-raised'
                      }`}>
                      {a.labelTh}
                    </button>
                  ))}
                </div>
              </div>
            ));
          })()}
          <label className="block border-t border-border pt-4"><Label>{t('propertyForm.description')}</Label>
            <textarea className="field h-auto py-2.5" rows={4} placeholder={t('propertyForm.descPlaceholder')} value={f.descriptionTh} onChange={(e) => set('descriptionTh', e.target.value)} />
          </label>
          {mode === 'create' && <p className="text-sm text-muted">{t('propertyForm.createHint')}</p>}
        </div>
      )}

      {err && <p className="text-sm text-danger">{err}</p>}

      <div className="flex items-center justify-between gap-2">
        <button type="button" className="btn-ghost" onClick={() => (step === 0 ? (onClose ? onClose() : router.back()) : setStep((s) => s - 1))}>
          {step === 0 ? t('common.cancel') : t('common.back')}
        </button>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted">{t('propertyForm.stepOf', { n: step + 1, total: STEP_KEYS.length })}</span>
          <button type="submit" className="btn-gold" disabled={saving}>
            {step < STEP_KEYS.length - 1 ? t('propertyForm.next') : saving ? t('propertyForm.saving') : mode === 'create' ? t('propertyForm.create') : t('propertyForm.saveEdit')}
          </button>
        </div>
      </div>
    </form>
  );
}

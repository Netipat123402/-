'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { DetailHeader, Field, InfoGroup, InfoRow, Modal, PhoneLink, RailBlock, SectionLabel, StatusBadge } from '@/components/ui';
import DocumentSection from '@/components/DocumentSection';
import { PROPERTY_STATUS, CONTRACT_STATUS, bahtFormat } from '@/lib/status';
import { formatPhone } from '@/lib/format';

interface PropLite { id: string; code: string; titleTh: string; status: string; monthlyRent: string; }
interface ContractLite { id: string; code: string; status: string; }
interface Owner {
  id: string; fullName: string; phone?: string; email?: string;
  address?: string; note?: string; idCardNo?: string | null;
  properties?: PropLite[]; contracts?: ContractLite[];
}

export default function OwnerDetailPage() {
  const t = useTranslations();
  const { api, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [o, setO] = useState<Owner | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Owner>({ id: '', fullName: '' });
  const [idCardInput, setIdCardInput] = useState(''); // เลขบัตรใหม่ (ว่าง = ไม่เปลี่ยน) — ไม่ prefill ค่า mask
  const [saving, setSaving] = useState(false);
  const [revealedId, setRevealedId] = useState<string | null>(null); // Phase 6: เลขบัตรเต็ม (เปิดดูแล้ว)

  // Phase 6: เปิดดูเลขบัตรเต็ม (เจ้าของเท่านั้น · บันทึก audit ที่ backend)
  async function revealIdCard() {
    try { const r = await api<{ idCardNo: string | null }>(`/owners/${id}/idcard`); setRevealedId(r.data.idCardNo || '—'); }
    catch { toast.error(t('owners.toastRevealFailed')); }
  }

  function startEdit() { if (o) setForm(o); setIdCardInput(''); setEdit(true); }
  function closeEdit() { setEdit(false); if (o) setForm(o); setIdCardInput(''); }

  useEffect(() => {
    (async () => {
      try { const r = await api<Owner>(`/owners/${id}`); setO(r.data); setForm(r.data); }
      catch { setO(null); } finally { setLoading(false); }
    })();
  }, [api, id]);

  async function save() {
    setSaving(true);
    try {
      const r = await api<Owner>(`/owners/${id}`, { method: 'PATCH', body: JSON.stringify({
        fullName: form.fullName, phone: form.phone || undefined, email: form.email || undefined,
        address: form.address || undefined, note: form.note || undefined,
        idCardNo: idCardInput.trim() || undefined, // ส่งเฉพาะเมื่อกรอกใหม่ (undefined = ไม่แตะค่าเดิม)
      }) });
      // PATCH ไม่คืน relations → คงทรัพย์/สัญญาเดิมไว้
      setO((prev) => ({ ...r.data, properties: prev?.properties, contracts: prev?.contracts }));
      setEdit(false); toast.success(t('common.saved'));
    } catch (e) { toast.error((e as { message?: string }).message || t('common.saveFailed')); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!o) return <div className="mx-auto max-w-3xl text-center text-muted">{t('owners.notFound')} <Link href="/owners" className="text-gold-dark underline">{t('common.back')}</Link></div>;

  const props = o.properties ?? [];
  const contracts = o.contracts ?? [];
  // พอร์ต (occupancy-first แบบ property-management SaaS): ทรัพย์ทั้งหมด · เช่าอยู่ · รายได้เช่าจากหลังที่ปล่อยแล้ว (rent roll)
  const rented = props.filter((p) => p.status === 'rented').length;
  const rentRoll = props.filter((p) => p.status === 'rented').reduce((s, p) => s + Number(p.monthlyRent ?? 0), 0);
  const dirty = form.fullName !== o.fullName || (form.phone ?? '') !== (o.phone ?? '')
    || (form.email ?? '') !== (o.email ?? '') || (form.address ?? '') !== (o.address ?? '')
    || (form.note ?? '') !== (o.note ?? '') || idCardInput.trim() !== '';

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      {/* HEADER = ชื่อ + เบอร์ (แม่แบบ DetailHeader เดียวกับลูกค้า/สัญญา) */}
      <DetailHeader
        backHref="/owners"
        title={o.fullName}
        subtitle={<span>{o.phone ? <PhoneLink phone={o.phone} className="text-sm text-muted" /> : t('owners.roleLabel')}{o.phone && <span className="text-muted"> · {t('owners.roleLabel')}</span>}</span>}
      />

      {/* main + ราง (เลิกแท็บ) — เนื้อหลัก(พอร์ต/ระบุตัวตน/โน้ต/เอกสาร) + รางพอร์ต (คอม=ขวา sticky · iPad=แถบบน · มือถือ=การ์ดบน) */}
      <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* รางพอร์ต — สถิติ(กึ่งกลาง) + ติดต่อ(label-value) + แก้ไข */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 xl:flex-col xl:items-stretch xl:gap-3">
              {/* สถิติพอร์ต — กึ่งกลาง (กฎ §8) */}
              <div className="flex shrink-0 text-center">
                <div className="flex-1 px-3">
                  <div className="text-lg font-semibold tabular-nums text-ink">{props.length}</div>
                  <div className="text-xs text-muted">{t('owners.statProperties')}</div>
                </div>
                <div className="flex-1 border-l border-border px-3">
                  <div className="text-lg font-semibold tabular-nums text-ink">{rented}</div>
                  <div className="text-xs text-muted">{t('owners.statRenting')}</div>
                </div>
                {rentRoll > 0 && (
                  <div className="flex-1 border-l border-border px-3">
                    <div className="text-lg font-semibold tabular-nums text-gold-dark">฿{bahtFormat(rentRoll)}</div>
                    <div className="text-xs text-muted">{t('owners.statIncome')}</div>
                  </div>
                )}
              </div>
              {/* ติดต่อ — label-value ราง (กฎ §8) */}
              <div className="border-t border-border pt-3 text-sm sm:flex-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-3">
                <div className="divide-y divide-border/60">
                  {o.phone && <div className="grid grid-cols-[3.5rem_1fr] gap-3 py-2"><span className="text-faint">{t('common.phone')}</span><PhoneLink phone={o.phone} className="text-ink" /></div>}
                  {o.email && <div className="grid grid-cols-[3.5rem_1fr] gap-3 py-2"><span className="text-faint">{t('common.email')}</span><span className="truncate text-ink">{o.email}</span></div>}
                  {o.address && <div className="grid grid-cols-[3.5rem_1fr] gap-3 py-2"><span className="text-faint">{t('common.address')}</span><span className="text-ink">{o.address}</span></div>}
                  {!o.phone && !o.email && !o.address && <p className="py-2 text-faint">{t('owners.noContact')}</p>}
                </div>
              </div>
              {can('owner', 'update') && <button className="btn-ghost w-full shrink-0 sm:w-auto xl:w-full" onClick={startEdit}>{t('owners.editData')}</button>}
            </div>
          </div>
        </div>

        {/* เนื้อหลัก */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          {/* ทรัพย์ในพอร์ต = asset หลักของ landlord → เนื้อแรก */}
          <InfoGroup label={t('owners.portfolio')} className="mb-4"
            action={props.length > 0 ? <span className="text-xs text-muted">{t('common.itemCount', { n: props.length })}</span> : undefined}>
            {props.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">{t('owners.emptyPortfolio')}</p>
            ) : (
              <RailBlock className="py-1">
                <div className="divide-y divide-border/60">
                  {props.slice(0, 6).map((p) => (
                    <button key={p.id} onClick={() => router.push(`/properties/${p.id}`)}
                      className="group flex w-full items-center gap-3 py-2.5 text-left outline-none transition hover:bg-raised/60 focus-visible:bg-raised focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gold">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-ink">{p.titleTh}</p>
                        <p className="font-mono text-[11px] text-faint">{p.code}</p>
                      </div>
                      <span className="shrink-0 text-sm tabular-nums text-gold-dark">฿{bahtFormat(Number(p.monthlyRent))}</span>
                      <StatusBadge map={PROPERTY_STATUS} value={p.status} short outline />
                    </button>
                  ))}
                  {/* ทรัพย์เยอะ → ไปหน้า list กรองเจ้าของ (ค้นหา/กรอง/จัดการได้เต็ม) แทนลิสต์ยาวรูดจอ */}
                  {props.length > 6 && (
                    <button onClick={() => router.push(`/properties?owner=${o.id}&ownerName=${encodeURIComponent(o.fullName)}`)}
                      className="flex w-full items-center justify-center py-3 text-sm text-gold-dark transition hover:underline">
                      {t('owners.viewAllProps', { n: props.length })}
                    </button>
                  )}
                </div>
              </RailBlock>
            )}
          </InfoGroup>

          {/* สัญญาที่เจ้าของเป็นคู่สัญญา (มีก็ต่อเมื่อมีจริง) */}
          {contracts.length > 0 && (
            <InfoGroup label={t('nav.contracts')} className="mb-4">
              {contracts.map((c) => (
                <InfoRow key={c.id} onClick={() => router.push(`/contracts/${c.id}`)} hideChevron
                  label={<span className="font-mono text-xs">{c.code}</span>}
                  value={<StatusBadge map={CONTRACT_STATUS} value={c.status} short outline />} />
              ))}
            </InfoGroup>
          )}

          {/* ระบุตัวตน — view/edit parity (ว่าง = —) · PII: mask ทุกคน · เจ้าของกด "แสดงเลขเต็ม" (audit) */}
          <InfoGroup label={t('owners.identity')} className="mb-4">
            <InfoRow label={t('common.idCard')} mono value={o.idCardNo ? (
              <span className="inline-flex items-center gap-2.5">
                {revealedId ?? o.idCardNo}
                {revealedId !== null
                  ? <button type="button" className="font-sans text-xs text-muted transition hover:text-ink" onClick={() => setRevealedId(null)}>{t('owners.idHide')}</button>
                  : can('owner', 'reveal_pii') && <button type="button" className="font-sans text-xs text-gold-dark transition hover:underline" onClick={revealIdCard}>{t('owners.idReveal')}</button>}
              </span>
            ) : undefined} />
          </InfoGroup>

          {/* โน้ตภายใน */}
          <InfoGroup label={t('owners.internalNote')} className="mb-4">
            <InfoRow label={t('common.note')} stack value={o.note || undefined} />
          </InfoGroup>

          {/* เอกสาร */}
          <section className="scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>{t('common.documents')}</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><DocumentSection entityType="owner" entityId={o.id} /></div>
          </section>
        </div>
      </div>

      {/* แก้ไขข้อมูล (modal) — จัด 3 หมวด (§10) ตรงกับ cluster หน้า detail · หัวข้อไม่มีไอคอน (§10b) */}
      <Modal open={edit} onClose={closeEdit} title={t('owners.editTitle')} confirmOnClose={dirty}>
        <div className="space-y-5">
          {/* หมวด 1 — ข้อมูลติดต่อ */}
          <div className="space-y-3">
            <SectionLabel>{t('owners.contact')}</SectionLabel>
            <Field label={t('common.fullName')} placeholder={t('owners.namePlaceholder')} value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Field label={t('common.phone')} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} />
            <Field label={t('common.email')} type="email" placeholder="name@email.com" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('common.address')}</span>
              <textarea className="field h-auto py-2.5" rows={2} placeholder={t('owners.addressPlaceholder')} value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
          </div>
          {/* หมวด 2 — ระบุตัวตน */}
          <div className="space-y-3">
            <SectionLabel>{t('owners.identity')}</SectionLabel>
            <Field label={t('common.idCard')} inputMode="numeric"
              hint={o.idCardNo ? t('owners.idHintCurrent', { id: o.idCardNo }) : t('owners.idHintEmpty')}
              placeholder={t('owners.idCardPlaceholder')} value={idCardInput} onChange={(e) => setIdCardInput(e.target.value)} />
          </div>
          {/* หมวด 3 — โน้ตภายใน */}
          <div className="space-y-3">
            <SectionLabel>{t('owners.internalNote')}</SectionLabel>
            <label className="block"><span className="sr-only">{t('common.note')}</span>
              <textarea className="field h-auto py-2.5" rows={2} placeholder={t('owners.notePlaceholder')} value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
            </label>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={closeEdit}>{t('common.cancel')}</button>
            <button className="btn-gold" disabled={saving} onClick={save}>{saving ? t('common.saving') : t('common.save')}</button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

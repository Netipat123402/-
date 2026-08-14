'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { PROPERTY_REQUEST_STATUS, PROPERTY_TYPE, bahtFormat } from '@/lib/status';
import { fmtDateCompact, formatPhone } from '@/lib/format';
import { DetailHeader, Field, InfoGroup, InfoRow, Modal, PhoneLink, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface ReqDetail {
  id: string; code: string; titleTh: string; status: string;
  propertyType?: string; province?: string; district?: string;
  expectedRent?: string; bedrooms?: number; bathrooms?: number; note?: string;
  ownerName?: string; ownerPhone?: string; ownerConsent?: boolean;
  reviewNote?: string; createdAt?: string;
  submittedBy?: { id: string; fullName: string };
  convertedProperty?: { id: string; code: string; status: string };
}

export default function PropertyRequestDetailPage() {
  const t = useTranslations();
  const { api, can, user } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [req, setReq] = useState<ReqDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState('');
  const [modal, setModal] = useState<'reject' | 'info' | 'edit' | null>(null);
  const [form, setForm] = useState({ titleTh: '', propertyType: '', province: '', district: '', expectedRent: '', bedrooms: '', bathrooms: '', note: '', ownerName: '', ownerPhone: '' });

  const load = useCallback(async () => {
    try { const r = await api<ReqDetail>(`/property-requests/${id}`); setReq(r.data); }
    catch { setReq(null); } finally { setLoading(false); }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>, ok: string, back?: boolean) {
    setBusy(true);
    try { await fn(); toast.success(ok); if (back) router.push('/property-requests'); else await load(); }
    catch (e) { toast.error((e as { message?: string }).message || t('common.actionFailed')); }
    finally { setBusy(false); }
  }
  const convert = () => act(async () => {
    const r = await api<{ id: string }>(`/property-requests/${id}/convert`, { method: 'POST', body: '{}' });
    router.push(`/properties/${r.data.id}`);
  }, t('propReq.toastConverted'));
  const submitReason = (kind: 'reject' | 'info') => {
    if (!reason.trim()) return;
    const path = kind === 'reject' ? 'reject' : 'request-info';
    const msg = kind === 'reject' ? t('propReq.toastRejected') : t('propReq.toastSentBack');
    setModal(null);
    act(() => api(`/property-requests/${id}/${path}`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }), msg).then(() => setReason(''));
  };
  const withdraw = () => act(() => api(`/property-requests/${id}/withdraw`, { method: 'POST', body: '{}' }), t('propReq.toastWithdrawn'), true);

  function openEdit() {
    if (!req) return;
    setForm({
      titleTh: req.titleTh, propertyType: req.propertyType ?? '', province: req.province ?? '', district: req.district ?? '',
      expectedRent: req.expectedRent ? String(Number(req.expectedRent)) : '', bedrooms: req.bedrooms ? String(req.bedrooms) : '', bathrooms: req.bathrooms ? String(req.bathrooms) : '',
      note: req.note ?? '', ownerName: req.ownerName ?? '', ownerPhone: req.ownerPhone ?? '',
    });
    setModal('edit');
  }
  const setF = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));
  function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.titleTh.trim()) return;
    setModal(null);
    act(() => api(`/property-requests/${id}`, { method: 'PATCH', body: JSON.stringify({
      titleTh: form.titleTh.trim(), propertyType: form.propertyType || undefined,
      province: form.province || undefined, district: form.district || undefined,
      expectedRent: form.expectedRent ? Number(form.expectedRent) : undefined,
      bedrooms: form.bedrooms ? Number(form.bedrooms) : undefined, bathrooms: form.bathrooms ? Number(form.bathrooms) : undefined,
      note: form.note || undefined, ownerName: form.ownerName || undefined, ownerPhone: form.ownerPhone || undefined,
    }) }), req?.status === 'needs_info' ? t('propReq.toastResubmitted') : t('common.saved'));
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!req) return <div className="mx-auto max-w-3xl text-center text-muted">{t('propReq.notFound')} <Link href="/property-requests" className="text-gold-dark underline">{t('common.back')}</Link></div>;

  const isReviewer = can('property_request', 'convert');
  const isMine = req.submittedBy?.id === user?.id;
  const open = req.status === 'pending' || req.status === 'needs_info';
  const loc = [req.province, req.district].filter(Boolean).join(' · ');
  const rooms = [req.bedrooms != null ? t('propReq.roomsBed', { n: req.bedrooms }) : null, req.bathrooms != null ? t('propReq.roomsBath', { n: req.bathrooms }) : null].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/property-requests"
        code={req.code}
        statusMap={PROPERTY_REQUEST_STATUS}
        statusValue={req.status}
        title={req.titleTh}
        subtitle={<>{t('propReq.submittedBy', { name: req.submittedBy?.fullName ?? '—' })}{req.createdAt ? ` · ${fmtDateCompact(req.createdAt)}` : ''}</>}
      />

      <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* ราง = สถานะ + ปุ่มตามบทบาท */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            <div className="text-center">
              <StatusBadge map={PROPERTY_REQUEST_STATUS} value={req.status} outline />
            </div>

            {/* ผู้จัดการ/เจ้าของ — ตรวจคำขอที่ยังเปิด */}
            {isReviewer && open && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button className="btn-gold btn-sm" disabled={busy} onClick={convert}>{t('propReq.convertBtn')}</button>
                <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { setReason(''); setModal('info'); }}>{t('propReq.infoBtn')}</button>
                <button className="mt-1 text-xs text-muted transition hover:text-danger" disabled={busy} onClick={() => { setReason(''); setModal('reject'); }}>{t('propReq.rejectBtn')}</button>
              </div>
            )}

            {/* เซลเจ้าของคำขอ — แก้ไข/ถอน (ตอนยังเปิด) */}
            {!isReviewer && isMine && open && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button className="btn-gold btn-sm" disabled={busy} onClick={openEdit}>{req.status === 'needs_info' ? t('propReq.editResubmit') : t('propReq.editBtn')}</button>
                <button className="mt-1 text-xs text-muted transition hover:text-danger" disabled={busy} onClick={withdraw}>{t('propReq.withdrawBtn')}</button>
              </div>
            )}

            {/* แปลงเป็นทรัพย์แล้ว — ลิงก์ไปทรัพย์ (ร่าง) ที่สร้าง */}
            {req.convertedProperty && (
              <Link href={`/properties/${req.convertedProperty.id}`} className="mt-3 block rounded-lg border border-border py-2 text-center text-sm text-gold-dark transition hover:bg-raised">
                {t('propReq.viewCreated', { code: req.convertedProperty.code })}
              </Link>
            )}

            {/* เหตุผล needs_info / rejected */}
            {req.reviewNote && (req.status === 'needs_info' || req.status === 'rejected') && (
              <div className="mt-3 rounded-lg bg-canvas p-3 text-xs">
                <div className="mb-1 font-medium text-muted">{req.status === 'needs_info' ? t('propReq.needMoreLabel') : t('propReq.rejectReasonLabel')}</div>
                <p className="leading-relaxed text-ink-soft">{req.reviewNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* เนื้อหา — label-value */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          <InfoGroup label={t('propReq.secProperty')} className="mb-4">
            <InfoRow label={t('common.type')} value={req.propertyType ? (PROPERTY_TYPE[req.propertyType] ? t(`propertyType.${req.propertyType}`) : req.propertyType) : undefined} hideEmpty />
            <InfoRow label={t('properties.col.location')} value={loc || undefined} hideEmpty />
            <InfoRow label={t('propReq.fieldExpected')} value={req.expectedRent ? `฿${bahtFormat(Number(req.expectedRent))}` : undefined} hideEmpty />
            <InfoRow label={t('propReq.fieldRooms')} value={rooms || undefined} hideEmpty />
          </InfoGroup>
          {req.note && (
            <InfoGroup label={t('propReq.secDetail')} className="mb-4">
              <InfoRow label={t('propReq.secDetail')} stack value={<span className="whitespace-pre-line leading-relaxed">{req.note}</span>} />
            </InfoGroup>
          )}
          <InfoGroup label={t('propReq.secOwner')} className="mb-4">
            <InfoRow label={t('common.name')} value={req.ownerName || undefined} hideEmpty />
            <InfoRow label={t('common.phone')} value={req.ownerPhone ? <PhoneLink phone={req.ownerPhone} /> : undefined} hideEmpty />
            <InfoRow label={t('propReq.fieldConsent')} value={req.ownerConsent ? <span className="text-success">{t('propReq.consentYes')}</span> : <span className="text-faint">{t('propReq.consentNo')}</span>} />
          </InfoGroup>
        </div>
      </div>

      {/* เหตุผล (ขอข้อมูลเพิ่ม / ปฏิเสธ) */}
      <Modal open={modal === 'info' || modal === 'reject'} onClose={() => setModal(null)}
        title={modal === 'reject' ? t('propReq.rejectTitle') : t('propReq.infoTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>{t('common.cancel')}</button>
            <button type="button" className={modal === 'reject' ? 'btn-ghost text-danger' : 'btn-gold'} disabled={busy || !reason.trim()} onClick={() => submitReason(modal === 'reject' ? 'reject' : 'info')}>
              {modal === 'reject' ? t('propReq.confirmReject') : t('propReq.sendBack')}
            </button>
          </div>
        }>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{modal === 'reject' ? t('propReq.rejectReasonReq') : t('propReq.infoReasonReq')}</span>
          <textarea className="field h-auto py-2.5" rows={3} placeholder={modal === 'reject' ? t('propReq.rejectPlaceholder') : t('propReq.infoPlaceholder')} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </Modal>

      {/* แก้ไขคำขอ (เซลเจ้าของ) */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title={t('propReq.editTitle')}>
        <form onSubmit={saveEdit} className="space-y-3">
          <Field label={`${t('propReq.fieldTitle')} *`} value={form.titleTh} onChange={(e) => setF('titleTh', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('common.type')}</span>
              <select className="field" value={form.propertyType} onChange={(e) => setF('propertyType', e.target.value)}>
                <option value="">{t('common.selectPlaceholder')}</option>
                {Object.keys(PROPERTY_TYPE).map((v) => <option key={v} value={v}>{t(`propertyType.${v}`)}</option>)}
              </select>
            </label>
            <Field label={t('propReq.fieldExpected')} inputMode="numeric" value={form.expectedRent} onChange={(e) => setF('expectedRent', e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('common.province')} value={form.province} onChange={(e) => setF('province', e.target.value)} />
            <Field label={t('propReq.fieldDistrict')} value={form.district} onChange={(e) => setF('district', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('propReq.fieldBedrooms')} inputMode="numeric" value={form.bedrooms} onChange={(e) => setF('bedrooms', e.target.value.replace(/[^0-9]/g, ''))} />
            <Field label={t('propReq.fieldBathrooms')} inputMode="numeric" value={form.bathrooms} onChange={(e) => setF('bathrooms', e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{t('propReq.secDetail')}</span>
            <textarea className="field h-auto py-2.5" rows={2} value={form.note} onChange={(e) => setF('note', e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('propReq.fieldOwnerName')} value={form.ownerName} onChange={(e) => setF('ownerName', e.target.value)} />
            <Field label={t('common.phone')} inputMode="tel" value={form.ownerPhone} onChange={(e) => setF('ownerPhone', formatPhone(e.target.value))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>{t('common.cancel')}</button>
            <button className="btn-gold" disabled={busy || !form.titleTh.trim()}>{req.status === 'needs_info' ? t('propReq.resubmitBtn') : t('common.save')}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

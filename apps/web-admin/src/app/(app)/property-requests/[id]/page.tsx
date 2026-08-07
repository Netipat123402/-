'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
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
    catch (e) { toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  const convert = () => act(async () => {
    const r = await api<{ id: string }>(`/property-requests/${id}/convert`, { method: 'POST', body: '{}' });
    router.push(`/properties/${r.data.id}`);
  }, 'สร้างประกาศ (ร่าง) แล้ว');
  const submitReason = (kind: 'reject' | 'info') => {
    if (!reason.trim()) return;
    const path = kind === 'reject' ? 'reject' : 'request-info';
    const msg = kind === 'reject' ? 'ปฏิเสธคำขอแล้ว' : 'ส่งกลับให้แก้ไขแล้ว';
    setModal(null);
    act(() => api(`/property-requests/${id}/${path}`, { method: 'POST', body: JSON.stringify({ reason: reason.trim() }) }), msg).then(() => setReason(''));
  };
  const withdraw = () => act(() => api(`/property-requests/${id}/withdraw`, { method: 'POST', body: '{}' }), 'ถอนคำขอแล้ว', true);

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
    }) }), req?.status === 'needs_info' ? 'แก้ไขและส่งใหม่แล้ว' : 'บันทึกแล้ว');
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!req) return <div className="mx-auto max-w-3xl text-center text-muted">ไม่พบคำขอ <Link href="/property-requests" className="text-gold-dark underline">กลับ</Link></div>;

  const isReviewer = can('property_request', 'convert');
  const isMine = req.submittedBy?.id === user?.id;
  const open = req.status === 'pending' || req.status === 'needs_info';
  const loc = [req.province, req.district].filter(Boolean).join(' · ');
  const rooms = [req.bedrooms != null ? `${req.bedrooms} นอน` : null, req.bathrooms != null ? `${req.bathrooms} น้ำ` : null].filter(Boolean).join(' · ');

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/property-requests"
        code={req.code}
        statusMap={PROPERTY_REQUEST_STATUS}
        statusValue={req.status}
        title={req.titleTh}
        subtitle={<>ส่งโดย {req.submittedBy?.fullName ?? '—'}{req.createdAt ? ` · ${fmtDateCompact(req.createdAt)}` : ''}</>}
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
                <button className="btn-gold btn-sm" disabled={busy} onClick={convert}>สร้างประกาศ (ร่าง)</button>
                <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { setReason(''); setModal('info'); }}>ขอข้อมูลเพิ่ม</button>
                <button className="mt-1 text-xs text-muted transition hover:text-danger" disabled={busy} onClick={() => { setReason(''); setModal('reject'); }}>ปฏิเสธคำขอ</button>
              </div>
            )}

            {/* เซลเจ้าของคำขอ — แก้ไข/ถอน (ตอนยังเปิด) */}
            {!isReviewer && isMine && open && (
              <div className="mt-3 grid grid-cols-1 gap-2">
                <button className="btn-gold btn-sm" disabled={busy} onClick={openEdit}>{req.status === 'needs_info' ? 'แก้ไข + ส่งใหม่' : 'แก้ไขคำขอ'}</button>
                <button className="mt-1 text-xs text-muted transition hover:text-danger" disabled={busy} onClick={withdraw}>ถอนคำขอ</button>
              </div>
            )}

            {/* แปลงเป็นทรัพย์แล้ว — ลิงก์ไปทรัพย์ (ร่าง) ที่สร้าง */}
            {req.convertedProperty && (
              <Link href={`/properties/${req.convertedProperty.id}`} className="mt-3 block rounded-lg border border-border py-2 text-center text-sm text-gold-dark transition hover:bg-raised">
                ดูทรัพย์ที่สร้าง · {req.convertedProperty.code} ›
              </Link>
            )}

            {/* เหตุผล needs_info / rejected */}
            {req.reviewNote && (req.status === 'needs_info' || req.status === 'rejected') && (
              <div className="mt-3 rounded-lg bg-canvas p-3 text-xs">
                <div className="mb-1 font-medium text-muted">{req.status === 'needs_info' ? 'ต้องการข้อมูลเพิ่ม' : 'เหตุผลที่ปฏิเสธ'}</div>
                <p className="leading-relaxed text-ink-soft">{req.reviewNote}</p>
              </div>
            )}
          </div>
        </div>

        {/* เนื้อหา — label-value */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          <InfoGroup label="ข้อมูลทรัพย์" className="mb-4">
            <InfoRow label="ประเภท" value={req.propertyType ? (PROPERTY_TYPE[req.propertyType] ?? req.propertyType) : undefined} hideEmpty />
            <InfoRow label="ทำเล" value={loc || undefined} hideEmpty />
            <InfoRow label="ราคาคาด/เดือน" value={req.expectedRent ? `฿${bahtFormat(Number(req.expectedRent))}` : undefined} hideEmpty />
            <InfoRow label="ห้อง" value={rooms || undefined} hideEmpty />
          </InfoGroup>
          {req.note && (
            <InfoGroup label="รายละเอียด" className="mb-4">
              <InfoRow label="รายละเอียด" stack value={<span className="whitespace-pre-line leading-relaxed">{req.note}</span>} />
            </InfoGroup>
          )}
          <InfoGroup label="เจ้าของทรัพย์" className="mb-4">
            <InfoRow label="ชื่อ" value={req.ownerName || undefined} hideEmpty />
            <InfoRow label="เบอร์โทร" value={req.ownerPhone ? <PhoneLink phone={req.ownerPhone} /> : undefined} hideEmpty />
            <InfoRow label="ยินยอมลงประกาศ" value={req.ownerConsent ? <span className="text-success">✓ ยินยอมแล้ว</span> : <span className="text-faint">ยังไม่ยืนยัน</span>} />
          </InfoGroup>
        </div>
      </div>

      {/* เหตุผล (ขอข้อมูลเพิ่ม / ปฏิเสธ) */}
      <Modal open={modal === 'info' || modal === 'reject'} onClose={() => setModal(null)}
        title={modal === 'reject' ? 'ปฏิเสธคำขอ' : 'ขอข้อมูลเพิ่ม'}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>ยกเลิก</button>
            <button type="button" className={modal === 'reject' ? 'btn-ghost text-danger' : 'btn-gold'} disabled={busy || !reason.trim()} onClick={() => submitReason(modal === 'reject' ? 'reject' : 'info')}>
              {modal === 'reject' ? 'ยืนยันปฏิเสธ' : 'ส่งกลับให้แก้ไข'}
            </button>
          </div>
        }>
        <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">{modal === 'reject' ? 'เหตุผลที่ปฏิเสธ *' : 'ต้องการข้อมูลอะไรเพิ่ม *'}</span>
          <textarea className="field h-auto py-2.5" rows={3} placeholder={modal === 'reject' ? 'เช่น ทรัพย์ซ้ำกับที่มีอยู่แล้ว' : 'เช่น ขอรูป/ราคาที่แน่นอน/เลขห้อง'} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      </Modal>

      {/* แก้ไขคำขอ (เซลเจ้าของ) */}
      <Modal open={modal === 'edit'} onClose={() => setModal(null)} title="แก้ไขคำขอ">
        <form onSubmit={saveEdit} className="space-y-3">
          <Field label="ชื่อทรัพย์ *" value={form.titleTh} onChange={(e) => setF('titleTh', e.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">ประเภท</span>
              <select className="field" value={form.propertyType} onChange={(e) => setF('propertyType', e.target.value)}>
                <option value="">— เลือก —</option>
                {Object.entries(PROPERTY_TYPE).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </label>
            <Field label="ราคาคาด/เดือน" inputMode="numeric" value={form.expectedRent} onChange={(e) => setF('expectedRent', e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="จังหวัด" value={form.province} onChange={(e) => setF('province', e.target.value)} />
            <Field label="เขต / อำเภอ" value={form.district} onChange={(e) => setF('district', e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ห้องนอน" inputMode="numeric" value={form.bedrooms} onChange={(e) => setF('bedrooms', e.target.value.replace(/[^0-9]/g, ''))} />
            <Field label="ห้องน้ำ" inputMode="numeric" value={form.bathrooms} onChange={(e) => setF('bathrooms', e.target.value.replace(/[^0-9]/g, ''))} />
          </div>
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">รายละเอียด</span>
            <textarea className="field h-auto py-2.5" rows={2} value={form.note} onChange={(e) => setF('note', e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Field label="ชื่อเจ้าของ" value={form.ownerName} onChange={(e) => setF('ownerName', e.target.value)} />
            <Field label="เบอร์โทร" inputMode="tel" value={form.ownerPhone} onChange={(e) => setF('ownerPhone', formatPhone(e.target.value))} />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" className="btn-ghost" onClick={() => setModal(null)}>ยกเลิก</button>
            <button className="btn-gold" disabled={busy || !form.titleTh.trim()}>{req.status === 'needs_info' ? 'ส่งใหม่' : 'บันทึก'}</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

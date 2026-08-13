'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useMasterData } from '@/lib/masterData';
import { mediaUrl } from '@/lib/api';
import { PROPERTY_STATUS, bahtFormat } from '@/lib/status';
import { ConfirmDialog, DetailHeader, InfoGroup, InfoRow, Modal, PhoneLink, ProgressBar, RailBlock, SectionLabel, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import PropertyForm, { type PropertyInitial } from '@/components/PropertyForm';
import ActivityTimeline from '@/components/ActivityTimeline';
import DocumentSection from '@/components/DocumentSection';
import Lightbox from '@/components/Lightbox';
import { useSwipe } from '@/lib/useSwipe';

interface Media { id: string; storageKey: string; isCover: boolean }
interface Property {
  id: string; code: string; titleTh: string; titleEn?: string; propertyType: string; status: string;
  monthlyRent: string; depositMonths?: number; bedrooms?: number; bathrooms?: number;
  areaSqm?: string; floor?: string; furnished?: string; province?: string; district?: string;
  projectName?: string; descriptionTh?: string; amenities?: Record<string, boolean>;
  isFeatured?: boolean; viewCount?: number;
  media: Media[];
  owner?: { id?: string; fullName: string; phone?: string; email?: string; _count?: { properties: number } };
  contracts?: { id: string; code: string }[]; // สัญญา active (Phase 13) — โชว์ลิงก์แทนทางตัน
}
interface CompletenessItem { key: string; label: string; required: boolean; done: boolean }
interface Completeness {
  checklist: CompletenessItem[]; requiredDone: number; requiredTotal: number;
  score: number; canPublish: boolean; missingRequired: string[];
}

export default function PropertyDetailPage() {
  const t = useTranslations();
  const { api, upload, can } = useAuth();
  const md = useMasterData(); // amenity/province localize ตาม locale
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [p, setP] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [imgIdx, setImgIdx] = useState(0); // รูปที่กำลังดู (gallery แบบหน้าเว็บ)
  // มือถือ/แท็บเล็ต = ปัดนิ้วเปลี่ยนรูป (แทนลูกศรที่บังจอ; ลูกศรเหลือเฉพาะเดสก์ท็อป) — ให้ interaction ตรงกับหน้า public
  const gallerySwipe = useSwipe((dir) => { const len = p?.media.length ?? 0; if (len > 1) setImgIdx((v) => (v + dir + len) % len); });
  const [confirm, setConfirm] = useState<null | 'reject' | 'sendback' | 'delete' | 'markRented'>(null);
  const [comp, setComp] = useState<Completeness | null>(null);
  const [editInitial, setEditInitial] = useState<PropertyInitial | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async (): Promise<Property | null> => {
    try {
      const r = await api<Property>(`/properties/${id}`);
      setP(r.data);
      // completeness = ด่านก่อนขอเผยแพร่/อนุมัติ — โหลดเฉพาะสถานะที่เกี่ยวข้อง (ร่าง/รอตรวจสอบ)
      if (r.data.status === 'draft' || r.data.status === 'pending_review') {
        try { const c = await api<Completeness>(`/properties/${id}/completeness`); setComp(c.data); }
        catch { setComp(null); }
      } else setComp(null);
      return r.data;
    }
    catch { setP(null); return null; }
    finally { setLoading(false); }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);

  // optimistic (ออปชัน): อัปเดต p ในเครื่องทันทีก่อนยิง API → ปุ่มที่กดบ่อย (เช่น ตั้งทรัพย์แนะนำ) เด้งทันมือ
  // สำเร็จ → load() ยืนยันความจริง · ล้มเหลว → คืนค่าเดิม (rollback)
  async function run(fn: () => Promise<unknown>, successMsg = t('common.actionDone'), optimistic?: (cur: Property) => Property) {
    const prev = p;
    if (optimistic && p) setP(optimistic(p));
    setBusy(true);
    try { await fn(); await load(); toast.success(successMsg); }
    catch (e) { if (optimistic && prev) setP(prev); toast.error((e as { message?: string }).message || t('common.actionFailed')); }
    finally { setBusy(false); }
  }

  async function uploadImage(file: File) {
    const wasLive = p?.status === 'available'; // Phase 4: แก้รูป live → เด้งกลับรอตรวจ
    const fd = new FormData(); fd.append('file', file);
    setUploadPct(0);
    try {
      await upload(`/properties/${id}/media`, fd, setUploadPct);
      const fresh = await load();
      toast.success(wasLive && fresh?.status === 'pending_review'
        ? t('propertyDetail.toast.photoAddedBounced')
        : t('propertyDetail.toast.photoAdded'));
    } catch (e) {
      toast.error((e as { message?: string }).message || t('propertyDetail.toast.uploadFailed'));
    } finally {
      setUploadPct(null);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-64 animate-pulse rounded-card bg-canvas" /></div>;
  if (!p) return <div className="mx-auto max-w-3xl text-center text-muted">{t('propertyDetail.notFound')} <Link href="/properties" className="text-gold-dark underline">{t('common.back')}</Link></div>;

  // ข้อมูลทรัพย์ = InfoGroup เรียงตามความสำคัญ (Phase 10) — ราคา→ห้อง→ทำเล→รายละเอียด→สิ่งอำนวยฯ
  // furnished labels → i18n (furnished.*)
  const amenities = Object.entries(p.amenities ?? {}).filter(([, v]) => v).map(([k]) => k);
  const hasRoomInfo = p.bedrooms != null || p.bathrooms != null || !!p.areaSqm || !!p.floor || !!p.furnished;
  const hasLocation = !!p.projectName || !!p.province || !!p.district;
  const activeContract = p.contracts?.[0]; // ไม่ว่าง → ลิงก์สัญญา
  const webUrl = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/properties/${p.code}`;

  // Phase 3 · ด่านเผยแพร่ + สิทธิ์ตามสถานะ (maker-checker)
  const notReady = !!comp && !comp.canPublish; // ยังไม่ครบจำเป็น 7/7 → ปิดปุ่มขอเผยแพร่/อนุมัติ
  const isGated = p.status === 'draft' || p.status === 'pending_review';
  const canSendback = p.status === 'pending_review' && can('property', 'reject');      // เจ้าของตีกลับให้แก้
  const canWithdraw = p.status === 'pending_review' && !can('property', 'approve') && can('property', 'change_status'); // ผู้ส่งถอนคำขอ
  const canUnpublish = p.status === 'available' && can('property', 'reject');
  const canMarkRented = p.status === 'available' && can('property', 'change_status');
  const canMarkAvail = p.status === 'rented' && !activeContract && can('property', 'change_status');
  const canDelete = p.status === 'draft' && can('property', 'delete');
  const showSecondary = canSendback || canWithdraw || canUnpublish || canMarkRented || canMarkAvail || canDelete;

  // โหลดข้อมูลเต็มแล้วเปิด modal แก้ไข (ใช้ร่วมทั้ง primary/secondary ตามสถานะ) — ใช้ route id (คงที่)
  async function openEdit() {
    try { const r = await api<PropertyInitial & { amenities?: Record<string, boolean> }>(`/properties/${id}`); setEditInitial({ ...r.data, id }); }
    catch { toast.error(t('common.loadFailed')); }
  }

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/properties"
        code={p.code}
        statusMap={PROPERTY_STATUS}
        statusValue={p.status}
        title={p.projectName || p.titleTh}
        subtitle={p.projectName ? p.titleTh : undefined}
        price={bahtFormat(Number(p.monthlyRent))}
        priceSuffix={t('propertyDetail.perMonth')}
      />

      {/* รูปทรัพย์ (gallery hero) คงบนสุดเสมอ · มือถือปัด / desktop ลูกศร hover */}
      <div className="mt-6">
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ''; }} />
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>{t('propertyDetail.photos')}</SectionLabel>
          {can('property', 'update') && (
            <button className="btn-ghost h-9" disabled={busy || uploadPct !== null} onClick={() => fileRef.current?.click()}><Icon name="plus" size={16} /> {t('propertyDetail.addPhoto')}</button>
          )}
        </div>
        {p.status === 'available' && can('property', 'update') && (
          <p className="mb-3 flex items-start gap-1.5 text-xs text-muted">
            <Icon name="alert-triangle" size={13} className="mt-0.5 shrink-0 text-warning" />
            {t('propertyDetail.editPhotoWarning')}
          </p>
        )}
        {uploadPct !== null && (
          <div className="mb-3"><ProgressBar value={uploadPct} /><p className="mt-1 text-xs text-muted">{t('propertyDetail.uploading', { pct: uploadPct })}</p></div>
        )}
        {p.media.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-card border border-border bg-canvas text-sm text-muted">{t('propertyDetail.noPhotos')}</div>
        ) : (() => {
          const idx = Math.min(imgIdx, p.media.length - 1);
          const active = p.media[idx];
          const has = p.media.length > 1;
          // thumbnail window สูงสุด 4 ใบ (เหมือนหน้าเว็บ public) เลื่อนตามรูปที่เลือก
          const win = 4;
          const tStart = Math.max(0, Math.min(idx - 1, Math.max(0, p.media.length - win)));
          const thumbs = p.media.slice(tStart, tStart + win);
          return (
            <>
              {/* role=button + คีย์บอร์ด → เปิด Lightbox ด้วยคีย์บอร์ดได้ + เป็นที่คืนโฟกัสตอนปิด (เป็น <button> ตรงๆ ไม่ได้เพราะมีปุ่ม ‹› ซ้อนใน) */}
              <div role="button" tabIndex={0} aria-label={t('propertyDetail.viewFullscreen')}
                onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setLightbox(idx); } }}
                {...(has ? gallerySwipe : {})}
                className="group relative aspect-[16/9] w-full touch-pan-y overflow-hidden rounded-card bg-canvas outline-none focus-visible:ring-2 focus-visible:ring-gold max-h-[40vh] sm:max-h-[34vh]">
                {p.media.map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={mediaUrl(m.storageKey)} alt="" onClick={() => setLightbox(idx)}
                    className={`absolute inset-0 h-full w-full cursor-zoom-in object-cover transition-opacity duration-200 ${i === idx ? 'opacity-100' : 'opacity-0'}`} />
                ))}
                {has && (
                  <>
                    {/* ลูกศร = เดสก์ท็อปเท่านั้น (มี mouse/hover) · มือถือ/แท็บเล็ตใช้ปัดนิ้วแทน (ไม่บังจอ) */}
                    <button aria-label={t('propertyDetail.prevPhoto')} onClick={() => setImgIdx((idx - 1 + p.media.length) % p.media.length)}
                      className="absolute left-2.5 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition duration-150 hover:bg-black/65 active:scale-90 active:bg-black/75 group-hover:opacity-100 lg:flex"><Icon name="chevron-left" size={20} /></button>
                    <button aria-label={t('propertyDetail.nextPhoto')} onClick={() => setImgIdx((idx + 1) % p.media.length)}
                      className="absolute right-2.5 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition duration-150 hover:bg-black/65 active:scale-90 active:bg-black/75 group-hover:opacity-100 lg:flex"><Icon name="chevron-right" size={20} /></button>
                    {/* หลอดทองบอกตำแหน่งรูป — ชุดเดียวกับหน้า public (แทน chip ตัวเลข) เพื่อความสม่ำเสมอข้ามแอป */}
                    <div role="progressbar" aria-valuemin={1} aria-valuemax={p.media.length} aria-valuenow={idx + 1}
                      aria-label={t('propertyDetail.photoNofM', { n: idx + 1, total: p.media.length })}
                      className="pointer-events-none absolute inset-x-3 bottom-3 z-10 h-1 overflow-hidden rounded-full bg-white/25">
                      <div className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out"
                        style={{ width: `${((idx + 1) / p.media.length) * 100}%` }} />
                    </div>
                  </>
                )}
                {active.isCover && <span className="absolute left-3 top-3 z-10 badge bg-gold text-[#1c1b18]">{t('propertyDetail.cover')}</span>}
                {can('property', 'update') && (
                  <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                    {!active.isCover && <button className="rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80" onClick={() => run(() => api(`/properties/${p.id}/media/${active.id}/cover`, { method: 'POST', body: '{}' }))}>{t('propertyDetail.setCover')}</button>}
                    <button className="rounded-lg bg-danger/85 px-2.5 py-1 text-xs text-white hover:bg-danger" onClick={() => run(async () => { await api(`/properties/${p.id}/media/${active.id}`, { method: 'DELETE' }); setImgIdx(0); })}>{t('common.delete')}</button>
                  </div>
                )}
              </div>
              {/* thumbnails — โชว์สูงสุด 4 ใบ (เหมือนหน้าเว็บ public) */}
              {has && (
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {thumbs.map((m) => {
                    const i = p.media.indexOf(m);
                    return (
                      <button key={m.id} onClick={() => setImgIdx(i)}
                        className={`relative aspect-[4/3] overflow-hidden rounded-lg transition ${i === idx ? 'ring-2 ring-gold' : 'opacity-80 hover:opacity-100'}`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={mediaUrl(m.storageKey)} alt="" className="h-full w-full object-cover" />
                      </button>
                    );
                  })}
                </div>
              )}
            </>
          );
        })()}
      </div>

      {/* main + ราง (เลิกแท็บ · listing) */}
      <div className="mt-6 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* ราง = สถานะ + ปุ่มตามสถานะ (คอม=ขวา sticky · iPad=แถบบน · มือถือ=การ์ดบน) */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 xl:flex-col xl:items-stretch xl:gap-3">
              <div className="shrink-0 text-center sm:text-left xl:text-center">
                <StatusBadge map={PROPERTY_STATUS} value={p.status} />
                <div className="mt-1 text-xs">
                  {p.status === 'draft' && <span className="text-faint">{t('propertyDetail.notLive')}</span>}
                  {p.status === 'pending_review' && <span className="text-info">{t('propertyDetail.awaitingApproval')}</span>}
                  {p.status === 'available' && <a href={webUrl} target="_blank" rel="noreferrer" className="text-gold-dark hover:underline">{t('propertyDetail.publishedViewWeb')}</a>}
                  {p.status === 'rented' && (activeContract
                    ? <Link href={`/contracts/${activeContract.id}`} className="text-gold-dark hover:underline">{t('propertyDetail.rentedViewContract')}</Link>
                    : <span className="text-faint">{t('propertyDetail.rentedOffSystem')}</span>)}
                </div>
                {/* telemetry (ยอดวิว) — ย้ายจากหัวมาไว้ในราง คู่กับสถานะเผยแพร่ */}
                {(p.viewCount ?? 0) > 0 && <div className="mt-1 inline-flex items-center gap-1 text-xs text-faint"><Icon name="search" size={12} className="opacity-60" /> {t('propertyDetail.views', { n: p.viewCount ?? 0 })}</div>}
                {/* เซล (ไม่มีสิทธิ์แก้) = สื่อชัดว่าเป็นข้อมูลอ้างอิง ไม่ใช่หน้าพัง */}
                {!can('property', 'update') && (
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-raised px-2 py-0.5 text-2xs text-muted">
                    <Icon name="info" size={11} className="text-faint" /> {t('common.readOnly')}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-1 gap-2 sm:ml-auto sm:flex sm:shrink-0 xl:ml-0 xl:grid xl:grid-cols-1">
                {/* นัดดูทรัพย์นี้ — เปลี่ยน "การดูแคตตาล็อก" เป็น "การขาย" (เซล/ผจก/เจ้าของ ที่นัดได้) */}
                {p.status === 'available' && can('appointment', 'create') && (
                  <Link href={`/appointments?newProperty=${p.id}`} className="btn-gold btn-sm flex items-center justify-center gap-1.5">
                    <Icon name="calendar" size={15} /> {t('propertyDetail.bookViewing')}
                  </Link>
                )}
                {p.status === 'draft' && can('property', 'approve') && (
                  <button className="btn-gold btn-sm" disabled={busy || notReady} onClick={() => run(() => api(`/properties/${p.id}/approve`, { method: 'POST', body: '{}' }), t('propertyDetail.toast.published'))}>{t('propertyDetail.publishBtn')}</button>
                )}
                {p.status === 'draft' && !can('property', 'approve') && can('property', 'change_status') && (
                  <button className="btn-gold btn-sm" disabled={busy || notReady} onClick={() => run(() => api(`/properties/${p.id}/submit-review`, { method: 'POST', body: '{}' }), t('propertyDetail.toast.submitted'))}>{t('propertyDetail.requestPublish')}</button>
                )}
                {p.status === 'pending_review' && can('property', 'approve') && (
                  <button className="btn-gold btn-sm" disabled={busy || notReady} onClick={() => run(() => api(`/properties/${p.id}/approve`, { method: 'POST', body: '{}' }), t('propertyDetail.toast.approved'))}>{t('propertyDetail.approvePublish')}</button>
                )}
                {can('property', 'update') && (
                  <button className={`btn-sm ${p.status === 'draft' ? 'btn-ghost' : 'btn-gold'}`} disabled={busy} onClick={openEdit}>{t('propertyDetail.editInfo')}</button>
                )}
                {can('property', 'update') && (
                  <button className={`btn-ghost btn-sm ${p.isFeatured ? 'border-gold text-gold-dark' : ''}`} disabled={busy}
                    onClick={() => run(() => api(`/properties/${p.id}`, { method: 'PATCH', body: JSON.stringify({ isFeatured: !p.isFeatured }) }), p.isFeatured ? t('propertyDetail.toast.unfeatured') : t('propertyDetail.toast.featured'), (cur) => ({ ...cur, isFeatured: !cur.isFeatured }))}>
                    <Icon name="star" size={15} /> {p.isFeatured ? t('propertyDetail.featured') : t('propertyDetail.setFeatured')}
                  </button>
                )}
              </div>
            </div>
            {/* Phase 3 · แผงความครบถ้วน (ร่าง/รอตรวจสอบ) — ด่านก่อนขอเผยแพร่/อนุมัติ */}
            {isGated && comp && (
              <div className="mt-3 border-t border-border pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-ink-soft">{t('propertyDetail.completeness')}</span>
                  <span className={`text-xs font-medium ${comp.canPublish ? 'text-success' : 'text-gold-dark'}`}>
                    {comp.canPublish ? t('propertyDetail.readyToPublish') : `${comp.score}%`}
                  </span>
                </div>
                <div className="mt-2"><ProgressBar value={comp.score} /></div>
                <div className="mt-1.5 text-2xs text-faint">
                  {t('propertyDetail.requiredCount', { done: comp.requiredDone, total: comp.requiredTotal })}
                  {(() => { const rec = comp.checklist.filter((i) => !i.required); return t('propertyDetail.recommendedCount', { done: rec.filter((i) => i.done).length, total: rec.length }); })()}
                </div>
                <ul className="mt-2 space-y-1">
                  {comp.checklist.filter((i) => i.required).map((i) => (
                    <li key={i.key} className="flex items-center gap-1.5 text-xs">
                      <Icon name={i.done ? 'check' : 'alert-triangle'} size={13} className={i.done ? 'text-success' : 'text-danger'} />
                      <span className={i.done ? 'text-ink-soft' : 'text-danger'}>{i.label}</span>
                    </li>
                  ))}
                </ul>
                {notReady && <p className="mt-2 text-2xs leading-relaxed text-faint">{p.status === 'pending_review' ? t('propertyDetail.mustCompleteApprove') : t('propertyDetail.mustCompleteRequest')}</p>}
              </div>
            )}
            {/* action รอง — quiet */}
            {showSecondary && (
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {canWithdraw && <button className="text-muted transition hover:text-ink" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'draft' }) }), t('propertyDetail.toast.withdrawn'))}>{t('propertyDetail.withdrawToEdit')}</button>}
                {canSendback && <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => setConfirm('sendback')}>{t('propertyDetail.sendBack')}</button>}
                {canMarkRented && <button className="text-muted transition hover:text-ink" disabled={busy} onClick={() => setConfirm('markRented')}>{t('propertyDetail.markRented')}</button>}
                {canUnpublish && <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => setConfirm('reject')}>{t('propertyDetail.unpublish')}</button>}
                {canMarkAvail && <button className="text-muted transition hover:text-ink" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'available' }) }), t('propertyDetail.toast.markedAvailable'))}>{t('propertyDetail.markAvailable')}</button>}
                {canDelete && <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => setConfirm('delete')}>{t('propertyDetail.deleteProperty')}</button>}
              </div>
            )}
          </div>
        </div>

        {/* เนื้อหา — label-value ราง (กฎ 1) */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          {hasRoomInfo && (
            /* label-value ล้วน ไม่มีไอคอนหน้า field — ให้ตรงทุกหน้า (minimal · §8 รางระดับเดียว) */
            <InfoGroup label={t('propertyDetail.roomsArea')} className="mb-4">
              <InfoRow label={t('propertyDetail.bedrooms')} value={p.bedrooms != null ? t('common.unitRooms', { n: p.bedrooms }) : undefined} hideEmpty />
              <InfoRow label={t('propertyDetail.bathrooms')} value={p.bathrooms != null ? t('common.unitRooms', { n: p.bathrooms }) : undefined} hideEmpty />
              <InfoRow label={t('propertyDetail.area')} value={p.areaSqm ? t('common.unitSqm', { n: p.areaSqm }) : undefined} hideEmpty />
              <InfoRow label={t('propertyDetail.floor')} value={p.floor || undefined} hideEmpty />
              <InfoRow label={t('propertyDetail.furnishing')} value={p.furnished ? t(`furnished.${p.furnished}`) : undefined} hideEmpty />
            </InfoGroup>
          )}
          {hasLocation && (
            <InfoGroup label={t('propertyDetail.location')} className="mb-4">
              <InfoRow label={t('propertyDetail.project')} value={p.projectName || undefined} hideEmpty />
              <InfoRow label={t('common.province')} value={md.provinceLabel(p.province)} hideEmpty />
              <InfoRow label={t('propertyDetail.district')} value={p.district || undefined} hideEmpty />
            </InfoGroup>
          )}
          {p.descriptionTh && (
            <InfoGroup label={t('propertyDetail.description')} className="mb-4">
              <InfoRow label={t('propertyDetail.description')} stack value={<span className="whitespace-pre-line leading-relaxed">{p.descriptionTh}</span>} />
            </InfoGroup>
          )}
          {amenities.length > 0 && (
            <InfoGroup label={t('propertyDetail.amenities')} className="mb-4">
              <RailBlock className="py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((a) => <span key={a} className="badge bg-canvas text-ink-soft">{md.amenityLabel(a)}</span>)}
                </div>
              </RailBlock>
            </InfoGroup>
          )}
          {p.depositMonths != null && (
            <InfoGroup label={t('propertyDetail.rentTerms')} className="mb-4">
              <InfoRow label={t('propertyDetail.deposit')} value={t('common.unitMonths', { n: p.depositMonths })} />
            </InfoGroup>
          )}
          {p.owner && (
            <InfoGroup label={t('propertyDetail.owner')} className="mb-4">
              <InfoRow label={t('common.name')} value={p.owner.fullName} href={p.owner.id ? `/owners/${p.owner.id}` : undefined} strong hideChevron />
              <InfoRow label={t('common.phone')} value={p.owner.phone ? <PhoneLink phone={p.owner.phone} /> : undefined} hideEmpty />
              <InfoRow label={t('common.email')} value={p.owner.email || undefined} hideEmpty />
              <InfoRow label={t('propertyDetail.ownedCount')} value={p.owner._count ? t('common.itemCount', { n: p.owner._count.properties }) : undefined} hideEmpty />
            </InfoGroup>
          )}
          <section className="mb-4 scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>{t('common.documents')}</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><DocumentSection entityType="property" entityId={p.id} /></div>
          </section>
          <section className="scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>{t('common.history')}</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><ActivityTimeline path={`/properties/${p.id}/activities`} /></div>
          </section>
        </div>
      </div>

      <Modal open={!!editInitial} onClose={() => setEditInitial(null)} title={t('propertyDetail.editTitle')} size="xl">
        {editInitial && (
          <PropertyForm mode="edit" initial={editInitial}
            onClose={() => setEditInitial(null)}
            onSaved={async () => {
              const wasLive = p?.status === 'available'; // Phase 4: แก้เนื้อหา live → เด้งกลับรอตรวจ
              setEditInitial(null);
              const fresh = await load();
              toast.success(wasLive && fresh?.status === 'pending_review'
                ? t('propertyDetail.toast.savedBounced')
                : t('propertyDetail.toast.saved'));
            }} />
        )}
      </Modal>

      <ConfirmDialog open={confirm === 'reject'} onClose={() => setConfirm(null)} busy={busy}
        title={t('propertyDetail.unpublish')} tone="danger" confirmLabel={t('propertyDetail.unpublish')} withReason
        message={t.rich('propertyDetail.unpublishMsg', { code: p.code, b: (c) => <b>{c}</b> })}
        reasonPlaceholder={t('propertyDetail.unpublishReason')}
        onConfirm={(reason) => { setConfirm(null); run(() => api(`/properties/${p.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }), t('propertyDetail.toast.unpublished')); }} />
      <ConfirmDialog open={confirm === 'sendback'} onClose={() => setConfirm(null)} busy={busy}
        title={t('propertyDetail.sendBackConfirm')} tone="danger" confirmLabel={t('propertyDetail.sendBackConfirm')} withReason reasonRequired
        reasonLabel={t('propertyDetail.sendBackReason')}
        message={t.rich('propertyDetail.sendBackMsg', { code: p.code, b: (c) => <b>{c}</b> })}
        reasonPlaceholder={t('propertyDetail.sendBackPlaceholder')}
        onConfirm={(reason) => { setConfirm(null); run(() => api(`/properties/${p.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }), t('propertyDetail.toast.sentback')); }} />
      <ConfirmDialog open={confirm === 'delete'} onClose={() => setConfirm(null)} busy={busy}
        title={t('propertyDetail.deleteProperty')} tone="danger" confirmLabel={t('propertyDetail.deleteProperty')}
        message={t.rich('propertyDetail.deleteMsg', { code: p.code, b: (c) => <b>{c}</b> })}
        onConfirm={() => { setConfirm(null); run(async () => { await api(`/properties/${p.id}`, { method: 'DELETE' }); router.push('/properties'); }); }} />
      <ConfirmDialog open={confirm === 'markRented'} onClose={() => setConfirm(null)} busy={busy}
        title={t('propertyDetail.markRented')} confirmLabel={t('propertyDetail.markRented')} withReason
        message={t.rich('propertyDetail.markRentedMsg', { code: p.code, b: (c) => <b>{c}</b> })}
        reasonPlaceholder={t('propertyDetail.markRentedReason')}
        onConfirm={(reason) => { setConfirm(null); run(() => api(`/properties/${p.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'rented', reason }) }), t('propertyDetail.toast.markedRented')); }} />

      {lightbox !== null && (
        <Lightbox images={p.media.map((m) => mediaUrl(m.storageKey))} index={lightbox}
          onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </div>
  );
}

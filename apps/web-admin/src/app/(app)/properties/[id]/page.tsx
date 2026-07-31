'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
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

export default function PropertyDetailPage() {
  const { api, upload, can } = useAuth();
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
  const [confirm, setConfirm] = useState<null | 'reject' | 'delete' | 'markRented'>(null);
  const [editInitial, setEditInitial] = useState<PropertyInitial | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [amenityLabels, setAmenityLabels] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { const r = await api<Property>(`/properties/${id}`); setP(r.data); }
    catch { setP(null); }
    finally { setLoading(false); }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);

  // ป้ายชื่อสิ่งอำนวยความสะดวกเป็นภาษาไทย (จาก master-data) — ไม่โชว์ key ดิบ
  useEffect(() => {
    api<Record<string, { code: string; labelTh: string }[]>>('/public/master-data')
      .then((m) => { const map: Record<string, string> = {}; (m.data.amenity ?? []).forEach((a) => { map[a.code] = a.labelTh; }); setAmenityLabels(map); })
      .catch(() => { /* */ });
  }, [api]);

  // optimistic (ออปชัน): อัปเดต p ในเครื่องทันทีก่อนยิง API → ปุ่มที่กดบ่อย (เช่น ตั้งทรัพย์แนะนำ) เด้งทันมือ
  // สำเร็จ → load() ยืนยันความจริง · ล้มเหลว → คืนค่าเดิม (rollback)
  async function run(fn: () => Promise<unknown>, successMsg = 'ทำรายการสำเร็จ', optimistic?: (cur: Property) => Property) {
    const prev = p;
    if (optimistic && p) setP(optimistic(p));
    setBusy(true);
    try { await fn(); await load(); toast.success(successMsg); }
    catch (e) { if (optimistic && prev) setP(prev); toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  async function uploadImage(file: File) {
    const fd = new FormData(); fd.append('file', file);
    setUploadPct(0);
    try {
      await upload(`/properties/${id}/media`, fd, setUploadPct);
      await load();
      toast.success('เพิ่มรูปแล้ว');
    } catch (e) {
      toast.error((e as { message?: string }).message || 'อัปโหลดไม่สำเร็จ');
    } finally {
      setUploadPct(null);
    }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-64 animate-pulse rounded-card bg-canvas" /></div>;
  if (!p) return <div className="mx-auto max-w-3xl text-center text-muted">ไม่พบทรัพย์ <Link href="/properties" className="text-gold-dark underline">กลับ</Link></div>;

  // ข้อมูลทรัพย์ = InfoGroup เรียงตามความสำคัญ (Phase 10) — ราคา→ห้อง→ทำเล→รายละเอียด→สิ่งอำนวยฯ
  const FURNISHED_TH: Record<string, string> = { fully: 'เฟอร์นิเจอร์ครบ', partial: 'เฟอร์นิเจอร์บางส่วน', unfurnished: 'ไม่มีเฟอร์นิเจอร์' };
  const amenities = Object.entries(p.amenities ?? {}).filter(([, v]) => v).map(([k]) => k);
  const hasRoomInfo = p.bedrooms != null || p.bathrooms != null || !!p.areaSqm || !!p.floor || !!p.furnished;
  const hasLocation = !!p.projectName || !!p.province || !!p.district;
  const activeContract = p.contracts?.[0]; // ไม่ว่าง → ลิงก์สัญญา
  const webUrl = `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/properties/${p.code}`;

  // โหลดข้อมูลเต็มแล้วเปิด modal แก้ไข (ใช้ร่วมทั้ง primary/secondary ตามสถานะ) — ใช้ route id (คงที่)
  async function openEdit() {
    try { const r = await api<PropertyInitial & { amenities?: Record<string, boolean> }>(`/properties/${id}`); setEditInitial({ ...r.data, id }); }
    catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
  }

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/properties"
        code={p.code}
        badge={<StatusBadge map={PROPERTY_STATUS} value={p.status} />}
        meta={<span className="inline-flex items-center gap-1 text-xs text-muted"><Icon name="search" size={12} className="opacity-60" /> ดู {p.viewCount ?? 0} ครั้ง</span>}
        title={p.projectName || p.titleTh}
        subtitle={p.projectName ? p.titleTh : undefined}
        price={bahtFormat(Number(p.monthlyRent))}
        priceSuffix="/เดือน"
      />

      {/* รูปทรัพย์ (gallery hero) คงบนสุดเสมอ · มือถือปัด / desktop ลูกศร hover */}
      <div className="mt-6">
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={(e) => { const file = e.target.files?.[0]; if (file) uploadImage(file); e.target.value = ''; }} />
        <div className="mb-3 flex items-center justify-between">
          <SectionLabel>รูปทรัพย์</SectionLabel>
          {can('property', 'update') && (
            <button className="btn-ghost h-9" disabled={busy || uploadPct !== null} onClick={() => fileRef.current?.click()}><Icon name="plus" size={16} /> เพิ่มรูป</button>
          )}
        </div>
        {uploadPct !== null && (
          <div className="mb-3"><ProgressBar value={uploadPct} /><p className="mt-1 text-xs text-muted">กำลังอัปโหลดรูป {uploadPct}%</p></div>
        )}
        {p.media.length === 0 ? (
          <div className="flex h-48 items-center justify-center rounded-card border border-border bg-canvas text-sm text-muted">ยังไม่มีรูป — กด “เพิ่มรูป”</div>
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
              <div role="button" tabIndex={0} aria-label="ดูรูปเต็มจอ"
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
                    <button aria-label="รูปก่อนหน้า" onClick={() => setImgIdx((idx - 1 + p.media.length) % p.media.length)}
                      className="absolute left-2.5 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition duration-150 hover:bg-black/65 active:scale-90 active:bg-black/75 group-hover:opacity-100 lg:flex"><Icon name="chevron-left" size={20} /></button>
                    <button aria-label="รูปถัดไป" onClick={() => setImgIdx((idx + 1) % p.media.length)}
                      className="absolute right-2.5 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-sm transition duration-150 hover:bg-black/65 active:scale-90 active:bg-black/75 group-hover:opacity-100 lg:flex"><Icon name="chevron-right" size={20} /></button>
                    {/* หลอดทองบอกตำแหน่งรูป — ชุดเดียวกับหน้า public (แทน chip ตัวเลข) เพื่อความสม่ำเสมอข้ามแอป */}
                    <div role="progressbar" aria-valuemin={1} aria-valuemax={p.media.length} aria-valuenow={idx + 1}
                      aria-label={`รูปที่ ${idx + 1} จาก ${p.media.length}`}
                      className="pointer-events-none absolute inset-x-3 bottom-3 z-10 h-1 overflow-hidden rounded-full bg-white/25">
                      <div className="h-full rounded-full bg-gold transition-[width] duration-300 ease-out"
                        style={{ width: `${((idx + 1) / p.media.length) * 100}%` }} />
                    </div>
                  </>
                )}
                {active.isCover && <span className="absolute left-3 top-3 z-10 badge bg-gold text-[#1c1b18]">ปก</span>}
                {can('property', 'update') && (
                  <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                    {!active.isCover && <button className="rounded-lg bg-black/60 px-2.5 py-1 text-xs text-white hover:bg-black/80" onClick={() => run(() => api(`/properties/${p.id}/media/${active.id}/cover`, { method: 'POST', body: '{}' }))}>ตั้งเป็นปก</button>}
                    <button className="rounded-lg bg-danger/85 px-2.5 py-1 text-xs text-white hover:bg-danger" onClick={() => run(async () => { await api(`/properties/${p.id}/media/${active.id}`, { method: 'DELETE' }); setImgIdx(0); })}>ลบ</button>
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
                  {p.status === 'draft' && <span className="text-faint">ยังไม่ขึ้นเว็บลูกค้า</span>}
                  {p.status === 'available' && <a href={webUrl} target="_blank" rel="noreferrer" className="text-gold-dark hover:underline">เผยแพร่แล้ว · ดูบนเว็บ ›</a>}
                  {p.status === 'rented' && (activeContract
                    ? <Link href={`/contracts/${activeContract.id}`} className="text-gold-dark hover:underline">ไม่ว่าง · ดูสัญญา ›</Link>
                    : <span className="text-faint">ไม่ว่าง (นอกระบบ)</span>)}
                </div>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:ml-auto sm:flex sm:shrink-0 xl:ml-0 xl:grid xl:grid-cols-1">
                {p.status === 'draft' && can('property', 'approve') && (
                  <button className="btn-gold btn-sm" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/approve`, { method: 'POST', body: '{}' }), 'เผยแพร่แล้ว — ทรัพย์ขึ้นเว็บลูกค้า')}>เผยแพร่ขึ้นเว็บ</button>
                )}
                {p.status === 'draft' && !can('property', 'approve') && can('property', 'change_status') && (
                  <button className="btn-gold btn-sm" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/submit-review`, { method: 'POST', body: '{}' }), 'ส่งให้หัวหน้าเผยแพร่แล้ว')}>ขอเผยแพร่</button>
                )}
                {can('property', 'update') && (
                  <button className={`btn-sm ${p.status === 'draft' ? 'btn-ghost' : 'btn-gold'}`} disabled={busy} onClick={openEdit}>แก้ไขข้อมูล</button>
                )}
                {can('property', 'update') && (
                  <button className={`btn-ghost btn-sm ${p.isFeatured ? 'border-gold text-gold-dark' : ''}`} disabled={busy}
                    onClick={() => run(() => api(`/properties/${p.id}`, { method: 'PATCH', body: JSON.stringify({ isFeatured: !p.isFeatured }) }), p.isFeatured ? 'เอาออกจากแนะนำแล้ว' : 'ตั้งเป็นทรัพย์แนะนำแล้ว', (cur) => ({ ...cur, isFeatured: !cur.isFeatured }))}>
                    <Icon name="star" size={15} /> {p.isFeatured ? 'ทรัพย์แนะนำ' : 'ตั้งเป็นแนะนำ'}
                  </button>
                )}
              </div>
            </div>
            {/* action รอง — quiet */}
            {((p.status === 'available' && (can('property', 'change_status') || can('property', 'reject'))) || (p.status === 'rented' && !activeContract && can('property', 'change_status')) || (p.status === 'draft' && can('property', 'delete'))) && (
              <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
                {p.status === 'available' && can('property', 'change_status') && <button className="text-muted transition hover:text-ink" disabled={busy} onClick={() => setConfirm('markRented')}>ทำเครื่องหมายไม่ว่าง</button>}
                {p.status === 'available' && can('property', 'reject') && <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => setConfirm('reject')}>ถอนประกาศ</button>}
                {p.status === 'rented' && !activeContract && can('property', 'change_status') && <button className="text-muted transition hover:text-ink" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'available' }) }), 'ทำเครื่องหมายว่างแล้ว — ทรัพย์กลับขึ้นเว็บ')}>ทำเครื่องหมายว่าง</button>}
                {p.status === 'draft' && can('property', 'delete') && <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => setConfirm('delete')}>ลบทรัพย์</button>}
              </div>
            )}
          </div>
        </div>

        {/* เนื้อหา — label-value ราง (กฎ 1) */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          {hasRoomInfo && (
            /* label-value ล้วน ไม่มีไอคอนหน้า field — ให้ตรงทุกหน้า (minimal · §8 รางระดับเดียว) */
            <InfoGroup label="ห้อง & พื้นที่" className="mb-4">
              <InfoRow label="ห้องนอน" value={p.bedrooms != null ? `${p.bedrooms} ห้อง` : undefined} hideEmpty />
              <InfoRow label="ห้องน้ำ" value={p.bathrooms != null ? `${p.bathrooms} ห้อง` : undefined} hideEmpty />
              <InfoRow label="พื้นที่" value={p.areaSqm ? `${p.areaSqm} ตร.ม.` : undefined} hideEmpty />
              <InfoRow label="ชั้น" value={p.floor || undefined} hideEmpty />
              <InfoRow label="เฟอร์นิเจอร์" value={p.furnished ? (FURNISHED_TH[p.furnished] ?? p.furnished) : undefined} hideEmpty />
            </InfoGroup>
          )}
          {hasLocation && (
            <InfoGroup label="ทำเล" className="mb-4">
              <InfoRow label="โครงการ" value={p.projectName || undefined} hideEmpty />
              <InfoRow label="จังหวัด" value={p.province || undefined} hideEmpty />
              <InfoRow label="เขต / อำเภอ" value={p.district || undefined} hideEmpty />
            </InfoGroup>
          )}
          {p.descriptionTh && (
            <InfoGroup label="รายละเอียด" className="mb-4">
              <InfoRow label="รายละเอียด" stack value={<span className="whitespace-pre-line leading-relaxed">{p.descriptionTh}</span>} />
            </InfoGroup>
          )}
          {amenities.length > 0 && (
            <InfoGroup label="สิ่งอำนวยความสะดวก" className="mb-4">
              <RailBlock className="py-2.5">
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((a) => <span key={a} className="badge bg-canvas text-ink-soft">{amenityLabels[a] ?? a}</span>)}
                </div>
              </RailBlock>
            </InfoGroup>
          )}
          {p.depositMonths != null && (
            <InfoGroup label="เงื่อนไขการเช่า" className="mb-4">
              <InfoRow label="เงินมัดจำ" value={`${p.depositMonths} เดือน`} />
            </InfoGroup>
          )}
          {p.owner && (
            <InfoGroup label="เจ้าของทรัพย์" className="mb-4">
              <InfoRow label="ชื่อ" value={p.owner.fullName} href={p.owner.id ? `/owners/${p.owner.id}` : undefined} strong hideChevron />
              <InfoRow label="เบอร์โทร" value={p.owner.phone ? <PhoneLink phone={p.owner.phone} /> : undefined} hideEmpty />
              <InfoRow label="อีเมล" value={p.owner.email || undefined} hideEmpty />
              <InfoRow label="จำนวนทรัพย์ที่ถือ" value={p.owner._count ? `${p.owner._count.properties} รายการ` : undefined} hideEmpty />
            </InfoGroup>
          )}
          <section className="mb-4 scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>เอกสาร</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><DocumentSection entityType="property" entityId={p.id} /></div>
          </section>
          <section className="scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>ประวัติ</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><ActivityTimeline path={`/properties/${p.id}/activities`} /></div>
          </section>
        </div>
      </div>

      <Modal open={!!editInitial} onClose={() => setEditInitial(null)} title="แก้ไขทรัพย์" size="xl">
        {editInitial && (
          <PropertyForm mode="edit" initial={editInitial}
            onClose={() => setEditInitial(null)}
            onSaved={() => { setEditInitial(null); load(); toast.success('บันทึกการแก้ไขแล้ว'); }} />
        )}
      </Modal>

      <ConfirmDialog open={confirm === 'reject'} onClose={() => setConfirm(null)} busy={busy}
        title="ถอนประกาศ" tone="danger" confirmLabel="ถอนประกาศ" withReason
        message={<>ถอนประกาศ <b>{p.code}</b> กลับเป็นฉบับร่าง? ลูกค้าจะไม่เห็นทรัพย์นี้บนเว็บ</>}
        reasonPlaceholder="เหตุผลที่ถอน (ถ้ามี)"
        onConfirm={(reason) => { setConfirm(null); run(() => api(`/properties/${p.id}/reject`, { method: 'POST', body: JSON.stringify({ reason }) }), 'ถอนประกาศแล้ว — กลับเป็นร่าง'); }} />
      <ConfirmDialog open={confirm === 'delete'} onClose={() => setConfirm(null)} busy={busy}
        title="ลบทรัพย์" tone="danger" confirmLabel="ลบทรัพย์"
        message={<>ลบทรัพย์ <b>{p.code}</b>? การลบไม่สามารถย้อนกลับได้</>}
        onConfirm={() => { setConfirm(null); run(async () => { await api(`/properties/${p.id}`, { method: 'DELETE' }); router.push('/properties'); }); }} />
      <ConfirmDialog open={confirm === 'markRented'} onClose={() => setConfirm(null)} busy={busy}
        title="ทำเครื่องหมายไม่ว่าง" confirmLabel="ทำเครื่องหมายไม่ว่าง" withReason
        message={<>ทำเครื่องหมายว่า <b>{p.code}</b> ไม่ว่าง (ปล่อยเช่านอกระบบ)? ทรัพย์จะถูกถอนออกจากเว็บลูกค้า</>}
        reasonPlaceholder="เหตุผล เช่น ปล่อยเช่าเองนอกระบบ (ถ้ามี)"
        onConfirm={(reason) => { setConfirm(null); run(() => api(`/properties/${p.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'rented', reason }) }), 'ทำเครื่องหมายไม่ว่างแล้ว'); }} />

      {lightbox !== null && (
        <Lightbox images={p.media.map((m) => mediaUrl(m.storageKey))} index={lightbox}
          onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </div>
  );
}

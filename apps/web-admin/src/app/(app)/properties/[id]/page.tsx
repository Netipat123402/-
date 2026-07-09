'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { mediaUrl } from '@/lib/api';
import { PROPERTY_STATUS, bahtFormat } from '@/lib/status';
import { ActionBar, ConfirmDialog, DetailHeader, InfoGroup, InfoRow, Modal, MoreMenu, PhoneLink, ProgressBar, SectionLabel, SectionNav, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import PropertyForm, { type PropertyInitial } from '@/components/PropertyForm';
import ActivityTimeline from '@/components/ActivityTimeline';
import DocumentSection from '@/components/DocumentSection';
import Lightbox from '@/components/Lightbox';

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

  // โหลดข้อมูลเต็มแล้วเปิด modal แก้ไข (ใช้ร่วมทั้ง primary/secondary ตามสถานะ) — ใช้ route id (คงที่)
  async function openEdit() {
    try { const r = await api<PropertyInitial & { amenities?: Record<string, boolean> }>(`/properties/${id}`); setEditInitial({ ...r.data, id }); }
    catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
  }

  return (
    <div className="mx-auto max-w-3xl">
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
      {/* หมายเหตุ: สเปค (ประเภท/นอน/น้ำ/พื้นที่) ไม่โชว์ที่หัวแล้ว — อยู่ในกล่อง "ห้อง & พื้นที่" ด้านล่าง (กฎ 1 บรรทัด 1 ข้อมูล) */}

      {/* การกระทำ — 1 primary(gold) ตามสถานะ · featured ghost · อันตราย/รองยุบใน ⋯ (Phase 8) */}
      <ActionBar className="mt-4">
        {p.status === 'draft' && can('property', 'approve') && (
          <button className="btn-gold btn-sm" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/approve`, { method: 'POST', body: '{}' }), 'เผยแพร่แล้ว — ทรัพย์ขึ้นเว็บลูกค้า')}>เผยแพร่ขึ้นเว็บ</button>
        )}
        {p.status === 'draft' && !can('property', 'approve') && can('property', 'change_status') && (
          <button className="btn-gold btn-sm" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/submit-review`, { method: 'POST', body: '{}' }), 'ส่งให้หัวหน้าเผยแพร่แล้ว')}>ขอเผยแพร่</button>
        )}
        {p.status !== 'draft' && can('property', 'update') && (
          <button className="btn-gold btn-sm" disabled={busy} onClick={openEdit}>แก้ไขข้อมูล</button>
        )}
        {p.status === 'draft' && can('property', 'update') && (
          <button className="btn-ghost btn-sm" disabled={busy} onClick={openEdit}>แก้ไขข้อมูล</button>
        )}
        {can('property', 'update') && (
          <button className={`btn-ghost btn-sm ${p.isFeatured ? 'border-gold text-gold-dark' : ''}`} disabled={busy}
            onClick={() => run(() => api(`/properties/${p.id}`, { method: 'PATCH', body: JSON.stringify({ isFeatured: !p.isFeatured }) }), p.isFeatured ? 'เอาออกจากแนะนำแล้ว' : 'ตั้งเป็นทรัพย์แนะนำแล้ว', (cur) => ({ ...cur, isFeatured: !cur.isFeatured }))}>
            <Icon name="star" size={15} /> {p.isFeatured ? 'ทรัพย์แนะนำ' : 'ตั้งเป็นแนะนำ'}
          </button>
        )}
        <MoreMenu items={[
          ...(p.status === 'available' && can('property', 'change_status') ? [{ label: 'ทำเครื่องหมายไม่ว่าง', icon: 'key' as const, onClick: () => setConfirm('markRented') }] : []),
          ...(p.status === 'available' && can('property', 'reject') ? [{ label: 'ถอนประกาศ', icon: 'file-text' as const, danger: true, onClick: () => setConfirm('reject') }] : []),
          ...(p.status === 'draft' && can('property', 'delete') ? [{ label: 'ลบทรัพย์', icon: 'trash' as const, danger: true, onClick: () => setConfirm('delete') }] : []),
        ]} />
      </ActionBar>

      {/* hint ตามสถานะ — แถบบาง ไม่กินพื้นที่ */}
      {p.status === 'draft' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink-soft">
          <Icon name="file-text" size={14} className="shrink-0 text-muted" />
          <span><b>ฉบับร่าง</b> — ยังไม่แสดงบนเว็บลูกค้า กด <b>“เผยแพร่ขึ้นเว็บ”</b> เมื่อข้อมูลครบ</span>
        </div>
      )}
      {p.status === 'available' && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-muted">
          <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="shrink-0 text-success" /> เผยแพร่บนเว็บลูกค้าแล้ว</span>
          <a href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/properties/${p.code}`}
            target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium text-gold-dark hover:underline">ดูบนเว็บ <Icon name="arrow-right" size={13} /></a>
        </div>
      )}
      {/* ไม่ว่าง (Phase 13 · ข้อ 14) — ให้ "ทางไปต่อ" แทนทางตัน:
          • ผูกสัญญา active → ลิงก์เข้าสัญญา (คืนทรัพย์โดยปิดสัญญา ไม่ใช่ปลดที่นี่)
          • ไม่ว่างแบบ manual (ไม่มีสัญญา live) → ปุ่ม "ทำเครื่องหมายว่าง" */}
      {p.status === 'rented' && (() => {
        const active = p.contracts?.[0];
        return (
          <div className="mt-4 overflow-hidden rounded-lg border border-gold/30 bg-gold/5">
            <div className="flex items-center gap-2 px-3 py-2 text-xs text-gold-dark">
              <Icon name="key" size={14} className="shrink-0" />
              <span><b>ไม่ว่าง</b> — {active ? 'ปล่อยเช่าตามสัญญาที่มีผลอยู่' : 'ทำเครื่องหมายไว้ว่าไม่ว่าง (ไม่มีสัญญาในระบบ)'}</span>
            </div>
            {active ? (
              <Link href={`/contracts/${active.id}`}
                className="flex items-center justify-between gap-2 border-t border-gold/20 px-3 py-2.5 text-sm transition hover:bg-gold/10">
                <span className="inline-flex items-center gap-1.5 text-ink"><Icon name="file-text" size={15} className="text-gold-dark" /> ดูสัญญา <span className="font-mono text-xs text-muted">{active.code}</span></span>
                <Icon name="chevron-right" size={16} className="text-faint" />
              </Link>
            ) : can('property', 'change_status') ? (
              <div className="border-t border-gold/20 px-3 py-2.5">
                <button className="btn-ghost btn-sm" disabled={busy}
                  onClick={() => run(() => api(`/properties/${p.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'available' }) }), 'ทำเครื่องหมายว่างแล้ว — ทรัพย์กลับขึ้นเว็บ')}>
                  ทำเครื่องหมายว่าง
                </button>
              </div>
            ) : null}
          </div>
        );
      })()}

      {/* รูปทรัพย์ — แบบเดียวกับหน้าเว็บ (รูปใหญ่ + ลูกศร + thumbnail + lightbox) + ปุ่มจัดการ */}
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
                className="group relative aspect-[16/9] w-full overflow-hidden rounded-card bg-canvas outline-none focus-visible:ring-2 focus-visible:ring-gold max-h-[40vh] sm:max-h-[34vh]">
                {p.media.map((m, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img key={m.id} src={mediaUrl(m.storageKey)} alt="" onClick={() => setLightbox(idx)}
                    className={`absolute inset-0 h-full w-full cursor-zoom-in object-cover transition-opacity duration-200 ${i === idx ? 'opacity-100' : 'opacity-0'}`} />
                ))}
                {has && (
                  <>
                    <button aria-label="รูปก่อนหน้า" onClick={() => setImgIdx((idx - 1 + p.media.length) % p.media.length)}
                      className="absolute left-2.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition duration-150 hover:bg-black/65 active:scale-90 active:bg-black/75"><Icon name="chevron-left" size={20} /></button>
                    <button aria-label="รูปถัดไป" onClick={() => setImgIdx((idx + 1) % p.media.length)}
                      className="absolute right-2.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition duration-150 hover:bg-black/65 active:scale-90 active:bg-black/75"><Icon name="chevron-right" size={20} /></button>
                    <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/55 px-2.5 py-1 text-xs font-medium text-white">{idx + 1} / {p.media.length}</span>
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

      {/* section nav — กระโดดไปแต่ละส่วน (หน้ายาว · Stripe/Linear) · dynamic ตามส่วนที่มีจริง */}
      <SectionNav items={[
        { id: 'sec-price', label: 'ราคา' },
        hasRoomInfo && { id: 'sec-room', label: 'ห้อง & พื้นที่' },
        hasLocation && { id: 'sec-location', label: 'ทำเล' },
        p.descriptionTh && { id: 'sec-desc', label: 'รายละเอียด' },
        amenities.length > 0 && { id: 'sec-amenities', label: 'สิ่งอำนวยฯ' },
        p.owner && { id: 'sec-owner', label: 'เจ้าของ' },
      ].filter(Boolean) as { id: string; label: string }[]} />
      {/* ข้อมูลทรัพย์ (Phase 10) — 1 บรรทัด 1 ข้อมูล ไล่ลง เรียงตามความสำคัญ: ราคา→ห้อง→ทำเล→รายละเอียด→สิ่งอำนวยฯ */}
      <div className="space-y-4">
        <InfoGroup label="ราคา & เงื่อนไข" id="sec-price">
          <InfoRow label="ค่าเช่า / เดือน" value={`฿${bahtFormat(Number(p.monthlyRent))}`} strong mono />
          <InfoRow label="เงินมัดจำ" value={p.depositMonths ? `${p.depositMonths} เดือน` : undefined} hideEmpty />
        </InfoGroup>

        {hasRoomInfo && (
          <InfoGroup label="ห้อง & พื้นที่" id="sec-room">
            <InfoRow icon="bed" label="ห้องนอน" value={p.bedrooms != null ? `${p.bedrooms} ห้อง` : undefined} hideEmpty />
            <InfoRow icon="bath" label="ห้องน้ำ" value={p.bathrooms != null ? `${p.bathrooms} ห้อง` : undefined} hideEmpty />
            <InfoRow icon="area" label="พื้นที่" value={p.areaSqm ? `${p.areaSqm} ตร.ม.` : undefined} hideEmpty />
            <InfoRow icon="floor" label="ชั้น" value={p.floor || undefined} hideEmpty />
            <InfoRow icon="sofa" label="เฟอร์นิเจอร์" value={p.furnished ? (FURNISHED_TH[p.furnished] ?? p.furnished) : undefined} hideEmpty />
          </InfoGroup>
        )}

        {hasLocation && (
          <InfoGroup label="ทำเล" id="sec-location">
            <InfoRow label="โครงการ" value={p.projectName || undefined} hideEmpty />
            <InfoRow label="จังหวัด" value={p.province || undefined} hideEmpty />
            <InfoRow label="เขต / อำเภอ" value={p.district || undefined} hideEmpty />
          </InfoGroup>
        )}

        {p.descriptionTh && (
          <InfoGroup label="รายละเอียด" id="sec-desc">
            <p className="whitespace-pre-line py-3 text-sm leading-relaxed text-ink-soft">{p.descriptionTh}</p>
          </InfoGroup>
        )}

        {amenities.length > 0 && (
          <InfoGroup label="สิ่งอำนวยความสะดวก" id="sec-amenities">
            <div className="flex flex-wrap gap-1.5 py-3">
              {amenities.map((a) => <span key={a} className="badge bg-canvas text-ink-soft">{amenityLabels[a] ?? a}</span>)}
            </div>
          </InfoGroup>
        )}
      </div>

      {/* เจ้าของทรัพย์ (Phase 11) — InfoGroup: ชื่อ(กดเข้า owner)/เบอร์(แตะโทร)/อีเมล/จำนวนทรัพย์ที่ถือ */}
      {p.owner && (
        <InfoGroup label="เจ้าของทรัพย์" className="mt-6" id="sec-owner">
          <InfoRow label="ชื่อ" value={p.owner.fullName} href={p.owner.id ? `/owners/${p.owner.id}` : undefined} strong />
          <InfoRow label="เบอร์โทร" value={p.owner.phone ? <PhoneLink phone={p.owner.phone} /> : undefined} hideEmpty />
          <InfoRow label="อีเมล" value={p.owner.email || undefined} hideEmpty />
          <InfoRow label="จำนวนทรัพย์ที่ถือ" value={p.owner._count ? `${p.owner._count.properties} รายการ` : undefined} hideEmpty />
        </InfoGroup>
      )}

      {/* documents */}
      <div className="mt-6 card p-5">
        <SectionLabel className="mb-4">เอกสาร</SectionLabel>
        <DocumentSection entityType="property" entityId={p.id} />
      </div>

      {/* activity timeline (Activity Center ระดับ entity) */}
      <div className="mt-6 card p-5">
        <SectionLabel className="mb-4">ประวัติการเปลี่ยนแปลง</SectionLabel>
        <ActivityTimeline path={`/properties/${p.id}/activities`} />
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

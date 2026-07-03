'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { mediaUrl } from '@/lib/api';
import { PROPERTY_STATUS, PROPERTY_TYPE, bahtFormat } from '@/lib/status';
import { Avatar, ConfirmDialog, Modal, PhoneLink, ProgressBar, SectionLabel, StatusBadge } from '@/components/ui';
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
  media: Media[]; owner?: { id?: string; fullName: string; phone?: string };
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
  const [confirm, setConfirm] = useState<null | 'reject' | 'delete'>(null);
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

  if (loading) return <div className="mx-auto max-w-4xl"><div className="h-64 animate-pulse rounded-card bg-canvas" /></div>;
  if (!p) return <div className="mx-auto max-w-4xl text-center text-muted">ไม่พบทรัพย์ <Link href="/properties" className="text-gold-dark underline">กลับ</Link></div>;

  // ข้อมูลหลัก (ราคา + facts) ย้ายไปเด่นบนหัว — ตารางนี้เหลือรายละเอียดรอง
  const facts = [
    PROPERTY_TYPE[p.propertyType] ?? p.propertyType,
    p.bedrooms != null ? `${p.bedrooms} นอน` : null,
    p.bathrooms != null ? `${p.bathrooms} น้ำ` : null,
    p.areaSqm ? `${p.areaSqm} ตร.ม.` : null,
  ].filter(Boolean).join(' · ');
  // จัด "ข้อมูลทรัพย์" เป็นหมวดชัดเจน — ตรงกับขั้นตอนตอนเพิ่มทรัพย์ (ราคา/มัดจำ แยกจากรายละเอียดห้อง)
  const FURNISHED_TH: Record<string, string> = { fully: 'เฟอร์นิเจอร์ครบ', partial: 'เฟอร์นิเจอร์บางส่วน', unfurnished: 'ไม่มีเฟอร์นิเจอร์' };
  const dash = (v?: string | number | null) => (v === 0 || v ? String(v) : '—');
  const groups: { title: string; items: [string, React.ReactNode][] }[] = [
    { title: 'ห้อง & พื้นที่', items: [
      ['ห้องนอน', p.bedrooms != null ? `${p.bedrooms} ห้อง` : '—'],
      ['ห้องน้ำ', p.bathrooms != null ? `${p.bathrooms} ห้อง` : '—'],
      ['พื้นที่', p.areaSqm ? `${p.areaSqm} ตร.ม.` : '—'],
      ['ชั้น', dash(p.floor)],
      ['เฟอร์นิเจอร์', p.furnished ? (FURNISHED_TH[p.furnished] ?? p.furnished) : '—'],
    ] },
    { title: 'ราคา & เงื่อนไข', items: [
      ['ค่าเช่า / เดือน', `฿${bahtFormat(Number(p.monthlyRent))}`],
      ['เงินมัดจำ', p.depositMonths ? `${p.depositMonths} เดือน` : '—'],
    ] },
    { title: 'ทำเล', items: [
      ['โครงการ', dash(p.projectName)],
      ['จังหวัด', dash(p.province)],
      ['เขต / อำเภอ', dash(p.district)],
    ] },
  ];
  const amenities = Object.entries(p.amenities ?? {}).filter(([, v]) => v).map(([k]) => k);

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/properties" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Icon name="arrow-left" size={16} /> กลับ</Link>

      {/* หัวข้อ — ลำดับชั้นตั้งเดียว (กวาดสายตาบน→ล่าง): meta → ชื่อโครงการ → คำบรรยาย → ราคา → facts
          ชื่อหลัก = ชื่อโครงการ (สั้น ตรงกับการ์ด/หน้า public); ราคากับ facts แยกบรรทัด ไม่ inline-wrap เป็นคลื่น */}
      <div className="mt-3">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="font-mono text-xs text-muted">{p.code}</span>
          <StatusBadge map={PROPERTY_STATUS} value={p.status} />
          <span className="inline-flex items-center gap-1 text-xs text-muted"><Icon name="search" size={13} className="opacity-60" /> ดู {p.viewCount ?? 0} ครั้ง</span>
        </div>
        <h1 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{p.projectName || p.titleTh}</h1>
        {p.projectName && <p className="mt-0.5 text-sm text-muted">{p.titleTh}</p>}
        <p className="mt-2 text-2xl font-bold tracking-tight text-gold-dark">฿{bahtFormat(Number(p.monthlyRent))}<span className="ml-0.5 text-sm font-normal text-muted">/เดือน</span></p>
        {facts && <p className="mt-1 text-sm text-muted">{facts}</p>}
      </div>

      {/* การกระทำทั้งหมดรวมแถวเดียว — แก้ไข + lifecycle ตามสถานะ */}
      <div className="mt-4 flex flex-wrap gap-2">
        {can('property', 'update') && (
          <button className="btn-ghost btn-sm" disabled={busy}
            onClick={async () => {
              try { const r = await api<PropertyInitial & { amenities?: Record<string, boolean> }>(`/properties/${p.id}`); setEditInitial({ ...r.data, id: p.id }); }
              catch { toast.error('โหลดข้อมูลไม่สำเร็จ'); }
            }}>แก้ไขข้อมูล</button>
        )}
        {/* กดดาว = ทรัพย์แนะนำ บนเว็บลูกค้า */}
        {can('property', 'update') && (
          <button className={`btn-ghost btn-sm ${p.isFeatured ? 'border-gold text-gold-dark' : ''}`} disabled={busy}
            onClick={() => run(() => api(`/properties/${p.id}`, { method: 'PATCH', body: JSON.stringify({ isFeatured: !p.isFeatured }) }), p.isFeatured ? 'เอาออกจากแนะนำแล้ว' : 'ตั้งเป็นทรัพย์แนะนำแล้ว', (cur) => ({ ...cur, isFeatured: !cur.isFeatured }))}>
            <Icon name="star" size={15} /> {p.isFeatured ? 'ทรัพย์แนะนำ' : 'ตั้งเป็นแนะนำ'}
          </button>
        )}
        {p.status === 'draft' && can('property', 'approve') &&
          <button className="btn-gold btn-sm" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/approve`, { method: 'POST', body: '{}' }), 'เผยแพร่แล้ว — ทรัพย์ขึ้นเว็บลูกค้า')}>เผยแพร่ขึ้นเว็บ</button>}
        {p.status === 'draft' && !can('property', 'approve') && can('property', 'change_status') &&
          <button className="btn-primary btn-sm" disabled={busy} onClick={() => run(() => api(`/properties/${p.id}/submit-review`, { method: 'POST', body: '{}' }), 'ส่งให้หัวหน้าเผยแพร่แล้ว')}>ขอเผยแพร่</button>}
        {p.status === 'available' && can('property', 'reject') &&
          <button className="btn-ghost btn-sm text-danger" disabled={busy} onClick={() => setConfirm('reject')}>ถอนประกาศ</button>}
        {p.status === 'draft' && can('property', 'delete') &&
          <button className="btn-ghost btn-sm text-danger" disabled={busy} onClick={() => setConfirm('delete')}>ลบ</button>}
      </div>

      {/* hint ตามสถานะ — แถบบาง ไม่กินพื้นที่ */}
      {p.status === 'draft' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-ink-soft">
          <Icon name="file-text" size={14} className="shrink-0 text-muted" />
          <span><b>ฉบับร่าง</b> — ยังไม่แสดงบนเว็บลูกค้า กด <b>“เผยแพร่ขึ้นเว็บ”</b> เมื่อข้อมูลครบ</span>
        </div>
      )}
      {p.status === 'available' && (
        <div className="mt-4 flex items-center justify-between gap-2 rounded-lg border border-success/30 bg-success/5 px-3 py-2 text-xs text-success">
          <span className="inline-flex items-center gap-1.5"><Icon name="check" size={14} className="shrink-0" /><b>ว่าง · เผยแพร่แล้ว</b></span>
          <a href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:3000/properties/${p.code}`}
            target="_blank" rel="noreferrer" className="inline-flex shrink-0 items-center gap-1 font-medium underline">ดูบนเว็บ <Icon name="arrow-right" size={13} /></a>
        </div>
      )}
      {p.status === 'rented' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold-dark">
          <Icon name="key" size={14} className="shrink-0" />
          <span><b>ไม่ว่าง</b> — มีสัญญาเช่าอยู่ จะกลับมาว่างเมื่อสัญญาสิ้นสุด</span>
        </div>
      )}

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
                      className="absolute left-2.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition duration-150 hover:bg-ink/70 active:scale-90 active:bg-ink/80"><Icon name="chevron-left" size={20} /></button>
                    <button aria-label="รูปถัดไป" onClick={() => setImgIdx((idx + 1) % p.media.length)}
                      className="absolute right-2.5 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-ink/45 text-white backdrop-blur-sm transition duration-150 hover:bg-ink/70 active:scale-90 active:bg-ink/80"><Icon name="chevron-right" size={20} /></button>
                    <span className="absolute bottom-3 right-3 z-10 rounded-full bg-ink/55 px-2.5 py-1 text-xs font-medium text-white">{idx + 1} / {p.media.length}</span>
                  </>
                )}
                {active.isCover && <span className="absolute left-3 top-3 z-10 badge bg-gold text-white">ปก</span>}
                {can('property', 'update') && (
                  <div className="absolute right-3 top-3 z-10 flex gap-1.5 opacity-0 transition group-hover:opacity-100">
                    {!active.isCover && <button className="rounded-lg bg-ink/65 px-2.5 py-1 text-xs text-white hover:bg-ink/85" onClick={() => run(() => api(`/properties/${p.id}/media/${active.id}/cover`, { method: 'POST', body: '{}' }))}>ตั้งเป็นปก</button>}
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

      {/* ข้อมูลทรัพย์ — แยกหมวดชัดเจน อ่านไล่ทีละกลุ่ม (เหมือนตอนเพิ่มทรัพย์) */}
      <div className="mt-6 card divide-y divide-border">
        {groups.map((g) => (
          <section key={g.title} className="p-5">
            <SectionLabel className="mb-3">{g.title}</SectionLabel>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {g.items.map(([k, v]) => (
                <div key={k} className="min-w-0">
                  <dt className="text-xs text-muted">{k}</dt>
                  <dd className="truncate text-sm text-ink">{v}</dd>
                </div>
              ))}
            </dl>
          </section>
        ))}
        {(p.descriptionTh || amenities.length > 0) && (
          <section className="space-y-4 p-5">
            {p.descriptionTh && (
              <div>
                <SectionLabel className="mb-2">รายละเอียด</SectionLabel>
                <p className="whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.descriptionTh}</p>
              </div>
            )}
            {amenities.length > 0 && (
              <div>
                <SectionLabel className="mb-2">สิ่งอำนวยความสะดวก</SectionLabel>
                <div className="flex flex-wrap gap-1.5">
                  {amenities.map((a) => <span key={a} className="badge bg-canvas text-ink-soft">{amenityLabels[a] ?? a}</span>)}
                </div>
              </div>
            )}
          </section>
        )}
      </div>

      {/* เจ้าของทรัพย์ — การ์ดกดเข้าหน้าเจ้าของได้ (เชื่อมหน้าเจ้าของ Phase 3) */}
      {p.owner && (
        <div className="mt-6 card p-5">
          <SectionLabel className="mb-3">เจ้าของทรัพย์</SectionLabel>
          <button onClick={() => p.owner?.id && router.push(`/owners/${p.owner.id}`)} disabled={!p.owner.id}
            className="flex w-full items-center gap-3 text-left transition enabled:hover:opacity-70">
            <Avatar name={p.owner.fullName} size={42} />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">{p.owner.fullName}</p>
              <PhoneLink phone={p.owner.phone} className="text-sm text-muted" />
            </div>
            {p.owner.id && <Icon name="chevron-right" size={18} className="shrink-0 text-faint" />}
          </button>
        </div>
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

      {lightbox !== null && (
        <Lightbox images={p.media.map((m) => mediaUrl(m.storageKey))} index={lightbox}
          onClose={() => setLightbox(null)} onIndex={setLightbox} />
      )}
    </div>
  );
}

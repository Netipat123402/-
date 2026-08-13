'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Combobox, ConfirmDialog, ProgressBar, SectionLabel, Spinner } from '@/components/ui';
import { Icon } from '@/components/Icon';
import Lightbox from '@/components/Lightbox';

interface DocVersion { mimeType?: string }
interface Doc {
  id: string; name: string; documentType: string; status: string;
  currentVersion?: DocVersion;
}

// ป้าย = catalog (docType.* / docStatus.*) แปลตอน render · code คงเดิม
const DOC_TYPE_CODES = ['title_deed', 'id_card', 'house_registration', 'lease', 'receipt', 'power_of_attorney', 'property_photo', 'other'];
const STATUS_CLS: Record<string, string> = {
  uploaded: 'bg-info/10 text-info', verified: 'bg-success/10 text-success',
  active: 'bg-success/10 text-success', archived: 'bg-border text-ink-soft',
};

export default function DocumentSection({
  entityType, entityId, canEdit = true, onDocsLoaded,
}: {
  entityType: string; entityId: string; canEdit?: boolean;
  // แจ้งชุดเอกสารล่าสุดให้ parent (เช่น checklist ก่อนลงนามสัญญา) — เรียกทุกครั้งที่ load
  onDocsLoaded?: (docs: { documentType: string; status: string }[]) => void;
}) {
  const t = useTranslations();
  const { api, upload, apiBlob, can } = useAuth();
  const toast = useToast();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [docType, setDocType] = useState('id_card');
  const [busy, setBusy] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null); // แถวที่กางปุ่มจัดการ (ตรวจ/เก็บถาวร/ลบ)
  const [openingId, setOpeningId] = useState<string | null>(null);    // กำลังโหลดไฟล์เพื่อเปิด (โชว์ spinner)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);  // objectURL รูปที่กำลังพรีวิวใน Lightbox
  const [pending, setPending] = useState<{ kind: 'delete' | 'archive'; id: string } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const LIMIT = 5;

  // เก็บ callback ใน ref → ไม่ต้องใส่ใน deps ของ load (กัน parent ส่ง inline fn แล้ว refetch วนไม่จบ)
  const onDocsLoadedRef = useRef(onDocsLoaded);
  onDocsLoadedRef.current = onDocsLoaded;
  const load = useCallback(async () => {
    try { const r = await api<Doc[]>(`/entities/${entityType}/${entityId}/documents`); setDocs(r.data ?? []); onDocsLoadedRef.current?.(r.data ?? []); }
    catch { /* */ } finally { setLoading(false); }
  }, [api, entityType, entityId]);
  useEffect(() => { load(); }, [load]);

  async function uploadDoc(file: File) {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('documentType', docType);
    fd.append('name', file.name.slice(0, 200)); // MR-42: กันชื่อไฟล์ยาว >200 ทำ DTO 400
    fd.append('entityType', entityType);
    fd.append('entityId', entityId);
    setUploadPct(0);
    try {
      await upload('/documents/upload', fd, setUploadPct);
      await load();
      toast.success(t('documents.toastAttached'));
    } catch (e) { toast.error((e as { message?: string }).message || t('documents.toastUploadFailed')); }
    finally { setUploadPct(null); }
  }

  // เอกสารไม่ใช่ static — ดึง blob ผ่าน endpoint ที่เช็คสิทธิ์ + บันทึก audit
  // เฉพาะ "รูปภาพ" → พรีวิวใน Lightbox (ในหน้า ลื่นกว่าเปิดแท็บใหม่)
  // ชนิดอื่น (PDF / HTML ใบเสร็จ / ฯลฯ) → เปิดแท็บใหม่ ให้เบราว์เซอร์เรนเดอร์ถูกชนิด
  async function openDoc(d: Doc) {
    const isImage = d.currentVersion?.mimeType?.startsWith('image/');
    setOpeningId(d.id);
    try {
      const blob = await apiBlob(`/documents/${d.id}/download`);
      const url = URL.createObjectURL(blob);
      if (isImage) {
        setPreviewUrl(url); // Lightbox จะ revoke ตอนปิด
      } else {
        window.open(url, '_blank');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      }
    } catch (e) { toast.error((e as { message?: string }).message || t('documents.toastOpenFailed')); }
    finally { setOpeningId(null); }
  }
  function closePreview() { if (previewUrl) URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }

  // optimistic: เปลี่ยนสถานะ/ลบแถวในเครื่องทันที แล้วยิง API เบื้องหลัง · load() ปิดท้าย sync ความจริง (สำเร็จ=ยืนยัน, ล้มเหลว=rollback)
  async function verify(id: string) {
    setBusy(true);
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, status: 'verified' } : d)));
    try { await api(`/documents/${id}/verify`, { method: 'POST', body: '{}' }); toast.success(t('documents.toastVerified')); load(); }
    catch (e) { toast.error((e as { message?: string }).message || t('documents.toastFailed')); load(); }
    finally { setBusy(false); }
  }
  async function remove(id: string) {
    setBusy(true);
    setDocs((ds) => ds.filter((d) => d.id !== id));
    try { await api(`/documents/${id}`, { method: 'DELETE' }); toast.success(t('documents.toastDeleted')); load(); }
    catch (e) { toast.error((e as { message?: string }).message || t('documents.toastDeleteFailed')); load(); }
    finally { setBusy(false); }
  }
  async function archive(id: string) {
    setBusy(true);
    setDocs((ds) => ds.map((d) => (d.id === id ? { ...d, status: 'archived' } : d)));
    try { await api(`/documents/${id}/archive`, { method: 'POST', body: '{}' }); toast.success(t('documents.toastArchived')); load(); }
    catch (e) { toast.error((e as { message?: string }).message || t('documents.toastFailed')); load(); }
    finally { setBusy(false); }
  }

  return (
    <div>
      {canEdit && can('document', 'upload') && (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="w-44">
            <Combobox searchable={false} size="sm" label="" value={docType} onChange={setDocType}
              options={DOC_TYPE_CODES.map((k) => ({ value: k, label: t(`docType.${k}`) }))} />
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" hidden
            onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadDoc(f); e.target.value = ''; }} />
          <button className="btn-ghost h-9" disabled={busy || uploadPct !== null} onClick={() => fileRef.current?.click()}>
            <Icon name="plus" size={16} /> {t('documents.attach')}
          </button>
        </div>
      )}

      {uploadPct !== null && (
        <div className="mb-4">
          <ProgressBar value={uploadPct} />
          <p className="mt-1 text-xs text-muted">{t('documents.uploading', { pct: uploadPct })}</p>
        </div>
      )}

      {loading ? (
        <div className="h-16 animate-pulse rounded-lg bg-canvas" />
      ) : docs.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted">{t('documents.none')}</p>
      ) : (
        // จัดกลุ่มตาม "ประเภทเอกสาร" (taxonomy) → หัวข้อกลุ่มทำให้หาเจอแม้ผ่านไปนาน + ลิสต์ไม่ปนมั่ว
        // จำกัด LIMIT แถวก่อน แล้วค่อยจัดกลุ่มจากชุดที่แสดง (กด"ดูทั้งหมด" เพื่อกางครบ)
        <div className="space-y-4">
          {DOC_TYPE_CODES
            .map((code) => ({ type: code, items: (showAll ? docs : docs.slice(0, LIMIT)).filter((d) => d.documentType === code) }))
            .filter((g) => g.items.length > 0)
            .map((g) => (
              <div key={g.type}>
                <SectionLabel className="mb-1.5">{t(`docType.${g.type}`)} <span className="font-normal text-faint">({g.items.length})</span></SectionLabel>
                <ul className="divide-y divide-border">
                  {g.items.map((d) => {
                    const stCls = STATUS_CLS[d.status] ?? 'bg-border text-ink-soft';
                    const stLabel = STATUS_CLS[d.status] ? t(`docStatus.${d.status}`) : d.status;
                    const isPdf = d.currentVersion?.mimeType?.includes('pdf');
                    // มีปุ่มจัดการรองหรือไม่ (ตรวจ/เก็บถาวร/ลบ) → ถ้ามีค่อยโชว์ปุ่มกาง ไม่งั้นเหลือแค่ "เปิด"
                    const canVerify = canEdit && d.status !== 'verified' && d.status !== 'archived' && can('document', 'verify');
                    const canArchive = canEdit && (d.status === 'verified' || d.status === 'active') && can('document', 'update');
                    const canDelete = canEdit && can('document', 'delete');
                    const hasMenu = canVerify || canArchive || canDelete;
                    const expanded = expandedId === d.id;
                    return (
                      <li key={d.id} className="py-3">
                        <div className="flex items-center gap-3">
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-canvas text-muted">{isPdf ? <Icon name="file-text" size={18} /> : <Icon name="image" size={18} />}</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-medium">{d.name}</p>
                          </div>
                          <span className={`badge shrink-0 ${stCls}`}>{stLabel}</span>
                          <button className="inline-flex shrink-0 items-center gap-1.5 text-sm font-medium text-gold-dark transition hover:underline disabled:opacity-60" disabled={openingId === d.id} onClick={() => openDoc(d)}>
                            {openingId === d.id && <Spinner className="h-3.5 w-3.5" />}{t('common.open')}
                          </button>
                          {hasMenu && (
                            <button aria-label={t('documents.manage')} aria-expanded={expanded}
                              className="-mr-1 shrink-0 rounded-lg p-1 text-muted transition hover:bg-raised hover:text-ink"
                              onClick={() => setExpandedId(expanded ? null : d.id)}>
                              <Icon name="chevron-down" size={16} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
                            </button>
                          )}
                        </div>
                        {/* แถวจัดการ (กางเมื่อกด) — ปุ่มรองอยู่ที่นี่ทั้งหมด ลิสต์หลักจึงสะอาด */}
                        {hasMenu && expanded && (
                          <div className="mt-2 flex items-center justify-end gap-4 pl-12">
                            {canVerify && <button className="text-sm text-success transition hover:underline" disabled={busy} onClick={() => verify(d.id)}>{t('documents.verify')}</button>}
                            {canArchive && <button className="text-sm text-muted transition hover:underline" disabled={busy} onClick={() => setPending({ kind: 'archive', id: d.id })}>{t('documents.archive')}</button>}
                            {canDelete && <button className="text-sm text-danger transition hover:underline" disabled={busy} onClick={() => setPending({ kind: 'delete', id: d.id })}>{t('common.delete')}</button>}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
        </div>
      )}
      {!loading && docs.length > LIMIT && (
        <button onClick={() => setShowAll((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-dark hover:underline">
          {showAll ? t('common.collapse') : t('common.viewAllN', { n: docs.length })}
          <Icon name="chevron-down" size={14} className={showAll ? 'rotate-180' : ''} />
        </button>
      )}

      <ConfirmDialog open={pending?.kind === 'delete'} onClose={() => setPending(null)} busy={busy}
        title={t('documents.deleteTitle')} tone="danger" confirmLabel={t('documents.deleteTitle')}
        message={t('documents.deleteMsg')}
        onConfirm={() => { const id = pending!.id; setPending(null); remove(id); }} />
      <ConfirmDialog open={pending?.kind === 'archive'} onClose={() => setPending(null)} busy={busy}
        title={t('documents.archiveTitle')} confirmLabel={t('documents.archive')}
        message={t('documents.archiveMsg')}
        onConfirm={() => { const id = pending!.id; setPending(null); archive(id); }} />

      {/* พรีวิวรูปเอกสารในหน้า (ไม่ต้องเปิดแท็บใหม่) — รูปเดียวต่อครั้ง */}
      {previewUrl && <Lightbox images={[previewUrl]} index={0} onClose={closePreview} onIndex={() => { /* รูปเดียว */ }} />}
    </div>
  );
}

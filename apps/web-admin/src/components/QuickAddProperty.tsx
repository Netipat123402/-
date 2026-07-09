'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useSearchLookup } from '@/lib/lookups';
import { Modal, Combobox } from '@/components/ui';

interface Master { code: string; labelTh: string }
interface Owner { id: string; fullName: string }

const FALLBACK_TYPES: Master[] = [
  { code: 'condo', labelTh: 'คอนโด' }, { code: 'house', labelTh: 'บ้านเดี่ยว' },
  { code: 'townhome', labelTh: 'ทาวน์โฮม' }, { code: 'apartment', labelTh: 'อพาร์ทเมนท์' },
];

/** ฟอร์มเพิ่มทรัพย์แบบลัด (จอเดียว) — กรอกขั้นต่ำแล้วบันทึกเป็นฉบับร่าง ไปเติมรายละเอียด/รูปต่อในหน้าทรัพย์ */
export default function QuickAddProperty({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { api } = useAuth();
  const router = useRouter();
  const [types, setTypes] = useState<Master[]>([]);
  const [provinces, setProvinces] = useState<Master[]>([]);
  const [f, setF] = useState({ propertyType: 'condo', ownerId: '', titleTh: '', monthlyRent: '', province: '' });
  const [fe, setFe] = useState<{ ownerId?: string; titleTh?: string; monthlyRent?: string }>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [loadErr, setLoadErr] = useState(false); // โหลด master-data ล้มเหลว (มักเพราะ session หมดอายุ)
  // ค้นหาเจ้าของฝั่ง server (MR-24 pattern) — รองรับเจ้าของ >100 ราย (เดิม limit=100 ตัดรายที่ 101+ ทิ้งเงียบๆ)
  const owners = useSearchLookup<Owner>('/owners', (o) => ({ value: o.id, label: o.fullName }), open);

  // โหลด master-data (แยกออกมาเพื่อให้ปุ่ม "ลองใหม่" เรียกซ้ำได้)
  const loadData = useCallback(async () => {
    setLoadErr(false);
    try {
      const m = await api<Record<string, Master[]>>('/public/master-data');
      setTypes(m.data.property_type ?? []);
      setProvinces(m.data.province ?? []);
    } catch {
      // เดิม catch เงียบ → dropdown ว่างโดยไม่บอกผู้ใช้ = ดูเหมือน "กดไม่ได้/พัง"
      setLoadErr(true);
    }
  }, [api]);

  // โหลด dropdown เมื่อเปิด + รีเซ็ตฟอร์ม
  useEffect(() => {
    if (!open) return;
    setF({ propertyType: 'condo', ownerId: '', titleTh: '', monthlyRent: '', province: '' });
    setFe({}); setErr('');
    loadData();
  }, [open, loadData]);

  function set<K extends keyof typeof f>(k: K, v: string) {
    setF((s) => ({ ...s, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }

  async function submit() {
    const v: typeof fe = {};
    if (!f.ownerId) v.ownerId = 'เลือกเจ้าของทรัพย์';
    if (!f.titleTh.trim()) v.titleTh = 'กรอกชื่อทรัพย์';
    if (!(Number(f.monthlyRent) > 0)) v.monthlyRent = 'กรอกค่าเช่าให้ถูกต้อง';
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      const r = await api<{ id: string }>('/properties', {
        method: 'POST',
        body: JSON.stringify({
          propertyType: f.propertyType, ownerId: f.ownerId, titleTh: f.titleTh.trim(),
          monthlyRent: Number(f.monthlyRent), province: f.province || undefined,
        }),
      });
      onClose();
      router.push(`/properties/${r.data.id}`);
    } catch (e) {
      setErr((e as Error).message || 'บันทึกไม่สำเร็จ');
      setSaving(false);
    }
  }

  const typeList = types.length ? types : FALLBACK_TYPES;

  return (
    <Modal open={open} onClose={onClose} title="เพิ่มทรัพย์แบบลัด"
      footer={
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-ghost btn-sm">ยกเลิก</button>
          <button type="button" onClick={submit} disabled={saving} className="btn-gold btn-sm">
            {saving ? 'กำลังบันทึก…' : 'สร้าง (ฉบับร่าง)'}
          </button>
        </div>
      }>
      <form onSubmit={(e) => { e.preventDefault(); submit(); }} className="space-y-4">
        {loadErr && (
          <div className="flex items-center justify-between gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm text-warning">
            <span>โหลดรายชื่อเจ้าของไม่สำเร็จ (เซสชันอาจหมดอายุ)</span>
            <button type="button" onClick={loadData} className="shrink-0 font-medium underline">ลองใหม่</button>
          </div>
        )}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">ประเภท</label>
          <div className="flex flex-wrap gap-1.5">
            {typeList.map((t) => (
              <button key={t.code} type="button" onClick={() => set('propertyType', t.code)}
                className={`rounded-lg border px-3 py-1.5 text-sm transition ${
                  f.propertyType === t.code ? 'border-gold bg-gold/15 text-gold-dark' : 'border-border bg-surface text-ink-soft hover:border-ink/40'
                }`}>
                {t.labelTh}
              </button>
            ))}
          </div>
        </div>

        <Combobox label="เจ้าของทรัพย์ *" placeholder="— เลือกเจ้าของ —" error={fe.ownerId}
          value={f.ownerId} onChange={(v) => set('ownerId', v)}
          options={owners.options} onSearch={owners.setQuery} loading={owners.loading}
          loadError={owners.error} onRetry={owners.reload} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">ชื่อทรัพย์ (ไทย) *</label>
          <input className={`field ${fe.titleTh ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
            placeholder="เช่น เดอะ เบส สุขุมวิท — 1 นอน"
            value={f.titleTh} onChange={(e) => set('titleTh', e.target.value)} />
          {fe.titleTh && <span className="mt-1 block text-xs text-danger">{fe.titleTh}</span>}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-soft">ค่าเช่า/เดือน (บาท) *</label>
          <input type="number" inputMode="numeric"
            className={`field ${fe.monthlyRent ? 'border-danger focus:border-danger focus:ring-danger/20' : ''}`}
            placeholder="เช่น 15000"
            value={f.monthlyRent} onChange={(e) => set('monthlyRent', e.target.value)} />
          {fe.monthlyRent && <span className="mt-1 block text-xs text-danger">{fe.monthlyRent}</span>}
        </div>

        <Combobox label="จังหวัด" placeholder="— เลือกจังหวัด —"
          value={f.province} onChange={(v) => set('province', v)}
          options={provinces.map((p) => ({ value: p.labelTh, label: p.labelTh }))} />

        {err && <p className="text-sm text-danger">{err}</p>}
        <p className="text-xs text-muted">บันทึกเป็นฉบับร่าง แล้วเพิ่มรูป/รายละเอียดต่อในหน้าทรัพย์</p>
      </form>
    </Modal>
  );
}

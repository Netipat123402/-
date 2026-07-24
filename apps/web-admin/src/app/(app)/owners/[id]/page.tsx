'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Avatar, Field, InfoRow, PhoneLink, SectionTabs, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
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

  function startEdit() { if (o) setForm(o); setIdCardInput(''); setEdit(true); }
  function cancelEdit() { setEdit(false); if (o) setForm(o); setIdCardInput(''); }

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
      setO((prev) => ({ ...r.data, properties: prev?.properties, contracts: prev?.contracts }));
      setEdit(false); toast.success('บันทึกแล้ว');
    } catch (e) { toast.error((e as { message?: string }).message || 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!o) return <div className="mx-auto max-w-3xl text-center text-muted">ไม่พบเจ้าของทรัพย์ <Link href="/owners" className="text-gold-dark underline">กลับ</Link></div>;

  const props = o.properties ?? [];
  const contracts = o.contracts ?? [];

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <Link href="/owners" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Icon name="arrow-left" size={16} /> กลับ</Link>

      {/* HEADER glance identifier — ชื่อ + เบอร์(ไม่มีไอคอน) + action · มือถือ stack / sm+ แนวนอน (action ขวา) */}
      <div className="mt-4 sm:flex sm:items-start sm:justify-between sm:gap-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={o.fullName} size={52} />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{o.fullName}</h1>
            {o.phone && <PhoneLink phone={o.phone} className="mt-0.5 text-sm text-muted" />}
          </div>
        </div>
        {can('owner', 'update') && !edit && (
          <button className="btn-ghost btn-sm mt-3 w-full sm:mt-0 sm:w-auto" onClick={startEdit}>แก้ไขข้อมูล</button>
        )}
      </div>

      {/* พอร์ต = glance stat (landlord: ทรัพย์คือ asset หลัก) — ยกยอดรวมจากท้ายการ์ดขึ้นหัว */}
      <div className="mt-4 flex gap-8 border-y border-border/60 py-3">
        <div>
          <div className="text-lg font-semibold tabular-nums text-ink">{props.length}</div>
          <div className="text-xs text-muted">ทรัพย์</div>
        </div>
        <div>
          <div className="text-lg font-semibold tabular-nums text-gold-dark">฿{bahtFormat(props.reduce((s, p) => s + Number(p.monthlyRent ?? 0), 0))}<span className="text-xs font-normal text-faint">/เดือน</span></div>
          <div className="text-xs text-muted">มูลค่าเช่ารวม</div>
        </div>
      </div>

      {/* per-device: มือถือ accordion · iPad/คอม แท็บ */}
      <SectionTabs className="mt-6" items={[
        { id: 'info', label: 'ข้อมูลเจ้าของ', content: (
          <div className="card p-5">
            {edit ? (
              <div className="space-y-4">
                <Field label="ชื่อ-นามสกุล" placeholder="เช่น สมชาย ใจดี" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
                <Field label="เบอร์โทร" inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} />
                <Field label="อีเมล" type="email" placeholder="name@email.com" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                <Field label="เลขบัตรประชาชน" inputMode="numeric"
                  hint={o.idCardNo ? `ปัจจุบัน: ${o.idCardNo} — เว้นว่าง = ไม่เปลี่ยน` : 'เว้นว่าง = ไม่ระบุ'}
                  placeholder="กรอกเพื่อเปลี่ยน/เพิ่ม" value={idCardInput} onChange={(e) => setIdCardInput(e.target.value)} />
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">ที่อยู่</span>
                  <textarea className="field h-auto py-2.5" rows={2} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </label>
                <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">โน้ต</span>
                  <textarea className="field h-auto py-2.5" rows={2} placeholder="บันทึกภายใน เช่น ช่องทางติดต่อที่สะดวก" value={form.note ?? ''} onChange={(e) => setForm({ ...form, note: e.target.value })} />
                </label>
                <div className="flex justify-end gap-2">
                  <button className="btn-ghost" onClick={cancelEdit}>ยกเลิก</button>
                  <button className="btn-gold" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {/* view/edit parity: โชว์ทุกฟิลด์เท่า edit (ว่าง = "—") — เบอร์/ชื่ออยู่หัว glance แล้ว */}
                <InfoRow label="อีเมล" value={o.email || undefined} />
                <InfoRow label="เลขบัตรประชาชน" value={o.idCardNo || undefined} mono />
                <InfoRow label="ที่อยู่" value={o.address || undefined} stack />
                <InfoRow label="โน้ต" value={o.note || undefined} stack />
              </div>
            )}
          </div>
        ) },
        { id: 'props', label: 'ทรัพย์', content: props.length === 0 ? (
          <p className="py-3 text-sm text-muted">ยังไม่มีทรัพย์ของเจ้าของรายนี้</p>
        ) : (
          <div className="card p-5">
            <ul className="divide-y divide-border">
              {props.map((p) => (
                <li key={p.id}>
                  <button onClick={() => router.push(`/properties/${p.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-70">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{p.titleTh}</p>
                      <p className="text-xs text-muted">{p.code}</p>
                    </div>
                    <span className="shrink-0 text-sm font-medium text-gold-dark">฿{bahtFormat(Number(p.monthlyRent))}</span>
                    <StatusBadge map={PROPERTY_STATUS} value={p.status} short />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) },
        { id: 'contracts', label: 'สัญญา', content: contracts.length === 0 ? (
          <p className="py-3 text-sm text-muted">ยังไม่มีสัญญา</p>
        ) : (
          <div className="card p-5">
            <ul className="divide-y divide-border">
              {contracts.map((c) => (
                <li key={c.id}>
                  <button onClick={() => router.push(`/contracts/${c.id}`)}
                    className="flex w-full items-center justify-between gap-3 py-3 text-left transition hover:opacity-70">
                    <span className="text-sm font-medium">{c.code}</span>
                    <StatusBadge map={CONTRACT_STATUS} value={c.status} short />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) },
        { id: 'docs', label: 'เอกสาร', content: (
          <div className="card p-5"><DocumentSection entityType="owner" entityId={o.id} /></div>
        ) },
      ]} />
    </div>
  );
}

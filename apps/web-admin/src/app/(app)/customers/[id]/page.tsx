'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Avatar, ConfirmDialog, Field, InfoRow, PhoneLink, SectionLabel, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { CONTRACT_STATUS, bahtFormat } from '@/lib/status';
import DocumentSection from '@/components/DocumentSection';
import { formatPhone } from '@/lib/format';

interface ContractLite { id: string; code: string; status: string; monthlyRent?: string; }
interface Customer { id: string; fullName: string; phone?: string; email?: string; address?: string; contracts?: ContractLite[]; }

export default function CustomerDetailPage() {
  const { api, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState<Customer>({ id: '', fullName: '' });
  const [saving, setSaving] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await api<Customer>(`/customers/${id}`); setC(r.data); setForm(r.data); }
      catch { setC(null); } finally { setLoading(false); }
    })();
  }, [api, id]);

  async function save() {
    setSaving(true);
    try {
      const r = await api<Customer>(`/customers/${id}`, { method: 'PATCH', body: JSON.stringify({
        fullName: form.fullName, phone: form.phone || undefined, email: form.email || undefined, address: form.address || undefined,
      }) });
      setC((prev) => ({ ...r.data, contracts: prev?.contracts })); setEdit(false); toast.success('บันทึกแล้ว');
    } catch (e) { toast.error((e as { message?: string }).message || 'บันทึกไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!c) return <div className="mx-auto max-w-3xl text-center text-muted">ไม่พบลูกค้า <Link href="/customers" className="text-gold-dark underline">กลับ</Link></div>;

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/customers" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Icon name="arrow-left" size={16} /> กลับ</Link>

      {/* hero — ชื่อเด่น + อักษรย่อ + แตะโทรได้ */}
      <div className="mt-4 flex items-center gap-3.5">
        <Avatar name={c.fullName} size={52} />
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{c.fullName}</h1>
          {c.phone && <PhoneLink phone={c.phone} className="mt-0.5 text-sm text-muted" />}
        </div>
      </div>

      <div className="mt-6 card p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <SectionLabel>ข้อมูลติดต่อ</SectionLabel>
          {can('customer', 'update') && !edit && <button className="text-sm text-gold-dark hover:underline" onClick={() => setEdit(true)}>แก้ไข</button>}
        </div>
        {edit ? (
          <div className="space-y-4">
            <Field label="ชื่อ-นามสกุล" placeholder="เช่น สมชาย ใจดี" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
            <Field label="เบอร์โทร" inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} />
            <Field label="อีเมล" type="email" placeholder="name@email.com" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">ที่อยู่</span>
              <textarea className="field h-auto py-2.5" rows={2} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
            </label>
            <div className="flex justify-end gap-2">
              <button className="btn-ghost" onClick={() => { setEdit(false); setForm(c); }}>ยกเลิก</button>
              <button className="btn-gold" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            <InfoRow label="เบอร์โทร" value={c.phone ? <PhoneLink phone={c.phone} /> : undefined} hideEmpty />
            <InfoRow label="อีเมล" value={c.email || undefined} hideEmpty />
            <InfoRow label="ที่อยู่" value={c.address || undefined} stack hideEmpty />
            {!c.phone && !c.email && !c.address && <p className="py-2.5 text-center text-sm text-muted">ยังไม่มีข้อมูลติดต่อ — กด “แก้ไข” เพื่อเพิ่ม</p>}
          </div>
        )}
      </div>

      {/* SECONDARY — สัญญาเช่าของลูกค้า */}
      {c.contracts && c.contracts.length > 0 && (
        <div className="mt-6 card p-5">
          <SectionLabel className="mb-4">สัญญา · {c.contracts.length}</SectionLabel>
          <ul className="divide-y divide-border">
            {c.contracts.map((ct) => (
              <li key={ct.id}>
                <button onClick={() => router.push(`/contracts/${ct.id}`)}
                  className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-70">
                  <span className="font-mono text-sm font-medium">{ct.code}</span>
                  {ct.monthlyRent != null && <span className="ml-auto shrink-0 text-sm font-medium tabular-nums text-gold-dark">฿{bahtFormat(Number(ct.monthlyRent))}</span>}
                  <StatusBadge map={CONTRACT_STATUS} value={ct.status} short />
                  <Icon name="chevron-right" size={15} className="shrink-0 text-faint" />
                </button>
              </li>
            ))}
          </ul>
          {/* ท้าย: สรุปค่าเช่าปัจจุบัน (เฉพาะสัญญา active) — ข้อมูลใหม่ ไม่ซ้ำหัว */}
          {c.contracts.some((ct) => ct.status === 'active') && (
            <div className="mt-3 flex items-center justify-between border-t border-border/60 pt-3 text-xs">
              <span className="text-muted">ค่าเช่าปัจจุบัน</span>
              <span className="font-medium tabular-nums text-ink">฿{bahtFormat(c.contracts.filter((ct) => ct.status === 'active').reduce((s, ct) => s + Number(ct.monthlyRent ?? 0), 0))}/เดือน</span>
            </div>
          )}
        </div>
      )}

      {/* ADVANCED — เอกสาร */}
      <div className="mt-6 card p-5">
        <SectionLabel className="mb-4">เอกสาร</SectionLabel>
        <DocumentSection entityType="customer" entityId={c.id} />
      </div>

      {/* ลบลูกค้า — เฉพาะที่ยังไม่มีสัญญา (เช่น convert จาก Lead ผิด) */}
      {can('customer', 'delete') && !(c.contracts && c.contracts.length > 0) && (
        <div className="mt-6 text-center">
          <button className="text-sm text-danger hover:underline" onClick={() => setDelOpen(true)}>ลบลูกค้ารายนี้</button>
        </div>
      )}

      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} busy={deleting}
        title="ลบลูกค้า" tone="danger" confirmLabel="ลบลูกค้า"
        message={<>ลบ <b>{c.fullName}</b> ออกจากระบบ? ใช้กรณีสร้าง/แปลงผิด (ลูกค้าที่มีสัญญาจะลบไม่ได้)</>}
        onConfirm={async () => {
          setDeleting(true);
          try { await api(`/customers/${c.id}`, { method: 'DELETE' }); toast.success('ลบลูกค้าแล้ว'); router.push('/customers'); }
          catch (e) { toast.error((e as { message?: string }).message || 'ลบไม่สำเร็จ'); setDeleting(false); setDelOpen(false); }
        }} />
    </div>
  );
}

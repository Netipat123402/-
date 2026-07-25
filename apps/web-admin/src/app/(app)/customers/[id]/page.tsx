'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { ActionBar, ConfirmDialog, DetailHeader, Field, InfoGroup, InfoRow, MoreMenu, PhoneLink, SectionTabs, StatusBadge } from '@/components/ui';
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

  const contracts = c.contracts ?? [];
  const activeRent = contracts.filter((ct) => ct.status === 'active').reduce((s, ct) => s + Number(ct.monthlyRent ?? 0), 0);

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      {/* HEADER = DetailHeader (แม่แบบเดียวกับทรัพย์/เจ้าของ) — ชื่อ + เบอร์ + ปุ่มแก้ไข/⋯ลบ · ไม่มี avatar */}
      <DetailHeader
        backHref="/customers"
        title={c.fullName}
        subtitle={c.phone ? <PhoneLink phone={c.phone} className="text-sm text-muted" /> : undefined}
        actions={!edit
          ? <ActionBar>
              {can('customer', 'update') && <button className="btn-ghost btn-sm" onClick={() => setEdit(true)}>แก้ไขข้อมูล</button>}
              {can('customer', 'delete') && contracts.length === 0 && (
                <MoreMenu items={[{ label: 'ลบลูกค้ารายนี้', icon: 'trash', danger: true, onClick: () => setDelOpen(true) }]} />
              )}
            </ActionBar>
          : undefined}
      />

      {/* สัญญา = glance stat (ยกยอดค่าเช่าปัจจุบันขึ้นหัว) — โชว์เมื่อมีสัญญา */}
      {contracts.length > 0 && (
        <div className="mt-4 flex gap-8 border-y border-border/60 py-3">
          <div>
            <div className="text-lg font-semibold tabular-nums text-ink">{contracts.length}</div>
            <div className="text-xs text-muted">สัญญา</div>
          </div>
          {activeRent > 0 && (
            <div>
              <div className="text-lg font-semibold tabular-nums text-gold-dark">฿{bahtFormat(activeRent)}<span className="text-xs font-normal text-faint">/เดือน</span></div>
              <div className="text-xs text-muted">ค่าเช่าปัจจุบัน</div>
            </div>
          )}
        </div>
      )}

      {/* per-device: มือถือ accordion · iPad/คอม แท็บ */}
      <SectionTabs className="mt-6" items={[
        // สัญญา (การเช่า) = แก่นของผู้เช่า → แท็บแรก (redesign ลำดับตาม entity)
        { id: 'contracts', label: 'สัญญา', content: contracts.length === 0 ? (
          <p className="py-3 text-sm text-muted">ยังไม่มีสัญญา</p>
        ) : (
          <div className="card p-5">
            <ul className="divide-y divide-border">
              {contracts.map((ct) => (
                <li key={ct.id}>
                  <button onClick={() => router.push(`/contracts/${ct.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-70">
                    <span className="font-mono text-sm font-medium">{ct.code}</span>
                    {ct.monthlyRent != null && <span className="ml-auto shrink-0 text-sm font-medium tabular-nums text-gold-dark">฿{bahtFormat(Number(ct.monthlyRent))}</span>}
                    <StatusBadge map={CONTRACT_STATUS} value={ct.status} short outline />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) },
        { id: 'contact', label: 'ข้อมูลติดต่อ', content: (
          edit ? (
            <div className="card p-5">
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
            </div>
          ) : (
            // แยกกล่อง (แม่แบบทรัพย์): ติดต่อ — เบอร์/ชื่ออยู่หัว glance แล้ว · view/edit parity (ว่าง = —)
            <InfoGroup label="ติดต่อ">
              <InfoRow label="อีเมล" value={c.email || undefined} />
              <InfoRow label="ที่อยู่" value={c.address || undefined} stack />
            </InfoGroup>
          )
        ) },
        { id: 'docs', label: 'เอกสาร', content: (
          <div className="card p-5"><DocumentSection entityType="customer" entityId={c.id} /></div>
        ) },
      ]} />

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

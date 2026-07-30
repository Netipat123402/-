'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { ConfirmDialog, DetailHeader, Field, InfoGroup, Modal, PhoneLink, SectionLabel, StatusBadge } from '@/components/ui';
import { CONTRACT_STATUS, bahtFormat } from '@/lib/status';
import DocumentSection from '@/components/DocumentSection';
import { formatPhone } from '@/lib/format';

interface ContractLite {
  id: string; code: string; status: string; monthlyRent?: string; endDate?: string;
  property?: { id: string; code: string; titleTh: string } | null;
  owner?: { fullName: string } | null;
}
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
  const active = contracts.filter((ct) => ct.status === 'active');       // กำลังเช่า
  const past = contracts.filter((ct) => ct.status !== 'active');          // ประวัติ (ไม่ active → ไม่ซ้ำ)
  const activeRent = active.reduce((s, ct) => s + Number(ct.monthlyRent ?? 0), 0);
  const daysLeftOf = (endDate?: string) => (endDate ? Math.ceil((new Date(endDate).getTime() - Date.now()) / 86400000) : null);

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      {/* HEADER = ชื่อ + เบอร์ (แม่แบบ DetailHeader) */}
      <DetailHeader
        backHref="/customers"
        title={c.fullName}
        subtitle={c.phone ? <PhoneLink phone={c.phone} className="text-sm text-muted" /> : undefined}
      />

      {/* A = เนื้อหลัก (การเช่า/ประวัติ/เอกสาร) + รางตัวตน (คอม=ขวา sticky · iPad=แถบบน · มือถือ=การ์ดบน) */}
      <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* รางตัวตน / ติดต่อ */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            {/* สถิติ */}
            <div className="flex flex-wrap gap-x-6 gap-y-3">
              <div>
                <div className="text-lg font-semibold tabular-nums text-ink">{contracts.length}</div>
                <div className="text-xs text-muted">สัญญา</div>
              </div>
              {activeRent > 0 && (
                <div>
                  <div className="text-lg font-semibold tabular-nums text-gold-dark">฿{bahtFormat(activeRent)}<span className="text-xs font-normal text-faint">/ด</span></div>
                  <div className="text-xs text-muted">ค่าเช่าปัจจุบัน</div>
                </div>
              )}
            </div>
            {/* ติดต่อ */}
            <div className="mt-3 space-y-2 border-t border-border pt-3 text-sm sm:flex sm:flex-wrap sm:gap-x-6 sm:gap-y-2 sm:space-y-0 xl:block xl:space-y-2">
              {c.phone && <div className="flex justify-between gap-3 sm:block xl:flex"><span className="text-faint">เบอร์</span><PhoneLink phone={c.phone} className="text-ink" /></div>}
              {c.email && <div className="flex justify-between gap-3 sm:block xl:flex"><span className="text-faint">อีเมล</span><span className="truncate text-ink">{c.email}</span></div>}
              {c.address && <div className="sm:basis-full xl:block"><span className="text-faint">ที่อยู่</span><span className="ml-2 text-ink xl:ml-0 xl:mt-0.5 xl:block">{c.address}</span></div>}
              {!c.email && !c.address && !c.phone && <span className="text-faint">— ยังไม่มีข้อมูลติดต่อ</span>}
            </div>
            {can('customer', 'update') && <button className="btn-ghost mt-3 w-full" onClick={() => { setForm(c); setEdit(true); }}>แก้ไขข้อมูล</button>}
          </div>
          {can('customer', 'delete') && contracts.length === 0 && (
            <div className="mt-2 text-center"><button className="text-xs text-muted transition hover:text-danger" onClick={() => setDelOpen(true)}>ลบลูกค้ารายนี้</button></div>
          )}
        </div>

        {/* เนื้อหลัก */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          {/* กำลังเช่า = สัญญา active (ทรัพย์+เจ้าของ+เหลือกี่วัน) */}
          <InfoGroup label="กำลังเช่า" className="mb-4">
            {active.length === 0 ? (
              <p className="py-2.5 text-sm text-muted">ยังไม่มีสัญญาที่เช่าอยู่</p>
            ) : active.map((ct) => {
              const dl = daysLeftOf(ct.endDate);
              return (
                <button key={ct.id} onClick={() => router.push(`/contracts/${ct.id}`)}
                  className="group flex w-full flex-col gap-1 py-3 text-left transition">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium text-ink transition group-hover:text-gold-dark">{ct.property?.titleTh ?? `สัญญา ${ct.code}`}</span>
                    <span className="shrink-0 font-semibold tabular-nums text-gold-dark">฿{bahtFormat(Number(ct.monthlyRent ?? 0))}<span className="text-xs font-normal text-faint">/เดือน</span></span>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-xs">
                    <span className="truncate font-mono text-faint">{ct.property?.code ?? ct.code}{ct.owner && <span className="font-sans text-muted"> · เจ้าของ {ct.owner.fullName}</span>}</span>
                    {dl != null && <span className="shrink-0 text-gold-dark">เหลือ {dl} วัน</span>}
                  </div>
                </button>
              );
            })}
          </InfoGroup>

          {/* ประวัติสัญญา = ไม่ active */}
          {past.length > 0 && (
            <InfoGroup label="ประวัติสัญญา" className="mb-4">
              {past.map((ct) => (
                <button key={ct.id} onClick={() => router.push(`/contracts/${ct.id}`)}
                  className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-70">
                  <span className="shrink-0 font-mono text-sm">{ct.code}</span>
                  {ct.property && <span className="truncate text-sm text-muted">{ct.property.titleTh}</span>}
                  {ct.monthlyRent != null && <span className="ml-auto shrink-0 text-sm tabular-nums text-muted">฿{bahtFormat(Number(ct.monthlyRent))}</span>}
                  <StatusBadge map={CONTRACT_STATUS} value={ct.status} short outline />
                </button>
              ))}
            </InfoGroup>
          )}

          {/* เอกสาร */}
          <section className="scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>เอกสาร</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><DocumentSection entityType="customer" entityId={c.id} /></div>
          </section>
        </div>
      </div>

      {/* แก้ไขข้อมูล (modal) */}
      <Modal open={edit} onClose={() => { setEdit(false); setForm(c); }} title="แก้ไขข้อมูลลูกค้า"
        confirmOnClose={form.fullName !== c.fullName || (form.phone ?? '') !== (c.phone ?? '') || (form.email ?? '') !== (c.email ?? '') || (form.address ?? '') !== (c.address ?? '')}>
        <div className="space-y-4">
          <Field label="ชื่อ-นามสกุล" placeholder="เช่น สมชาย ใจดี" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <Field label="เบอร์โทร" inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: formatPhone(e.target.value) })} />
          <Field label="อีเมล" type="email" placeholder="name@email.com" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <label className="block"><span className="mb-1.5 block text-sm font-medium text-ink-soft">ที่อยู่</span>
            <textarea className="field h-auto py-2.5" rows={2} placeholder="บ้านเลขที่ ถนน แขวง/ตำบล เขต/อำเภอ จังหวัด" value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <button className="btn-ghost" onClick={() => { setEdit(false); setForm(c); }}>ยกเลิก</button>
            <button className="btn-gold" disabled={saving} onClick={save}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
          </div>
        </div>
      </Modal>

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

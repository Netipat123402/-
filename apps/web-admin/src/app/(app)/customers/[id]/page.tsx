'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { ConfirmDialog, DetailHeader, Field, InfoGroup, InfoRow, Modal, PhoneLink, RailBlock, SectionLabel, StatusBadge } from '@/components/ui';
import { CONTRACT_STATUS, bahtFormat } from '@/lib/status';
import DocumentSection from '@/components/DocumentSection';
import { fmtDate, formatPhone } from '@/lib/format';

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
        {/* รางตัวตน / ติดต่อ (คอม=ขวา sticky · iPad=แถบแนวนอน · มือถือ=การ์ด) */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6 xl:flex-col xl:items-stretch xl:gap-3">
              {/* สถิติ — กึ่งกลาง (กฎ 2) */}
              <div className="flex shrink-0 text-center">
                <div className="flex-1 px-3">
                  <div className="text-lg font-semibold tabular-nums text-ink">{contracts.length}</div>
                  <div className="text-xs text-muted">สัญญา</div>
                </div>
                {activeRent > 0 && (
                  <div className="flex-1 border-l border-border px-3">
                    <div className="text-lg font-semibold tabular-nums text-gold-dark">฿{bahtFormat(activeRent)}</div>
                    <div className="text-xs text-muted">ค่าเช่าปัจจุบัน</div>
                  </div>
                )}
              </div>
              {/* ติดต่อ — label-value ราง (กฎ 1) */}
              <div className="border-t border-border pt-3 text-sm sm:flex-1 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0 xl:border-l-0 xl:border-t xl:pl-0 xl:pt-3">
                <div className="divide-y divide-border/60">
                  {c.phone && <div className="grid grid-cols-[3.5rem_1fr] gap-3 py-2"><span className="text-faint">เบอร์</span><PhoneLink phone={c.phone} className="text-ink" /></div>}
                  {c.email && <div className="grid grid-cols-[3.5rem_1fr] gap-3 py-2"><span className="text-faint">อีเมล</span><span className="truncate text-ink">{c.email}</span></div>}
                  {c.address && <div className="grid grid-cols-[3.5rem_1fr] gap-3 py-2"><span className="text-faint">ที่อยู่</span><span className="text-ink">{c.address}</span></div>}
                  {!c.phone && !c.email && !c.address && <p className="py-2 text-faint">— ยังไม่มีข้อมูลติดต่อ</p>}
                </div>
              </div>
              {can('customer', 'update') && <button className="btn-ghost w-full shrink-0 sm:w-auto xl:w-full" onClick={() => { setForm(c); setEdit(true); }}>แก้ไขข้อมูล</button>}
            </div>
          </div>
          {can('customer', 'delete') && contracts.length === 0 && (
            <div className="mt-2 text-center"><button className="text-xs text-muted transition hover:text-danger" onClick={() => setDelOpen(true)}>ลบลูกค้ารายนี้</button></div>
          )}
        </div>

        {/* เนื้อหลัก */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          {/* กำลังเช่า = สัญญา active → label-value ราง (กฎ 1) */}
          {active.length === 0 ? (
            <InfoGroup label="กำลังเช่า" className="mb-4">
              <p className="py-2.5 text-sm text-muted">ยังไม่มีสัญญาที่เช่าอยู่</p>
            </InfoGroup>
          ) : active.map((ct) => {
            const dl = daysLeftOf(ct.endDate);
            return (
              <InfoGroup key={ct.id} label="กำลังเช่า" className="mb-4"
                action={<button className="text-xs text-gold-dark transition hover:underline" onClick={() => router.push(`/contracts/${ct.id}`)}>ดูสัญญา ›</button>}>
                {ct.property && (
                  <InfoRow label="ทรัพย์" href={`/properties/${ct.property.id}`} strong hideChevron
                    value={<span><span className="block">{ct.property.titleTh}</span><span className="mt-0.5 block font-mono text-xs font-normal text-faint">{ct.property.code}</span></span>} />
                )}
                {ct.owner && <InfoRow label="เจ้าของ" value={ct.owner.fullName} />}
                <InfoRow label="ค่าเช่า" value={`฿${bahtFormat(Number(ct.monthlyRent ?? 0))}/เดือน`} />
                <InfoRow label="วันสิ้นสุด" value={<span>{ct.endDate ? fmtDate(ct.endDate) : '—'}{dl != null && <span className="text-gold-dark"> · เหลือ {dl} วัน</span>}</span>} />
              </InfoGroup>
            );
          })}

          {/* ประวัติสัญญา = ไม่ active → label(รหัส)-value(ค่าเช่า/สถานะ) ราง */}
          {past.length > 0 && (
            <InfoGroup label="ประวัติสัญญา" className="mb-4">
              {past.map((ct) => (
                <InfoRow key={ct.id} onClick={() => router.push(`/contracts/${ct.id}`)} hideChevron
                  label={<span className="font-mono text-xs">{ct.code}</span>}
                  value={<span className="inline-flex items-center gap-2">{ct.monthlyRent != null && <span className="tabular-nums text-muted">฿{bahtFormat(Number(ct.monthlyRent))}</span>}<StatusBadge map={CONTRACT_STATUS} value={ct.status} short outline /></span>} />
              ))}
            </InfoGroup>
          )}

          {/* เอกสาร */}
          <section className="scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>เอกสาร</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><RailBlock><DocumentSection entityType="customer" entityId={c.id} /></RailBlock></div>
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

'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useLookup } from '@/lib/lookups';
import { LEAD_SOURCE, LEAD_STATUS, PROPERTY_STATUS, bahtFormat } from '@/lib/status';
import { fmtDate } from '@/lib/format';
import { Combobox, ConfirmDialog, DetailHeader, InfoGroup, InfoRow, Modal, PhoneLink, RailBlock, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface PropLite { id: string; code: string; titleTh: string; status: string; monthlyRent: string; }
interface LeadDetail {
  id: string; code: string; fullName: string; phone?: string;
  status: string; source: string; assignedToId?: string; customerId?: string;
  email?: string; message?: string; createdAt?: string; preferredViewAt?: string; lostReason?: string;
  assignedTo?: { fullName: string }; interests?: { property: PropLite }[];
}

export default function LeadDetailPage() {
  const { api, user, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [lead, setLead] = useState<LeadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const [closeOpen, setCloseOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferTo, setTransferTo] = useState('');
  const assignable = useLookup<{ id: string; fullName: string }>('/users/assignable', (u) => ({ value: u.id, label: u.fullName }), transferOpen);

  const load = useCallback(async () => {
    try { const r = await api<LeadDetail>(`/leads/${id}`); setLead(r.data); }
    catch { setLead(null); } finally { setLoading(false); }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);

  // action: ยิง API → สำเร็จ = โหลดใหม่ (sync ความจริง) หรือกลับหน้า list (ลบ) · ล้มเหลว = แจ้ง error
  async function act(fn: () => Promise<unknown>, successMsg: string, opts?: { back?: boolean }) {
    setBusy(true);
    try {
      await fn();
      toast.success(successMsg);
      if (opts?.back) router.push('/leads'); else await load();
    } catch (e) {
      toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ');
    } finally { setBusy(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!lead) return <div className="mx-auto max-w-3xl text-center text-muted">ไม่พบ Lead <Link href="/leads" className="text-gold-dark underline">กลับ</Link></div>;

  const interests = lead.interests ?? [];

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/leads"
        code={lead.code}
        badge={<StatusBadge map={LEAD_STATUS} value={lead.status} />}
        title={lead.fullName}
        subtitle={lead.phone ? <PhoneLink phone={lead.phone} className="text-sm text-muted" /> : undefined}
      />

      {/* A = เนื้อหา (ความต้องการ/ทรัพย์สนใจ/ติดต่อ/การดูแล) + ราง pipeline (สถานะ+ขั้นถัดไป) — โครงเดียวกับสัญญา/ลูกค้า/นัด */}
      <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* ราง = สถานะ pipeline + ปุ่มขั้นถัดไป (คอม=ขวา sticky · iPad=แถบบน · มือถือ=การ์ดบน) */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 xl:flex-col xl:items-stretch xl:gap-3">
              <div className="shrink-0 text-center sm:text-left xl:text-center">
                <StatusBadge map={LEAD_STATUS} value={lead.status} />
                <div className="mt-1 text-xs text-faint">ช่องทาง {LEAD_SOURCE[lead.source] ?? lead.source}</div>
              </div>
              {lead.status === 'new' && can('lead', 'assign') ? (
                <div className="grid grid-cols-1 gap-2 sm:ml-auto sm:flex sm:shrink-0 xl:ml-0 xl:grid xl:grid-cols-1">
                  <button className="btn-gold btn-sm" disabled={busy}
                    onClick={() => act(() => api(`/leads/${lead.id}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId: user!.id, startWorking: true }) }), 'รับ Lead มาดูแลแล้ว')}>
                    รับดูแล Lead นี้
                  </button>
                </div>
              ) : lead.status === 'working' ? (
                <div className="grid grid-cols-1 gap-2 sm:ml-auto sm:flex sm:shrink-0 xl:ml-0 xl:grid xl:grid-cols-1">
                  {can('appointment', 'create') && (
                    <button className="btn-gold btn-sm" disabled={busy} onClick={() => router.push(`/appointments?newLead=${lead.id}`)}>
                      <Icon name="calendar" size={15} /> สร้างนัดดูทรัพย์
                    </button>
                  )}
                  {can('lead', 'convert') && !lead.customerId && (
                    <button className="btn-ghost btn-sm" disabled={busy}
                      onClick={() => act(() => api(`/leads/${lead.id}/convert`, { method: 'POST' }), 'แปลงเป็นลูกค้าแล้ว')}>
                      แปลงเป็นลูกค้า
                    </button>
                  )}
                </div>
              ) : lead.status === 'closed' ? (
                <div className="rounded-lg border border-border bg-canvas px-3 py-2 text-center text-xs text-muted sm:ml-auto sm:shrink-0">
                  {lead.customerId ? 'ปิดสำเร็จ — แปลงเป็นลูกค้าแล้ว' : 'ปิด Lead แล้ว (ไม่สำเร็จ)'}
                </div>
              ) : null}
            </div>
          </div>
          {/* action รอง — quiet */}
          {(lead.status !== 'closed' || (can('lead', 'delete') && !lead.customerId)) && (
            <div className="mt-2 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs">
              {lead.status === 'working' && can('lead', 'assign') && <button className="text-muted transition hover:text-ink" disabled={busy} onClick={() => setTransferOpen(true)}>โอนให้คนอื่น</button>}
              {lead.status !== 'closed' && <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => setCloseOpen(true)}>ปิด Lead</button>}
              {can('lead', 'delete') && !lead.customerId && <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => setDelOpen(true)}>ลบ Lead</button>}
            </div>
          )}
        </div>

        {/* เนื้อหา — label-value ราง (กฎ 1) */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          <InfoGroup label="ความต้องการ" className="mb-4">
            <InfoRow label="โจทย์" value={lead.message || undefined} stack hideEmpty />
            <InfoRow label="อยากเข้าชม" value={lead.preferredViewAt ? fmtDate(lead.preferredViewAt) : undefined} hideEmpty />
            {!lead.message && !lead.preferredViewAt && <p className="py-6 text-center text-sm text-muted">ยังไม่ได้ระบุ</p>}
          </InfoGroup>

          <InfoGroup label="ทรัพย์ที่สนใจ" className="mb-4">
            {interests.length === 0 ? <p className="py-6 text-center text-sm text-muted">ยังไม่ได้ระบุทรัพย์ที่สนใจ</p> : (
              <RailBlock className="py-1">
                <div className="divide-y divide-border/60">
                  {interests.map((it) => (
                    <button key={it.property.id} onClick={() => router.push(`/properties/${it.property.id}`)}
                      className="group flex w-full items-center gap-3 py-3 text-left transition">
                      <span className="min-w-0 flex-1 truncate text-ink transition group-hover:text-gold-dark">{it.property.titleTh}</span>
                      <span className="shrink-0 tabular-nums text-muted">฿{bahtFormat(Number(it.property.monthlyRent))}</span>
                      <StatusBadge map={PROPERTY_STATUS} value={it.property.status} short outline />
                    </button>
                  ))}
                </div>
              </RailBlock>
            )}
          </InfoGroup>

          <InfoGroup label="ติดต่อ" className="mb-4">
            <InfoRow label="อีเมล" value={lead.email || undefined} />
          </InfoGroup>

          <InfoGroup label="การดูแล" className="mb-4">
            <InfoRow label="ผู้ดูแล" value={lead.assignedTo?.fullName ?? (lead.assignedToId ? '—' : 'ยังไม่มอบหมาย')} />
            <InfoRow label="เข้ามาเมื่อ" value={lead.createdAt ? fmtDate(lead.createdAt) : undefined} />
            {lead.status === 'closed' && lead.lostReason && <InfoRow label="เหตุผลที่ปิด" value={lead.lostReason} stack />}
          </InfoGroup>
        </div>
      </div>

      {/* โอนให้คนอื่น */}
      <Modal open={transferOpen} onClose={() => { setTransferOpen(false); setTransferTo(''); }} title="โอน Lead ให้คนอื่น"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setTransferOpen(false); setTransferTo(''); }}>ยกเลิก</button>
            <button type="button" className="btn-gold" disabled={busy || !transferTo}
              onClick={() => { if (transferTo) { setTransferOpen(false); act(() => api(`/leads/${lead.id}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId: transferTo }) }), 'โอน Lead ให้ผู้ดูแลใหม่แล้ว'); setTransferTo(''); } }}>
              โอน Lead
            </button>
          </div>
        }>
        <Combobox label="ผู้ดูแลใหม่" value={transferTo} onChange={setTransferTo}
          options={assignable.options} loading={assignable.loading} loadError={assignable.error} onRetry={assignable.reload}
          placeholder="— เลือกผู้ดูแล —" />
      </Modal>

      {/* ปิด Lead (ไม่สำเร็จ) — ขอเหตุผล */}
      <ConfirmDialog open={closeOpen} onClose={() => setCloseOpen(false)} busy={busy}
        title="ปิด Lead (ไม่สำเร็จ)" tone="danger" confirmLabel="ปิด Lead" withReason
        message={<>ปิด Lead <b>{lead.fullName}</b>? จะนับเป็นไม่สำเร็จ</>}
        reasonPlaceholder="เหตุผลที่ปิด (ถ้ามี)"
        onConfirm={(reason) => { setCloseOpen(false); act(() => api(`/leads/${lead.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'closed', lostReason: reason }) }), 'ปิด Lead แล้ว'); }} />

      {/* ลบ Lead */}
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} busy={busy}
        title="ลบ Lead" tone="danger" confirmLabel="ลบ Lead"
        message={<>ลบ Lead <b>{lead.fullName}</b> ทิ้ง? ใช้กรณีสร้างผิด/สแปม — ถ้าแค่ติดต่อไม่ได้ ใช้ “ปิด Lead” แทน</>}
        onConfirm={() => { setDelOpen(false); act(() => api(`/leads/${lead.id}`, { method: 'DELETE' }), 'ลบ Lead แล้ว', { back: true }); }} />
    </div>
  );
}

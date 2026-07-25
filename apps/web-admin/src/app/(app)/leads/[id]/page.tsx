'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { useLookup } from '@/lib/lookups';
import { LEAD_SOURCE, LEAD_STATUS, PROPERTY_STATUS, bahtFormat } from '@/lib/status';
import { fmtDate } from '@/lib/format';
import { ActionBar, Combobox, ConfirmDialog, DetailHeader, InfoGroup, InfoRow, Modal, MoreMenu, PhoneLink, SectionTabs, StatusBadge } from '@/components/ui';
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

  // MoreMenu (รอง/อันตราย) — เข้าชุดแม่แบบทรัพย์ (⋯ ในหัว)
  const moreItems = [
    ...(lead.status === 'working' && can('lead', 'assign') ? [{ label: 'โอนให้คนอื่น', icon: 'users' as const, onClick: () => setTransferOpen(true) }] : []),
    ...(lead.status !== 'closed' ? [{ label: 'ปิด Lead (ไม่สำเร็จ)', icon: 'x' as const, danger: true, onClick: () => setCloseOpen(true) }] : []),
    ...(can('lead', 'delete') && !lead.customerId ? [{ label: 'ลบ Lead นี้', icon: 'trash' as const, danger: true, onClick: () => setDelOpen(true) }] : []),
  ];

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      {/* HEADER = DetailHeader (แม่แบบทรัพย์) — รหัส+สถานะ+ช่องทาง · ชื่อ · เบอร์ · ปุ่ม status-driven (pipeline) ขวา/ใต้หัว */}
      <DetailHeader
        backHref="/leads"
        code={lead.code}
        badge={<StatusBadge map={LEAD_STATUS} value={lead.status} />}
        meta={<span className="text-xs text-muted">{LEAD_SOURCE[lead.source] ?? lead.source}</span>}
        title={lead.fullName}
        subtitle={lead.phone ? <PhoneLink phone={lead.phone} className="text-sm text-muted" /> : undefined}
        actions={
          <ActionBar>
            {lead.status === 'new' && can('lead', 'assign') && (
              <button className="btn-gold btn-sm" disabled={busy}
                onClick={() => act(() => api(`/leads/${lead.id}/assign`, { method: 'POST', body: JSON.stringify({ assignedToId: user!.id, startWorking: true }) }), 'รับ Lead มาดูแลแล้ว')}>
                รับดูแล Lead นี้
              </button>
            )}
            {lead.status === 'working' && can('appointment', 'create') && (
              <button className="btn-gold btn-sm" disabled={busy} onClick={() => router.push(`/appointments?newLead=${lead.id}`)}>
                <Icon name="calendar" size={15} /> สร้างนัดดูทรัพย์
              </button>
            )}
            {lead.status === 'working' && can('lead', 'convert') && !lead.customerId && (
              <button className="btn-ghost btn-sm" disabled={busy}
                onClick={() => act(() => api(`/leads/${lead.id}/convert`, { method: 'POST' }), 'แปลงเป็นลูกค้าแล้ว')}>
                แปลงเป็นลูกค้า
              </button>
            )}
            {moreItems.length > 0 && <MoreMenu items={moreItems} />}
          </ActionBar>
        }
      />

      {/* hint ตามสถานะ — แถบบาง (เข้าชุดทรัพย์) */}
      {lead.status === 'new' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold-dark">
          <Icon name="user-plus" size={14} className="shrink-0" /> <span><b>Lead ใหม่</b> — รีบรับดูแลเพื่อเริ่มติดตาม</span>
        </div>
      )}
      {lead.status === 'closed' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-muted">
          <Icon name={lead.customerId ? 'check' : 'x'} size={14} className={`shrink-0 ${lead.customerId ? 'text-success' : 'text-muted'}`} />
          <span>{lead.customerId ? 'ปิดสำเร็จ — แปลงเป็นลูกค้าแล้ว' : 'ปิด Lead แล้ว (ไม่สำเร็จ)'}</span>
        </div>
      )}

      {/* per-device: มือถือ accordion · iPad/คอม แท็บ */}
      <SectionTabs className="mt-6" items={[
        { id: 'overview', label: 'ภาพรวม', content: (
          <div className="xl:columns-2 xl:gap-5">
            <InfoGroup label="ความต้องการ" className="mb-4 break-inside-avoid">
              <InfoRow label="รายละเอียด" value={lead.message || undefined} stack hideEmpty />
              <InfoRow label="อยากเข้าชม" value={lead.preferredViewAt ? fmtDate(lead.preferredViewAt) : undefined} hideEmpty />
              {!lead.message && !lead.preferredViewAt && <p className="py-2.5 text-sm text-muted">ยังไม่ได้ระบุ</p>}
            </InfoGroup>
            <InfoGroup label="ติดต่อ" className="mb-4 break-inside-avoid">
              <InfoRow label="อีเมล" value={lead.email || undefined} />
            </InfoGroup>
            <InfoGroup label="การดูแล" className="mb-4 break-inside-avoid">
              <InfoRow label="ผู้ดูแล" value={lead.assignedTo?.fullName ?? (lead.assignedToId ? '—' : 'ยังไม่มอบหมาย')} />
              <InfoRow label="เข้ามาเมื่อ" value={lead.createdAt ? fmtDate(lead.createdAt) : undefined} />
              {lead.status === 'closed' && lead.lostReason && <InfoRow label="เหตุผลที่ปิด" value={lead.lostReason} stack />}
            </InfoGroup>
          </div>
        ) },
        { id: 'interests', label: 'ทรัพย์ที่สนใจ', content: interests.length === 0 ? (
          <p className="py-3 text-sm text-muted">ยังไม่ได้ระบุทรัพย์ที่สนใจ</p>
        ) : (
          <div className="card p-5">
            <ul className="divide-y divide-border">
              {interests.map((it) => (
                <li key={it.property.id}>
                  <button onClick={() => router.push(`/properties/${it.property.id}`)}
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:opacity-70">
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">{it.property.titleTh}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums text-gold-dark">฿{bahtFormat(Number(it.property.monthlyRent))}</span>
                    <StatusBadge map={PROPERTY_STATUS} value={it.property.status} short outline />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) },
      ]} />

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

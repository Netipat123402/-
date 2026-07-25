'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { APPOINTMENT_STATUS } from '@/lib/status';
import { fmtDateTime, fmtTimeRange, fmtUntil, fmtWeekdayDate } from '@/lib/format';
import { ActionBar, DetailHeader, Field, InfoGroup, InfoRow, Modal, MoreMenu, PhoneLink, SectionTabs, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface ApptDetail {
  id: string; code: string; scheduledAt: string; status: string;
  durationMin: number; location?: string; title?: string;
  lead?: { id: string; fullName: string; phone?: string };
  property?: { id: string; code: string; titleTh: string };
  agent?: { fullName: string };
  cancelReason?: string;
}

export default function AppointmentDetailPage() {
  const { api, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [appt, setAppt] = useState<ApptDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [reOpen, setReOpen] = useState(false);
  const [reAt, setReAt] = useState('');

  const load = useCallback(async () => {
    try { const r = await api<ApptDetail>(`/appointments/${id}`); setAppt(r.data); }
    catch { setAppt(null); } finally { setLoading(false); }
  }, [api, id]);
  useEffect(() => { load(); }, [load]);

  async function act(fn: () => Promise<unknown>, successMsg: string) {
    setBusy(true);
    try { await fn(); toast.success(successMsg); await load(); }
    catch (e) { toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ'); }
    finally { setBusy(false); }
  }
  const run = (action: string, label: string) => act(() => api(`/appointments/${id}/${action}`, { method: 'POST', body: JSON.stringify({}) }), `${label}แล้ว`);
  async function doReschedule() {
    if (!reAt) return;
    setReOpen(false);
    await act(() => api(`/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(reAt).toISOString() }) }), 'เลื่อนนัดแล้ว');
    setReAt('');
  }
  // นัดใหม่อีกครั้ง — ใช้ flow สร้างนัดที่หน้า list (prefill lead ถ้ามี · ทั่วไป = เปิดหน้าสร้าง)
  const rebook = () => router.push(appt?.lead ? `/appointments?newLead=${appt.lead.id}` : '/appointments');

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!appt) return <div className="mx-auto max-w-3xl text-center text-muted">ไม่พบนัดหมาย <Link href="/appointments" className="text-gold-dark underline">กลับ</Link></div>;

  const subject = appt.lead?.fullName || appt.title || `นัด ${appt.code}`;
  const isUpcoming = appt.status === 'upcoming';

  // แท็บ (owner: แยก 3 — ทรัพย์ · รายละเอียด · ลูกค้า) · โชว์ ทรัพย์/ลูกค้า เฉพาะที่มี (นัดนอกรอบไม่มี)
  const tabs: { id: string; label: string; content: React.ReactNode }[] = [];
  if (appt.property) tabs.push({ id: 'property', label: 'ทรัพย์ที่นัดดู', content: (
    <InfoGroup label="ทรัพย์ที่นัดดู">
      <InfoRow label="ทรัพย์" href={`/properties/${appt.property.id}`} strong hideChevron
        value={<span><span className="block">{appt.property.titleTh}</span><span className="mt-0.5 block font-mono text-xs font-normal text-faint">{appt.property.code}</span></span>} />
    </InfoGroup>
  ) });
  tabs.push({ id: 'detail', label: 'รายละเอียดนัด', content: (
    <div className="xl:columns-2 xl:gap-5">
      <InfoGroup label="สถานที่นัด" className="mb-4 break-inside-avoid">
        <div className="py-3 text-sm text-gold-dark">{appt.location || <span className="text-faint">—</span>}</div>
      </InfoGroup>
      <InfoGroup label="ผู้รับผิดชอบ" className="mb-4 break-inside-avoid">
        <div className="py-3 text-sm text-ink">{appt.agent?.fullName || <span className="text-faint">—</span>}</div>
      </InfoGroup>
      {appt.status === 'cancelled' && appt.cancelReason && (
        <InfoGroup label="เหตุผลที่ยกเลิก" className="mb-4 break-inside-avoid">
          <div className="py-3 text-sm text-muted">{appt.cancelReason}</div>
        </InfoGroup>
      )}
    </div>
  ) });
  if (appt.lead) tabs.push({ id: 'lead', label: 'ลูกค้า', content: (
    <InfoGroup label="ลูกค้า">
      <InfoRow label="ชื่อ" value={appt.lead.fullName} href={`/leads/${appt.lead.id}`} strong hideChevron />
      <InfoRow label="เบอร์โทร" value={appt.lead.phone ? <PhoneLink phone={appt.lead.phone} /> : undefined} hideEmpty />
    </InfoGroup>
  ) });

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      {/* HEADER = DetailHeader (แม่แบบทรัพย์) — รหัส+สถานะ+urgency · หัวข้อนัด · ปุ่ม status-driven (event-first) */}
      <DetailHeader
        backHref="/appointments"
        code={appt.code}
        badge={<StatusBadge map={APPOINTMENT_STATUS} value={appt.status} />}
        meta={isUpcoming ? <span className="text-xs text-gold-dark">{fmtUntil(appt.scheduledAt)}</span> : undefined}
        title={subject}
        actions={
          <ActionBar>
            {isUpcoming && can('appointment', 'change_status') && (
              <>
                <button className="btn-gold btn-sm" disabled={busy} onClick={() => run('complete', 'บันทึกว่าพบแล้ว')}>พบลูกค้าแล้ว</button>
                <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { setReAt(''); setReOpen(true); }}>เลื่อนนัด</button>
                <MoreMenu items={[
                  { label: 'ยกเลิกนัด', icon: 'x', danger: true, onClick: () => run('cancel', 'ยกเลิกนัด') },
                  { label: 'ลูกค้าไม่มาตามนัด', icon: 'x', danger: true, onClick: () => run('no-show', 'บันทึกว่าไม่มาตามนัด') },
                ]} />
              </>
            )}
            {!isUpcoming && can('appointment', 'create') && (
              <button className="btn-gold btn-sm" disabled={busy} onClick={rebook}><Icon name="calendar" size={15} /> นัดใหม่อีกครั้ง</button>
            )}
          </ActionBar>
        }
      />

      {/* glance "เมื่อไหร่" = แก่นนัด (event) → เด่นใต้หัว */}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-y border-border/60 py-3">
        <span className="text-lg font-semibold tabular-nums tracking-tight text-ink">{fmtWeekdayDate(appt.scheduledAt)}</span>
        <span className="text-sm tabular-nums text-muted">{fmtTimeRange(appt.scheduledAt, appt.durationMin)} · {appt.durationMin} นาที</span>
      </div>

      {appt.status === 'done' && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-border bg-canvas px-3 py-2 text-xs text-success">
          <Icon name="check" size={14} className="shrink-0" /> พบลูกค้าแล้ว
        </div>
      )}

      {/* per-device: มือถือ accordion · iPad/คอม แท็บ */}
      <SectionTabs className="mt-6" items={tabs} />

      {/* เลื่อนนัด */}
      <Modal open={reOpen} onClose={() => { setReOpen(false); setReAt(''); }} title="เลื่อนนัด"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setReOpen(false); setReAt(''); }}>ยกเลิก</button>
            <button type="button" className="btn-gold" disabled={busy || !reAt} onClick={doReschedule}>ยืนยันเลื่อนนัด</button>
          </div>
        }>
        <Field label="วันเวลานัดใหม่ *" type="datetime-local"
          hint={reAt ? fmtDateTime(reAt) : undefined} value={reAt} onChange={(e) => setReAt(e.target.value)} />
      </Modal>
    </div>
  );
}

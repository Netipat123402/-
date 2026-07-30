'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { APPOINTMENT_STATUS } from '@/lib/status';
import { fmtDateTime, fmtTimeRange, fmtUntil, fmtWeekdayDate } from '@/lib/format';
import { DetailHeader, Field, InfoGroup, InfoRow, Modal, PhoneLink, StatusBadge } from '@/components/ui';
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

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/appointments"
        code={appt.code}
        badge={<StatusBadge map={APPOINTMENT_STATUS} value={appt.status} />}
        title={subject}
        subtitle={appt.property ? 'นัดดูทรัพย์' : (appt.title ? 'นัดนอกรอบ' : undefined)}
      />

      {/* B = เนื้อหา (ทรัพย์/ลูกค้า/สถานที่) + รางวันเวลา/สถานะ/ปุ่ม — โครง+ขนาดเดียวกับสัญญา/ลูกค้า */}
      <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* ราง = วันเวลา (พระเอก) + สถานะ + ปุ่ม (คอม=ขวา sticky · iPad=แถบบน · มือถือ=การ์ดบน) */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 xl:flex-col xl:items-stretch xl:gap-3">
              <div className="shrink-0">
                <div className="text-lg font-semibold tabular-nums text-ink">{fmtWeekdayDate(appt.scheduledAt)}</div>
                <div className="text-sm tabular-nums text-muted">{fmtTimeRange(appt.scheduledAt, appt.durationMin)} · {appt.durationMin} นาที</div>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge map={APPOINTMENT_STATUS} value={appt.status} outline />
                {isUpcoming && <span className="text-xs text-gold-dark">{fmtUntil(appt.scheduledAt)}</span>}
              </div>
              {isUpcoming && can('appointment', 'change_status') ? (
                <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 xl:grid xl:grid-cols-1">
                  <button className="btn-gold btn-sm" disabled={busy} onClick={() => run('complete', 'บันทึกว่าพบแล้ว')}>พบลูกค้าแล้ว</button>
                  <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { setReAt(''); setReOpen(true); }}>เลื่อนนัด</button>
                </div>
              ) : !isUpcoming && can('appointment', 'create') ? (
                <button className="btn-gold btn-sm shrink-0" disabled={busy} onClick={rebook}><Icon name="calendar" size={15} /> นัดใหม่อีกครั้ง</button>
              ) : null}
            </div>
            {isUpcoming && can('appointment', 'change_status') && (
              <div className="mt-3 flex justify-center gap-5 text-xs">
                <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => run('cancel', 'ยกเลิกนัด')}>ยกเลิกนัด</button>
                <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => run('no-show', 'บันทึกว่าไม่มาตามนัด')}>ลูกค้าไม่มา</button>
              </div>
            )}
          </div>
        </div>

        {/* เนื้อหา — label-value ราง (กฎ 1) */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          {appt.property && (
            <InfoGroup label="ทรัพย์ที่นัดดู" className="mb-4">
              <InfoRow label="ทรัพย์" href={`/properties/${appt.property.id}`} strong hideChevron
                value={<span><span className="block">{appt.property.titleTh}</span><span className="mt-0.5 block font-mono text-xs font-normal text-faint">{appt.property.code}</span></span>} />
            </InfoGroup>
          )}
          {appt.lead && (
            <InfoGroup label="ลูกค้า" className="mb-4">
              <InfoRow label="ชื่อ" value={appt.lead.fullName} href={`/leads/${appt.lead.id}`} strong hideChevron />
              <InfoRow label="เบอร์โทร" value={appt.lead.phone ? <PhoneLink phone={appt.lead.phone} /> : undefined} hideEmpty />
            </InfoGroup>
          )}
          <InfoGroup label="สถานที่ · ผู้ดูแล" className="mb-4">
            <InfoRow label="สถานที่นัด" value={appt.location || undefined} />
            <InfoRow label="ผู้รับผิดชอบ" value={appt.agent?.fullName || undefined} />
          </InfoGroup>
          {appt.status === 'cancelled' && appt.cancelReason && (
            <InfoGroup label="เหตุผลที่ยกเลิก" className="mb-4">
              <InfoRow label="เหตุผล" value={appt.cancelReason} stack />
            </InfoGroup>
          )}
        </div>
      </div>

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

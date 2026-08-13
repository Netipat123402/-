'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { APPOINTMENT_STATUS } from '@/lib/status';
import { fmtDateTime, fmtTimeRange, relUntil, fmtWeekdayDate } from '@/lib/format';
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
  const t = useTranslations();
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
    catch (e) { toast.error((e as { message?: string }).message || t('common.actionFailed')); }
    finally { setBusy(false); }
  }
  const run = (action: string, msg: string) => act(() => api(`/appointments/${id}/${action}`, { method: 'POST', body: JSON.stringify({}) }), msg);
  async function doReschedule() {
    if (!reAt) return;
    setReOpen(false);
    await act(() => api(`/appointments/${id}/reschedule`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(reAt).toISOString() }) }), t('appts.toastRescheduled'));
    setReAt('');
  }
  // นัดใหม่อีกครั้ง — ใช้ flow สร้างนัดที่หน้า list (prefill lead ถ้ามี · ทั่วไป = เปิดหน้าสร้าง)
  const rebook = () => router.push(appt?.lead ? `/appointments?newLead=${appt.lead.id}` : '/appointments');

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-40 animate-pulse rounded-card bg-canvas" /></div>;
  if (!appt) return <div className="mx-auto max-w-3xl text-center text-muted">{t('appts.notFound')} <Link href="/appointments" className="text-gold-dark underline">{t('common.back')}</Link></div>;

  const subject = appt.lead?.fullName || appt.title || t('appts.subjectFallback', { code: appt.code });
  const isUpcoming = appt.status === 'upcoming';

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/appointments"
        code={appt.code}
        statusMap={APPOINTMENT_STATUS}
        statusValue={appt.status}
        title={subject}
        subtitle={appt.property ? t('appts.subtitleViewing') : (appt.title ? t('appts.subtitleGeneral') : undefined)}
      />

      {/* B = เนื้อหา (ทรัพย์/ลูกค้า/สถานที่) + รางวันเวลา/สถานะ/ปุ่ม — โครง+ขนาดเดียวกับสัญญา/ลูกค้า */}
      <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* ราง = วันเวลา (พระเอก) + สถานะ + ปุ่ม (คอม=ขวา sticky · iPad=แถบบน · มือถือ=การ์ดบน) */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 xl:flex-col xl:items-stretch xl:gap-3">
              <div className="shrink-0 sm:text-left xl:text-center">
                <div className="text-lg font-semibold tabular-nums text-ink">{fmtWeekdayDate(appt.scheduledAt)}</div>
                <div className="text-sm tabular-nums text-muted">{fmtTimeRange(appt.scheduledAt, appt.durationMin)} · {t('appts.minutes', { n: appt.durationMin })}</div>
              </div>
              <div className="flex shrink-0 items-center gap-2 xl:justify-center">
                <StatusBadge map={APPOINTMENT_STATUS} value={appt.status} outline />
                {isUpcoming && <span className="text-xs text-gold-dark">{relUntil(appt.scheduledAt, t)}</span>}
              </div>
              {isUpcoming && can('appointment', 'change_status') ? (
                <div className="grid grid-cols-2 gap-2 sm:ml-auto sm:flex sm:shrink-0 xl:ml-0 xl:grid xl:grid-cols-1">
                  <button className="btn-gold btn-sm" disabled={busy} onClick={() => run('complete', t('appts.toastCompleted'))}>{t('appts.completeBtn')}</button>
                  <button className="btn-ghost btn-sm" disabled={busy} onClick={() => { setReAt(''); setReOpen(true); }}>{t('appts.rescheduleBtn')}</button>
                </div>
              ) : !isUpcoming && can('appointment', 'create') ? (
                <div className="grid grid-cols-1 gap-2 sm:ml-auto sm:flex sm:shrink-0 xl:ml-0 xl:grid xl:grid-cols-1">
                  <button className="btn-gold btn-sm" disabled={busy} onClick={rebook}><Icon name="calendar" size={15} /> {t('appts.rebookBtn')}</button>
                </div>
              ) : null}
            </div>
            {isUpcoming && can('appointment', 'change_status') && (
              <div className="mt-3 flex justify-center gap-5 text-xs">
                <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => run('cancel', t('appts.toastCancelled'))}>{t('appts.cancelBtn')}</button>
                <button className="text-muted transition hover:text-danger" disabled={busy} onClick={() => run('no-show', t('appts.toastNoShow'))}>{t('appts.noShowBtn')}</button>
              </div>
            )}
          </div>
        </div>

        {/* เนื้อหา — label-value ราง (กฎ 1) */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          {appt.property && (
            <InfoGroup label={t('appts.secProperty')} className="mb-4">
              <InfoRow label={t('appts.fieldProp')} href={`/properties/${appt.property.id}`} strong hideChevron
                value={<span><span className="block">{appt.property.titleTh}</span><span className="mt-0.5 block font-mono text-xs font-normal text-faint">{appt.property.code}</span></span>} />
            </InfoGroup>
          )}
          {appt.lead && (
            <InfoGroup label={t('appts.secCustomer')} className="mb-4">
              <InfoRow label={t('common.name')} value={appt.lead.fullName} href={`/leads/${appt.lead.id}`} strong hideChevron />
              <InfoRow label={t('common.phone')} value={appt.lead.phone ? <PhoneLink phone={appt.lead.phone} /> : undefined} hideEmpty />
            </InfoGroup>
          )}
          <InfoGroup label={t('appts.secWhereWho')} className="mb-4">
            <InfoRow label={t('appts.fieldLocation')} value={appt.location || undefined} />
            <InfoRow label={t('appts.fieldAgentInCharge')} value={appt.agent?.fullName || undefined} />
          </InfoGroup>
          {appt.status === 'cancelled' && appt.cancelReason && (
            <InfoGroup label={t('appts.secCancelReason')} className="mb-4">
              <InfoRow label={t('appts.fieldReason')} value={appt.cancelReason} stack />
            </InfoGroup>
          )}
        </div>
      </div>

      {/* เลื่อนนัด */}
      <Modal open={reOpen} onClose={() => { setReOpen(false); setReAt(''); }} title={t('appts.rescheduleTitle')}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => { setReOpen(false); setReAt(''); }}>{t('common.cancel')}</button>
            <button type="button" className="btn-gold" disabled={busy || !reAt} onClick={doReschedule}>{t('appts.rescheduleConfirm')}</button>
          </div>
        }>
        <Field label={`${t('appts.fieldNewWhen')} *`} type="datetime-local"
          hint={reAt ? fmtDateTime(reAt) : undefined} value={reAt} onChange={(e) => setReAt(e.target.value)} />
      </Modal>
    </div>
  );
}

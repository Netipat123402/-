'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { bahtFormat, CONTRACT_STATUS } from '@/lib/status';
import { fmtDate } from '@/lib/format';
import { ConfirmDialog, DetailHeader, Field, InfoGroup, InfoRow, Modal, RailBlock, SectionLabel, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import DocumentSection from '@/components/DocumentSection';

/** ขั้นตอน checklist ก่อนลงนามสัญญา (ข้อ 12) — module scope กัน remount */
function SignStep({ done, text }: { done: boolean; text: string }) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${done ? 'bg-success text-white' : 'border border-border'}`}>
        {done ? <Icon name="check" size={13} /> : <span className="h-1.5 w-1.5 rounded-full bg-faint" />}
      </span>
      <span className={done ? 'text-ink' : 'text-muted'}>{text}</span>
    </li>
  );
}

interface Contract {
  id: string; code: string; status: string; monthlyRent: string;
  depositAmount?: string; commissionAmount?: string; startDate?: string; endDate?: string; signedAt?: string;
  // คู่สัญญา (มาจาก include ของ API) — ใช้เป็น identity + กระโดดไปหน้าที่เกี่ยวข้อง
  customer?: { id: string; fullName: string; phone?: string };
  property?: { id: string; code: string; titleTh: string };
  owner?: { id: string; fullName: string; phone?: string };
  agent?: { fullName: string };
}
interface Term { id: string; termKey: string; termValue: string; }

// มาตรฐานวันที่เดียวทั้งแอป "14 Jul 26" (lib) · ว่าง = —
function d(s?: string) { return s ? fmtDate(s) : '—'; }

export default function ContractDetailPage() {
  const { api, can } = useAuth();
  const toast = useToast();
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [c, setC] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [terms, setTerms] = useState<Term[]>([]);
  const [tk, setTk] = useState('');
  const [tv, setTv] = useState('');
  const [docKey, setDocKey] = useState(0); // บังคับ DocumentSection โหลดใหม่หลังออกใบเสร็จ
  // modal states (แทน prompt/confirm)
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [rcAmount, setRcAmount] = useState('');
  const [rcLabel, setRcLabel] = useState('ค่าเช่า');
  const [renewOpen, setRenewOpen] = useState(false);
  const [rnEnd, setRnEnd] = useState('');
  const [rnRent, setRnRent] = useState('');
  const [closeOpen, setCloseOpen] = useState(false);
  const [delOpen, setDelOpen] = useState(false);
  // ข้อ 12: สถานะ lease สำหรับ checklist ก่อนลงนาม — คำนวณจากเอกสารที่ DocumentSection โหลด (แหล่งเดียว)
  const [lease, setLease] = useState<{ attached: boolean; verified: boolean }>({ attached: false, verified: false });
  const onDocs = useCallback((docs: { documentType: string; status: string }[]) => {
    const leaseDocs = docs.filter((x) => x.documentType === 'lease' && x.status !== 'archived');
    setLease({ attached: leaseDocs.length > 0, verified: leaseDocs.some((x) => x.status === 'verified' || x.status === 'active') });
  }, []);

  const loadTerms = useCallback(async () => {
    try { const r = await api<Term[]>(`/contracts/${id}/terms`); setTerms(r.data ?? []); } catch { /* */ }
  }, [api, id]);

  const load = useCallback(async () => {
    try { const r = await api<Contract>(`/contracts/${id}`); setC(r.data); await loadTerms(); }
    catch { setC(null); } finally { setLoading(false); }
  }, [api, id, loadTerms]);
  useEffect(() => { load(); }, [load]);

  async function addTerm() {
    if (!tk.trim() || !tv.trim()) return;
    try { await api(`/contracts/${id}/terms`, { method: 'POST', body: JSON.stringify({ termKey: tk, termValue: tv }) }); setTk(''); setTv(''); loadTerms(); toast.success('เพิ่มเงื่อนไขแล้ว'); }
    catch (e) { toast.error((e as { message?: string }).message || 'เพิ่มไม่สำเร็จ'); }
  }
  async function delTerm(termId: string) {
    try { await api(`/contracts/${id}/terms/${termId}`, { method: 'DELETE' }); loadTerms(); toast.success('ลบเงื่อนไขแล้ว'); }
    catch (e) { toast.error((e as { message?: string }).message || 'ลบไม่สำเร็จ'); }
  }

  async function run(fn: () => Promise<unknown>, successMsg = 'ทำรายการสำเร็จ') {
    setBusy(true);
    try { await fn(); await load(); toast.success(successMsg); }
    catch (e) { toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  // ออกใบเสร็จ — เปิด Modal กรอกจำนวนเงิน + รายการ
  function openReceipt() { setRcAmount(String(Number(c?.monthlyRent ?? 0))); setRcLabel('ค่าเช่า'); setReceiptOpen(true); }
  async function submitReceipt() {
    const amount = Number(rcAmount);
    if (!Number.isFinite(amount) || amount <= 0) { toast.error('จำนวนเงินไม่ถูกต้อง'); return; }
    setBusy(true);
    try {
      const r = await api<{ receiptNo: string }>(`/contracts/${id}/receipt`, { method: 'POST', body: JSON.stringify({ amount, periodLabel: rcLabel.trim() || undefined }) });
      setDocKey((k) => k + 1); // refresh เอกสารให้เห็นใบเสร็จใหม่
      setReceiptOpen(false);
      toast.success(`ออกใบเสร็จ ${r.data?.receiptNo} แล้ว — ดูในส่วนเอกสาร`);
    } catch (e) { toast.error((e as { message?: string }).message || 'ออกใบเสร็จไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  // ต่อสัญญา — เปิด Modal กรอกวันสิ้นสุดใหม่ + ค่าเช่าใหม่ (ถ้าเปลี่ยน)
  function openRenew() { setRnEnd(''); setRnRent(String(Number(c?.monthlyRent ?? 0))); setRenewOpen(true); }
  async function submitRenew() {
    if (!rnEnd) { toast.error('กรุณาระบุวันสิ้นสุดสัญญาใหม่'); return; }
    const body: Record<string, unknown> = { endDate: rnEnd };
    if (rnRent && Number.isFinite(Number(rnRent))) body.monthlyRent = Number(rnRent);
    setBusy(true);
    try {
      const r = await api<{ id: string; code: string }>(`/contracts/${id}/renew`, { method: 'POST', body: JSON.stringify(body) });
      setRenewOpen(false);
      toast.success(`ต่อสัญญาแล้ว — สัญญาใหม่ ${r.data?.code}`);
      if (r.data?.id) setTimeout(() => { router.push(`/contracts/${r.data!.id}`); }, 700); // MR-42: client-nav ไม่รีโหลดทั้งหน้า
    } catch (e) { toast.error((e as { message?: string }).message || 'ต่อสัญญาไม่สำเร็จ'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="mx-auto max-w-3xl"><div className="h-48 animate-pulse rounded-card bg-canvas" /></div>;
  if (!c) return <div className="mx-auto max-w-3xl text-center text-muted">ไม่พบสัญญา <Link href="/contracts" className="text-gold-dark underline">กลับ</Link></div>;

  // แถบความคืบหน้าอายุสัญญา + เหลือกี่วัน (รางสถานะ A+)
  const startMs = c.startDate ? new Date(c.startDate).getTime() : null;
  const endMs = c.endDate ? new Date(c.endDate).getTime() : null;
  const progress = startMs && endMs && endMs > startMs ? Math.min(100, Math.max(0, ((Date.now() - startMs) / (endMs - startMs)) * 100)) : 0;
  const daysLeft = endMs ? Math.ceil((endMs - Date.now()) / 86400000) : null;

  return (
    <div className="mx-auto max-w-3xl xl:max-w-5xl">
      <DetailHeader
        backHref="/contracts"
        code={c.code}
        badge={<StatusBadge map={CONTRACT_STATUS} value={c.status} />}
        title={c.customer?.fullName || 'สัญญาเช่า'}
        subtitle={`สัญญาเช่า${c.property ? ` · ${c.property.titleTh}` : ''}`}
        price={bahtFormat(Number(c.monthlyRent))}
        priceSuffix="/เดือน"
      />

      {/* A+ = เอกสาร (ซ้าย/ล่าง) + รางสถานะ (คอม=ขวา sticky · iPad=แถบบน · มือถือ=การ์ดบน) */}
      <div className="mt-5 xl:grid xl:grid-cols-[minmax(0,1fr)_19rem] xl:items-start xl:gap-8">
        {/* รางสถานะ */}
        <div className="xl:order-2">
          <div className="rounded-card border border-border bg-surface p-4 xl:sticky xl:top-20">
            {c.status === 'draft' ? (
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 shrink-0 rounded-full bg-faint" />ฉบับร่าง — รอลงนาม</div>
                <div>
                  <SectionLabel>ขั้นตอนก่อนลงนาม</SectionLabel>
                  <ul className="mt-2.5 space-y-2">
                    <SignStep done={lease.attached} text="แนบเอกสารสัญญาเช่า (lease)" />
                    <SignStep done={lease.verified} text="เอกสารผ่านการตรวจสอบ (verify)" />
                  </ul>
                  {!lease.verified && (
                    <p className="mt-2.5 text-xs text-muted">
                      {lease.attached
                        ? <>กด <b>“ตรวจสอบแล้ว”</b> ที่เอกสาร lease ในส่วน <b>เอกสารสัญญา</b> ด้านล่าง</>
                        : <>แนบเอกสาร <b>สัญญาเช่า (lease)</b> ในส่วน <b>เอกสารสัญญา</b> ด้านล่าง แล้วกดตรวจสอบ</>}
                    </p>
                  )}
                </div>
                {can('contract', 'sign') && (
                  <button className="btn-gold w-full" disabled={busy || !lease.verified}
                    onClick={() => run(() => api(`/contracts/${c.id}/sign`, { method: 'POST', body: '{}' }), 'ลงนามสัญญาแล้ว — มีผลบังคับ · ทรัพย์เปลี่ยนเป็นไม่ว่าง')}>
                    ลงนามสัญญา (มีผล)
                  </button>
                )}
                {can('contract', 'delete') && (
                  <button className="text-xs text-muted transition hover:text-danger" onClick={() => setDelOpen(true)}>ลบสัญญาร่าง</button>
                )}
              </div>
            ) : c.status === 'active' ? (
              <>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-5 xl:flex-col xl:items-stretch xl:gap-3">
                  <div className="flex shrink-0 items-center gap-2 text-sm font-medium"><span className="h-2 w-2 shrink-0 rounded-full bg-success" />มีผลบังคับ</div>
                  {startMs && endMs && (
                    <div className="min-w-0 sm:flex-1 xl:flex-initial">
                      <div className="h-1 overflow-hidden rounded-full bg-border"><div className="h-full rounded-full bg-gold-dark" style={{ width: `${progress}%` }} /></div>
                      <div className="mt-1 flex justify-between text-xs text-faint"><span>{d(c.startDate)}</span><span>{d(c.endDate)}</span></div>
                    </div>
                  )}
                  {daysLeft != null && <span className="shrink-0 whitespace-nowrap text-xs text-gold-dark xl:text-center">เหลือ {daysLeft} วัน</span>}
                  <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0 xl:grid xl:grid-cols-1">
                    {can('contract', 'update') && <button className="btn-gold btn-sm" disabled={busy} onClick={openReceipt}>ออกใบเสร็จ</button>}
                    {can('contract', 'create') && <button className="btn-ghost btn-sm" disabled={busy} onClick={openRenew}>ต่อสัญญา</button>}
                  </div>
                </div>
                {can('contract', 'change_status') && (
                  <div className="mt-3 text-center"><button className="text-xs text-muted transition hover:text-danger" onClick={() => setCloseOpen(true)}>ปิดสัญญา</button></div>
                )}
              </>
            ) : (
              <div className="flex items-center gap-2 text-sm font-medium"><span className="h-2 w-2 shrink-0 rounded-full bg-faint" />สิ้นสุดแล้ว{c.endDate && <span className="font-normal text-muted"> · {d(c.endDate)}</span>}</div>
            )}
          </div>
        </div>

        {/* เอกสารสัญญา (อ่านไล่เป็นชุด ไม่มีแท็บ) */}
        <div className="mt-6 xl:order-1 xl:mt-0">
          <div className="md:columns-2 md:gap-5 xl:columns-1">
            <InfoGroup label="คู่สัญญา" className="mb-4 break-inside-avoid">
              {c.customer && (
                <InfoRow label="ผู้เช่า" href={`/customers/${c.customer.id}`} strong hideChevron
                  value={<span>{c.customer.fullName}{c.customer.phone && <span className="font-normal text-muted"> · {c.customer.phone}</span>}</span>} />
              )}
              {c.property && (
                <InfoRow label="ทรัพย์" href={`/properties/${c.property.id}`} strong hideChevron
                  value={<span><span className="block">{c.property.titleTh}</span><span className="mt-0.5 block font-mono text-xs font-normal text-faint">{c.property.code}</span></span>} />
              )}
              {c.owner && (
                <InfoRow label="เจ้าของ" href={`/owners/${c.owner.id}`} strong hideChevron
                  value={<span>{c.owner.fullName}{c.owner.phone && <span className="font-normal text-muted"> · {c.owner.phone}</span>}</span>} />
              )}
              {c.agent && <InfoRow label="พนักงาน" value={c.agent.fullName} />}
            </InfoGroup>

            <InfoGroup label="ระยะเวลา" className="mb-4 break-inside-avoid">
              <InfoRow label="ลงนามเมื่อ" value={c.signedAt ? d(c.signedAt) : undefined} hideEmpty />
              <InfoRow label="วันเริ่ม" value={d(c.startDate)} />
              <InfoRow label="วันสิ้นสุด" value={d(c.endDate)} />
            </InfoGroup>

            <InfoGroup label="การเงิน" className="mb-4 break-inside-avoid">
              <InfoRow label="ค่าเช่า/เดือน" value={`฿${bahtFormat(Number(c.monthlyRent))}`} mono />
              <InfoRow label="เงินมัดจำ" value={c.depositAmount ? `฿${bahtFormat(Number(c.depositAmount))}` : undefined} mono hideEmpty />
              <InfoRow label="ค่านายหน้า" value={c.commissionAmount ? `฿${bahtFormat(Number(c.commissionAmount))}` : undefined} mono hideEmpty />
            </InfoGroup>
          </div>

          <InfoGroup label="เงื่อนไข" className="mb-4">
            {terms.length === 0 ? <p className="py-2.5 text-sm text-muted">ยังไม่มีเงื่อนไข</p> : (
              terms.map((t) => (
                <InfoRow key={t.id} label={t.termKey} value={
                  <span className="inline-flex items-center gap-2">{t.termValue}{can('contract', 'update') && <button className="text-xs text-danger hover:underline" onClick={() => delTerm(t.id)}>ลบ</button>}</span>
                } />
              ))
            )}
            {can('contract', 'update') && (
              <div className="flex flex-wrap gap-2 py-3">
                <input className="field h-10 max-w-[150px]" placeholder="หัวข้อ (เช่น ค่าน้ำ)" value={tk} onChange={(e) => setTk(e.target.value)} />
                <input className="field h-10 flex-1" placeholder="รายละเอียด" value={tv} onChange={(e) => setTv(e.target.value)} />
                <button className="btn-ghost h-10" onClick={addTerm}><Icon name="plus" size={16} /> เพิ่ม</button>
              </div>
            )}
          </InfoGroup>

          <section className="scroll-mt-28 overflow-hidden rounded-card border border-border bg-surface">
            <div className="px-4 pt-3.5 sm:px-5"><SectionLabel>เอกสารสัญญา</SectionLabel></div>
            <div className="px-4 pb-4 pt-2 sm:px-5"><RailBlock><DocumentSection key={docKey} entityType="contract" entityId={c.id} onDocsLoaded={onDocs} /></RailBlock></div>
          </section>
        </div>
      </div>

      {/* ออกใบเสร็จ */}
      <Modal open={receiptOpen} onClose={() => setReceiptOpen(false)} title="ออกใบเสร็จ"
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setReceiptOpen(false)} disabled={busy}>ยกเลิก</button>
            <button type="button" className="btn-gold" onClick={submitReceipt} disabled={busy}>{busy ? 'กำลังออก…' : 'ออกใบเสร็จ'}</button>
          </div>
        }>
        <div className="space-y-4">
          <Field label="จำนวนเงิน (บาท)" inputMode="numeric" value={rcAmount} onChange={(e) => setRcAmount(e.target.value)} />
          <Field label="รายการ" placeholder="เช่น ค่าเช่าเดือนมิถุนายน 2569" value={rcLabel} onChange={(e) => setRcLabel(e.target.value)} />
        </div>
      </Modal>

      {/* ต่อสัญญา */}
      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="ต่อสัญญา" confirmOnClose={!!rnEnd}
        footer={
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={() => setRenewOpen(false)} disabled={busy}>ยกเลิก</button>
            <button type="button" className="btn-gold" onClick={submitRenew} disabled={busy}>{busy ? 'กำลังต่อ…' : 'ต่อสัญญา'}</button>
          </div>
        }>
        <div className="space-y-4">
          <Field label="วันสิ้นสุดสัญญาใหม่" type="date" value={rnEnd} onChange={(e) => setRnEnd(e.target.value)} />
          <Field label="ค่าเช่าใหม่ (บาท)" hint="เว้นว่าง = เท่าเดิม" inputMode="numeric" value={rnRent} onChange={(e) => setRnRent(e.target.value)} />
        </div>
      </Modal>

      {/* ปิดสัญญา */}
      <ConfirmDialog open={closeOpen} onClose={() => setCloseOpen(false)} busy={busy}
        title="ปิดสัญญา" tone="danger" confirmLabel="ปิดสัญญา" withReason
        message={<>ปิดสัญญา <b>{c.code}</b>? สถานะจะเปลี่ยนเป็น “สิ้นสุด”</>}
        reasonPlaceholder="เหตุผลที่ปิด (ถ้ามี)"
        onConfirm={(reason) => { setCloseOpen(false); run(() => api(`/contracts/${c.id}/status`, { method: 'PATCH', body: JSON.stringify({ toStatus: 'ended', reason }) }), 'ปิดสัญญาแล้ว'); }} />

      {/* ลบสัญญาร่าง — ปลดล็อกการลบทรัพย์/เจ้าของที่ผูกไว้ (สร้างผิด) */}
      <ConfirmDialog open={delOpen} onClose={() => setDelOpen(false)} busy={busy}
        title="ลบสัญญาร่าง" tone="danger" confirmLabel="ลบสัญญา"
        message={<>ลบสัญญาร่าง <b>{c.code}</b> ทิ้ง? ใช้กรณีสร้างผิด — ลบแล้วทรัพย์/เจ้าของที่ผูกไว้จะลบได้</>}
        onConfirm={async () => {
          setBusy(true);
          try { await api(`/contracts/${c.id}`, { method: 'DELETE' }); toast.success('ลบสัญญาร่างแล้ว'); router.push('/contracts'); }
          catch (e) { toast.error((e as { message?: string }).message || 'ลบไม่สำเร็จ'); setBusy(false); setDelOpen(false); }
        }} />
    </div>
  );
}

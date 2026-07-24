'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { bahtFormat, CONTRACT_STATUS, isExpiringSoon } from '@/lib/status';
import { ActionBar, ConfirmDialog, DetailHeader, Field, InfoGroup, InfoRow, Modal, MoreMenu, SectionLabel, SectionTabs, StatusBadge } from '@/components/ui';
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

function d(s?: string) { return s ? new Date(s).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'; }

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

      {/* ข้อ 12 — Sign flow: checklist ก่อนลงนาม (แทน toast แดง×3) + ปุ่ม disabled พร้อมเหตุผลจนกว่าจะครบ */}
      {c.status === 'draft' && (
        <div className="mt-4 space-y-3">
          <div className="rounded-xl border border-border bg-surface p-4">
            <SectionLabel>ขั้นตอนก่อนลงนาม</SectionLabel>
            <ul className="mt-3 space-y-2.5">
              <SignStep done={lease.attached} text="แนบเอกสารสัญญาเช่า (lease)" />
              <SignStep done={lease.verified} text="เอกสารผ่านการตรวจสอบ (verify)" />
            </ul>
            {!lease.verified && (
              <p className="mt-3 text-xs text-muted">
                {lease.attached
                  ? <>กด <b>“ตรวจสอบแล้ว”</b> ที่เอกสาร lease ในส่วน <b>เอกสารสัญญา</b> ด้านล่าง</>
                  : <>แนบเอกสาร <b>สัญญาเช่า (lease)</b> ในส่วน <b>เอกสารสัญญา</b> ด้านล่าง แล้วกดตรวจสอบ</>}
              </p>
            )}
          </div>
          <ActionBar>
            {can('contract', 'sign') && (
              <button className="btn-gold btn-sm" disabled={busy || !lease.verified}
                onClick={() => run(() => api(`/contracts/${c.id}/sign`, { method: 'POST', body: '{}' }), 'ลงนามสัญญาแล้ว — มีผลบังคับ · ทรัพย์เปลี่ยนเป็นไม่ว่าง')}>
                ลงนามสัญญา (มีผล)
              </button>
            )}
            <MoreMenu items={can('contract', 'delete') ? [{ label: 'ลบสัญญาร่าง', icon: 'trash' as const, danger: true, onClick: () => setDelOpen(true) }] : []} />
          </ActionBar>
          {can('contract', 'sign') && !lease.verified && (
            <p className="text-xs text-muted">ยังลงนามไม่ได้ — ต้องแนบและตรวจสอบเอกสาร lease ให้ครบก่อน</p>
          )}
        </div>
      )}

      {c.status === 'active' && (
        <>
          <ActionBar className="mt-4">
            {can('contract', 'update') && <button className="btn-gold btn-sm" disabled={busy} onClick={openReceipt}>ออกใบเสร็จ</button>}
            {can('contract', 'create') && <button className="btn-ghost btn-sm" disabled={busy} onClick={openRenew}>ต่อสัญญา</button>}
            <MoreMenu items={can('contract', 'change_status') ? [{ label: 'ปิดสัญญา', icon: 'x' as const, danger: true, onClick: () => setCloseOpen(true) }] : []} />
          </ActionBar>
          {isExpiringSoon(c.endDate) && (
            <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold-dark">
              <Icon name="clock" size={14} className="shrink-0" />
              <span>สัญญาใกล้ครบกำหนด (สิ้นสุด {d(c.endDate)}) — พิจารณาต่อสัญญา/ปิดสัญญา</span>
            </div>
          )}
        </>
      )}

      {/* per-device (owner mandate): มือถือ accordion · iPad/คอม แท็บ · sign-flow/action คงเหนือแท็บ (จัดการก่อน) */}
      <SectionTabs className="mt-6" items={[
        { id: 'detail', label: 'รายละเอียด', content: (
          <div className="xl:columns-2 xl:gap-5">
            {/* คู่สัญญา */}
            <InfoGroup label="คู่สัญญา" className="mb-4 break-inside-avoid">
              {c.customer && (
                <InfoRow label="ลูกค้า" href={`/customers/${c.customer.id}`} strong hideChevron
                  value={<span>{c.customer.fullName}{c.customer.phone && <span className="font-normal text-muted"> · {c.customer.phone}</span>}</span>} />
              )}
              {c.property && (
                // ข้อ 5: ชื่อทรัพย์เต็มบรรทัดบน · เลขทรัพย์บรรทัดล่างจาง (เลิกชื่อโดนตัด/เลขลอย)
                <InfoRow label="ทรัพย์" href={`/properties/${c.property.id}`} strong hideChevron
                  value={<span><span className="block">{c.property.titleTh}</span><span className="mt-0.5 block font-mono text-xs font-normal text-faint">{c.property.code}</span></span>} />
              )}
              {c.owner && (
                <InfoRow label="เจ้าของ" href={`/owners/${c.owner.id}`} strong hideChevron
                  value={<span>{c.owner.fullName}{c.owner.phone && <span className="font-normal text-muted"> · {c.owner.phone}</span>}</span>} />
              )}
              {c.agent && <InfoRow label="พนักงาน" value={c.agent.fullName} />}
            </InfoGroup>

            {/* การเงิน — ค่าเช่าอยู่หัว glance แล้ว เหลือ มัดจำ/นายหน้า (T1.3) */}
            <InfoGroup label="การเงิน" className="mb-4 break-inside-avoid">
              <InfoRow label="เงินมัดจำ" value={c.depositAmount ? `฿${bahtFormat(Number(c.depositAmount))}` : undefined} mono hideEmpty />
              <InfoRow label="ค่านายหน้า" value={c.commissionAmount ? `฿${bahtFormat(Number(c.commissionAmount))}` : undefined} mono hideEmpty />
              {!c.depositAmount && !c.commissionAmount && <p className="py-2.5 text-sm text-muted">ยังไม่ระบุมัดจำ/ค่านายหน้า</p>}
            </InfoGroup>

            {/* ระยะเวลา */}
            <InfoGroup label="ระยะเวลา" className="mb-4 break-inside-avoid">
              <InfoRow label="วันเริ่ม" value={d(c.startDate)} />
              <InfoRow label="วันสิ้นสุด" value={<span className="inline-flex items-center gap-1.5">{d(c.endDate)}{c.status === 'active' && isExpiringSoon(c.endDate) && <span className="badge bg-gold/15 text-gold-dark">ใกล้ครบกำหนด</span>}</span>} />
              <InfoRow label="ลงนามเมื่อ" value={c.signedAt ? d(c.signedAt) : undefined} hideEmpty />
            </InfoGroup>
          </div>
        ) },
        { id: 'terms', label: 'เงื่อนไข', content: (
          <div className="card p-5">
            {terms.length === 0 ? <p className="mb-3 text-sm text-muted">ยังไม่มีเงื่อนไข</p> : (
              <ul className="mb-3 divide-y divide-border">
                {terms.map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-2.5 text-sm">
                    <span><span className="font-medium">{t.termKey}:</span> <span className="text-ink-soft">{t.termValue}</span></span>
                    {can('contract', 'update') && <button className="text-xs text-danger hover:underline" onClick={() => delTerm(t.id)}>ลบ</button>}
                  </li>
                ))}
              </ul>
            )}
            {can('contract', 'update') && (
              <div className="flex flex-wrap gap-2">
                <input className="field h-10 max-w-[160px]" placeholder="หัวข้อ (เช่น ค่าน้ำ)" value={tk} onChange={(e) => setTk(e.target.value)} />
                <input className="field h-10 flex-1" placeholder="รายละเอียด" value={tv} onChange={(e) => setTv(e.target.value)} />
                <button className="btn-ghost h-10" onClick={addTerm}><Icon name="plus" size={16} /> เพิ่ม</button>
              </div>
            )}
          </div>
        ) },
        { id: 'docs', label: 'เอกสาร', content: (
          <div className="card p-5">
            <DocumentSection key={docKey} entityType="contract" entityId={c.id} onDocsLoaded={onDocs} />
          </div>
        ) },
      ]} />

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

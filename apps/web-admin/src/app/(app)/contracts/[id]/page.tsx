'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { bahtFormat, CONTRACT_STATUS, isExpiringSoon } from '@/lib/status';
import { ConfirmDialog, Field, Modal, StatusBadge } from '@/components/ui';
import { Icon } from '@/components/Icon';
import DocumentSection from '@/components/DocumentSection';

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

function d(s?: string) { return s ? new Date(s).toLocaleDateString('th-TH', { dateStyle: 'medium' }) : '—'; }

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

  // จัดเป็นหมวดเหมือนหน้ารายละเอียดทรัพย์ (การเงิน แยกจาก ระยะเวลา)
  const groups: { title: string; items: [string, string][] }[] = [
    { title: 'การเงิน', items: [
      ['ค่าเช่า / เดือน', `฿${bahtFormat(Number(c.monthlyRent))}`],
      ['เงินมัดจำ', c.depositAmount ? `฿${bahtFormat(Number(c.depositAmount))}` : '—'],
      ['ค่านายหน้า', c.commissionAmount ? `฿${bahtFormat(Number(c.commissionAmount))}` : '—'],
    ] },
    { title: 'ระยะเวลา', items: [
      ['วันเริ่ม', d(c.startDate)],
      ['วันสิ้นสุด', d(c.endDate)],
      ['ลงนามเมื่อ', d(c.signedAt)],
    ] },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/contracts" className="inline-flex items-center gap-1 text-sm text-muted hover:text-ink"><Icon name="arrow-left" size={16} /> กลับ</Link>
      <div className="mt-3 flex items-center gap-2">
        <span className="font-mono text-xs text-muted">{c.code}</span>
        <StatusBadge map={CONTRACT_STATUS} value={c.status} />
      </div>
      {/* identity = ลูกค้า (สัญญาของใคร) · รอง = ชนิดสัญญา + ทรัพย์ — รู้ทันทีว่าสัญญาไหน ไม่ใช่หัวข้อกลาง ๆ */}
      <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">{c.customer?.fullName || 'สัญญาเช่า'}</h1>
      <p className="mt-0.5 truncate text-sm text-muted">สัญญาเช่า{c.property ? ` · ${c.property.titleTh}` : ''}</p>

      {/* actions — 3 สถานะ */}
      <div className="mt-4 flex flex-wrap gap-2">
        {c.status === 'draft' && can('contract', 'sign') && (
          <button className="btn-gold btn-sm" disabled={busy} onClick={() => run(() => api(`/contracts/${c.id}/sign`, { method: 'POST', body: '{}' }), 'ลงนามสัญญาแล้ว — มีผลบังคับ')}>ลงนามสัญญา (มีผล)</button>
        )}
        {c.status === 'draft' && can('contract', 'delete') && (
          <button className="btn-ghost btn-sm text-danger" disabled={busy} onClick={() => setDelOpen(true)}>ลบสัญญาร่าง</button>
        )}
        {c.status === 'active' && (
          <>
            {can('contract', 'create') && <button className="btn-ghost btn-sm text-gold-dark" disabled={busy} onClick={openRenew}>ต่อสัญญา</button>}
            {can('contract', 'update') && <button className="btn-ghost btn-sm" disabled={busy} onClick={openReceipt}>ออกใบเสร็จ</button>}
            {can('contract', 'change_status') && (
              <button className="btn-ghost btn-sm text-danger" disabled={busy} onClick={() => setCloseOpen(true)}>ปิดสัญญา</button>
            )}
          </>
        )}
      </div>

      {c.status === 'draft' && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-canvas p-3 text-sm text-ink-soft">
          <Icon name="file-text" size={16} className="mt-0.5 shrink-0 text-muted" />
          <span>แนบ <b>เอกสารสัญญาเช่า (lease)</b> แล้วกด “ตรวจสอบ” ในส่วนเอกสารด้านล่าง ก่อนลงนาม</span>
        </div>
      )}
      {c.status === 'active' && isExpiringSoon(c.endDate) && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-gold/30 bg-gold/5 px-3 py-2 text-xs text-gold-dark">
          <Icon name="clock" size={14} className="shrink-0" />
          <span>สัญญาใกล้ครบกำหนด (สิ้นสุด {d(c.endDate)}) — พิจารณาต่อสัญญา/ปิดสัญญา</span>
        </div>
      )}

      {/* คู่สัญญา — กระโดดไปหน้าลูกค้า/ทรัพย์/เจ้าของได้ (เดิมหน้านี้ไม่โยงไปไหนเลย) */}
      <div className="mt-6 card p-5">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">คู่สัญญา</h3>
        <div className="divide-y divide-border">
          {c.customer && (
            <button onClick={() => router.push(`/customers/${c.customer!.id}`)} className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-70">
              <span className="w-16 shrink-0 text-xs text-muted">ลูกค้า</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.customer.fullName}</span>
              <Icon name="chevron-right" size={16} className="shrink-0 text-faint" />
            </button>
          )}
          {c.property && (
            <button onClick={() => router.push(`/properties/${c.property!.id}`)} className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-70">
              <span className="w-16 shrink-0 text-xs text-muted">ทรัพย์</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.property.titleTh}</span>
              <span className="shrink-0 font-mono text-xs text-gold-dark">{c.property.code}</span>
              <Icon name="chevron-right" size={16} className="shrink-0 text-faint" />
            </button>
          )}
          {c.owner && (
            <button onClick={() => router.push(`/owners/${c.owner!.id}`)} className="flex w-full items-center gap-3 py-2.5 text-left transition hover:opacity-70">
              <span className="w-16 shrink-0 text-xs text-muted">เจ้าของ</span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium">{c.owner.fullName}</span>
              <Icon name="chevron-right" size={16} className="shrink-0 text-faint" />
            </button>
          )}
          {c.agent && (
            <div className="flex items-center gap-3 py-2.5">
              <span className="w-16 shrink-0 text-xs text-muted">พนักงาน</span>
              <span className="min-w-0 flex-1 truncate text-sm text-ink">{c.agent.fullName}</span>
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 card divide-y divide-border">
        {groups.map((g) => (
          <section key={g.title} className="p-5">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
              {g.items.map(([k, v]) => (
                <div key={k} className="min-w-0"><dt className="text-xs text-muted">{k}</dt><dd className="truncate text-sm text-ink">{v}</dd></div>
              ))}
            </dl>
          </section>
        ))}
      </div>

      <div className="mt-6 card p-5">
        <h2 className="mb-4 font-semibold">เงื่อนไขเพิ่มเติม</h2>
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

      <div className="mt-6 card p-5">
        <h2 className="mb-4 font-semibold">เอกสารสัญญา</h2>
        <DocumentSection key={docKey} entityType="contract" entityId={c.id} />
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
      <Modal open={renewOpen} onClose={() => setRenewOpen(false)} title="ต่อสัญญา"
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

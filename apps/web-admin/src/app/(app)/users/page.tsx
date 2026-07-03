'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useToast } from '@/components/Toast';
import { Col, Combobox, ConfirmDialog, Field, FilterBar, ListView, Modal, PageHeader } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { badgeClass, type Tone } from '@/lib/status';
import { formatPhone, phoneDigits } from '@/lib/format';

interface User { id: string; email: string; fullName: string; phone?: string; status: string; roles: string[]; }
interface Role { name: string; description?: string; }

const ROLE_TH: Record<string, string> = {
  super_admin: 'ผู้ดูแลสูงสุด', company_admin: 'ผู้บริหาร', branch_manager: 'ผจก.สาขา',
  team_lead: 'หัวหน้าทีม', sales_agent: 'พนักงานขาย', back_office: 'หลังบ้าน', auditor: 'ผู้ตรวจสอบ',
};
const STATUS_TH: Record<string, { label: string; tone: Tone }> = {
  active: { label: 'ใช้งาน', tone: 'active' }, invited: { label: 'รอเปิดใช้', tone: 'gold' }, suspended: { label: 'ระงับ', tone: 'neutral' },
};

export default function UsersPage() {
  const { api, can, user } = useAuth();
  const toast = useToast();
  const [q, setQ] = useState('');
  const { rows, meta, loading, reload } = useList<User>(`/users${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  const [roles, setRoles] = useState<Role[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<User | null>(null);
  const [delTarget, setDelTarget] = useState<User | null>(null);
  const [deleting, setDeleting] = useState(false);
  // แก้ไขบัญชี (role/สถานะ) + รีเซ็ตรหัสผ่านโดยแอดมิน
  const [edit, setEdit] = useState<{ role: string; status: string; password: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [editErr, setEditErr] = useState('');

  function openUser(u: User) {
    setActive(u);
    setEdit({ role: u.roles[0] ?? 'sales_agent', status: u.status, password: '' });
    setShowPw(false); setEditErr('');
  }

  async function saveEdit() {
    if (!active || !edit) return;
    const body: { roleNames?: string[]; status?: string } = {};
    if (edit.role && edit.role !== active.roles[0]) body.roleNames = [edit.role];
    if (edit.status !== active.status) body.status = edit.status;
    if (!body.roleNames && !body.status) return;
    setSavingEdit(true); setEditErr('');
    try {
      await api(`/users/${active.id}`, { method: 'PATCH', body: JSON.stringify(body) });
      setActive(null); reload(); toast.success('บันทึกการแก้ไขแล้ว');
    } catch (e) { setEditErr((e as { message?: string }).message || 'บันทึกไม่สำเร็จ'); }
    finally { setSavingEdit(false); }
  }

  async function resetPw() {
    if (!active || !edit) return;
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(edit.password)) {
      setEditErr('รหัสผ่านอย่างน้อย 8 ตัว และต้องมีทั้งตัวอักษรและตัวเลข'); return;
    }
    setSavingEdit(true); setEditErr('');
    try {
      await api(`/users/${active.id}`, { method: 'PATCH', body: JSON.stringify({ password: edit.password }) });
      setEdit((x) => x && { ...x, password: '' });
      toast.success('รีเซ็ตรหัสผ่านแล้ว — บัญชีนี้ถูกบังคับเข้าสู่ระบบใหม่');
    } catch (e) { setEditErr((e as { message?: string }).message || 'รีเซ็ตไม่สำเร็จ'); }
    finally { setSavingEdit(false); }
  }

  async function removeUser() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await api(`/users/${delTarget.id}`, { method: 'DELETE' });
      setDelTarget(null); setActive(null); reload();
      toast.success('ลบบัญชีแล้ว');
    } catch (e) { toast.error((e as { message?: string }).message || 'ลบไม่สำเร็จ'); }
    finally { setDeleting(false); }
  }
  const [form, setForm] = useState({ email: '', fullName: '', phone: '', password: '', role: 'sales_agent' });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');
  const [fe, setFe] = useState<{ fullName?: string; email?: string; phone?: string; password?: string }>({});
  function setField(k: keyof typeof form, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in fe) setFe((e) => ({ ...e, [k]: undefined }));
  }

  useEffect(() => { (async () => { try { const r = await api<Role[]>('/users/roles'); setRoles(r.data); } catch { /* */ } })(); }, [api]);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    const v: typeof fe = {};
    if (!form.fullName.trim()) v.fullName = 'กรุณากรอกชื่อ-นามสกุล';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) v.email = 'อีเมลไม่ถูกต้อง';
    const d = phoneDigits(form.phone);
    if (d && d.length !== 10) v.phone = 'เบอร์โทรต้องมี 10 หลัก';
    if (form.password.length < 8) v.password = 'รหัสผ่านอย่างน้อย 8 ตัว';
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify({
        email: form.email, fullName: form.fullName, phone: d || undefined,
        password: form.password, roleNames: [form.role],
      }) });
      setOpen(false); setForm({ email: '', fullName: '', phone: '', password: '', role: 'sales_agent' }); setFe({}); reload();
      toast.success('สร้างบัญชีแล้ว');
    } catch (e2) { setErr((e2 as { message?: string }).message || 'สร้างไม่สำเร็จ'); }
    finally { setSaving(false); }
  }

  const statusBadge = (s: string) => {
    const st = STATUS_TH[s] ?? { label: s, tone: 'neutral' as Tone };
    return <span className={badgeClass(st.tone)}>{st.label}</span>;
  };

  const cols: Col<User>[] = [
    { header: 'ชื่อ', primary: true, cell: (u) => u.fullName },
    { header: 'อีเมล · บทบาท', sub: true, cell: (u) => `${u.email} · ${u.roles.map((r) => ROLE_TH[r] ?? r).join(', ')}` },
    { header: 'บทบาท', cell: (u) => u.roles.map((r) => ROLE_TH[r] ?? r).join(', ') },
    { header: 'สถานะ', right: true, cell: (u) => statusBadge(u.status) },
  ];

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="ผู้ใช้งาน" count={`${meta.total ?? rows.length} บัญชี`}
        action={can('user', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> บัญชี</button>} />
      <FilterBar search={{ value: q, onChange: setQ, placeholder: 'ค้นหาชื่อ/อีเมล…' }} />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(u) => u.id} loading={loading} empty="ยังไม่มีผู้ใช้" emptyIcon="users" onRow={openUser} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="สร้างบัญชีผู้ใช้">
        <form onSubmit={create} className="space-y-4">
          <Field label="ชื่อ-นามสกุล *" error={fe.fullName} placeholder="เช่น สมชาย ใจดี" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
          <Field label="อีเมล *" type="email" error={fe.email} placeholder="name@ros.local" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          <Field label="เบอร์โทร" error={fe.phone} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone} onChange={(e) => setField('phone', formatPhone(e.target.value))} />
          <Field label="รหัสผ่าน *" type="text" error={fe.password} hint="อย่างน้อย 8 ตัวอักษร" value={form.password} onChange={(e) => setField('password', e.target.value)} />
          <Combobox label="บทบาท *" searchable={false} value={form.role} onChange={(v) => setForm({ ...form, role: v })}
            options={(roles.length ? roles : [{ name: 'sales_agent' }]).map((r) => ({ value: r.name, label: ROLE_TH[r.name] ?? r.name }))} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>ยกเลิก</button>
            <button className="btn-gold" disabled={saving}>{saving ? 'กำลังสร้าง…' : 'สร้างบัญชี'}</button>
          </div>
        </form>
      </Modal>

      {/* จัดการบัญชี (แตะแถว) */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.fullName ?? ''}>
        {active && (
          <div className="space-y-4">
            <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2">
              <div><dt className="text-xs text-muted">อีเมล</dt><dd className="text-sm">{active.email}</dd></div>
              <div><dt className="text-xs text-muted">เบอร์โทร</dt><dd className="text-sm">{active.phone || '—'}</dd></div>
              <div><dt className="text-xs text-muted">บทบาท</dt><dd className="text-sm">{active.roles.map((r) => ROLE_TH[r] ?? r).join(', ')}</dd></div>
              <div><dt className="text-xs text-muted">สถานะ</dt><dd className="text-sm">{statusBadge(active.status)}</dd></div>
            </dl>

            {/* แก้ไขบัญชี — เปลี่ยนบทบาท/สถานะ (ไม่ใช่บัญชีตัวเอง) + รีเซ็ตรหัสผ่าน */}
            {can('user', 'update') && !active.roles.includes('super_admin') && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted">แก้ไขบัญชี</p>
                {active.id !== user?.id && (
                  <>
                    <Combobox label="บทบาท" searchable={false} value={edit?.role ?? ''}
                      onChange={(v) => setEdit((e) => e && { ...e, role: v })}
                      options={(roles.length ? roles : [{ name: 'sales_agent' }]).map((r) => ({ value: r.name, label: ROLE_TH[r.name] ?? r.name }))} />
                    <Combobox label="สถานะ" searchable={false} value={edit?.status ?? ''}
                      onChange={(v) => setEdit((e) => e && { ...e, status: v })}
                      options={[{ value: 'active', label: 'ใช้งาน' }, { value: 'suspended', label: 'ระงับการใช้งาน' }]} />
                    <button className="btn-primary w-full" disabled={savingEdit} onClick={saveEdit}>บันทึกการแก้ไข</button>
                  </>
                )}
                <div className="pt-1">
                  <label className="mb-1.5 block text-sm font-medium text-ink-soft">ตั้งรหัสผ่านใหม่</label>
                  <div className="relative">
                    <input className="field pr-16" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                      placeholder="อย่างน้อย 8 ตัว มีตัวอักษร+ตัวเลข" value={edit?.password ?? ''}
                      onChange={(e) => setEdit((x) => x && { ...x, password: e.target.value })} />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-ink">
                      {showPw ? 'ซ่อน' : 'แสดง'}
                    </button>
                  </div>
                  <button className="btn-ghost mt-2 w-full" disabled={savingEdit || !edit?.password} onClick={resetPw}>รีเซ็ตรหัสผ่าน</button>
                  <p className="mt-1.5 text-xs text-muted">รีเซ็ตแล้วบัญชีนี้จะถูกบังคับออกจากระบบทุกอุปกรณ์</p>
                </div>
                {editErr && <p className="text-sm text-danger">{editErr}</p>}
              </div>
            )}

            {can('user', 'delete') && active.id !== user?.id && !active.roles.includes('super_admin') && (
              <div className="border-t border-border pt-4">
                <button className="btn-danger w-full" onClick={() => { const t = active; setActive(null); setDelTarget(t); }}>
                  <Icon name="x" size={16} /> ลบบัญชีนี้ถาวร
                </button>
                <p className="mt-2 text-center text-xs text-muted">งานที่บัญชีนี้ดูแลอยู่จะกลายเป็น “ยังไม่มีผู้รับผิดชอบ”</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)} busy={deleting}
        title="ลบบัญชีถาวร" tone="danger" confirmLabel="ลบถาวร"
        message={delTarget ? <>ลบบัญชี <b>{delTarget.fullName}</b> ({delTarget.email}) อย่างถาวร? การลบไม่สามารถย้อนกลับได้</> : ''}
        onConfirm={removeUser} />
    </div>
  );
}

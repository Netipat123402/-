'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useToast } from '@/components/Toast';
import { Col, Combobox, ConfirmDialog, Field, FilterBar, InfoRow, ListView, Modal, PageHeader } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { badgeClass, type Tone } from '@/lib/status';
import { formatPhone, phoneDigits } from '@/lib/format';

interface User { id: string; email: string; fullName: string; phone?: string; status: string; roles: string[]; }
interface Role { name: string; description?: string; }

// operating จริง = 3 · dormant คงป้ายไว้เพื่อแสดงผู้ใช้เดิมที่ยังผูกบทบาทนั้น (label ผ่าน users.role.* catalog)
const KNOWN_ROLES = ['super_admin', 'property_manager', 'sales_agent', 'company_admin', 'branch_manager', 'team_lead', 'back_office', 'auditor'];
// tone ไม่ผ่าน i18n (สี) · label ผ่าน users.status.*
const STATUS_TONE: Record<string, Tone> = { active: 'active', invited: 'gold', suspended: 'neutral' };

export default function UsersPage() {
  const { api, can, user } = useAuth();
  const toast = useToast();
  const t = useTranslations();
  const roleLabel = (r: string) => (KNOWN_ROLES.includes(r) ? t(`users.role.${r}`) : r);
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
      setActive(null); reload(); toast.success(t('users.savedEditToast'));
    } catch (e) { setEditErr((e as { message?: string }).message || t('common.saveFailed')); }
    finally { setSavingEdit(false); }
  }

  async function resetPw() {
    if (!active || !edit) return;
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(edit.password)) {
      setEditErr(t('users.valPassword')); return;
    }
    setSavingEdit(true); setEditErr('');
    try {
      await api(`/users/${active.id}`, { method: 'PATCH', body: JSON.stringify({ password: edit.password }) });
      setEdit((x) => x && { ...x, password: '' });
      toast.success(t('users.resetPwToast'));
    } catch (e) { setEditErr((e as { message?: string }).message || t('users.resetFailed')); }
    finally { setSavingEdit(false); }
  }

  async function removeUser() {
    if (!delTarget) return;
    setDeleting(true);
    try {
      await api(`/users/${delTarget.id}`, { method: 'DELETE' });
      setDelTarget(null); setActive(null); reload();
      toast.success(t('users.deletedToast'));
    } catch (e) { toast.error((e as { message?: string }).message || t('users.deleteFailed')); }
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
    if (!form.fullName.trim()) v.fullName = t('users.valFullName');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) v.email = t('users.valEmail');
    const d = phoneDigits(form.phone);
    if (d && d.length !== 10) v.phone = t('users.valPhone');
    // ข้อ 7 (root cause): เดิมเช็คแค่ยาว ≥8 → รหัสไม่มีตัวเลข/ตัวอักษรผ่าน FE แต่ backend ตีกลับ (สร้างไม่สำเร็จเงียบ ๆ)
    // ตอนนี้เช็คให้ตรง PASSWORD_RULE ฝั่ง server → โชว์ error ใต้ช่องทันที
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(form.password)) v.password = t('users.valPassword');
    if (Object.keys(v).length) { setFe(v); return; }
    setSaving(true); setErr('');
    try {
      await api('/users', { method: 'POST', body: JSON.stringify({
        email: form.email, fullName: form.fullName, phone: d || undefined,
        password: form.password, roleNames: [form.role],
      }) });
      setOpen(false); setForm({ email: '', fullName: '', phone: '', password: '', role: 'sales_agent' }); setFe({}); reload();
      toast.success(t('users.createdToast'));
    } catch (e2) { setErr((e2 as { message?: string }).message || t('users.createFailed')); }
    finally { setSaving(false); }
  }

  const statusBadge = (s: string) => (
    <span className={badgeClass(STATUS_TONE[s] ?? 'neutral')}>{STATUS_TONE[s] ? t(`users.status.${s}`) : s}</span>
  );

  // บทบาทที่ให้เลือก = ที่ backend อนุญาต (listRoles กรอง isActive = 3 บทบาท operating แล้ว) · ไม่ filter ซ้ำที่ FE
  const rolesBase = roles.length ? roles : [{ name: 'sales_agent' } as Role];
  const roleOptions = rolesBase.map((r) => ({ value: r.name, label: roleLabel(r.name) }));

  // หลัก = ชื่อ · รอง(การ์ด+ตาราง) = บทบาท (key ของ user list — สแกน "ใครทำอะไรได้") · อีเมล = คอลัมน์เฉพาะตาราง (identity/login → การ์ด touch แคบไม่ยัด) · ขวา = สถานะ
  const cols: Col<User>[] = [
    { header: t('common.name'), primary: true, cell: (u) => u.fullName },
    { header: t('common.role'), sub: true, cell: (u) => u.roles.map(roleLabel).join(', ') },
    { header: t('common.email'), cell: (u) => <span className="text-muted">{u.email}</span> },
    { header: t('common.status'), right: true, cell: (u) => statusBadge(u.status) },
  ];

  return (
    <div>
      <PageHeader title={t('users.title')} count={t('users.accountCount', { n: meta.total ?? rows.length })}
        action={can('user', 'create') && <button className="btn-gold btn-sm" onClick={() => setOpen(true)}><Icon name="plus" size={16} /> {t('users.accountShort')}</button>} />
      <FilterBar search={{ value: q, onChange: setQ, placeholder: t('users.searchPlaceholder') }} />

      <div className="mt-4 mouse:card mouse:overflow-hidden">
        <ListView items={rows} cols={cols} keyOf={(u) => u.id} loading={loading} empty={t('users.emptyList')} emptyIcon="users" onRow={openUser} />
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={t('users.createTitle')}
        confirmOnClose={!!(form.fullName || form.email || form.phone || form.password)}>
        <form onSubmit={create} className="space-y-4">
          <Field label={`${t('common.fullName')} *`} error={fe.fullName} placeholder={t('owners.namePlaceholder')} value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} />
          <Field label={`${t('common.email')} *`} type="email" error={fe.email} placeholder="name@ros.local" value={form.email} onChange={(e) => setField('email', e.target.value)} />
          <Field label={t('common.phone')} error={fe.phone} inputMode="tel" placeholder="08x-xxx-xxxx" value={form.phone} onChange={(e) => setField('phone', formatPhone(e.target.value))} />
          <Field label={`${t('users.password')} *`} type="text" error={fe.password} hint={t('users.passwordHint')} value={form.password} onChange={(e) => setField('password', e.target.value)} />
          <Combobox label={`${t('common.role')} *`} searchable={false} value={form.role} onChange={(v) => setForm({ ...form, role: v })}
            options={roleOptions} />
          {err && <p className="text-sm text-danger">{err}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>{t('common.cancel')}</button>
            <button className="btn-gold" disabled={saving}>{saving ? t('users.creating') : t('users.createBtn')}</button>
          </div>
        </form>
      </Modal>

      {/* จัดการบัญชี (แตะแถว) */}
      <Modal open={!!active} onClose={() => setActive(null)} title={active?.fullName ?? ''}>
        {active && (
          <div className="space-y-4">
            <div className="divide-y divide-border/60">
              <InfoRow label={t('common.email')} value={active.email} />
              <InfoRow label={t('common.phone')} value={active.phone || undefined} hideEmpty />
              <InfoRow label={t('common.role')} value={active.roles.map(roleLabel).join(', ')} />
              <InfoRow label={t('common.status')} value={statusBadge(active.status)} />
            </div>

            {/* แก้ไขบัญชี — เปลี่ยนบทบาท/สถานะ (ไม่ใช่บัญชีตัวเอง) + รีเซ็ตรหัสผ่าน */}
            {can('user', 'update') && !active.roles.includes('super_admin') && (
              <div className="space-y-3 border-t border-border pt-4">
                <p className="text-xs font-medium text-muted">{t('users.editAccount')}</p>
                {active.id !== user?.id && (
                  <>
                    <Combobox label={t('common.role')} searchable={false} value={edit?.role ?? ''}
                      onChange={(v) => setEdit((e) => e && { ...e, role: v })}
                      options={roleOptions} />
                    <Combobox label={t('common.status')} searchable={false} value={edit?.status ?? ''}
                      onChange={(v) => setEdit((e) => e && { ...e, status: v })}
                      options={[{ value: 'active', label: t('users.status.active') }, { value: 'suspended', label: t('users.suspendOption') }]} />
                    <button className="btn-gold w-full" disabled={savingEdit} onClick={saveEdit}>{t('users.saveEdit')}</button>
                  </>
                )}
                <div className="pt-1">
                  <label className="mb-1.5 block text-sm font-medium text-ink-soft">{t('users.setNewPassword')}</label>
                  <div className="relative">
                    <input className="field pr-16" type={showPw ? 'text' : 'password'} autoComplete="new-password"
                      placeholder={t('users.passwordHintShort')} value={edit?.password ?? ''}
                      onChange={(e) => setEdit((x) => x && { ...x, password: e.target.value })} />
                    <button type="button" onClick={() => setShowPw((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-muted hover:text-ink">
                      {showPw ? t('common.hide') : t('common.show')}
                    </button>
                  </div>
                  <button className="btn-ghost mt-2 w-full" disabled={savingEdit || !edit?.password} onClick={resetPw}>{t('users.resetPwBtn')}</button>
                  <p className="mt-1.5 text-xs text-muted">{t('users.resetPwNote')}</p>
                </div>
                {editErr && <p className="text-sm text-danger">{editErr}</p>}
              </div>
            )}

            {can('user', 'delete') && active.id !== user?.id && !active.roles.includes('super_admin') && (
              <div className="border-t border-border pt-4">
                <button className="btn-danger w-full" onClick={() => { const target = active; setActive(null); setDelTarget(target); }}>
                  <Icon name="x" size={16} /> {t('users.deleteBtn')}
                </button>
                <p className="mt-2 text-center text-xs text-muted">{t('users.deleteNote')}</p>
              </div>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog open={!!delTarget} onClose={() => setDelTarget(null)} busy={deleting}
        title={t('users.deleteTitle')} tone="danger" confirmLabel={t('users.confirmDelete')}
        message={delTarget ? t.rich('users.deleteMessage', { name: delTarget.fullName, email: delTarget.email, b: (c) => <b>{c}</b> }) : ''}
        onConfirm={removeUser} />
    </div>
  );
}

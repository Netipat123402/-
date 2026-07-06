'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Field, InfoGroup, InfoRow, PageHeader } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface Setting { key: string; value: Record<string, unknown> }

export default function SettingsPage() {
  const { api, can } = useAuth();
  const toast = useToast();
  const [settings, setSettings] = useState<Record<string, Record<string, unknown>>>({});
  const [name, setName] = useState('');
  const [contact, setContact] = useState({ phone: '', email: '', lineOaId: '' });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const editable = can('setting', 'update');

  useEffect(() => {
    (async () => {
      try {
        const r = await api<Setting[]>('/settings');
        const map: Record<string, Record<string, unknown>> = {};
        r.data.forEach((s) => { map[s.key] = s.value; });
        setSettings(map);
        setName((map['company.name']?.th as string) ?? '');
        const c = map['company.contact'] ?? {};
        setContact({ phone: (c.phone as string) ?? '', email: (c.email as string) ?? '', lineOaId: (c.lineOaId as string) ?? '' });
      } catch { /* */ }
      finally { setLoading(false); }
    })();
  }, [api]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setSaved(false);
    try {
      await api('/settings/company.name', { method: 'PATCH', body: JSON.stringify({ value: { th: name, en: name } }) });
      await api('/settings/company.contact', { method: 'PATCH', body: JSON.stringify({ value: contact }) });
      setSaved(true); setTimeout(() => setSaved(false), 2500); toast.success('บันทึกการตั้งค่าแล้ว');
    } catch (e) { toast.error((e as { message?: string }).message || 'บันทึกไม่สำเร็จ'); } finally { setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-2xl"><div className="h-64 animate-pulse rounded-card bg-canvas" /></div>;

  const consent = settings['privacy.consent_version'] ?? {};
  const retention = settings['retention.policy'] ?? {};

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="ตั้งค่า" />

      <form onSubmit={save} className="mt-6">
        <div className="card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">ข้อมูลบริษัท</h2>
          <div className="space-y-4">
            <Field label="ชื่อบริษัท" value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} />
            <Field label="เบอร์โทรติดต่อ" value={contact.phone} disabled={!editable} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <Field label="อีเมล" type="email" value={contact.email} disabled={!editable} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <Field label="LINE Official ID" value={contact.lineOaId} disabled={!editable} onChange={(e) => setContact({ ...contact, lineOaId: e.target.value })} />
          </div>
          {editable && (
            <div className="mt-5 flex items-center gap-3">
              <button className="btn-gold" disabled={saving}>{saving ? 'กำลังบันทึก…' : 'บันทึก'}</button>
              {saved && <span className="inline-flex items-center gap-1 text-sm text-success"><Icon name="check" size={15} /> บันทึกแล้ว</span>}
            </div>
          )}
        </div>
      </form>

      <InfoGroup label="ระบบ & นโยบาย" className="mt-6">
        <InfoRow label="เวอร์ชันนโยบายความเป็นส่วนตัว" value={(consent.current as string) || undefined} />
        <InfoRow label="เก็บข้อมูลสัญญา" value={retention.contract_days ? `${Math.round(Number(retention.contract_days) / 365)} ปี` : undefined} />
        <InfoRow label="เก็บข้อมูลลูกค้า" value={retention.customer_days ? `${Math.round(Number(retention.customer_days) / 365)} ปี` : undefined} />
      </InfoGroup>
      <p className="mt-3 text-center text-xs text-muted">ค่าระบบเหล่านี้ปรับได้ในเฟสถัดไป</p>
    </div>
  );
}

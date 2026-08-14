'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/Toast';
import { Field, InfoGroup, InfoRow, PageHeader } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface Setting { key: string; value: Record<string, unknown> }

export default function SettingsPage() {
  const { api, can } = useAuth();
  const toast = useToast();
  const t = useTranslations();
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
      setSaved(true); setTimeout(() => setSaved(false), 2500); toast.success(t('settings.savedToast'));
    } catch (e) { toast.error((e as { message?: string }).message || t('common.saveFailed')); } finally { setSaving(false); }
  }

  if (loading) return <div className="mx-auto max-w-2xl"><div className="h-64 animate-pulse rounded-card bg-canvas" /></div>;

  const consent = settings['privacy.consent_version'] ?? {};
  const retention = settings['retention.policy'] ?? {};

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={t('settings.title')} />

      <form onSubmit={save} className="mt-6">
        <div className="card p-5">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted">{t('settings.companyInfo')}</h2>
          <div className="space-y-4">
            <Field label={t('settings.companyName')} value={name} disabled={!editable} onChange={(e) => setName(e.target.value)} />
            <Field label={t('settings.contactPhone')} value={contact.phone} disabled={!editable} onChange={(e) => setContact({ ...contact, phone: e.target.value })} />
            <Field label={t('common.email')} type="email" value={contact.email} disabled={!editable} onChange={(e) => setContact({ ...contact, email: e.target.value })} />
            <Field label="LINE Official ID" value={contact.lineOaId} disabled={!editable} onChange={(e) => setContact({ ...contact, lineOaId: e.target.value })} />
          </div>
          {editable && (
            <div className="mt-5 flex items-center gap-3">
              <button className="btn-gold" disabled={saving}>{saving ? t('common.saving') : t('common.save')}</button>
              {saved && <span className="inline-flex items-center gap-1 text-sm text-success"><Icon name="check" size={15} /> {t('common.saved')}</span>}
            </div>
          )}
        </div>
      </form>

      <InfoGroup label={t('settings.systemPolicy')} className="mt-6">
        <InfoRow label={t('settings.privacyVersion')} value={(consent.current as string) || undefined} />
        <InfoRow label={t('settings.retentionContract')} value={retention.contract_days ? t('settings.years', { n: Math.round(Number(retention.contract_days) / 365) }) : undefined} />
        <InfoRow label={t('settings.retentionCustomer')} value={retention.customer_days ? t('settings.years', { n: Math.round(Number(retention.customer_days) / 365) }) : undefined} />
      </InfoGroup>
      <p className="mt-3 text-center text-xs text-muted">{t('settings.systemNote')}</p>
    </div>
  );
}

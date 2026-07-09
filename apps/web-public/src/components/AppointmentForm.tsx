'use client';

import { useState } from 'react';
import { Spinner } from './loaders';
import { Icon } from '@/components/Icon';
import { formatPhone, phoneDigits } from '@/lib/format';
import { useLang } from '@/lib/lang';
import { clientApiBase as apiBase } from '@/lib/api';

/** ช่องกรอกพร้อม label บนช่อง + error ใต้ช่อง (PDF: label ไม่ใช่ placeholder, บอก where & why) */
function Field({ label, required, hint, error, children }: {
  label: string; required?: boolean; hint?: string; error?: string; children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink-soft">
        {label}{required && <span className="text-danger"> *</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-xs text-danger">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-xs text-muted">{hint}</span>
      ) : null}
    </label>
  );
}

export default function AppointmentForm({ propertyCode }: { propertyCode: string }) {
  const { t } = useLang();
  const [form, setForm] = useState({ fullName: '', phone: '', message: '' });
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<{ fullName?: string; phone?: string; consent?: string }>({});
  const [state, setState] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
    if (k in errors) setErrors((e) => ({ ...e, [k]: undefined }));
  }

  function validate() {
    const e: typeof errors = {};
    if (!form.fullName.trim()) e.fullName = t('errName');
    const digits = phoneDigits(form.phone);
    if (!digits) e.phone = t('errPhone');
    else if (digits.length !== 10) e.phone = t('errPhone10');
    if (!consent) e.consent = t('errConsent');
    return e;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const v = validate();
    if (Object.keys(v).length) { setErrors(v); return; }
    setState('loading'); setError('');
    try {
      const res = await fetch(`${apiBase()}/public/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: form.fullName, phone: phoneDigits(form.phone), propertyCode,
          message: form.message || undefined,
          consent,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || t('errSend'));
      setState('done');
    } catch (err) {
      setError((err as Error).message);
      setState('error');
    }
  }

  if (state === 'done') {
    return (
      <div id="appointment" className="card scroll-mt-24 p-6 text-center">
        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-success/10 text-success"><Icon name="check" size={26} /></div>
        <h3 className="text-lg font-semibold">{t('successTitle')}</h3>
        <p className="mt-1 text-sm text-muted">{t('successSub')}</p>
      </div>
    );
  }

  return (
    <form id="appointment" onSubmit={submit} noValidate className="card scroll-mt-24 space-y-3.5 p-6">
      <div>
        <h3 className="text-lg font-semibold">{t('bookViewing')}</h3>
        <p className="mt-0.5 text-sm text-muted">{t('bookViewingSub')}</p>
      </div>
      <Field label={t('fieldName')} required error={errors.fullName}>
        <input className={`field ${errors.fullName ? 'border-danger' : ''}`} placeholder={t('namePlaceholder')}
          value={form.fullName} onChange={(e) => set('fullName', e.target.value)} />
      </Field>
      <Field label={t('fieldPhone')} required error={errors.phone}>
        <input className={`field ${errors.phone ? 'border-danger' : ''}`} placeholder="08x-xxx-xxxx" inputMode="tel"
          value={form.phone} onChange={(e) => set('phone', formatPhone(e.target.value))} />
      </Field>
      <Field label={t('fieldMessage')}>
        <textarea className="field h-auto py-2.5" rows={3} placeholder={t('messagePlaceholder')}
          value={form.message} onChange={(e) => set('message', e.target.value)} />
      </Field>
      <div>
        <label className="flex items-start gap-2 text-sm text-muted">
          <input type="checkbox" className="mt-0.5 h-4 w-4 accent-gold" checked={consent}
            onChange={(e) => { setConsent(e.target.checked); setErrors((er) => ({ ...er, consent: undefined })); }} />
          <span>{t('consentPre')}<a href="/privacy" className="text-gold-dark underline">{t('consentPolicy')}</a>{t('consentPost')}</span>
        </label>
        {errors.consent && <p className="mt-1 text-xs text-danger">{errors.consent}</p>}
      </div>
      {state === 'error' && <p className="text-sm text-danger">{error}</p>}
      <button className="btn-gold w-full" disabled={state === 'loading'}>
        {state === 'loading' ? <><Spinner className="h-4 w-4" /> {t('sending')}</> : t('submitRequest')}
      </button>
      {/* trust/urgency — ลดความกังวลก่อนตัดสินใจติดต่อ (honest: ตอบไว + ฟรี ไม่ผูกมัด) */}
      <ul className="space-y-1.5 border-t border-border pt-3.5 text-xs text-muted">
        <li className="flex items-center gap-2"><Icon name="clock" size={14} className="shrink-0 text-gold-dark" />{t('trustReply24')}</li>
        <li className="flex items-center gap-2"><Icon name="check" size={14} className="shrink-0 text-gold-dark" />{t('trustFreeNoObligation')}</li>
      </ul>
    </form>
  );
}

'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { Icon } from '@/components/Icon';
import { thaiifyActivity } from '@/lib/status';
import { relTime, fmtDateTime } from '@/lib/format';

interface ActivityI18n { key: string; params?: Record<string, string | number> }
interface Activity {
  id: string; action: string; summary?: string; createdAt: string;
  metadata?: { i18n?: ActivityI18n } | null;
}

// enum สถานะที่ฝังใน param (from/to/status) → แปลผ่าน activity.status.* · date param (at) → format
const STATUS_ENUMS = new Set(['draft', 'available', 'rented', 'new', 'working', 'closed', 'upcoming', 'done', 'cancelled', 'no_show', 'active', 'ended']);
type TFn = (key: string, values?: Record<string, string | number>) => string;
function localizeParams(params: Record<string, string | number> | undefined, t: TFn): Record<string, string | number> {
  if (!params) return {};
  const out: Record<string, string | number> = { ...params };
  for (const k of ['from', 'to', 'status']) {
    const v = out[k];
    if (typeof v === 'string' && STATUS_ENUMS.has(v)) out[k] = t(`activity.status.${v}`);
  }
  if (typeof out.at === 'string') out.at = fmtDateTime(out.at);
  return out;
}

/** ไทม์ไลน์กิจกรรม (Activity log) ของ entity — path เช่น /properties/:id/activities */
export default function ActivityTimeline({ path, limit = 5 }: { path: string; limit?: number }) {
  const t = useTranslations();
  const { api } = useAuth();
  const [rows, setRows] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    (async () => {
      try { const r = await api<Activity[]>(path); setRows(r.data); }
      catch { /* */ } finally { setLoading(false); }
    })();
  }, [api, path]);

  if (loading) return <div className="h-20 animate-pulse rounded-lg bg-canvas" />;
  if (rows.length === 0) return <p className="text-sm text-muted">{t('activity.none')}</p>;

  const shown = expanded ? rows : rows.slice(0, limit);

  return (
    <>
      <ol className="relative space-y-4 border-l border-border pl-4">
        {shown.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gold" />
            <p className="text-sm">{
              a.metadata?.i18n?.key
                ? t(a.metadata.i18n.key, localizeParams(a.metadata.i18n.params, t))
                : (a.summary ? thaiifyActivity(a.summary) : a.action)
            }</p>
            <p className="text-xs text-muted">{relTime(a.createdAt, t, () => fmtDateTime(a.createdAt))}</p>
          </li>
        ))}
      </ol>
      {rows.length > limit && (
        <button onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-dark hover:underline">
          {expanded ? t('common.collapse') : t('common.viewAllN', { n: rows.length })}
          <Icon name="chevron-down" size={14} className={expanded ? 'rotate-180' : ''} />
        </button>
      )}
    </>
  );
}

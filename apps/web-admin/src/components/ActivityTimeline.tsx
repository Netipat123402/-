'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Icon } from '@/components/Icon';

interface Activity { id: string; action: string; summary?: string; createdAt: string; }

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return new Date(iso).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'short' });
}

/** ไทม์ไลน์กิจกรรม (Activity log) ของ entity — path เช่น /properties/:id/activities */
export default function ActivityTimeline({ path, limit = 5 }: { path: string; limit?: number }) {
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
  if (rows.length === 0) return <p className="text-sm text-muted">ยังไม่มีประวัติ</p>;

  const shown = expanded ? rows : rows.slice(0, limit);

  return (
    <>
      <ol className="relative space-y-4 border-l border-border pl-4">
        {shown.map((a) => (
          <li key={a.id} className="relative">
            <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-gold" />
            <p className="text-sm">{a.summary || a.action}</p>
            <p className="text-xs text-muted">{timeAgo(a.createdAt)}</p>
          </li>
        ))}
      </ol>
      {rows.length > limit && (
        <button onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-gold-dark hover:underline">
          {expanded ? 'ย่อ' : `ดูทั้งหมด (${rows.length})`}
          <Icon name="chevron-down" size={14} className={expanded ? 'rotate-180' : ''} />
        </button>
      )}
    </>
  );
}

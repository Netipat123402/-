'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useToast } from '@/components/Toast';
import { EmptyState, ListSkeleton, PageHeader, Pagination, Segmented, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';
import { relTime } from '@/lib/format';

interface Post {
  id: string; category: string; body: string; displayName: string;
  status: string; createdAt: string; publishedAt?: string;
}

const ACT_TOAST: Record<'approve' | 'reject' | 'archive', string> = {
  approve: 'community.approvedToast', reject: 'community.rejectedToast', archive: 'community.archivedToast',
};

export default function CommunityPage() {
  const { api } = useAuth();
  const toast = useToast();
  const t = useTranslations();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const { rows, meta, loading, reload } = useList<Post>(`/community?status=${status}&page=${page}&limit=${PAGE_SIZE}`, { pollMs: 20000 });

  const statusTabs = [
    { value: 'pending', label: t('community.status.pending') },
    { value: 'published', label: t('community.status.published') },
    { value: 'archived', label: t('community.status.archived') },
    { value: 'rejected', label: t('community.status.rejected') },
  ];
  const categoryLabel = (c: string) => {
    const known = ['looking_room', 'looking_condo', 'for_rent', 'looking_tenant', 'buy_sell'];
    return known.includes(c) ? t(`community.category.${c}`) : c;
  };

  async function act(id: string, action: 'approve' | 'reject' | 'archive') {
    setBusy(id);
    try { await api(`/community/${id}/${action}`, { method: 'PATCH' }); reload(); toast.success(t(ACT_TOAST[action])); }
    catch (e) { toast.error((e as { message?: string }).message || t('community.actionFailed')); }
    finally { setBusy(''); }
  }

  return (
    <div>
      <PageHeader title={t('community.title')} subtitle={t('community.subtitle')} count={t('community.postCount', { n: meta.total ?? 0 })} />

      <div className="mt-4">
        <Segmented options={statusTabs} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>

      <div className="mt-4 card overflow-hidden">
        {loading ? <ListSkeleton /> : rows.length === 0 ? (
          <EmptyState text={status === 'pending' ? t('community.emptyPending') : t('community.emptyOther')} icon="users" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id} className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="badge bg-gold/15 text-gold-dark">{categoryLabel(p.category)}</span>
                  <span className="text-xs text-muted">{relTime(p.createdAt, t)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.body}</p>
                <p className="mt-2 text-xs text-muted">— {p.displayName}</p>

                {status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button className="btn-gold btn-sm" disabled={!!busy} onClick={() => act(p.id, 'approve')}>
                      <Icon name="check" size={15} /> {t('community.approve')}
                    </button>
                    <button className="btn-ghost btn-sm text-danger" disabled={!!busy} onClick={() => act(p.id, 'reject')}>{t('community.reject')}</button>
                  </div>
                )}
                {status === 'published' && (
                  <div className="mt-3">
                    <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => act(p.id, 'archive')}>{t('community.archive')}</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />
    </div>
  );
}

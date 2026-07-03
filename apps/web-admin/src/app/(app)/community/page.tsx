'use client';

import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { useToast } from '@/components/Toast';
import { EmptyState, ListSkeleton, PageHeader, Pagination, Segmented, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';

interface Post {
  id: string; category: string; body: string; displayName: string;
  status: string; createdAt: string; publishedAt?: string;
}

const CATEGORY_TH: Record<string, string> = {
  looking_room: 'หาห้อง', looking_condo: 'หาคอนโด', for_rent: 'ปล่อยเช่า',
  looking_tenant: 'หาผู้เช่า', buy_sell: 'ซื้อขาย',
};
const STATUS_TABS = [
  { value: 'pending', label: 'รออนุมัติ' },
  { value: 'published', label: 'เผยแพร่แล้ว' },
  { value: 'archived', label: 'เก็บถาวร' },
  { value: 'rejected', label: 'ไม่อนุมัติ' },
];

function timeAgo(iso: string) {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'เมื่อสักครู่';
  if (m < 60) return `${m} นาทีที่แล้ว`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} ชม.ที่แล้ว`;
  return new Date(iso).toLocaleDateString('th-TH');
}

export default function CommunityPage() {
  const { api } = useAuth();
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState('');
  const { rows, meta, loading, reload } = useList<Post>(`/community?status=${status}&page=${page}&limit=${PAGE_SIZE}`, { pollMs: 20000 });

  async function act(id: string, action: 'approve' | 'reject' | 'archive', label: string) {
    setBusy(id);
    try { await api(`/community/${id}/${action}`, { method: 'PATCH' }); reload(); toast.success(`${label}แล้ว`); }
    catch (e) { toast.error((e as { message?: string }).message || 'ทำรายการไม่สำเร็จ'); }
    finally { setBusy(''); }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="ชุมชน" subtitle="กระดานประกาศจากผู้ใช้ — อนุมัติก่อนแสดงบนเว็บ" count={`${meta.total ?? 0} โพสต์`} />

      <div className="mt-4">
        <Segmented options={STATUS_TABS} value={status} onChange={(v) => { setPage(1); setStatus(v); }} />
      </div>

      <div className="mt-4 card overflow-hidden">
        {loading ? <ListSkeleton /> : rows.length === 0 ? (
          <EmptyState text={status === 'pending' ? 'ไม่มีโพสต์รออนุมัติ' : 'ไม่มีโพสต์ในหมวดนี้'} icon="users" />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((p) => (
              <li key={p.id} className="px-4 py-4">
                <div className="flex items-center gap-2">
                  <span className="badge bg-gold/15 text-gold-dark">{CATEGORY_TH[p.category] ?? p.category}</span>
                  <span className="text-xs text-muted">{timeAgo(p.createdAt)}</span>
                </div>
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-ink-soft">{p.body}</p>
                <p className="mt-2 text-xs text-muted">— {p.displayName}</p>

                {status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button className="btn-gold btn-sm" disabled={!!busy} onClick={() => act(p.id, 'approve', 'อนุมัติ')}>
                      <Icon name="check" size={15} /> อนุมัติ
                    </button>
                    <button className="btn-ghost btn-sm text-danger" disabled={!!busy} onClick={() => act(p.id, 'reject', 'ไม่อนุมัติ')}>ไม่อนุมัติ</button>
                  </div>
                )}
                {status === 'published' && (
                  <div className="mt-3">
                    <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => act(p.id, 'archive', 'เก็บถาวร')}>เก็บถาวร</button>
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

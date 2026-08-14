'use client';

import { useTranslations } from 'next-intl';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { Avatar, EmptyState, FilterBar, ListSkeleton, PageHeader, Pagination, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  PROPERTY_STATUS, LEAD_STATUS, APPOINTMENT_STATUS, CONTRACT_STATUS, PROPERTY_TYPE, bahtFormat,
} from '@/lib/status';
import { relTime } from '@/lib/format';

interface Change { field: string; from: unknown; to: unknown; }
interface AuditLog {
  id: string; action: string; actorName: string; actorRole?: string;
  entityType?: string; entityId?: string; createdAt: string;
  // ดีเทลเชิงลึก (เฉพาะผู้มีสิทธิ์ audit:read)
  ipAddress?: string | null; entityLabel?: string | null; changes?: Change[];
}

// color แยกจาก label (color ไม่ผ่าน i18n · label ผ่าน audit.action.*)
const ACTION_COLOR: Record<string, string> = {
  login: 'bg-success/10 text-success',
  logout: 'bg-border text-ink-soft',
  login_failed: 'bg-danger/10 text-danger',
  create: 'bg-info/10 text-info',
  update: 'bg-warning/10 text-warning',
  delete: 'bg-danger/10 text-danger',
  approve: 'bg-success/10 text-success',
  reject: 'bg-warning/10 text-warning',
  change_status: 'bg-gold/15 text-gold-dark',
  submit_review: 'bg-warning/10 text-warning',
  sign: 'bg-success/10 text-success',
  assign: 'bg-info/10 text-info',
  convert: 'bg-gold/15 text-gold-dark',
  renew: 'bg-gold/15 text-gold-dark',
  receipt: 'bg-info/10 text-info',
  upload: 'bg-info/10 text-info',
  download: 'bg-info/10 text-info',
};

const KNOWN_ENTITIES = ['property', 'lead', 'owner', 'customer', 'appointment', 'contract'];
// ฟิลด์ที่มี label แปล (diff "ค่าเดิม → ค่าใหม่") · นอกลิสต์ = โชว์ key ดิบ
const KNOWN_FIELDS = ['status', 'titleTh', 'propertyType', 'province', 'district', 'projectName', 'monthlyRent', 'depositMonths', 'bedrooms', 'bathrooms', 'areaSqm', 'floor', 'assignedToId', 'reason', 'isFeatured', 'fullName', 'phone', 'email', 'roles'];

const STATUS_MAPS: Record<string, Record<string, { labelKey: string }>> = {
  property: PROPERTY_STATUS, lead: LEAD_STATUS, appointment: APPOINTMENT_STATUS, contract: CONTRACT_STATUS,
};

/** fallback เวลา audit — วันเวลาแบบสากล (en-GB) "5 Jan 14:30" · ไม่มีอักษรไทย ใช้ได้ 2 ภาษา */
const auditTimeFallback = (d: Date) =>
  `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;

/** แปลงค่าในฟิลด์ให้อ่านง่าย (สถานะ/ประเภท/ราคา/พื้นที่ …) */
function fmtVal(entityType: string | undefined, field: string, val: unknown, t: (k: string) => string): string {
  if (val == null || val === '') return '—';
  if (Array.isArray(val)) return val.join(', ');
  const s = String(val);
  if (field === 'status' && entityType && STATUS_MAPS[entityType]?.[s]) return t(STATUS_MAPS[entityType][s].labelKey);
  if (field === 'propertyType') return PROPERTY_TYPE[s] ? t(`propertyType.${s}`) : s;
  if (field === 'monthlyRent') { const n = Number(val); return Number.isFinite(n) ? `฿${bahtFormat(n)}` : s; }
  if (field === 'areaSqm') return `${s} ${t('audit.sqmUnit')}`;
  if (field === 'depositMonths') return `${s} ${t('audit.monthsUnit')}`;
  if (typeof val === 'boolean') return val ? t('audit.yes') : t('audit.no');
  return s;
}

function fullTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })} ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
}

export default function AuditPage() {
  const t = useTranslations();
  const { api } = useAuth();
  const [action, setAction] = useState('');
  const [range, setRange] = useState('');
  const [page, setPage] = useState(1);
  const [actions, setActions] = useState<string[]>([]);
  const [open, setOpen] = useState<Set<string>>(new Set());

  const params = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) });
  if (action) params.set('action', action);
  if (range) { const d = new Date(); d.setDate(d.getDate() - Number(range) + 1); d.setHours(0, 0, 0, 0); params.set('from', d.toISOString()); }
  // เรียลไทม์: รีเฟรชเงียบทุก 10 วินาที — ฟีดทีม (activity:read) เห็นได้ทุกบทบาท · กฎมองเห็นกรองฝั่ง backend
  // หมายเหตุ: ไม่มีปุ่ม "ล้างทั้งหมด" — บันทึกตรวจสอบเก็บถาวร (immutable) เพื่อความปลอดภัย/compliance
  const { rows, meta, loading } = useList<AuditLog>(`/audit-logs/feed?${params}`, { pollMs: 10000 });

  useEffect(() => { (async () => { try { const r = await api<string[]>('/audit-logs/actions'); setActions(r.data); } catch { /* */ } })(); }, [api]);

  function toggle(id: string) {
    setOpen((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }

  const actionLabel = (a: string) => (ACTION_COLOR[a] ? t(`audit.action.${a}`) : a);
  const entityLabel = (e: string) => (KNOWN_ENTITIES.includes(e) ? t(`audit.entity.${e}`) : e);
  const fieldLabel = (f: string) => (KNOWN_FIELDS.includes(f) ? t(`audit.field.${f}`) : f);
  const rangeOptions = [
    { value: '', label: t('audit.range.all') },
    { value: '1', label: t('audit.range.today') },
    { value: '7', label: t('audit.range.last7') },
    { value: '30', label: t('audit.range.last30') },
  ];

  return (
    <div>
      <PageHeader title={t('audit.title')} subtitle={t('audit.subtitle', { n: meta.total ?? 0 })} />

      <FilterBar
        filters={[
          { key: 'action', label: t('audit.actionFilter'), value: action, onChange: (v) => { setPage(1); setAction(v); },
            options: [{ value: '', label: t('audit.allActions') }, ...actions.map((a) => ({ value: a, label: actionLabel(a) }))], searchable: true },
          { key: 'range', label: t('audit.rangeFilter'), value: range, onChange: (v) => { setPage(1); setRange(v); }, options: rangeOptions },
        ]} />

      <div className="mt-4 card overflow-hidden">
        {loading ? <ListSkeleton /> : rows.length === 0 ? <EmptyState text={t('audit.empty')} icon="clock" /> : (
          <ul className="divide-y divide-border">
            {rows.map((l) => {
              const color = ACTION_COLOR[l.action] ?? 'bg-border text-ink-soft';
              const changes = l.changes ?? [];
              const expandable = changes.length > 0 || !!l.ipAddress;
              const isOpen = open.has(l.id);
              return (
                <li key={l.id}>
                  <div
                    role={expandable ? 'button' : undefined}
                    onClick={expandable ? () => toggle(l.id) : undefined}
                    className={`flex items-start gap-3 px-4 py-3 ${expandable ? 'cursor-pointer transition hover:bg-raised' : ''}`}>
                    <Avatar name={l.actorName} size={34} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm leading-snug">
                        <span className="font-semibold">{l.actorName}</span>
                        {' '}<span className={`badge ${color}`}>{actionLabel(l.action)}</span>
                        {l.entityType && <span className="text-muted">{' · '}{entityLabel(l.entityType)}</span>}
                      </p>
                      {l.entityLabel && (
                        <p className="mt-0.5 truncate text-xs text-muted">{t('audit.atEntity', { label: l.entityLabel })}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <time className="whitespace-nowrap text-xs text-muted" dateTime={l.createdAt}>{relTime(l.createdAt, t, auditTimeFallback)}</time>
                      {expandable && (
                        <Icon name="chevron-down" size={16}
                          className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                      )}
                    </div>
                  </div>

                  {expandable && isOpen && (
                    <div className="border-t border-border bg-canvas/50 px-4 py-3 pl-[60px]">
                      {changes.length > 0 && (
                        <dl className="space-y-1.5">
                          {changes.map((c) => (
                            <div key={c.field} className="flex items-baseline gap-2 text-xs">
                              <dt className="w-20 shrink-0 text-muted">{fieldLabel(c.field)}</dt>
                              <dd className="flex min-w-0 flex-1 items-baseline gap-1.5">
                                <span className="truncate text-muted line-through decoration-faint/60">{fmtVal(l.entityType, c.field, c.from, t)}</span>
                                <Icon name="chevron-right" size={12} className="shrink-0 text-faint" />
                                <span className="truncate font-medium text-ink">{fmtVal(l.entityType, c.field, c.to, t)}</span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <p className={`text-2xs text-muted ${changes.length > 0 ? 'mt-2.5' : ''}`}>
                        {fullTime(l.createdAt)}{l.ipAddress ? ` · IP ${l.ipAddress}` : ''}
                      </p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
      <Pagination meta={meta} page={page} setPage={setPage} />
    </div>
  );
}

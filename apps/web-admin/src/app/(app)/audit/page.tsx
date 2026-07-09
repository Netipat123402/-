'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth';
import { useList } from '@/lib/useList';
import { Avatar, EmptyState, FilterBar, ListSkeleton, PageHeader, Pagination, PAGE_SIZE } from '@/components/ui';
import { Icon } from '@/components/Icon';
import {
  PROPERTY_STATUS, LEAD_STATUS, APPOINTMENT_STATUS, CONTRACT_STATUS, PROPERTY_TYPE, bahtFormat,
} from '@/lib/status';

interface Change { field: string; from: unknown; to: unknown; }
interface AuditLog {
  id: string; action: string; actorName: string; actorRole?: string;
  entityType?: string; entityId?: string; createdAt: string;
  // ดีเทลเชิงลึก (เฉพาะผู้มีสิทธิ์ audit:read)
  ipAddress?: string | null; entityLabel?: string | null; changes?: Change[];
}

const ACTION_TH: Record<string, { label: string; color: string }> = {
  login: { label: 'เข้าสู่ระบบ', color: 'bg-success/10 text-success' },
  logout: { label: 'ออกจากระบบ', color: 'bg-border text-ink-soft' },
  login_failed: { label: 'เข้าระบบล้มเหลว', color: 'bg-danger/10 text-danger' },
  create: { label: 'สร้าง', color: 'bg-info/10 text-info' },
  update: { label: 'แก้ไข', color: 'bg-warning/10 text-warning' },
  delete: { label: 'ลบ', color: 'bg-danger/10 text-danger' },
  approve: { label: 'เผยแพร่', color: 'bg-success/10 text-success' },
  reject: { label: 'ถอนประกาศ', color: 'bg-warning/10 text-warning' },
  change_status: { label: 'เปลี่ยนสถานะ', color: 'bg-gold/15 text-gold-dark' },
  submit_review: { label: 'ขอเผยแพร่', color: 'bg-warning/10 text-warning' },
  sign: { label: 'ลงนาม', color: 'bg-success/10 text-success' },
  assign: { label: 'มอบหมาย', color: 'bg-info/10 text-info' },
  convert: { label: 'แปลงลูกค้า', color: 'bg-gold/15 text-gold-dark' },
  renew: { label: 'ต่อสัญญา', color: 'bg-gold/15 text-gold-dark' },
  receipt: { label: 'ออกใบเสร็จ', color: 'bg-info/10 text-info' },
  upload: { label: 'อัปโหลด', color: 'bg-info/10 text-info' },
  download: { label: 'ดาวน์โหลด', color: 'bg-info/10 text-info' },
};

const ENTITY_TH: Record<string, string> = {
  property: 'ทรัพย์', lead: 'Lead', owner: 'เจ้าของ', customer: 'ลูกค้า',
  appointment: 'นัดหมาย', contract: 'สัญญา',
};

// ชื่อฟิลด์เป็นไทย (สำหรับ diff "ค่าเดิม → ค่าใหม่")
const FIELD_TH: Record<string, string> = {
  status: 'สถานะ', titleTh: 'ชื่อ', propertyType: 'ประเภท', province: 'จังหวัด',
  district: 'อำเภอ/เขต', projectName: 'โครงการ', monthlyRent: 'ราคา/เดือน',
  depositMonths: 'มัดจำ', bedrooms: 'ห้องนอน', bathrooms: 'ห้องน้ำ', areaSqm: 'พื้นที่',
  floor: 'ชั้น', assignedToId: 'ผู้รับผิดชอบ', reason: 'เหตุผล', isFeatured: 'ทรัพย์แนะนำ',
  fullName: 'ชื่อ', phone: 'เบอร์โทร', email: 'อีเมล', roles: 'บทบาท',
};

const STATUS_MAPS: Record<string, Record<string, { label: string }>> = {
  property: PROPERTY_STATUS, lead: LEAD_STATUS, appointment: APPOINTMENT_STATUS, contract: CONTRACT_STATUS,
};

/** แปลงค่าในฟิลด์ให้อ่านง่าย (สถานะ/ประเภท/ราคา/พื้นที่ …) */
function fmtVal(entityType: string | undefined, field: string, val: unknown): string {
  if (val == null || val === '') return '—';
  if (Array.isArray(val)) return val.join(', ');
  const s = String(val);
  if (field === 'status' && entityType && STATUS_MAPS[entityType]?.[s]) return STATUS_MAPS[entityType][s].label;
  if (field === 'propertyType') return PROPERTY_TYPE[s] ?? s;
  if (field === 'monthlyRent') { const n = Number(val); return Number.isFinite(n) ? `฿${bahtFormat(n)}` : s; }
  if (field === 'areaSqm') return `${s} ตร.ม.`;
  if (field === 'depositMonths') return `${s} เดือน`;
  if (typeof val === 'boolean') return val ? 'ใช่' : 'ไม่';
  return s;
}

const RANGE_OPTIONS = [
  { value: '', label: 'ทุกช่วงเวลา' },
  { value: '1', label: 'วันนี้' },
  { value: '7', label: '7 วันล่าสุด' },
  { value: '30', label: '30 วันล่าสุด' },
];

/** เวลาแบบสัมพัทธ์ — เน้นอ่านง่าย "ใคร · ทำอะไร · เมื่อไหร่" */
function relTime(iso: string) {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return 'เมื่อสักครู่';
  if (diff < 3600) return `${Math.floor(diff / 60)} นาทีที่แล้ว`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} ชม.ที่แล้ว`;
  if (diff < 172800) return 'เมื่อวาน';
  return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}`;
}
function fullTime(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })} ${d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })} น.`;
}

export default function AuditPage() {
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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="บันทึกกิจกรรม" subtitle={`${meta.total ?? 0} รายการ · อัปเดตเรียลไทม์`} />

      <FilterBar
        filters={[
          { key: 'action', label: 'การกระทำ', value: action, onChange: (v) => { setPage(1); setAction(v); },
            options: [{ value: '', label: 'ทุกการกระทำ' }, ...actions.map((a) => ({ value: a, label: ACTION_TH[a]?.label ?? a }))], searchable: true },
          { key: 'range', label: 'ช่วงเวลา', value: range, onChange: (v) => { setPage(1); setRange(v); }, options: RANGE_OPTIONS },
        ]} />

      <div className="mt-4 card overflow-hidden">
        {loading ? <ListSkeleton /> : rows.length === 0 ? <EmptyState text="ไม่พบบันทึกกิจกรรม" icon="clock" /> : (
          <ul className="divide-y divide-border">
            {rows.map((l) => {
              const a = ACTION_TH[l.action] ?? { label: l.action, color: 'bg-border text-ink-soft' };
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
                        {' '}<span className={`badge ${a.color}`}>{a.label}</span>
                        {l.entityType && <span className="text-muted">{' · '}{ENTITY_TH[l.entityType] ?? l.entityType}</span>}
                      </p>
                      {l.entityLabel && (
                        <p className="mt-0.5 truncate text-xs text-muted">ทำที่ {l.entityLabel}</p>
                      )}
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <time className="whitespace-nowrap text-xs text-muted" dateTime={l.createdAt}>{relTime(l.createdAt)}</time>
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
                              <dt className="w-20 shrink-0 text-muted">{FIELD_TH[c.field] ?? c.field}</dt>
                              <dd className="flex min-w-0 flex-1 items-baseline gap-1.5">
                                <span className="truncate text-muted line-through decoration-faint/60">{fmtVal(l.entityType, c.field, c.from)}</span>
                                <Icon name="chevron-right" size={12} className="shrink-0 text-faint" />
                                <span className="truncate font-medium text-ink">{fmtVal(l.entityType, c.field, c.to)}</span>
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                      <p className={`text-[11px] text-muted ${changes.length > 0 ? 'mt-2.5' : ''}`}>
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

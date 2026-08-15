import { fmtDate, fmtDateTime } from '@/lib/format';

type TFn = (key: string, values?: Record<string, string | number>) => string;

export interface NotifField { field: string; from?: string; to?: string }
export interface NotifI18n {
  title: string; body: string;
  titleKey?: string | null; bodyKey?: string | null; params?: Record<string, unknown> | null;
}

/** สร้าง values สำหรับ t() จาก params ของ notification (i18n · C-backend 2/2)
 *  · date param at→fmtDateTime, date→fmtDate · whatKey→resolve ซ้อน ({what}) · fields[]→ประกอบ {changes} */
export function notifValues(raw: Record<string, unknown> | null | undefined, t: TFn): Record<string, string | number> {
  const v: Record<string, string | number> = {};
  if (!raw) return v;
  for (const [k, val] of Object.entries(raw)) {
    if (typeof val === 'string' || typeof val === 'number') v[k] = val;
  }
  if (typeof raw.at === 'string') v.at = fmtDateTime(raw.at);
  if (typeof raw.date === 'string') v.date = fmtDate(raw.date);
  if (typeof raw.whatKey === 'string') v.what = t(raw.whatKey, (raw.whatParams as Record<string, string | number>) || {});
  if (Array.isArray(raw.fields)) {
    v.changes = (raw.fields as NotifField[]).map((f) =>
      f.from !== undefined ? t(`notif.ownerField.${f.field}`, { from: f.from, to: f.to ?? '' }) : t(`notif.ownerFieldFlag.${f.field}`),
    ).join(' · ');
  }
  return v;
}

/** title/body ของ notification: ใช้ i18n key ถ้ามี · fallback ข้อความ persist (row เก่า/LINE) */
export const notifTitle = (n: NotifI18n, t: TFn) => (n.titleKey ? t(n.titleKey, notifValues(n.params, t)) : n.title);
export const notifBody = (n: NotifI18n, t: TFn) => (n.bodyKey ? t(n.bodyKey, notifValues(n.params, t)) : n.body);

/** หมวดแจ้งเตือนที่ต้องบทบาทนั้น "ลงมือทำ" (action-first) — เจ้าของ=กันโกง/อนุมัติ/เซ็น · ผจก=ทรัพย์/สัญญา · เซล=ไปป์ไลน์
 *  notification scope ที่ backend อยู่แล้ว → จัดลำดับให้งานที่ต้องทำลอยบน · ใช้ร่วม /notifications + NotificationBell (mental model เดียว) */
export const ACTION_CAT_BY_ROLE: Record<string, string[]> = {
  super_admin: ['owner', 'property', 'contract'],
  property_manager: ['property', 'contract'],
  sales_agent: ['lead', 'appointment'],
};
export const actionCatsFor = (role?: string): string[] => ACTION_CAT_BY_ROLE[role ?? ''] ?? [];

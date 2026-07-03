import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import type { AuthenticatedUser } from '../../common/auth/authenticated-user';

type Json = Prisma.JsonValue;
const asObj = (v: Json): Record<string, Json> | null =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, Json>) : null;
const valOf = (v: Json | null | undefined, key: string): Json | undefined => asObj(v ?? null)?.[key];

/** สร้างรายการเปลี่ยนแปลง [{field, from, to}] จาก oldValue/newValue (ข้ามฟิลด์ที่ค่าเท่าเดิม) */
function buildChanges(oldV: Json | null, newV: Json | null, nameMap: Map<string, string>) {
  const o = asObj(oldV), n = asObj(newV);
  if (!o && !n) return [];
  const keys = new Set<string>([...(o ? Object.keys(o) : []), ...(n ? Object.keys(n) : [])]);
  const resolve = (field: string, val: Json | undefined): Json => {
    if ((field === 'assignedToId' || field.endsWith('UserId')) && typeof val === 'string') return nameMap.get(val) ?? val;
    return val ?? null;
  };
  const out: { field: string; from: Json; to: Json }[] = [];
  for (const k of keys) {
    const from = o?.[k] ?? null, to = n?.[k] ?? null;
    if (JSON.stringify(from) !== JSON.stringify(to)) out.push({ field: k, from: resolve(k, from), to: resolve(k, to) });
  }
  return out;
}

/** AuditQueryService (MR-27) — อ่าน/แสดง audit log + activity feed (แยก logic จาก controller) */
@Injectable()
export class AuditQueryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(user: AuthenticatedUser, action?: string, from?: string, to?: string, page = '1', limitRaw?: string) {
    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(`${to}T23:59:59`);
    }
    // กฎมองเห็น: ผู้ที่ไม่ใช่ super_admin จะไม่เห็น action ของแอดมิน
    if (!user.roles.includes('super_admin')) {
      where.NOT = { actorRole: { contains: 'super_admin' } };
    }
    const p = Math.max(1, Number(page)), limit = Math.min(100, Math.max(1, Number(limitRaw) || 30));
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);

    const actorIds = [...new Set(logs.map((l) => l.actorId).filter(Boolean))] as string[];
    const users = await this.prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, fullName: true } });
    const nameMap = new Map(users.map((u) => [u.id, u.fullName]));

    const items = logs.map((l) => ({
      id: l.id, action: l.action, actorRole: l.actorRole,
      actorName: l.actorId ? (nameMap.get(l.actorId) ?? '(ลบแล้ว)') : 'ระบบ/ไม่ระบุ',
      entityType: l.entityType, entityId: l.entityId,
      oldValue: l.oldValue, newValue: l.newValue,
      ipAddress: l.ipAddress, createdAt: l.createdAt,
    }));
    return { items, total, page: p, limit, totalPages: Math.ceil(total / limit) };
  }

  async feed(user: AuthenticatedUser, action?: string, from?: string, page = '1', limitRaw?: string) {
    const where: Prisma.AuditLogWhereInput = {};
    if (action) where.action = action;
    if (from) where.createdAt = { gte: new Date(from) };
    if (!user.roles.includes('super_admin')) {
      where.NOT = { actorRole: { contains: 'super_admin' } };
    }
    const p = Math.max(1, Number(page)), limit = Math.min(100, Math.max(1, Number(limitRaw) || 10));
    const [logs, total] = await this.prisma.$transaction([
      this.prisma.auditLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (p - 1) * limit, take: limit }),
      this.prisma.auditLog.count({ where }),
    ]);

    // ดีเทลเชิงลึก เฉพาะผู้มีสิทธิ์ audit:read — เซล (activity:read) เห็นแค่สรุป
    const canSeeDetail = user.permissions.some((pm) => pm.resource === 'audit' && pm.action === 'read');

    const actorIds = logs.map((l) => l.actorId).filter(Boolean) as string[];
    const assigneeIds = canSeeDetail
      ? logs.flatMap((l) => [valOf(l.oldValue, 'assignedToId'), valOf(l.newValue, 'assignedToId')]).filter(Boolean) as string[]
      : [];
    const userIds = [...new Set([...actorIds, ...assigneeIds])];
    const users = await this.prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, fullName: true } });
    const nameMap = new Map(users.map((u) => [u.id, u.fullName]));

    const entityLabels = canSeeDetail ? await this.resolveEntityLabels(logs) : new Map<string, string>();

    const items = logs.map((l) => {
      const base = {
        id: l.id, action: l.action, actorRole: l.actorRole,
        actorName: l.actorId ? (nameMap.get(l.actorId) ?? '(ลบแล้ว)') : 'ระบบ',
        entityType: l.entityType, entityId: l.entityId, createdAt: l.createdAt,
      };
      if (!canSeeDetail) return base;
      return {
        ...base,
        ipAddress: l.ipAddress,
        entityLabel: l.entityId ? entityLabels.get(`${l.entityType}:${l.entityId}`) ?? null : null,
        changes: buildChanges(l.oldValue, l.newValue, nameMap),
      };
    });
    return { items, total, page: p, limit, totalPages: Math.ceil(total / limit) };
  }

  async actions() {
    const rows = await this.prisma.auditLog.findMany({ distinct: ['action'], select: { action: true }, orderBy: { action: 'asc' } });
    return rows.map((r) => r.action);
  }

  /** ดึงรหัส/ชื่อของเอนทิตีที่อ้างถึง เพื่อโชว์ "ทำที่ <code · ชื่อ>" แทน UUID */
  private async resolveEntityLabels(logs: { entityType: string | null; entityId: string | null }[]) {
    const map = new Map<string, string>();
    const byType: Record<string, string[]> = {};
    for (const l of logs) if (l.entityType && l.entityId) (byType[l.entityType] ||= []).push(l.entityId);
    const put = (type: string, rows: { id: string }[], label: (r: any) => string) =>
      rows.forEach((r) => map.set(`${type}:${r.id}`, label(r)));
    if (byType.property) put('property', await this.prisma.property.findMany({ where: { id: { in: byType.property } }, select: { id: true, code: true, titleTh: true } }), (r) => `${r.code} · ${r.titleTh}`);
    if (byType.lead) put('lead', await this.prisma.lead.findMany({ where: { id: { in: byType.lead } }, select: { id: true, code: true, fullName: true } }), (r) => `${r.code} · ${r.fullName}`);
    if (byType.owner) put('owner', await this.prisma.owner.findMany({ where: { id: { in: byType.owner } }, select: { id: true, fullName: true } }), (r) => r.fullName);
    if (byType.customer) put('customer', await this.prisma.customer.findMany({ where: { id: { in: byType.customer } }, select: { id: true, fullName: true } }), (r) => r.fullName);
    if (byType.appointment) put('appointment', await this.prisma.appointment.findMany({ where: { id: { in: byType.appointment } }, select: { id: true, code: true } }), (r) => r.code);
    if (byType.contract) put('contract', await this.prisma.contract.findMany({ where: { id: { in: byType.contract } }, select: { id: true, code: true } }), (r) => r.code);
    return map;
  }
}

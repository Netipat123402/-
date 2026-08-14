import {
  BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException,
} from '@nestjs/common';
import { Appointment, AppointmentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { AuditService } from '../../common/trail/audit.service';
import { ActivityService } from '../../common/trail/activity.service';
import { NotificationService } from '../notification/notification.service';
import { resolveScope } from '../../common/auth/permissions.guard';
import { NEVER_MATCH } from '../../common/auth/scope.util';
import { ACTIVE_APPT_STATUSES, canTransitionAppt } from './appointment.lifecycle';
import { thaiDateTime } from '../../common/util/thai-datetime';
import type { AuthenticatedUser, Scope } from '../../common/auth/authenticated-user';
import type { RequestMeta } from '../../common/types/request-meta';
import {
  CancelDto, CreateAppointmentDto, QueryAppointmentDto, RescheduleDto,
} from './dto/appointment.dto';

@Injectable()
export class AppointmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly activity: ActivityService,
    private readonly notifications: NotificationService,
  ) {}

  private scopeWhere(user: AuthenticatedUser, scope: Scope): Prisma.AppointmentWhereInput {
    const base: Prisma.AppointmentWhereInput = { deletedAt: null };
    if (scope === 'all') return base;
    if (scope === 'branch') return user.branchId ? { ...base, branchId: user.branchId } : { ...base, ...NEVER_MATCH };
    if (scope === 'team') return user.teamId ? { ...base, agent: { teamId: user.teamId } } : { ...base, ...NEVER_MATCH };
    return { ...base, agentId: user.id };
  }

  private require(user: AuthenticatedUser, action: string): Scope {
    const scope = resolveScope(user, 'appointment', action);
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์ appointment:${action}`);
    return scope;
  }

  /** กันเวลาชน (Phase 1 §9 / edge case) — agent คนเดียวห้ามนัดซ้อนเวลา */
  private async assertNoConflict(agentId: string, start: Date, durationMin: number, excludeId?: string) {
    const end = new Date(start.getTime() + durationMin * 60000);
    const sameAgent = await this.prisma.appointment.findMany({
      where: {
        agentId, deletedAt: null, status: { in: ACTIVE_APPT_STATUSES },
        ...(excludeId ? { id: { not: excludeId } } : {}),
      },
      select: { id: true, scheduledAt: true, durationMin: true },
    });
    for (const a of sameAgent) {
      const aStart = a.scheduledAt.getTime();
      const aEnd = aStart + a.durationMin * 60000;
      if (aStart < end.getTime() && aEnd > start.getTime()) {
        throw new ConflictException('เวลานัดชนกับนัดอื่นของเจ้าหน้าที่คนนี้');
      }
    }
  }

  /** A5: ทรัพย์/Lead ที่อ้างอิงต้องอยู่ใน read-scope ของผู้ใช้ (กันผูก entity ข้ามสาขา) */
  private async assertRef(user: AuthenticatedUser, resource: 'property' | 'lead', id: string) {
    const scope = resolveScope(user, resource, 'read');
    if (!scope) throw new ForbiddenException(`ไม่มีสิทธิ์อ้างอิง ${resource}`);
    if (resource === 'property') {
      const w: Prisma.PropertyWhereInput = { id, deletedAt: null };
      if (scope === 'branch') w.branchId = user.branchId;
      else if (scope === 'team') w.assignedTo = { teamId: user.teamId };
      else if (scope === 'own') w.assignedToId = user.id;
      if (!(await this.prisma.property.findFirst({ where: w, select: { id: true } }))) {
        throw new NotFoundException('ไม่พบทรัพย์ในสิทธิ์ของคุณ');
      }
    } else {
      const w: Prisma.LeadWhereInput = { id, deletedAt: null };
      if (scope === 'branch') w.OR = [{ branchId: user.branchId }, { branchId: null }];
      else if (scope === 'team') w.assignedTo = { teamId: user.teamId };
      else if (scope === 'own') w.assignedToId = user.id;
      if (!(await this.prisma.lead.findFirst({ where: w, select: { id: true } }))) {
        throw new NotFoundException('ไม่พบ Lead ในสิทธิ์ของคุณ');
      }
    }
  }

  /** A5: agent ที่มอบหมายต้องเป็นผู้ใช้ที่ active (และอยู่สาขาเดียวกัน ถ้าผู้สร้างไม่ใช่ scope all) */
  private async assertAgent(user: AuthenticatedUser, agentId: string) {
    const w: Prisma.UserWhereInput = { id: agentId, deletedAt: null, status: 'active' };
    if (resolveScope(user, 'appointment', 'create') !== 'all') w.branchId = user.branchId;
    if (!(await this.prisma.user.findFirst({ where: w, select: { id: true } }))) {
      throw new BadRequestException('เจ้าหน้าที่ไม่ถูกต้องหรืออยู่นอกสาขาของคุณ');
    }
  }

  /** ตรวจว่า error คือการชนกับ exclusion constraint นัดซ้อน (F6 — race-safe ระดับ DB) */
  private isOverlapError(e: unknown): boolean {
    const msg = e instanceof Error ? e.message : String(e);
    const meta = (e as { meta?: { constraint?: string } }).meta;
    return msg.includes('appointments_no_overlap') || (meta?.constraint?.includes('no_overlap') ?? false);
  }

  // ใช้ค่า sequence สูงสุดที่มีจริง (ไม่ใช่ count) — กันรหัสซ้ำหลังลบ record
  private async genCode(): Promise<string> {
    const head = `APT-${new Date().getFullYear()}-`;
    // #10: ดึงเฉพาะรหัสล่าสุดผ่าน unique index (ไม่ scan ทั้งปี)
    const last = await this.prisma.appointment.findFirst({ where: { code: { startsWith: head } }, orderBy: { code: 'desc' }, select: { code: true } });
    const n = last ? parseInt(last.code.slice(head.length), 10) : 0;
    return head + String((Number.isFinite(n) ? n : 0) + 1).padStart(4, '0');
  }

  async create(user: AuthenticatedUser, dto: CreateAppointmentDto, meta: RequestMeta) {
    this.require(user, 'create');
    // A1: นัดต้องเป็นเวลาในอนาคต
    if (new Date(dto.scheduledAt).getTime() <= Date.now()) {
      throw new ConflictException('เวลานัดต้องเป็นเวลาในอนาคต');
    }
    // นัดมี 2 แบบ: (1) นัดดูทรัพย์ = ต้องมี lead + property  (2) นัดนอกรอบ = ใส่ title แทน
    const isViewing = !!(dto.leadId || dto.propertyId);
    if (isViewing) {
      if (!dto.leadId || !dto.propertyId) {
        throw new BadRequestException('นัดดูทรัพย์ต้องระบุทั้ง Lead และทรัพย์');
      }
      // A5: ทรัพย์/Lead ที่อ้างอิงต้องอยู่ในสิทธิ์ของผู้สร้าง (กันผูกข้ามสาขา)
      await this.assertRef(user, 'property', dto.propertyId);
      await this.assertRef(user, 'lead', dto.leadId);
    } else if (!dto.title?.trim()) {
      throw new BadRequestException('นัดนอกรอบต้องระบุหัวข้อนัด');
    }
    await this.assertAgent(user, dto.agentId);
    const duration = dto.durationMin ?? 30;
    await this.assertNoConflict(dto.agentId, dto.scheduledAt, duration);
    // G1: retry เมื่อรหัสชน (concurrent create)
    let appt: Appointment | undefined;
    for (let attempt = 0; ; attempt++) {
      const code = await this.genCode();
      try {
        appt = await this.prisma.appointment.create({
          data: {
            code, status: 'upcoming', scheduledAt: dto.scheduledAt, durationMin: duration,
            title: dto.title?.trim() || null,
            location: dto.location, note: dto.note, branchId: user.branchId,
            createdBy: user.id, updatedBy: user.id,
            ...(dto.leadId ? { lead: { connect: { id: dto.leadId } } } : {}),
            ...(dto.propertyId ? { property: { connect: { id: dto.propertyId } } } : {}),
            agent: { connect: { id: dto.agentId } },
          },
        });
        break;
      } catch (e) {
        if (this.isOverlapError(e)) throw new ConflictException('เวลานัดชนกับนัดอื่นของเจ้าหน้าที่คนนี้');
        if (attempt < 4 && e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') continue;
        throw e;
      }
    }
    // เมื่อมีนัดดูทรัพย์ → ดัน lead ที่ยัง "ใหม่" ให้เป็น "กำลังดูแล"
    if (dto.leadId) {
      await this.prisma.lead.updateMany({
        where: { id: dto.leadId, status: 'new' },
        data: { status: 'working' },
      });
    }
    await this.activity.log({ entityType: 'appointment', entityId: appt.id, action: 'create', actorId: user.id, summary: `สร้างนัด ${appt.code}`, i18nKey: 'activity.appointment.create', i18nParams: { code: appt.code } });
    await this.notifications.notifyUser(dto.agentId, {
      category: 'appointment', entityType: 'appointment', entityId: appt.id,
      title: isViewing ? 'มีนัดดูทรัพย์ใหม่' : 'มีนัดใหม่',
      body: `${appt.title ? `${appt.title} — ` : `นัด ${appt.code} `}วันที่ ${thaiDateTime(dto.scheduledAt)}`,
      titleKey: isViewing ? 'notif.apptNew.titleViewing' : 'notif.apptNew.title',
      bodyKey: appt.title ? 'notif.apptNew.bodyTitled' : 'notif.apptNew.body',
      params: { code: appt.code, name: appt.title ?? '', at: dto.scheduledAt.toISOString() },
    });
    await this.audit.record(user, { action: 'create', entityType: 'appointment', entityId: appt.id, newValue: { code: appt.code }, ...meta });
    return appt;
  }

  async findMany(user: AuthenticatedUser, query: QueryAppointmentDto) {
    const scope = this.require(user, 'read');
    const and: Prisma.AppointmentWhereInput[] = [this.scopeWhere(user, scope)];
    if (query.status) and.push({ status: query.status });
    if (query.agentId) and.push({ agentId: query.agentId });
    if (query.q) and.push({ OR: [
      { code: { contains: query.q, mode: 'insensitive' } },
      { title: { contains: query.q, mode: 'insensitive' } },
      { lead: { fullName: { contains: query.q, mode: 'insensitive' } } },
      { property: { titleTh: { contains: query.q, mode: 'insensitive' } } },
    ] });
    if (query.date) {
      const start = new Date(query.date); start.setHours(0, 0, 0, 0);
      const end = new Date(start); end.setDate(end.getDate() + 1);
      and.push({ scheduledAt: { gte: start, lt: end } });
    } else if (query.dateFrom || query.dateTo) {
      // ช่วงวันที่ (เช่น "สัปดาห์นี้") — ครอบคลุมทั้งวันของ dateFrom..dateTo
      const range: Prisma.DateTimeFilter = {};
      if (query.dateFrom) { const s = new Date(query.dateFrom); s.setHours(0, 0, 0, 0); range.gte = s; }
      if (query.dateTo) { const e = new Date(query.dateTo); e.setHours(0, 0, 0, 0); e.setDate(e.getDate() + 1); range.lt = e; }
      and.push({ scheduledAt: range });
    }
    const where: Prisma.AppointmentWhereInput = { AND: and };
    const page = query.page ?? 1, limit = query.limit ?? 20;
    const orderBy: Prisma.AppointmentOrderByWithRelationInput =
      query.sort === 'desc' ? { scheduledAt: 'desc' } : { scheduledAt: 'asc' }; // MR-12
    const [items, total] = await this.prisma.$transaction([
      this.prisma.appointment.findMany({ where, orderBy, skip: (page - 1) * limit, take: limit,
        include: { lead: { select: { fullName: true, phone: true } }, property: { select: { titleTh: true, monthlyRent: true } } } }),
      this.prisma.appointment.count({ where }),
    ]);
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(user: AuthenticatedUser, id: string) {
    const scope = this.require(user, 'read');
    // ดึงลูกค้า (ชื่อ+เบอร์) + ทรัพย์ (รหัส/ชื่อ) + พนักงาน เพื่อโชว์ในหน้า detail/modal ของนัด
    const appt = await this.prisma.appointment.findFirst({
      where: { AND: [this.scopeWhere(user, scope), { id }] },
      include: {
        lead: { select: { id: true, fullName: true, phone: true } },
        property: { select: { id: true, code: true, titleTh: true } },
        agent: { select: { fullName: true } },
      },
    });
    if (!appt) throw new NotFoundException('ไม่พบนัด');
    return appt;
  }

  async reschedule(user: AuthenticatedUser, id: string, dto: RescheduleDto, meta: RequestMeta) {
    const appt = await this.requireInScope(user, id, 'change_status');
    // เลื่อนได้เฉพาะนัดที่ยังรอพบ — สถานะคง upcoming เปลี่ยนแค่เวลา
    if (appt.status !== 'upcoming') {
      throw new ConflictException(`เลื่อนนัดจากสถานะ ${appt.status} ไม่ได้`);
    }
    // A1: เวลาที่เลื่อนไปต้องเป็นอนาคต
    if (new Date(dto.scheduledAt).getTime() <= Date.now()) {
      throw new ConflictException('เวลานัดต้องเป็นเวลาในอนาคต');
    }
    const duration = dto.durationMin ?? appt.durationMin;
    await this.assertNoConflict(appt.agentId, dto.scheduledAt, duration, appt.id);
    let updated;
    try {
      updated = await this.prisma.appointment.update({
        where: { id }, data: { scheduledAt: dto.scheduledAt, durationMin: duration, updatedBy: user.id },
      });
    } catch (e) {
      if (this.isOverlapError(e)) throw new ConflictException('เวลานัดชนกับนัดอื่นของเจ้าหน้าที่คนนี้');
      throw e;
    }
    await this.activity.log({ entityType: 'appointment', entityId: id, action: 'reschedule', actorId: user.id, summary: `เลื่อนนัดเป็น ${dto.scheduledAt.toISOString()}`, i18nKey: 'activity.appointment.reschedule', i18nParams: { at: dto.scheduledAt.toISOString() } });
    await this.notifications.notifyUser(appt.agentId, {
      category: 'appointment', entityType: 'appointment', entityId: id,
      title: 'นัดถูกเลื่อนเวลา',
      body: `นัด ${appt.code} เลื่อนเป็น ${thaiDateTime(dto.scheduledAt)}`,
      titleKey: 'notif.apptReschedule.title',
      bodyKey: 'notif.apptReschedule.body',
      params: { code: appt.code, at: dto.scheduledAt.toISOString() },
    });
    await this.audit.record(user, { action: 'change_status', entityType: 'appointment', entityId: id, oldValue: { scheduledAt: appt.scheduledAt }, newValue: { scheduledAt: dto.scheduledAt }, ...meta });
    return updated;
  }

  async cancel(user: AuthenticatedUser, id: string, dto: CancelDto, meta: RequestMeta) {
    const appt = await this.requireInScope(user, id, 'change_status');
    const result = await this.transition(user, appt, 'cancelled', dto.reason, meta);
    await this.notifications.notifyUser(appt.agentId, {
      category: 'appointment', entityType: 'appointment', entityId: id,
      title: 'นัดถูกยกเลิก',
      body: `นัด ${appt.code} ถูกยกเลิก${dto.reason ? ` (${dto.reason})` : ''}`,
      titleKey: 'notif.apptCancel.title',
      bodyKey: dto.reason ? 'notif.apptCancel.bodyReason' : 'notif.apptCancel.body',
      params: { code: appt.code, reason: dto.reason ?? '' },
    });
    return result;
  }

  async noShow(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const appt = await this.requireInScope(user, id, 'change_status');
    // "ไม่มาตามนัด" = ยกเลิกพร้อมเหตุผล
    return this.transition(user, appt, 'cancelled', 'ไม่มาตามนัด', meta);
  }

  async complete(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const appt = await this.requireInScope(user, id, 'change_status');
    // พบลูกค้าแล้ว → lead คงสถานะ "กำลังดูแล"
    return this.transition(user, appt, 'done', undefined, meta);
  }

  private async transition(
    user: AuthenticatedUser, appt: Appointment, to: AppointmentStatus,
    reason: string | undefined, meta: RequestMeta,
  ) {
    if (!canTransitionAppt(appt.status, to)) {
      throw new ConflictException(`เปลี่ยนสถานะนัดจาก ${appt.status} ไป ${to} ไม่ได้`);
    }
    const updated = await this.prisma.appointment.update({
      where: { id: appt.id },
      data: { status: to, cancelReason: to === 'cancelled' ? reason : appt.cancelReason, updatedBy: user.id },
    });
    await this.activity.log({ entityType: 'appointment', entityId: appt.id, action: 'status_change', actorId: user.id, summary: `นัด: ${appt.status} → ${to}`, metadata: { from: appt.status, to, reason }, i18nKey: 'activity.appointment.status', i18nParams: { from: appt.status, to } });
    await this.audit.record(user, { action: 'change_status', entityType: 'appointment', entityId: appt.id, oldValue: { status: appt.status }, newValue: { status: to, reason }, ...meta });
    return updated;
  }

  private async requireInScope(user: AuthenticatedUser, id: string, action: string): Promise<Appointment> {
    const scope = this.require(user, action);
    const appt = await this.prisma.appointment.findFirst({ where: { AND: [this.scopeWhere(user, scope), { id }] } });
    if (!appt) throw new NotFoundException('ไม่พบนัด');
    return appt;
  }
}
